// Netlify serverless function for the Chaiiwala Dashboard API
import express from 'express';
import serverless from 'serverless-http';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import cors from 'cors';
import createMemoryStore from 'memorystore';

// Create memory store
const MemoryStore = createMemoryStore(session);

// ------------------------------
// Auth and storage in one file for Netlify
// ------------------------------

const scryptAsync = promisify(scrypt);

// User storage and authentication
class MemStorage {
  constructor() {
    // Create a memory store for sessions
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize storage maps
    this.users = new Map();
    this.userId = 0;
    
    // Seed initial data
    this.seedInitialData();
  }
  
  async getUser(id) {
    return this.users.get(id);
  }
  
  async getUserByUsername(username) {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }
  
  async createUser(insertUser) {
    const id = ++this.userId;
    
    // Default values for optional fields
    const storeId = insertUser.storeId ?? null;
    const title = insertUser.title ?? null;
    const permissions = insertUser.permissions ?? null;
    const role = insertUser.role ?? "staff";
    
    const user = { 
      id, 
      username: insertUser.username,
      password: insertUser.password,
      firstName: insertUser.firstName,
      lastName: insertUser.lastName,
      name: insertUser.name,
      email: insertUser.email,
      title: title,
      role: role,
      permissions: permissions,
      storeId: storeId
    };
    
    this.users.set(id, user);
    return user;
  }
  
  seedInitialData() {
    // Common function to hash password for seeding
    const hashPassword = 'c8680ca3ea7be0ac4fef3954ccf3bb114ba12f8fab964e0a6f55ff9386c022a4f4a78e71343bd0e2213c11c86266a8c1a13d507752bdd80b492ae04a5ee9f2b6.b6e5be78c42ffc3595c7352fbd88fe9f'; // password123
    
    // Seed users
    const userData = [
      { 
        username: "shabnam", 
        password: hashPassword, 
        firstName: "Shabnam", 
        lastName: "Qureshi", 
        name: "Shabnam Qureshi", 
        email: "shabnam@chaiiwala.com", 
        title: "Director of Operations", 
        role: "admin", 
        permissions: ["all_access", "user_management", "system_settings"]
      },
      
      // Regional manager with access to all stores and highest permissions
      { 
        username: "usman", 
        password: hashPassword, 
        firstName: "Usman", 
        lastName: "Aftab", 
        name: "Usman Aftab", 
        email: "usman.aftab@chaiiwala.co.uk", 
        title: "Regional Director", 
        role: "regional", 
        permissions: ["view_all_stores", "inventory_management", "staff_scheduling", "reporting", "task_management", "all_features"]
      },
      
      // Store manager with access limited to Stockport Road store
      { 
        username: "jubayed", 
        password: hashPassword, 
        firstName: "Jubayed", 
        lastName: "Chowdhury", 
        name: "Jubayed Chowdhury", 
        email: "jubayed@chaiiwala.com", 
        title: "Store Manager", 
        role: "store", 
        storeId: 5, 
        permissions: ["manage_store", "view_inventory", "staff_scheduling"] 
      },
      
      // Original seed data with updated fields
      { 
        username: "admin", 
        password: hashPassword, 
        firstName: "Admin", 
        lastName: "User", 
        name: "Admin User", 
        email: "admin@chaiiwala.com",
        title: "System Administrator",
        role: "admin", 
        permissions: ["all_access"] 
      }
    ];
    
    userData.forEach(user => {
      this.createUser(user);
    });
  }
}

// Create the storage instance
const storage = new MemStorage();

// Password handling functions
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64));
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Create Express app
const app = express();

// Configure middleware
app.use(express.json());
app.use(cookieParser());

