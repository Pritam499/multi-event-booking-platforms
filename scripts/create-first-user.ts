// scripts/create-first-user.ts
import { getPayload } from 'payload';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Add console log to verify script is running
console.log('🚀 Starting create-first-user script...');

async function createFirstUser() {
  try {
    console.log('📋 Loading environment variables...');
    console.log('PAYLOAD_SECRET exists:', !!process.env.PAYLOAD_SECRET);
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

    if (!process.env.PAYLOAD_SECRET) {
      throw new Error('PAYLOAD_SECRET environment variable is required');
    }

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    console.log('🔌 Connecting to Payload...');

    // Import your actual payload config with dynamic import
    // Use the correct path to your config file
    const payloadConfigModule = await import('../src/payload.config.js');
    const payloadConfig = payloadConfigModule.default;

    console.log('✅ Payload config loaded successfully');

    // Remove `secret` — Payload reads PAYLOAD_SECRET from .env automatically
    const payload = await getPayload({
      config: payloadConfig,
    });

    console.log('✅ Connected to Payload successfully');
    console.log('🔍 Checking existing users...');

    // Check if any user exists
    const { docs: users } = await payload.find({
      collection: 'users',
      limit: 1,
      depth: 0,
    });

    if (users.length > 0) {
      console.log('ℹ️ Users already exist in the database');
      console.log('📧 First user email:', users[0].email);
      return;
    }

    console.log('👤 Creating first super admin user...');

    // Create first super admin user
    const result = await payload.create({
      collection: 'users',
      data: {
        email: 'superadmin@example.com',
        password: 'admin123', // Change this in production!
        name: 'Super Admin',
        role: 'superAdmin',
      },
    });

    console.log('✅ First user created successfully!');
    console.log('📧 Email: superadmin@example.com');
    console.log('🔑 Password: admin123');
    console.log('🆔 User ID:', result.id);
    console.log('⚠️ Remember to change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating first user:');
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack.split('\n').slice(0, 3).join('\n'));
      }
    } else {
      console.error('Unknown error:', error);
    }
  } finally {
    console.log('🏁 Script execution completed');
    process.exit(0);
  }
}

// Execute the function
createFirstUser();
