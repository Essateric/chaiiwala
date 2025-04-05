import { db, pool } from '../server/db';
import { managerDetails, users, stores, accessLevelEnum } from '../shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function convertAccessLevelToRole(level: string) {
  if (level === 'Shop Limited Access') return 'staff' as const;
  if (level === 'Senior Manager Access') return 'store' as const;
  if (level === 'Admin Access') return 'admin' as const;
  return 'staff' as const;
}

interface ManagerCSVRow {
  manager_name: string;
  email_address: string;
  phone_number: string;
  assigned_shop: string;
  access_level: string;
  date_of_joining: string;
  last_login_date: string;
}

async function importManagers() {
  try {
    // Read the CSV file
    const fileContent = fs.readFileSync('../attached_assets/managers.csv', { encoding: 'utf-8' });
    
    // Parse the CSV data
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    }) as ManagerCSVRow[];

    console.log('Found', records.length, 'manager records');

    // Process each manager
    for (const record of records) {
      const nameParts = record.manager_name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      const username = record.email_address.split('@')[0];

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUser) {
        console.log(`User ${username} already exists, skipping`);
        continue;
      }

      // Get the store ID
      const storeName = record.assigned_shop;
      const store = await db.select().from(stores).where(eq(stores.name, storeName)).limit(1);
      const storeId = store.length > 0 ? store[0].id : null;
      
      if (!storeId) {
        console.log(`Store ${storeName} not found, manager will not be associated with a store`);
      } else {
        console.log(`Found store ID ${storeId} for ${storeName}`);
      }

      // Determine role from access level
      const userRole = await convertAccessLevelToRole(record.access_level);

      // Create user
      console.log(`Creating user ${username} with role ${userRole} for store ${storeName}`);
      const hashedPassword = await hashPassword('password123');
      
      const [user] = await db.insert(users)
        .values({
          username,
          password: hashedPassword,
          firstName,
          lastName,
          name: record.manager_name,
          email: record.email_address,
          title: "Manager",
          role: userRole,
          storeId
        })
        .returning();

      if (!user) {
        console.log(`Failed to create user ${username}`);
        continue;
      }

      // Create manager details using SQL directly with the pool
      await pool.query(
        `INSERT INTO manager_details (user_id, phone_number, access_level, date_of_joining, last_login_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, record.phone_number, record.access_level, record.date_of_joining, record.last_login_date]
      );

      console.log(`Created manager details for ${username}`);
    }

    console.log('Import complete');
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    process.exit(0);
  }
}

importManagers();