// Enhanced CORS configuration for Netlify deployment
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      process.env.URL,
      process.env.DEPLOY_URL,
      process.env.DEPLOY_PRIME_URL,
      'https://www.chaiiwala-dashboard.netlify.app',
      'https://chaiiwala-dashboard.netlify.app'
    ];
    
    // Allow localhost and netlify dev server in non-production
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push(
        'http://localhost:3000', 
        'http://localhost:5000', 
        'http://localhost:8888'
      );
    }
    
    console.log('CORS request from origin:', origin);
    
    // Check if the origin is allowed - more permissive for Netlify subdomain
    if (allowedOrigins.includes(origin) || 
        origin.endsWith('.netlify.app') || 
        /https?:\/\/[a-zA-Z0-9-]+--chaiiwala-dashboard\.netlify\.app/.test(origin)) {
      callback(null, true);
    } else {
      // More permissive CORS in development, but log it
      console.log('Allowing non-whitelisted origin:', origin);
      callback(null, true);
    }
  },
  credentials: true, // Critical for cookies/auth to work
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours - cache preflight request results
};

app.use(cors(corsOptions));

// Session configuration with improved security for Netlify
const sessionSettings = {
  secret: process.env.SESSION_SECRET || "chaiiwala-dashboard-secure-key-8675309",
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    // Always use secure cookies in production environment (Netlify)
    secure: process.env.NETLIFY === "true" || process.env.NODE_ENV === "production",
    httpOnly: true,
    // Use 'none' for Netlify deployment to enable cross-site cookies
    sameSite: process.env.NETLIFY === "true" ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Always set trust proxy for Netlify deployment
app.set("trust proxy", 1);

// Ensure secure cookies are set correctly for Netlify
if (process.env.NETLIFY === "true" || process.env.NODE_ENV === "production") {
  sessionSettings.cookie.secure = true;
}

app.use(session(sessionSettings));
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    } catch (error) {
      return done(error);
    }
  }),
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// ------------------------------
// API Routes
// ------------------------------

// Authentication routes with improved error handling for Netlify deployment
app.post("/api/register", async (req, res, next) => {
  try {
    // Validate input data
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ 
        message: "Username and password are required",
        status: "error"
      });
    }

    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).json({
        message: "Username already exists",
        status: "error" 
      });
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    // Remove password from response object
    const userResponse = { ...user };
    delete userResponse.password;

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json({
        message: "User registered successfully",
        user: userResponse,
        status: "success"
      });
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      message: "Failed to register user",
      error: error.message,
      status: "error"
    });
  }
});

app.post("/api/login", (req, res, next) => {
  console.log("Login attempt for username:", req.body.username);
  
  // Validate request body
  if (!req.body.username || !req.body.password) {
    console.warn("Login attempt missing username or password");
    return res.status(400).json({
      message: "Username and password are required",
      status: "error"
    });
  }
  
  // Custom passport authenticate to provide better error messages
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Login error:", err);
      return res.status(500).json({ 
        message: "Internal server error during login",
        status: "error",
        details: process.env.NODE_ENV === 'production' ? null : err.message
      });
    }
    
    if (!user) {
      console.warn(`Failed login attempt for user: ${req.body.username}`);
      return res.status(401).json({ 
        message: "Invalid username or password",
        status: "error"
      });
    }
    
    console.log(`User ${user.username} authenticated successfully, establishing session...`);
    
    req.login(user, (err) => {
      if (err) {
        console.error("Session error:", err);
        return res.status(500).json({ 
          message: "Failed to create session",
          status: "error",
          details: process.env.NODE_ENV === 'production' ? null : err.message
        });
      }
      
      // Remove password from response
      const userResponse = { ...user };
      delete userResponse.password;
      
      console.log(`Login successful for ${user.username}, session established`);
      
      // Set a custom header to confirm successful authentication
      res.header('X-Auth-Confirmed', 'true');
      
      res.status(200).json({
        message: "Login successful",
        user: userResponse,
        status: "success"
      });
    });
  })(req, res, next);
});

app.post("/api/logout", (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(200).json({ 
        message: "No active session to logout",
        status: "success"
      });
    }
    
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ 
          message: "Error during logout",
          status: "error"
        });
      }
      res.status(200).json({
        message: "Logged out successfully",
        status: "success"
      });
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ 
      message: "Failed to process logout",
      status: "error"
    });
  }
});

