// Netlify serverless function for the Chaiiwala Dashboard API
import express from 'express';
import serverless from 'serverless-http';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import cors from 'cors';

// Import server setup - using Netlify-compatible modules
import { setupAuth } from '../auth';
import { registerRoutes } from '../routes';

// Create Express app
const app = express();

// Configure middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.URL || 'http://localhost:3000',
  credentials: true
}));

// Session and passport will be initialized by the setupAuth function

// Set up authentication
setupAuth(app);

// Register API routes
registerRoutes(app);

// Export the handler for Netlify Functions
export const handler = serverless(app);