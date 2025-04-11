import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Variables to be exported
let pool;
let db;

// Check if we have a database connection URL
if (process.env.DATABASE_URL) {
  try {
    // Use PostgreSQL connection if DATABASE_URL is available
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    console.log("Connected to PostgreSQL database");
  } catch (error) {
    console.error("Failed to connect to PostgreSQL database:", error);
    pool = null;
    db = null;
  }
} else {
  console.log("No DATABASE_URL provided - database features will be limited");
  pool = null;
  db = null;
}

export { pool, db };