app.get("/api/user", (req, res) => {
  try {
    console.log("User authentication check, isAuthenticated:", req.isAuthenticated());
    
    // Log session info for debugging (without sensitive data)
    if (req.session) {
      const sessionInfo = { 
        id: req.session.id,
        cookie: { ...req.session.cookie },
        // Don't log passport data as it may contain sensitive info
        hasPassport: !!req.session.passport
      };
      console.log("Session info:", JSON.stringify(sessionInfo));
    } else {
      console.warn("No session object found");
    }
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        message: "Not authenticated",
        status: "error"
      });
    }
    
    console.log(`User data requested for: ${req.user.username}`);
    
    // Remove password from response
    const userResponse = { ...req.user };
    delete userResponse.password;
    
    // Add custom header for debugging
    res.header('X-Auth-Status', 'authenticated');
    
    res.status(200).json({
      user: userResponse,
      status: "success"
    });
  } catch (error) {
    console.error("Auth check error:", error);
    res.status(500).json({
      message: "Error retrieving user data",
      details: process.env.NODE_ENV === 'production' ? null : error.message,
      status: "error"
    });
  }
});

// Basic API routes for the Dashboard
app.get("/api/stores", (req, res) => {
  res.json([
    {
      id: 1,
      name: "Chaiiwala London Bridge", 
      address: "142 Long Lane, London SE1 4BS, United Kingdom", 
      city: "London", 
      region: "Greater London", 
      phone: "+44-20-7407-1234", 
      email: "londonbridge@chaiiwala.com", 
      openingHours: "Mon-Sat: 9am-10pm, Sun: 10am-8pm"
    },
    {
      id: 2,
      name: "Chaiiwala Birmingham", 
      address: "60-62 Ladypool Road, Birmingham B12 8JU, United Kingdom", 
      city: "Birmingham", 
      region: "West Midlands", 
      phone: "+44-121-446-5678", 
      email: "birmingham@chaiiwala.com", 
      openingHours: "Mon-Sun: 8am-11pm"
    },
    {
      id: 3,
      name: "Chaiiwala Manchester Rusholme", 
      address: "183-185 Wilmslow Road, Manchester M14 5AP, United Kingdom", 
      city: "Manchester", 
      region: "Greater Manchester", 
      phone: "+44-161-224-9012", 
      email: "manchester@chaiiwala.com", 
      openingHours: "Mon-Sun: 8am-12am"
    },
    {
      id: 4,
      name: "Chaiiwala Leicester", 
      address: "98 London Road, Leicester LE2 0QS, United Kingdom", 
      city: "Leicester", 
      region: "Leicestershire", 
      phone: "+44-116-254-3456", 
      email: "leicester@chaiiwala.com", 
      openingHours: "Mon-Sun: 9am-11pm"
    },
    {
      id: 5,
      name: "Chaiiwala Stockport Road", 
      address: "165 Stockport Road, Manchester M12 4WH, United Kingdom", 
      city: "Manchester", 
      region: "Greater Manchester", 
      phone: "+44-161-273-7890", 
      email: "stockportroad@chaiiwala.com", 
      openingHours: "Mon-Sun: 8am-11pm"
    }
  ]);
});

// Inventory routes
app.get("/api/inventory", (req, res) => {
  res.json([
    { id: 1, name: "Chai Masala", sku: "INV-001", category: "Tea & Chai", storeId: 2, quantity: "5 kg", status: "low_stock", lastUpdated: new Date() },
    { id: 2, name: "Milk", sku: "INV-002", category: "Beverages", storeId: 1, quantity: "24 liters", status: "in_stock", lastUpdated: new Date() },
    { id: 3, name: "To-Go Cups (16oz)", sku: "INV-003", category: "Packaging", storeId: 4, quantity: "150 pcs", status: "on_order", lastUpdated: new Date() },
    { id: 4, name: "Sugar", sku: "INV-004", category: "Food Ingredients", storeId: 3, quantity: "12 kg", status: "in_stock", lastUpdated: new Date() },
    { id: 5, name: "Karak Tea Bags", sku: "INV-005", category: "Tea & Chai", storeId: 5, quantity: "0 boxes", status: "out_of_stock", lastUpdated: new Date() }
  ]);
});

