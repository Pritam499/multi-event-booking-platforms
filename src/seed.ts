// src/seed.ts
import { fileURLToPath, pathToFileURL } from 'url'
import path from 'path'
import payload from 'payload'
import dotenv from 'dotenv'
import { COLLECTIONS } from './constants/collections'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const toRichText = (text: string) => ({
  root: {
    type: 'root',
    version: 1,
    format: '' as '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify',
    indent: 0,
    direction: null as 'ltr' | 'rtl' | null,
    children: [
      {
        type: 'paragraph',
        version: 1,
        format: '' as '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify',
        indent: 0,
        direction: null as 'ltr' | 'rtl' | null,
        children: [
          {
            type: 'text',
            version: 1,
            text,
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
          },
        ],
      },
    ],
  },
})

async function seed() {
  try {
    const payloadConfig = await import(
      pathToFileURL(path.resolve(__dirname, './payload.config.ts')).href
    )
    await payload.init({ config: payloadConfig.default })

    console.log('✅ Payload initialized.')

    // --- CREATE SUPERADMIN FIRST (bypassing tenant validation) ---
    const superAdminEmail = 'superadmin@example.com'
    let superAdmin = (
      await payload.find({
        collection: COLLECTIONS.USERS,
        where: { email: { equals: superAdminEmail } },
        limit: 1,
      })
    )?.docs?.[0]

    if (!superAdmin) {
      console.log('👑 Creating SuperAdmin user...');
      
      // Create a special context to bypass tenant validation
      const bypassContext = {
        user: {
          id: 'seed-script-bypass',
          role: 'superAdmin', // This should bypass the tenant requirement
          collection: COLLECTIONS.USERS,
          _strategy: 'local',
        },
        payload,
      } as any

      // Use create with bypass context
      superAdmin = await payload.create({
        collection: COLLECTIONS.USERS,
        data: {
          name: 'Super Admin',
          email: superAdminEmail,
          password: 'admin123', // Change this password!
          role: 'superAdmin',
          // Explicitly set tenant to null for superAdmin
          tenant: null,
        },
        req: bypassContext,
      })
      console.log('✅ Created SuperAdmin:', superAdmin.email)
      console.log('📧 Email: superadmin@example.com')
      console.log('🔑 Password: admin123')
      console.log('⚠️ Remember to change the password after first login!')
    } else {
      console.log('ℹ️ SuperAdmin already exists:', superAdmin.email)
    }

    // --- NOW PROCEED WITH THE REST OF SEEDING ---
    console.log('\n🌱 Proceeding with tenant seeding...')

    // Tenants
    const tenantsData = [
      { name: 'Tenant Alpha', slug: 'tenant-alpha' },
      { name: 'Tenant Beta', slug: 'tenant-beta' },
    ]

    for (const t of tenantsData) {
      let tenant = (
        await payload.find({
          collection: COLLECTIONS.TENANTS,
          where: { slug: { equals: t.slug } },
          limit: 1,
        })
      )?.docs?.[0]

      if (!tenant) {
        // Use SuperAdmin context to create tenants
        const superAdminContext = {
          user: {
            id: superAdmin.id,
            role: 'superAdmin',
            collection: COLLECTIONS.USERS,
            _strategy: 'local',
            email: superAdmin.email,
          },
        } as any

        tenant = await payload.create({
          collection: COLLECTIONS.TENANTS,
          data: { name: t.name, slug: t.slug },
          req: superAdminContext,
        })
        console.log('🏢 Created tenant:', tenant.name)
      }

      console.log(`\n➡️ Seeding tenant: ${tenant.name}`)

      // Create users with proper context
      const tenantContext = {
        user: {
          id: 'seed-script',
          role: 'admin',
          tenant: tenant.id,
          collection: COLLECTIONS.USERS,
          _strategy: 'local',
        },
      } as any

      // Admin
      const adminEmail = `admin@${tenant.slug}.example`
      let admin = (
        await payload.find({
          collection: COLLECTIONS.USERS,
          where: {
            and: [{ email: { equals: adminEmail } }, { tenant: { equals: tenant.id } }],
          },
          limit: 1,
        })
      )?.docs?.[0]

      if (!admin) {
        admin = await payload.create({
          collection: COLLECTIONS.USERS,
          data: {
            name: `${tenant.name} Admin`,
            email: adminEmail,
            password: 'password',
            role: 'admin',
            tenant: tenant.id,
          },
          req: tenantContext,
        })
        console.log('👤 Created admin:', admin.email)
      }

      // Organizer
      const organizerEmail = `organizer@${tenant.slug}.example`
      let organizer = (
        await payload.find({
          collection: COLLECTIONS.USERS,
          where: {
            and: [{ email: { equals: organizerEmail } }, { tenant: { equals: tenant.id } }],
          },
          limit: 1,
        })
      )?.docs?.[0]

      if (!organizer) {
        organizer = await payload.create({
          collection: COLLECTIONS.USERS,
          data: {
            name: `${tenant.name} Organizer`,
            email: organizerEmail,
            password: 'password',
            role: 'organizer',
            tenant: tenant.id,
          },
          req: tenantContext,
        })
        console.log('👤 Created organizer:', organizer.email)
      }

      // Attendees
      const attendees: any[] = []
      for (let i = 1; i <= 3; i++) {
        const email = `attendee${i}@${tenant.slug}.example`
        let att = (
          await payload.find({
            collection: COLLECTIONS.USERS,
            where: {
              and: [{ email: { equals: email } }, { tenant: { equals: tenant.id } }],
            },
            limit: 1,
          })
        )?.docs?.[0]

        if (!att) {
          att = await payload.create({
            collection: COLLECTIONS.USERS,
            data: {
              name: `${tenant.name} Attendee ${i}`,
              email,
              password: 'password',
              role: 'attendee',
              tenant: tenant.id,
            },
            req: tenantContext,
          })
          console.log('👤 Created attendee:', att.email)
        }
        attendees.push(att)
      }

      // Events
      const eventsData = [
        {
          title: `${tenant.name} - Workshop`,
          capacity: 2,
          description: toRichText('Hands-on workshop.'),
          offsetDays: 1,
        },
        {
          title: `${tenant.name} - Meetup`,
          capacity: 1,
          description: toRichText('Casual meetup.'),
          offsetDays: 2,
        },
      ]

      const events: any[] = []
      for (const ev of eventsData) {
        let event = (
          await payload.find({
            collection: COLLECTIONS.EVENTS,
            where: {
              and: [{ title: { equals: ev.title } }, { tenant: { equals: tenant.id } }],
            },
            limit: 1,
          })
        )?.docs?.[0]

        if (!event) {
          event = await payload.create({
            collection: COLLECTIONS.EVENTS,
            data: {
              title: ev.title,
              description: ev.description,
              date: new Date(Date.now() + ev.offsetDays * 86400000).toISOString(),
              capacity: ev.capacity,
              organizer: organizer.id,
              tenant: tenant.id,
            },
            req: tenantContext,
          })
          console.log('📅 Created event:', event.title)
        }
        events.push(event)
      }

      // Bookings
      console.log('   Creating bookings...')

      // First attendee gets confirmed booking
      try {
        const confirmedBooking = await payload.create({
          collection: COLLECTIONS.BOOKINGS,
          data: {
            event: events[0].id,
            user: attendees[0].id,
            tenant: tenant.id,
            status: 'confirmed',
          },
          req: { ...tenantContext, user: { ...tenantContext.user, id: attendees[0].id } },
        })
        console.log(`   ✅ ${attendees[0].email} -> CONFIRMED for ${events[0].title}`)
      } catch (err) {
        console.error('   ❌ Booking failed for', attendees[0].email, err)
      }

      // Second attendee gets confirmed booking (fills the capacity)
      try {
        const confirmedBooking = await payload.create({
          collection: COLLECTIONS.BOOKINGS,
          data: {
            event: events[0].id,
            user: attendees[1].id,
            tenant: tenant.id,
            status: 'confirmed',
          },
          req: { ...tenantContext, user: { ...tenantContext.user, id: attendees[1].id } },
        })
        console.log(`   ✅ ${attendees[1].email} -> CONFIRMED for ${events[0].title}`)
      } catch (err) {
        console.error('   ❌ Booking failed for', attendees[1].email, err)
      }

      // Third attendee gets waitlisted (event is now full)
      try {
        const waitlistedBooking = await payload.create({
          collection: COLLECTIONS.BOOKINGS,
          data: {
            event: events[0].id,
            user: attendees[2].id,
            tenant: tenant.id,
            status: 'waitlisted',
          },
          req: { ...tenantContext, user: { ...tenantContext.user, id: attendees[2].id } },
        })
        console.log(`   ✅ ${attendees[2].email} -> WAITLISTED for ${events[0].title}`)
      } catch (err) {
        console.error('   ❌ Booking failed for', attendees[2].email, err)
      }
    }

    console.log('\n🎉 Seeding complete!')
    console.log('\n📊 Login Credentials:')
    console.log('- SuperAdmin: superadmin@example.com / admin123')
    console.log('- Each tenant has admin/organizer/attendee users with password: "password"')
    console.log('\n🚀 You can now login to the admin panel!')

    process.exit(0)
  } catch (err) {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  }
}

seed()