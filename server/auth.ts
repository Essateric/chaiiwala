import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

// Define test users with fixed passwords for debugging
const TEST_USERS = [
  { username: "shabnam", password: "password123", firstName: "Shabnam", lastName: "Essa", name: "Shabnam Essa", role: "admin", email: "shabnam@chaiiwala.com" },
  { username: "usman", password: "password123", firstName: "Usman", lastName: "Aftab", name: "Usman Aftab", role: "regional", email: "usman@chaiiwala.com" },
  { username: "jubayed", password: "password123", firstName: "Jubayed", lastName: "Chowdhury", name: "Jubayed Chowdhury", role: "store", storeId: 5, email: "jubayed@chaiiwala.com" },
  { username: "imran", password: "password123", firstName: "Imran", lastName: "Khan", name: "Imran Khan", role: "store", storeId: 2, email: "imran@chaiiwala.com" },
  { username: "zahra", password: "password123", firstName: "Zahra", lastName: "Mahmood", name: "Zahra Mahmood", role: "store", storeId: 3, email: "zahra@chaiiwala.com" }
];

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  console.log("Setting up authentication...");
  
  // Use session store from storage
  const sessionStore = storage.sessionStore;

  // Configure session middleware
  const sessionSettings: session.SessionOptions = {
    secret: "chaiiwala-dashboard-secret-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Create test users if they don't exist
  setTimeout(async () => {
    for (const testUser of TEST_USERS) {
      const existingUser = await storage.getUserByUsername(testUser.username);
      if (!existingUser) {
        console.log(`Creating test user: ${testUser.username}`);
        await storage.createUser({
          ...testUser
        });
      }
    }
    console.log("Test users ready");
  }, 1000);
  
  // Simple password verification strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt for: ${username}`);
        
        // Get user from storage
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        // For test users, verify with fixed passwords
        if (TEST_USERS.some(u => u.username === username)) {
          if (password === "password123") {
            console.log(`Test user authenticated: ${username}`);
            return done(null, user);
          }
        } else {
          // For normal users, verify against stored password
          if (password === user.password) {
            console.log(`User authenticated: ${username}`);
            return done(null, user);
          }
        }
        
        console.log(`Invalid password for: ${username}`);
        return done(null, false, { message: 'Invalid username or password' });
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`User not found for ID: ${id}`);
        return done(null, false);
      }
      return done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      return done(error);
    }
  });

  // Auth Routes
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log(`Registration attempt: ${req.body.username}`);
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        
        console.log(`User registered: ${user.username}`);
        res.status(201).json({
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          storeId: user.storeId
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log(`Login attempt: ${req.body.username}`);
    
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }
      
      if (!user) {
        console.log(`Login failed for ${req.body.username}: ${info?.message}`);
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return next(err);
        }
        
        console.log(`Login successful: ${user.username}`);
        return res.json({
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          storeId: user.storeId
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const username = req.user ? (req.user as any).username : 'Unknown';
    console.log(`Logout: ${username}`);
    
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('User data requested but not authenticated');
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const user = req.user as SelectUser;
    console.log(`User data requested for: ${user.username}`);
    
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      storeId: user.storeId
    });
  });
}
