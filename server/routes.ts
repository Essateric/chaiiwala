import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertStoreSchema, 
  insertInventorySchema, 
  insertTaskSchema,
  insertChecklistSchema,
  insertChecklistTaskSchema,
  insertScheduleSchema,
  insertAnnouncementSchema,
  insertJobLogSchema,
  taskStatusEnum,
  priorityEnum,
  inventoryStatusEnum,
  jobFlagEnum
} from "@shared/schema";

// Helper middleware to check if user is authenticated
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Helper middleware to check if user has required role
const hasRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && roles.includes(req.user.role)) {
      return next();
    }
    res.status(403).json({ message: "Forbidden: insufficient permissions" });
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Redirect root to auth page for easier access
  app.get("/", (req, res) => {
    if (!req.isAuthenticated()) {
      res.redirect("/auth");
    } else {
      // If already authenticated, let the client handle it
      res.redirect("/dashboard");
    }
  });

  // Stores
  app.get("/api/stores", isAuthenticated, async (req, res) => {
    const stores = await storage.getAllStores();
    res.json(stores);
  });

  app.post("/api/stores", isAuthenticated, hasRole(["admin", "regional"]), async (req, res) => {
    try {
      const storeData = insertStoreSchema.parse(req.body);
      const store = await storage.createStore(storeData);
      res.status(201).json(store);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create store" });
      }
    }
  });

  app.get("/api/stores/:id", isAuthenticated, async (req, res) => {
    const store = await storage.getStore(parseInt(req.params.id));
    if (store) {
      res.json(store);
    } else {
      res.status(404).json({ message: "Store not found" });
    }
  });

  // Inventory
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    const inventory = await storage.getAllInventory();
    res.json(inventory);
  });

  app.post("/api/inventory", isAuthenticated, hasRole(["admin", "regional", "store"]), async (req, res) => {
    try {
      const inventoryData = insertInventorySchema.parse(req.body);
      const item = await storage.createInventoryItem(inventoryData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create inventory item" });
      }
    }
  });

  app.patch("/api/inventory/:id", isAuthenticated, hasRole(["admin", "regional", "store"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedItem = await storage.updateInventoryItem(id, req.body);
      if (updatedItem) {
        res.json(updatedItem);
      } else {
        res.status(404).json({ message: "Inventory item not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  // Tasks
  app.get("/api/tasks", isAuthenticated, async (req, res) => {
    const tasks = await storage.getAllTasks();
    res.json(tasks);
  });
  
  app.get("/api/tasks/today", isAuthenticated, async (req, res) => {
    const tasks = await storage.getTodayTasks();
    res.json(tasks);
  });

  app.post("/api/tasks", isAuthenticated, hasRole(["admin", "regional", "store"]), async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create task" });
      }
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedTask = await storage.updateTask(id, req.body);
      if (updatedTask) {
        res.json(updatedTask);
      } else {
        res.status(404).json({ message: "Task not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Checklists
  app.get("/api/checklists", isAuthenticated, async (req, res) => {
    const checklists = await storage.getAllChecklists();
    res.json(checklists);
  });

  app.post("/api/checklists", isAuthenticated, hasRole(["admin", "regional", "store"]), async (req, res) => {
    try {
      const checklistData = insertChecklistSchema.parse(req.body);
      const checklist = await storage.createChecklist(checklistData);
      res.status(201).json(checklist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create checklist" });
      }
    }
  });

  app.patch("/api/checklists/:checklistId/tasks/:taskId", isAuthenticated, async (req, res) => {
    try {
      const checklistId = parseInt(req.params.checklistId);
      const taskId = parseInt(req.params.taskId);
      const { completed } = req.body;
      
      const updatedTask = await storage.updateChecklistTask(checklistId, taskId, completed);
      if (updatedTask) {
        res.json(updatedTask);
      } else {
        res.status(404).json({ message: "Checklist task not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update checklist task" });
    }
  });

  // Staff Schedule
  app.get("/api/schedule/shifts", isAuthenticated, async (req, res) => {
    const shifts = await storage.getAllSchedules();
    res.json(shifts);
  });

  app.post("/api/schedule/shifts", isAuthenticated, hasRole(["admin", "regional", "store"]), async (req, res) => {
    try {
      const scheduleData = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule(scheduleData);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create schedule" });
      }
    }
  });

  app.delete("/api/schedule/shifts/:id", isAuthenticated, hasRole(["admin", "regional", "store"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSchedule(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

  // Staff
  app.get("/api/staff", isAuthenticated, async (req, res) => {
    const staff = await storage.getAllStaff();
    res.json(staff);
  });

  // Announcements
  app.get("/api/announcements", isAuthenticated, async (req, res) => {
    const announcements = await storage.getAllAnnouncements();
    res.json(announcements);
  });
  
  app.get("/api/announcements/recent", isAuthenticated, async (req, res) => {
    const announcements = await storage.getRecentAnnouncements();
    res.json(announcements);
  });

  app.post("/api/announcements", isAuthenticated, hasRole(["admin", "regional", "store"]), async (req, res) => {
    try {
      const announcementData = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement(announcementData);
      res.status(201).json(announcement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create announcement" });
      }
    }
  });

  app.post("/api/announcements/:id/like", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedAnnouncement = await storage.likeAnnouncement(id);
      if (updatedAnnouncement) {
        res.json(updatedAnnouncement);
      } else {
        res.status(404).json({ message: "Announcement not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to like announcement" });
    }
  });

  // Locations (for dropdown selections)
  app.get("/api/locations", isAuthenticated, async (req, res) => {
    const stores = await storage.getAllStores();
    const locations = stores.map(store => ({
      id: store.id,
      name: store.name
    }));
    res.json(locations);
  });

  // Job Logs
  app.get("/api/joblogs", isAuthenticated, async (req, res) => {
    const jobLogs = await storage.getAllJobLogs();
    res.json(jobLogs);
  });

  app.get("/api/joblogs/store/:storeId", isAuthenticated, async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    const jobLogs = await storage.getJobLogsByStore(storeId);
    res.json(jobLogs);
  });

  app.get("/api/joblogs/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const jobLog = await storage.getJobLog(id);
    if (jobLog) {
      res.json(jobLog);
    } else {
      res.status(404).json({ message: "Job log not found" });
    }
  });

  app.post("/api/joblogs", isAuthenticated, hasRole(["admin", "regional", "store", "staff"]), async (req, res) => {
    try {
      const jobLogData = insertJobLogSchema.parse(req.body);
      const jobLog = await storage.createJobLog(jobLogData);
      res.status(201).json(jobLog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create job log" });
      }
    }
  });

  app.patch("/api/joblogs/:id", isAuthenticated, hasRole(["admin", "regional", "store"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedJobLog = await storage.updateJobLog(id, req.body);
      if (updatedJobLog) {
        res.json(updatedJobLog);
      } else {
        res.status(404).json({ message: "Job log not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update job log" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
