// Netlify serverless function for the Chaiiwala Dashboard API
// CommonJS version for better Netlify compatibility
const express = require('express');
const serverless = require('serverless-http');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const { scrypt, randomBytes, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const cors = require('cors');
const createMemoryStore = require('memorystore');

// Create memory store
const MemoryStore = createMemoryStore(session);

// ------------------------------
// Auth and storage in one file for Netlify
// ------------------------------

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// ------------------------------
// In-memory Storage Implementation
// ------------------------------

class MemStorage {
  constructor() {
    this.users = new Map();
    this.stores = new Map();
    this.inventory = new Map();
    this.tasks = new Map();
    this.checklists = new Map();
    this.checklistTasks = new Map();
    this.schedules = new Map();
    this.announcements = new Map();
    this.jobLogs = new Map();
    this.eventOrders = new Map();
    
    this.userId = 1;
    this.storeId = 1;
    this.inventoryId = 1;
    this.taskId = 1;
    this.checklistId = 1;
    this.checklistTaskId = 1;
    this.scheduleId = 1;
    this.announcementId = 1;
    this.jobLogId = 1;
    this.eventOrderId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Initialize with seed data
    this.seedInitialData();
  }
  
  /* All methods from the original MemStorage class would be here */
  
  // Example methods (add more from original implementation as needed)
  async getUser(id) {
    return this.users.get(id);
  }
  
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(user => 
      user.username.toLowerCase() === username.toLowerCase()
    );
  }
  
  async createUser(insertUser) {
    const id = this.userId++;
    const user = { 
      ...insertUser, 
      id,
      createdAt: new Date().toISOString()
    };
    this.users.set(id, user);
    return user;
  }
  
  // Seed data method
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

const storage = new MemStorage();

// ------------------------------
// Setup express app for serverless
// ------------------------------

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Enhanced CORS setup for Netlify environment
app.use(cors({
  origin: true, // Allow any origin when deployed
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Additional CORS headers for all browsers and environments
app.use((req, res, next) => {
  // Set to the specific origin in production, or * in development
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Trust the Netlify proxy
app.set("trust proxy", 1);

// Auth setup
const sessionSettings = {
  secret: process.env.SESSION_SECRET || "chaiiwala-dashboard-secure-session-key",
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    // Always use secure cookies when not in development
    secure: process.env.NODE_ENV !== "development",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none', // Important for cross-site requests in Netlify
    path: '/'
  }
};

app.use(session(sessionSettings));
app.use(passport.initialize());
app.use(passport.session());

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
  })
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

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// ------------------------------
// API Routes
// ------------------------------

// Auth routes
app.post("/api/register", async (req, res, next) => {
  try {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await hashPassword(req.body.password);
    const user = await storage.createUser({
      ...req.body,
      password: hashedPassword
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/login", passport.authenticate("local"), (req, res) => {
  res.status(200).json(req.user);
});

app.post("/api/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.sendStatus(200);
  });
});

app.get("/api/user", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  res.json(req.user);
});

// Add other API routes based on your original implementation
// For example:

// Users/Staff routes
app.get("/api/staff", isAuthenticated, async (req, res) => {
  try {
    const staff = await storage.getAllStaff();
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export handler function for Netlify Functions
const handler = serverless(app);
module.exports = { handler };