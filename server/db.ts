import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@shared/schema';

// In production, we should ideally use pooled connections for better performance
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not defined in environment variables");
  process.exit(1);
}

// Configure neon client
neonConfig.fetchOptions = {
  cache: 'no-store',
};

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL);

// Create a database instance with the client and schema
export const db = drizzle(sql, { schema });
