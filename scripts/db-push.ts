import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as schema from '../shared/schema';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const { Pool } = pg;

// This script creates all the database tables based on the schema
async function main() {
  console.log('Connecting to database...');
  
  const DATABASE_URL = 'postgresql://neondb_owner:npg_OMSkt9XaI8lF@ep-plain-lab-a51kvi1m.us-east-2.aws.neon.tech/neondb?sslmode=require';
  
  // Set the environment variable for drizzle-kit
  process.env.DATABASE_URL = DATABASE_URL;
  
  // Generate migrations
  console.log('Generating migrations...');
  try {
    const { stdout, stderr } = await execAsync('npx drizzle-kit generate:pg');
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error('Error generating migrations:', error);
    return;
  }
  
  // Push schema to database
  console.log('Pushing schema to database...');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });
  
  const db = drizzle(pool, { schema });
  
  try {
    // Push the schema directly without migrations for simplicity
    console.log('Applying schema to database...');
    try {
      const { stdout, stderr } = await execAsync('npx drizzle-kit push:pg');
      console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (error) {
      console.error('Error pushing schema:', error);
      return;
    }
    
    console.log('Database schema created successfully');
    
    // Import DatabaseStorage to seed initial data
    const { DatabaseStorage } = await import('../server/database-storage');
    const storage = new DatabaseStorage();
    
    console.log('Seeding initial data...');
    await storage.seedInitialData();
    
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });