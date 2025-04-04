// Netlify-compatible routes
import { storage } from "./storage";
import { createServer } from "http";

// Simplified routes for Netlify serverless functions
export function registerRoutes(app) {
  // Get all stores
  app.get("/api/stores", async (req, res) => {
    try {
      const stores = await storage.getAllStores();
      res.json(stores);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all inventory
  app.get("/api/inventory", async (req, res) => {
    try {
      const inventory = await storage.getAllInventory();
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create inventory item
  app.post("/api/inventory", async (req, res) => {
    try {
      const item = await storage.createInventoryItem(req.body);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update inventory item
  app.patch("/api/inventory/:id", async (req, res) => {
    try {
      const item = await storage.updateInventoryItem(parseInt(req.params.id), req.body);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get today's tasks
  app.get("/api/tasks/today", async (req, res) => {
    try {
      const tasks = await storage.getTodayTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create task
  app.post("/api/tasks", async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update task
  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateTask(parseInt(req.params.id), req.body);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all checklists
  app.get("/api/checklists", async (req, res) => {
    try {
      const checklists = await storage.getAllChecklists();
      res.json(checklists);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create checklist
  app.post("/api/checklists", async (req, res) => {
    try {
      const checklist = await storage.createChecklist(req.body);
      res.status(201).json(checklist);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create checklist task
  app.post("/api/checklists/tasks", async (req, res) => {
    try {
      const task = await storage.createChecklistTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update checklist task
  app.patch("/api/checklists/:checklistId/tasks/:taskId", async (req, res) => {
    try {
      const { completed } = req.body;
      const task = await storage.updateChecklistTask(
        parseInt(req.params.checklistId),
        parseInt(req.params.taskId),
        completed
      );
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all schedules
  app.get("/api/schedules", async (req, res) => {
    try {
      const schedules = await storage.getAllSchedules();
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create schedule
  app.post("/api/schedules", async (req, res) => {
    try {
      const schedule = await storage.createSchedule(req.body);
      res.status(201).json(schedule);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete schedule
  app.delete("/api/schedules/:id", async (req, res) => {
    try {
      await storage.deleteSchedule(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all announcements
  app.get("/api/announcements", async (req, res) => {
    try {
      const announcements = await storage.getAllAnnouncements();
      res.json(announcements);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get recent announcements
  app.get("/api/announcements/recent", async (req, res) => {
    try {
      const announcements = await storage.getRecentAnnouncements();
      res.json(announcements);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create announcement
  app.post("/api/announcements", async (req, res) => {
    try {
      const announcement = await storage.createAnnouncement(req.body);
      res.status(201).json(announcement);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Like announcement
  app.post("/api/announcements/:id/like", async (req, res) => {
    try {
      const announcement = await storage.likeAnnouncement(parseInt(req.params.id));
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all staff
  app.get("/api/staff", async (req, res) => {
    try {
      const staff = await storage.getAllStaff();
      res.json(staff);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Creating a server for serverless env
  const httpServer = createServer(app);
  return httpServer;
}