// Staff routes
app.get("/api/staff", (req, res) => {
  res.json([
    { id: 1, name: "Mohammed Ali", role: "staff", color: "#3b82f6" },
    { id: 2, name: "Jessica Patel", role: "staff", color: "#f43f5e" },
    { id: 3, name: "David Chen", role: "staff", color: "#14b8a6" }
  ]);
});

// Tasks routes
app.get("/api/tasks", (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  res.json([
    { id: 1, title: "Deep clean coffee machines", description: "Perform full deep cleaning", storeId: 1, assignedTo: 1, dueDate: today, status: "in_progress", priority: "high" },
    { id: 2, title: "Restock inventory", description: "Restock all low items", storeId: 2, assignedTo: 2, dueDate: today, status: "todo", priority: "medium" },
    { id: 3, title: "Staff training", description: "Train new employees", storeId: 3, assignedTo: 3, dueDate: today, status: "todo", priority: "medium" }
  ]);
});

// Today's tasks
app.get("/api/tasks/today", (req, res) => {
  res.json([
    { id: "1", title: "Deep clean coffee machines", location: "Store 1", dueDate: new Date().toISOString(), completed: false },
    { id: "2", title: "Restock inventory", location: "Store 2", dueDate: new Date().toISOString(), completed: false }
  ]);
});

// Checklists routes
app.get("/api/checklists", (req, res) => {
  res.json([
    {
      id: 1,
      title: "Morning Opening Procedures",
      description: "Tasks to complete when opening the store",
      category: "Daily Operations",
      storeId: 1,
      assignedTo: "Opening Staff",
      tasks: [
        { id: 1, title: "Turn on all equipment", checklistId: 1, completed: false },
        { id: 2, title: "Check refrigerator temperatures", checklistId: 1, completed: false },
        { id: 3, title: "Prepare chai stations", checklistId: 1, completed: true }
      ]
    },
    {
      id: 2,
      title: "Evening Closing Procedures",
      description: "Tasks to complete before closing the store",
      category: "Daily Operations",
      storeId: 1,
      assignedTo: "Closing Staff",
      tasks: [
        { id: 4, title: "Clean all equipment", checklistId: 2, completed: false },
        { id: 5, title: "Restock supplies for next day", checklistId: 2, completed: false }
      ]
    }
  ]);
});

// Schedules routes 
app.get("/api/schedules", (req, res) => {
  res.json([
    { id: "1", staffId: 1, staffName: "Mohammed Ali", role: "staff", start: "08:00", end: "16:00", day: 1 },
    { id: "2", staffId: 2, staffName: "Jessica Patel", role: "staff", start: "12:00", end: "20:00", day: 1 },
    { id: "3", staffId: 3, staffName: "David Chen", role: "staff", start: "15:00", end: "23:00", day: 1 }
  ]);
});

// Announcements routes
app.get("/api/announcements", (req, res) => {
  res.json([
    {
      id: 1,
      title: "New Summer Menu Items",
      content: "We're excited to announce our new summer menu featuring refreshing mango lassi, cold brew chai, and summer berry desserts. Training materials are available in the staff portal.",
      category: "Menu Update",
      author: "Head Office",
      date: new Date(),
      important: true,
      likes: 5
    },
    {
      id: 2,
      title: "Upcoming Bank Holiday Hours",
      content: "Please note that all locations will operate on reduced hours (10am-6pm) during the upcoming bank holiday on August 28. Please adjust staff schedules accordingly.",
      category: "Operational",
      author: "Operations Team",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      important: false,
      likes: 3
    }
  ]);
});

// Recent announcements
app.get("/api/announcements/recent", (req, res) => {
  res.json([
    { id: "1", title: "New Summer Menu Items", description: "We're excited to announce our new summer menu...", date: "just now", isHighlighted: true },
    { id: "2", title: "Upcoming Bank Holiday Hours", description: "Please note that all locations will operate on reduced hours...", date: "5 days ago", isHighlighted: false }
  ]);
});

