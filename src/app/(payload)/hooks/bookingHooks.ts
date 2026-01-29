// src/hooks/bookingHooks.ts
import type {
  CollectionBeforeChangeHook,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionAfterOperationHook,
} from "payload";

/**
 * Retry helper for FK timing issues (notifications -> booking).
 * If retries are exhausted, we allow caller to fallback (e.g., omit booking).
 */
async function retry<T>(fn: () => Promise<T>, retries = 5, delay = 150): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const e = err as any;
    if (retries > 0 && e?.code === "23503") {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay);
    }
    if (e?.code !== "23503") {
      console.error("Error in retry function (non-FK):", e);
    }
    throw e;
  }
}

/**
 * Helper to create a notification safely (fallback if FK race).
 */
async function createNotificationSafe(req: any, data: any) {
  try {
    return await retry(() =>
      req.payload.create({
        collection: "notifications",
        data,
      })
    );
  } catch (err: any) {
    if (err?.code === "23503" && data.booking) {
      // FK failed after retries → fallback without booking
      console.warn("FK race persisted, creating notification without booking ref");
      const { booking, ...rest } = data;
      return await req.payload.create({
        collection: "notifications",
        data: rest,
      });
    }
    throw err;
  }
}

/**
 * Promote oldest waitlisted booking.
 * Uses db.updateOne (bypasses hooks), so we create its log here.
 * Safe: the promoted booking already exists → FK ok.
 */
const promoteOldestWaitlist = async (eventId: string, tenantId: string, req: any) => {
  const oldestWaitlistedBooking = await req.payload.find({
    collection: "bookings",
    where: {
      and: [
        { event: { equals: eventId } },
        { status: { equals: "waitlisted" } },
        { tenant: { equals: tenantId } },
      ],
    },
    sort: "createdAt",
    limit: 1,
    depth: 0,
  });

  if (!oldestWaitlistedBooking.docs.length) return null;
  const bookingToPromote = oldestWaitlistedBooking.docs[0];

  try {
    await req.payload.db.updateOne({
      collection: "bookings",
      id: bookingToPromote.id,
      data: { status: "confirmed" },
    });

    const promotedBooking = await req.payload.findByID({
      collection: "bookings",
      id: bookingToPromote.id,
      depth: 1,
    });

    await createNotificationSafe(req, {
      user: promotedBooking.user.id,
      booking: promotedBooking.id,
      type: "waitlist_promoted",
      title: "Promoted from Waitlist",
      message: "Good news! You've been promoted from waitlist to confirmed.",
      tenant: tenantId,
      read: false,
    });

    // Log here (booking row exists; no FK race)
    await req.payload.create({
      collection: "booking-logs",
      data: {
        booking: promotedBooking.id,
        event: eventId,
        user: promotedBooking.user.id,
        action: "promote_from_waitlist",
        note: "Automatically promoted from waitlist after cancellation.",
        tenant: tenantId,
      },
    });

    return promotedBooking;
  } catch (err: unknown) {
    console.error("Error promoting waitlisted booking:", err);
    return null;
  }
};

// ----- BEFORE CHANGE -----
export const bookingBeforeChange: CollectionBeforeChangeHook = async ({
  req,
  operation,
  data,
}) => {
  if (operation !== "create") return data;

  const user = req.user as any;
  if (!user?.tenant) throw new Error("User must belong to a tenant to create a booking");

  data.tenant = user.tenant;
  data.user = user.id;

  const eventId = data.event;
  if (!eventId) throw new Error("Event is required for booking");

  try {
    const event = await req.payload.findByID({
      collection: "events",
      id: eventId,
      depth: 0,
    });
    if (!event) throw new Error("Event not found");

    const confirmedBookings = await req.payload.find({
      collection: "bookings",
      where: {
        and: [
          { event: { equals: eventId } },
          { status: { equals: "confirmed" } },
          { tenant: { equals: user.tenant } },
        ],
      },
      limit: 0,
    });

    const capacity = event.capacity || 0;
    const confirmedCount = confirmedBookings.totalDocs || 0;

    data.status = confirmedCount < capacity ? "confirmed" : "waitlisted";
    return data;
  } catch (err: unknown) {
    console.error("Error in bookingBeforeChange:", err);
    throw err;
  }
};

