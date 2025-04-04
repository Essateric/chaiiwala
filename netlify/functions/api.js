// Import required dependencies
import express from 'express';
import serverless from 'serverless-http';
import session from 'express-session';
import { registerRoutes } from '../../server/routes';

// Create Express app
const app = express();

// Configure Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup session (this would need to be configured appropriately for production)
app.use(session({
  secret: process.env.SESSION_SECRET || 'chaiiwala-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Register the API routes from our existing routes.ts file
registerRoutes(app);

// Export the serverless function
export const handler = serverless(app);