// Enhanced error handling for Netlify Functions
app.use((err, req, res, next) => {
  // Log the error with more context for debugging
  console.error(`Netlify Function Error [${req.method} ${req.path}]:`, err);
  
  // Determine if this is an authentication error
  let statusCode = 500;
  let errorMessage = "Internal server error";
  
  if (err.name === 'AuthenticationError' || err.message.includes('authentication')) {
    statusCode = 401;
    errorMessage = "Authentication failed";
  } else if (err.name === 'ValidationError' || err.message.includes('validation')) {
    statusCode = 400;
    errorMessage = "Validation error";
  }
  
  // Send a structured error response
  res.status(statusCode).json({
    status: "error",
    message: errorMessage,
    details: process.env.NODE_ENV === 'production' ? null : err.message,
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Debug route to check authentication status and session details
app.get("/api/auth-test", (req, res) => {
  try {
    // Don't require authentication for this route
    const authStatus = {
      isAuthenticated: req.isAuthenticated(),
      timestamp: new Date().toISOString(),
      hasSession: !!req.session,
      hasPassport: !!(req.session && req.session.passport),
      cookies: req.headers.cookie ? "Present" : "None",
      // Safe environment info that doesn't expose sensitive data
      env: {
        isNetlify: !!process.env.NETLIFY,
        isProduction: process.env.NODE_ENV === 'production',
        host: req.get('host'),
        origin: req.get('origin'),
        referer: req.get('referer')
      }
    };
    
    // If authenticated, add safe user info
    if (req.isAuthenticated() && req.user) {
      authStatus.user = {
        id: req.user.id,
        username: req.user.username,
        name: req.user.name,
        role: req.user.role
      };
    }
    
    res.status(200).json({
      status: "success",
      message: "Authentication test",
      data: authStatus
    });
  } catch (error) {
    console.error("Auth test error:", error);
    res.status(500).json({
      status: "error",
      message: "Error during authentication test",
      details: error.message
    });
  }
});

// Add a catch-all route for debugging purposes
app.all('*', (req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route not found: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// Export the handler for Netlify Functions with improved error handling wrapper
export const handler = async (event, context) => {
  // Log incoming requests in production for debugging authentication issues
  console.log(`Netlify Function Request: ${event.httpMethod} ${event.path}`);
  
  // Log headers without sensitive information for debugging CORS and cookies
  const safeHeaders = { ...event.headers };
  if (safeHeaders.cookie) safeHeaders.cookie = "REDACTED";
  if (safeHeaders.authorization) safeHeaders.authorization = "REDACTED";
  console.log('Request headers:', JSON.stringify(safeHeaders));
  
  // For improved debugging on Netlify
  if (event.body) {
    try {
      // Only log non-sensitive information from the body
      const bodyData = JSON.parse(event.body);
      if (bodyData) {
        const safeBody = { ...bodyData };
        if (safeBody.password) safeBody.password = "REDACTED";
        console.log('Request body (safe):', JSON.stringify(safeBody));
      }
    } catch (e) {
      // If body is not JSON, don't log it
      console.log('Request has non-JSON body');
    }
  }
  
  // Needed for proper path handling in Netlify Functions
  // This handles the case where the request is coming to /.netlify/functions/api/login
  // by modifying the path to be /api/login which Express can handle
  if (event.path.startsWith('/.netlify/functions/api')) {
    const originalPath = event.path;
    event.path = event.path.replace('/.netlify/functions/api', '/api') || '/api';
    console.log(`Rewriting path: ${originalPath} -> ${event.path}`);
    
    // Also fix the rawPath if it exists (used in some Netlify environments)
    if (event.rawPath) {
      event.rawPath = event.rawPath.replace('/.netlify/functions/api', '/api') || '/api';
    }
  }
  
  // Return the serverless handler with proper error handling
  try {
    return await serverless(app)(event, context);
  } catch (error) {
    console.error('Serverless handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'Internal server error in Netlify function',
        error: process.env.NODE_ENV === 'production' ? 'Server error' : error.message
      })
    };
  }
};