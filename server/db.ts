import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, lanes, bids, roleEnum, statusEnum, vehicleTypeEnum } from '@shared/schema';

// Create a PostgreSQL connection
const connectionString = process.env.DATABASE_URL || '';
const client = postgres(connectionString, { max: 1 });
export const db = drizzle(client);

// Initialize the database with seed data
export async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Create tables by running migrations
    await createTables();
    
    // Check if we have any users, if not, create default users
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length === 0) {
      console.log('Creating default users...');
      // Create admin user
      await db.insert(users).values({
        username: 'admin',
        password: 'admin123',
        companyName: 'Admin Company',
        role: 'admin'
      });
      
      // Create freight forwarder user
      await db.insert(users).values({
        username: 'user',
        password: 'user123',
        companyName: 'Freight Co.',
        role: 'forwarder'
      });
    }
    
    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Create database tables using direct SQL
async function createTables() {
  try {
    // Create enums first
    await client`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
          CREATE TYPE role AS ENUM ('admin', 'forwarder');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status') THEN
          CREATE TYPE status AS ENUM ('active', 'archived', 'ending_soon');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_type') THEN
          CREATE TYPE vehicle_type AS ENUM ('40t', '12t', 'van');
        END IF;
      END
      $$;
    `;
    
    // Create users table
    await client`
      DROP TABLE IF EXISTS bids;
      DROP TABLE IF EXISTS lanes;
      DROP TABLE IF EXISTS users;
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        company_name TEXT NOT NULL,
        role role NOT NULL DEFAULT 'forwarder'
      )
    `;
    
    // Create lanes table
    await client`
      CREATE TABLE IF NOT EXISTS lanes (
        id SERIAL PRIMARY KEY,
        bid_name TEXT NOT NULL,
        status status NOT NULL DEFAULT 'active',
        vehicle_type vehicle_type NOT NULL,
        loading_location TEXT NOT NULL,
        unloading_location TEXT NOT NULL,
        valid_from TIMESTAMP NOT NULL,
        valid_until TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER NOT NULL REFERENCES users(id)
      )
    `;
    
    // Create bids table
    await client`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        lane_id INTEGER NOT NULL REFERENCES lanes(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('Tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}