// ----- AFTER CHANGE -----
// Notifications only (NO LOG INSERTS here)
export const bookingAfterChange: CollectionAfterChangeHook = async ({
  req,
  doc,
  previousDoc,
  operation,
}) => {
  // Small delay to avoid immediate FK races on notification->booking
  await new Promise((resolve) => setTimeout(resolve, 50));

  if (operation === "create") {
    const notificationType =
      doc.status === "confirmed" ? "booking_confirmed" : "waitlisted";
    const title = doc.status === "confirmed" ? "Booking Confirmed" : "Added to Waitlist";
    const message =
      doc.status === "confirmed"
        ? "Your booking has been confirmed."
        : "The event is full. You've been added to the waitlist.";

    try {
      await createNotificationSafe(req, {
        user: doc.user,
        booking: doc.id,
        type: notificationType,
        title,
        message,
        tenant: doc.tenant,
        read: false,
      });
    } catch (err: unknown) {
      console.error("Error creating notification for new booking:", err);
    }
    return;
  }

  if (operation === "update") {
    const statusChanged = previousDoc?.status !== doc?.status;
    if (!statusChanged) return;

    const wasConfirmed = previousDoc?.status === "confirmed";
    const nowCanceled = doc?.status === "canceled";

    if (wasConfirmed && nowCanceled) {
      try {
        await createNotificationSafe(req, {
          user: doc.user,
          booking: doc.id,
          type: "booking_canceled",
          title: "Booking Canceled",
          message: "Your booking has been canceled.",
          tenant: doc.tenant,
          read: false,
        });

        // Promote waitlisted attendee (includes its own log)
        await promoteOldestWaitlist(doc.event, doc.tenant, req);
      } catch (err: unknown) {
        console.error("Error handling booking cancellation:", err);
      }
      return;
    }

    // General status change notifications
    try {
      let notificationType: "booking_confirmed" | "waitlisted" | "booking_canceled";
      switch (doc.status) {
        case "confirmed":
          notificationType = "booking_confirmed";
          break;
        case "waitlisted":
          notificationType = "waitlisted";
          break;
        case "canceled":
          notificationType = "booking_canceled";
          break;
        default:
          return;
      }

      await createNotificationSafe(req, {
        user: doc.user,
        booking: doc.id,
        type: notificationType,
        title: `Booking ${doc.status}`,
        message: `Your booking status is now: ${doc.status}`,
        tenant: doc.tenant,
        read: false,
      });
    } catch (err: unknown) {
      console.error("Error handling general status change notification:", err);
    }
  }
};

// ----- AFTER DELETE -----
// Notifications + waitlist promotion (NO LOG INSERT here — delete log is in afterOperation)
export const bookingAfterDelete: CollectionAfterDeleteHook = async ({ req, doc }) => {
  if (!doc) return;
  if (doc.status !== "confirmed") return;

  try {
    await createNotificationSafe(req, {
      user: doc.user,
      booking: doc.id,
      type: "booking_canceled",
      title: "Booking Deleted",
      message: "Your confirmed booking has been deleted.",
      tenant: doc.tenant,
      read: false,
    });

    // Promote from waitlist (includes its own log)
    await promoteOldestWaitlist(doc.event, doc.tenant, req);
  } catch (err: unknown) {
    console.error("Error handling booking deletion:", err);
  }
};

/**
 * AFTER OPERATION — create booking logs only after transaction commit.
 * Use broad `any` on result shapes to avoid type noise; these are internal objects.
 */
export const bookingAfterOperation: CollectionAfterOperationHook = async ({
  operation,
  result,
  req,
}) => {
  if (!["create", "delete"].includes(operation)) return;

  const results = Array.isArray(result) ? result : [result];

  for (const cur of results) {
    if (!cur) continue;

    let logData: Record<string, any> | null = null;

    if (operation === "create") {
      logData = {
        booking: cur.id,
        event: cur.event,
        user: cur.user,
        action: cur.status === "confirmed" ? "auto_confirm" : "auto_waitlist",
        note: `Booking created with status: ${cur.status}`,
        tenant: cur.tenant,
      };
    }

    if (operation === "delete") {
      if (cur.status === "confirmed") {
        logData = {
          booking: cur.id,
          event: cur.event,
          user: cur.user,
          action: "cancel_confirmed",
          note: "Confirmed booking was deleted",
          tenant: cur.tenant,
        };
      } else {
        logData = {
          booking: cur.id,
          event: cur.event,
          user: cur.user,
          action: "cancel_unconfirmed",
          note: `Unconfirmed booking (status: ${cur.status}) was deleted`,
          tenant: cur.tenant,
        };
      }
    }

    if (logData) {
      setImmediate(async () => {
        try {
          await req.payload.create({
            collection: "booking-logs",
            data: logData as any,
          });
        } catch (err) {
          req.payload.logger.error("Error creating booking log:", err);
        }
      });
    }
  }
};

