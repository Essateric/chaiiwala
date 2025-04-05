import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertStoreSchema, insertInventorySchema, insertMaintenanceJobSchema, insertAnnouncementSchema } from "@shared/schema";
import { z } from "zod";

// Auth middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

const hasRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  setupAuth(app);

  // Stores routes
  app.get("/api/stores", isAuthenticated, async (req, res, next) => {
    try {
      const stores = await storage.getStores();
      res.json(stores);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/stores/:id", isAuthenticated, async (req, res, next) => {
    try {
      const storeId = parseInt(req.params.id);
      const store = await storage.getStore(storeId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      res.json(store);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/stores", isAuthenticated, hasRole(['admin', 'regional_manager']), async (req, res, next) => {
    try {
      const validatedData = insertStoreSchema.parse(req.body);
      const store = await storage.createStore(validatedData);
      res.status(201).json(store);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid store data", errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/stores/:id", isAuthenticated, hasRole(['admin', 'regional_manager']), async (req, res, next) => {
    try {
      const storeId = parseInt(req.params.id);
      const validatedData = insertStoreSchema.partial().parse(req.body);
      const updatedStore = await storage.updateStore(storeId, validatedData);
      
      if (!updatedStore) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      res.json(updatedStore);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid store data", errors: error.errors });
      }
      next(error);
    }
  });

  // Store Staff routes
  app.get("/api/stores/:id/staff", isAuthenticated, async (req, res, next) => {
    try {
      const storeId = parseInt(req.params.id);
      const staff = await storage.getStoreStaff(storeId);
      res.json(staff);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/stores/:id/staff", isAuthenticated, hasRole(['admin', 'regional_manager', 'store_manager']), async (req, res, next) => {
    try {
      const storeId = parseInt(req.params.id);
      const staffData = { ...req.body, storeId };
      const newStaffAssignment = await storage.assignStaffToStore(staffData);
      res.status(201).json(newStaffAssignment);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/stores/:storeId/staff/:userId", isAuthenticated, hasRole(['admin', 'regional_manager', 'store_manager']), async (req, res, next) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const userId = parseInt(req.params.userId);
      await storage.removeStaffFromStore(storeId, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Inventory routes
  app.get("/api/stores/:id/inventory", isAuthenticated, async (req, res, next) => {
    try {
      const storeId = parseInt(req.params.id);
      const inventory = await storage.getInventory(storeId);
      res.json(inventory);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/inventory/:id", isAuthenticated, async (req, res, next) => {
    try {
      const inventoryId = parseInt(req.params.id);
      const item = await storage.getInventoryItem(inventoryId);
      
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/inventory", isAuthenticated, async (req, res, next) => {
    try {
      const validatedData = insertInventorySchema.parse(req.body);
      const item = await storage.createInventoryItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inventory data", errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/inventory/:id", isAuthenticated, async (req, res, next) => {
    try {
      const inventoryId = parseInt(req.params.id);
      const validatedData = insertInventorySchema.partial().parse(req.body);
      const updatedItem = await storage.updateInventoryItem(inventoryId, validatedData);
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inventory data", errors: error.errors });
      }
      next(error);
    }
  });

  // Maintenance routes
  app.get("/api/maintenance", isAuthenticated, async (req, res, next) => {
    try {
      const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;
      const jobs = await storage.getMaintenanceJobs(storeId);
      res.json(jobs);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/maintenance/stats", isAuthenticated, async (req, res, next) => {
    try {
      const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;
      const stats = await storage.getMaintenanceStats(storeId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/maintenance/:id", isAuthenticated, async (req, res, next) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getMaintenanceJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Maintenance job not found" });
      }
      
      res.json(job);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/maintenance", isAuthenticated, async (req, res, next) => {
    try {
      const validatedData = insertMaintenanceJobSchema.parse(req.body);
      const job = await storage.createMaintenanceJob(validatedData);
      res.status(201).json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid maintenance job data", errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/maintenance/:id", isAuthenticated, async (req, res, next) => {
    try {
      const jobId = parseInt(req.params.id);
      const validatedData = insertMaintenanceJobSchema.partial().parse(req.body);
      const updatedJob = await storage.updateMaintenanceJob(jobId, validatedData);
      
      if (!updatedJob) {
        return res.status(404).json({ message: "Maintenance job not found" });
      }
      
      res.json(updatedJob);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid maintenance job data", errors: error.errors });
      }
      next(error);
    }
  });

  // Announcements routes
  app.get("/api/announcements", isAuthenticated, async (req, res, next) => {
    try {
      const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;
      const announcements = await storage.getAnnouncements(storeId);
      res.json(announcements);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/announcements", isAuthenticated, hasRole(['admin', 'regional_manager']), async (req, res, next) => {
    try {
      const validatedData = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement(validatedData);
      res.status(201).json(announcement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid announcement data", errors: error.errors });
      }
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
