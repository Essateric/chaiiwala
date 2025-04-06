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
app.use(cors({
  origin: process.env.URL || true, // Allow any origin in development
  credentials: true
}));

// Session configuration
const sessionSettings = {
  secret: process.env.SESSION_SECRET || "chaiiwala-dashboard-secret",
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
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

// Authentication routes
app.post("/api/register", async (req, res, next) => {
  try {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
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
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  res.json(req.user);
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

// Simple error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// Export the handler for Netlify Functions
export const handler = serverless(app);