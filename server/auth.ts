import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function setupAuth(app: Express) {
  // Create admin user with simple password if it doesn't exist
  const existingAdmin = await storage.getUserByUsername("admin");
  if (!existingAdmin) {
    console.log("Creating admin user with simple password");
    const simplePassword = await hashPassword("password123");
    await storage.createUser({
      username: "admin",
      password: simplePassword,
      name: "Admin User",
      role: "admin",
      email: "admin@chaiiwala.com"
    });
  }

  // Create test users with simple password if they don't exist
  const testUsers = [
    { username: "shabnam", name: "Shabnam Essa", role: "admin" as const, email: "shabnam@chaiiwala.com" },
    { username: "usman", name: "Usman Aftab", role: "regional" as const, email: "usman@chaiiwala.com" },
    { username: "jubayed", name: "Jubayed Chowdhury", role: "store" as const, storeId: 5, email: "jubayed@chaiiwala.com" }
  ];

  for (const user of testUsers) {
    const existingUser = await storage.getUserByUsername(user.username);
    if (!existingUser) {
      console.log(`Creating test user ${user.username} with simple password`);
      const simplePassword = await hashPassword("password123");
      await storage.createUser({
        ...user,
        password: simplePassword
      });
    }
  }

  // Use session store from storage
  const sessionStore = storage.sessionStore;

  // Configure session middleware
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "chaiiwala-dashboard-secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.log(`Login failed: User '${username}' not found`);
          return done(null, false, { message: 'Invalid username or password' });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          console.log(`Login failed: Invalid password for user '${username}'`);
          return done(null, false, { message: 'Invalid username or password' });
        }

        console.log(`User '${username}' logged in successfully`);
        return done(null, user);
      } catch (error) {
        console.error('Login error:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`Deserialization failed: User with ID ${id} not found`);
        return done(null, false);
      }
      return done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  // Auth Routes
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('Register attempt:', req.body.username);
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log(`Registration failed: Username '${req.body.username}' already exists`);
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      console.log(`User '${user.username}' registered successfully`);
      req.login(user, (err) => {
        if (err) {
          console.error('Login after registration failed:', err);
          return next(err);
        }
        res.status(201).json({
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
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
    console.log('Login attempt:', req.body.username);
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }
      if (!user) {
        console.log('Login failed:', info?.message || 'Authentication failed');
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
      }
      req.login(user, (err) => {
        if (err) {
          console.error('Session creation error:', err);
          return next(err);
        }
        console.log(`User '${user.username}' logged in successfully`);
        return res.json({
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          storeId: user.storeId
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    if (req.user) {
      console.log(`User '${(req.user as any).username}' logged out`);
    }
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('User data requested but not authenticated');
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const user = req.user as SelectUser;
    console.log(`User data requested for '${user.username}'`);
    
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      storeId: user.storeId
    });
  });
}
