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
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// We can't use the file-upload package in serverless functions
// Instead we'll handle Base64 encoded images directly

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

// Enhanced session configuration for Netlify
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

// Trust the Netlify proxy
app.set("trust proxy", 1);

// Extra debugging to help diagnose session issues
console.log("Session configuration:", {
  secret: "***REDACTED***",
  nodeEnv: process.env.NODE_ENV,
  secureCookies: sessionSettings.cookie.secure,
  sameSite: sessionSettings.cookie.sameSite
});

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

// Job Logs routes
app.get("/api/joblogs", (req, res) => {
  // Filter by store if provided
  const storeId = req.query.storeId ? parseInt(req.query.storeId) : null;
  
  const joblogs = [
    { 
      id: 1, 
      title: "Broken refrigerator", 
      description: "Main refrigerator not maintaining temperature", 
      storeId: 1, 
      status: "pending", 
      priority: "high", 
      reportedBy: "Shabnam Qureshi",
      reportedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      comments: "Called maintenance, waiting for parts",
      images: []
    },
    { 
      id: 2, 
      title: "Leaky tap in kitchen", 
      description: "Water dripping from main kitchen tap", 
      storeId: 2, 
      status: "in_progress", 
      priority: "medium", 
      reportedBy: "Usman Aftab",
      reportedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      comments: "Plumber coming tomorrow",
      images: []
    },
    { 
      id: 3, 
      title: "Flickering lights in dining area", 
      description: "Several lights are flickering in the main dining area", 
      storeId: 3, 
      status: "completed", 
      priority: "low", 
      reportedBy: "Manager",
      reportedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      comments: "Electrician replaced ballasts",
      images: []
    },
    { 
      id: 4, 
      title: "POS system errors", 
      description: "Cashier terminals occasionally freezing", 
      storeId: 5, 
      status: "pending", 
      priority: "high", 
      reportedBy: "Jubayed Chowdhury",
      reportedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      comments: "IT support contacted",
      images: []
    }
  ];
  
  const result = storeId ? joblogs.filter(job => job.storeId === storeId) : joblogs;
  res.json(result);
});

app.post("/api/joblogs", (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const newJobLog = {
    id: Math.floor(Math.random() * 10000) + 100, // Generate a random ID 
    ...req.body,
    reportedBy: req.user.name,
    reportedDate: new Date().toISOString(),
    images: req.body.images || []
  };
  
  res.status(201).json(newJobLog);
});

app.put("/api/joblogs/:id", (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const id = parseInt(req.params.id);
  const updatedJobLog = {
    id,
    ...req.body,
    // Preserve reported info
    reportedBy: req.body.reportedBy,
    reportedDate: req.body.reportedDate
  };
  
  res.json(updatedJobLog);
});

// Event Orders routes
app.get("/api/event-orders", (req, res) => {
  // Filter by store if provided
  const storeId = req.query.storeId ? parseInt(req.query.storeId) : null;
  
  const eventOrders = [
    {
      id: 1,
      customerName: "Sarah Thompson",
      customerEmail: "sarah.thompson@example.com",
      customerPhone: "07700123456",
      eventName: "Corporate Meeting",
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      eventLocation: "123 Business Center, Manchester",
      products: [
        { name: "Karak Chai", quantity: 50, notes: "Half with sugar, half without" },
        { name: "Samosas", quantity: 100, notes: "Vegetarian only" }
      ],
      status: "confirmed",
      totalAmount: 425.00,
      deposit: 100.00,
      storeId: 1,
      bookedBy: "Shabnam Qureshi",
      bookedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Delivery by 10am"
    },
    {
      id: 2,
      customerName: "John Williams",
      customerEmail: "john.williams@example.com",
      customerPhone: "07700123457",
      eventName: "Wedding Reception",
      eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      eventLocation: "Grand Wedding Hall, Birmingham",
      products: [
        { name: "Masala Chai", quantity: 200, notes: "Full service with staff" },
        { name: "Mixed Sweets", quantity: 250, notes: "Including Jalebi and Gulab Jamun" }
      ],
      status: "pending",
      totalAmount: 1200.00,
      deposit: 400.00,
      storeId: 2,
      bookedBy: "Usman Aftab",
      bookedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Requires 3 staff members"
    },
    {
      id: 3,
      customerName: "Lisa Johnson",
      customerEmail: "lisa.johnson@example.com",
      customerPhone: "07700123458",
      eventName: "Birthday Party",
      eventDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      eventLocation: "Johnson Residence, Stockport",
      products: [
        { name: "Chai Latte", quantity: 30, notes: "With almond milk option" },
        { name: "Chaat Selection", quantity: 40, notes: "Assorted" }
      ],
      status: "confirmed",
      totalAmount: 350.00,
      deposit: 100.00,
      storeId: 5,
      bookedBy: "Jubayed Chowdhury",
      bookedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Residential address, call before delivery"
    }
  ];
  
  const result = storeId ? eventOrders.filter(order => order.storeId === storeId) : eventOrders;
  res.json(result);
});

app.post("/api/event-orders", (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const newEventOrder = {
    id: Math.floor(Math.random() * 10000) + 100, // Generate a random ID
    ...req.body,
    bookedBy: req.user.name,
    bookedDate: new Date().toISOString(),
    // Set default status if not provided
    status: req.body.status || "pending"
  };
  
  res.status(201).json(newEventOrder);
});

app.put("/api/event-orders/:id", (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const id = parseInt(req.params.id);
  const updatedEventOrder = {
    id,
    ...req.body,
    // Preserve booking info
    bookedBy: req.body.bookedBy,
    bookedDate: req.body.bookedDate
  };
  
  res.json(updatedEventOrder);
});

// CORS headers are already set above

// File upload endpoint for job logs
app.post("/api/upload/joblog-image", (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    // For Netlify functions, we expect base64 encoded images in the request
    const { imageData, fileName, fileType } = req.body;
    
    if (!imageData || !fileName || !fileType) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required image data, filename or file type" 
      });
    }
    
    // Generate a unique filename to prevent collisions
    const uniqueFileName = `${Date.now()}-${fileName}`;
    
    // In Netlify functions, we can't save files to disk
    // Instead, we'll return the base64 data as a data URL which can be used directly in the frontend
    const dataUrl = `data:${fileType};base64,${imageData}`;
    
    res.json({
      success: true,
      fileUrl: dataUrl,
      fileName: uniqueFileName,
      message: "Image processed successfully"
    });
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to process image", 
      error: error.message 
    });
  }
});

// Enhanced error handler with detailed logging
app.use((err, req, res, next) => {
  console.error('API Error:', err.message);
  console.error('Stack Trace:', err.stack);
  console.error('Request URL:', req.originalUrl);
  console.error('Request Method:', req.method);
  console.error('Request Body:', JSON.stringify(req.body || {}));
  
  res.status(500).json({ 
    error: err.message,
    path: req.path,
    method: req.method,
    // Don't include stack trace in production response for security
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Export the handler for Netlify Functions
export const handler = serverless(app);