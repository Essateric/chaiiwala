import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Fix for ErrorEvent which has only a getter issue
const originalWSError = ws.ErrorEvent;
ws.ErrorEvent = function ErrorEvent(error) {
  const event = new originalWSError(error);
  Object.defineProperty(event, 'message', {
    get() { return error.message; },
    set() { /* ignore */ },
    configurable: true,
  });
  return event;
};

neonConfig.webSocketConstructor = ws;

// Variables to be exported
let pool;
let db;

// Check if we have a database connection URL
if (process.env.DATABASE_URL) {
  const connectWithRetry = async (retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
      try {
        pool = new Pool({ 
          connectionString: process.env.DATABASE_URL,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });
        
        // Test the connection
        await pool.query('SELECT 1');
        db = drizzle(pool, { schema });
        console.log("Connected to PostgreSQL database");
        return true;
      } catch (error) {
        console.error(`Database connection attempt ${i + 1} failed:`, error);
        if (pool) {
          await pool.end().catch(console.error);
        }
        if (i < retries - 1) {
          console.log(`Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    return false;
  };

  if (!await connectWithRetry()) {
    console.error("Failed to connect to PostgreSQL database after retries");
    pool = null;
    db = null;
  }
} else {
  console.log("No DATABASE_URL provided - database features will be limited");
  pool = null;
  db = null;
}

export { pool, db };