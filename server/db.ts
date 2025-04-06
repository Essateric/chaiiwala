import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Log database connection status
console.log(`Database connection: ${process.env.DATABASE_URL ? 'Available' : 'Not available'}`);

// Setup database connection if DATABASE_URL is available
let pool;
let db;

try {
  if (process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    console.log("Database connection established successfully");
  } else {
    console.log("No DATABASE_URL provided - using in-memory storage instead");
  }
} catch (error) {
  console.error("Error connecting to database:", error);
  console.log("Falling back to in-memory storage");
}

export { pool, db };
