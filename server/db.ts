import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon to use WebSockets
neonConfig.webSocketConstructor = ws;
// Disable patching - this is the key to fixing the WebSocket error with Neon
neonConfig.patchWebSocketPrototype = false;

// Variables to be exported
let pool: Pool | null = null;
let db: any = null;

// Create a connection handling function
const createPool = () => {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL provided - database features will be limited");
    return null;
  }
  
  return new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 10, // Reduced max connections to avoid overloading
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Increased timeout for more resilience
  });
};

// Initialize the pool
try {
  pool = createPool();
  if (pool) {
    db = drizzle(pool, { schema });
    console.log("Connected to PostgreSQL database");
  }
} catch (error) {
  console.error("Failed to connect to database:", error);
  pool = null;
  db = null;
}

export { pool, db };