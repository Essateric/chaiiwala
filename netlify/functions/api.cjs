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
    // Admin user
    this.users.set(1, {
      id: 1,
      username: "admin",
      password: "$2b$10$sKsibAGWF4pCtxXu1a5XzOw7TKI7ElDZNUvCmwh/ZUk1lP5ylS67y", // password123
      name: "Admin User",
      email: "admin@chaiiwala.com",
      phone: "1234567890",
      role: "admin",
      storeId: null,
      createdAt: new Date().toISOString()
    });
    this.userId = 2;
    
    // Add more seed data as needed
  }
}

const storage = new MemStorage();

// ------------------------------
// Setup express app for serverless
// ------------------------------

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Auth setup
const sessionSettings = {
  secret: process.env.SESSION_SECRET || "chaiiwala-dashboard-secure-session-key",
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
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