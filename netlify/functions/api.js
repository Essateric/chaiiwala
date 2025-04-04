// Netlify serverless function for the Chaiiwala Dashboard API
import express from 'express';
import serverless from 'serverless-http';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import cors from 'cors';

// Import server setup
import { setupAuth } from '../../server/auth';
import { registerRoutes } from '../../server/routes';

// Create Express app
const app = express();

// Configure middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.URL || 'http://localhost:3000',
  credentials: true
}));

// Set up session
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
};

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  sessionConfig.cookie.secure = true;
}

app.use(session(sessionConfig));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Set up authentication
setupAuth(app);

// Register API routes
registerRoutes(app);

// Export the handler for Netlify Functions
export const handler = serverless(app);