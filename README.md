# Multi-Tenant Event Booking System

A comprehensive multi-tenant event booking backend built with Payload CMS, featuring waitlist management, real-time notifications, and organizer dashboards.

## 🚀 Features

- **Multi-Tenancy Support**: Complete data isolation between organizations
- **Smart Waitlist System**: Automatic promotion when seats become available
- **Real-time Notifications**: In-app alerts for all booking status changes
- **Organizer Dashboard**: Analytics, progress indicators, and activity feeds
- **Role-Based Access Control**: Attendee, Organizer, and Admin permissions

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- pnpm package manager

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Pritam499/multi-event-booking-platforms.git
cd multi-event-booking-platforms
```

### 2. Environment Setup

Copy the environment example file and configure your settings:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/your_database

# Payload Configuration
PAYLOAD_SECRET=your_very_long_random_secret_here
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

# Optional: Email configuration if needed
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Database Setup

Run migrations to set up the database schema:

```bash
pnpm payload migrate
```

### 5. Seed the Database

Populate the database with sample data including tenants, users, events, and bookings:

```bash
pnpx tsx src/seed.ts
```

This will create:
- 2 tenants (Tenant Alpha and Tenant Beta)
- 1 super admin user
- 1 organizer and 3 attendees per tenant
- 2 events per tenant with different capacities
- Sample bookings with waitlist scenarios

## 🎮 Usage

### Development Mode

Start the development server:

```bash
pnpm dev
```

Access the application at:
- **Admin Panel**: http://localhost:3000/admin
- **API**: http://localhost:3000/api

### Production Build

Create a production build:

```bash
pnpm run build
```

Start production server:

```bash
pnpm start
```

## 👥 Default Login Credentials

After seeding, use these credentials to login:

### Super Admin (Full Access)
- **Email**: superadmin@example.com
- **Password**: admin123

### Tenant Alpha Admin
- **Email**: admin@tenant-alpha.example
- **Password**: password

### Tenant Alpha Organizer
- **Email**: organizer@tenant-alpha.example  
- **Password**: password

### Tenant Alpha Attendees
- **Emails**: attendee1@tenant-alpha.example, attendee2@tenant-alpha.example, attendee3@tenant-alpha.example
- **Password**: password

*(Repeat for Tenant Beta)*

## 📊 API Endpoints

### Booking Management
- `POST /api/book-event` - Create a new booking
- `POST /api/cancel-booking` - Cancel a booking
- `GET /api/my-bookings` - Get user's bookings
- `GET /api/dashboard` - Organizer dashboard data

### Notifications
- `GET /api/my-notifications` - Get user notifications
- `POST /api/notifications/:id/read` - Mark notification as read

## 🏗️ Architecture

### Collections
- **Tenants**: Organization isolation
- **Users**: Role-based access control
- **Events**: Event management with capacity limits
- **Bookings**: Booking system with waitlist support
- **Notifications**: Real-time user alerts
- **BookingLogs**: Audit trail for all booking actions

### Key Features Implemented
- ✅ Multi-tenancy with data isolation
- ✅ Waitlist automation with promotion logic
- ✅ Real-time notification system
- ✅ Organizer dashboard with analytics
- ✅ Comprehensive access control
- ✅ Audit logging for all actions

## 🚀 Deployment

### Vercel Deployment

1. **Push to GitHub**
2. **Connect repository to Vercel**
3. **Set environment variables in Vercel dashboard**:
   - `DATABASE_URL`
   - `PAYLOAD_SECRET` 
   - `PAYLOAD_PUBLIC_SERVER_URL`

4. **Deploy!** Vercel will automatically:
   - Install dependencies with pnpm
   - Generate Payload types
   - Build the Next.js application
   - Deploy to production

### Environment Variables for Production

```env
DATABASE_URL=your_production_postgres_url
PAYLOAD_SECRET=your_production_secret
PAYLOAD_PUBLIC_SERVER_URL=https://your-app.vercel.app
```

## 🔧 Development Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm devsafe          # Clean build and start dev server

# Build & Production
pnpm build            # Create production build
pnpm start            # Start production server

# Database & Types
pnpm payload migrate  # Run database migrations
pnpm generate:types   # Generate Payload TypeScript types

# Seeding
pnpm run seed         # Seed database with sample data
```

## 🐛 Troubleshooting

### Common Issues

1. **Build Errors**: Clear cache and rebuild
   ```bash
   rm -rf .next node_modules/.cache
   pnpm install
   pnpm run build
   ```

2. **Database Connection**: Verify DATABASE_URL in .env

3. **Permission Errors**: Run terminal as Administrator on Windows

4. **Type Errors**: Regenerate types
   ```bash
   pnpm run generate:types
   ```

## 📝 License

This project is created as part of WeFrameTech Backend Hiring Task.

## 🆘 Support

For issues related to this implementation, please refer to:
- [Payload CMS Documentation](https://payloadcms.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Note**: This is a demonstration project for evaluation purposes. Ensure all credentials are changed before production use.