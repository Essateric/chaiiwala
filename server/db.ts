import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../shared/schema';

const { Pool } = pg;

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_OMSkt9XaI8lF@ep-plain-lab-a51kvi1m.us-east-2.aws.neon.tech/neondb?sslmode=require',
});

// Create a drizzle instance using the pool and schema
export const db = drizzle(pool, { schema });