import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertMaintenanceJobSchema, updateMaintenanceJobSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Stores routes
  app.get("/api/stores", async (req, res, next) => {
    try {
      const stores = await storage.getAllStores();
      res.json(stores);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/stores/:id", async (req, res, next) => {
    try {
      const storeId = parseInt(req.params.id);
      if (isNaN(storeId)) {
        return res.status(400).json({ message: "Invalid store ID" });
      }
      
      const store = await storage.getStore(storeId);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      res.json(store);
    } catch (error) {
      next(error);
    }
  });

  // Maintenance jobs routes
  app.get("/api/maintenance-jobs", async (req, res, next) => {
    try {
      const storeId = req.query.storeId ? parseInt(req.query.storeId as string) : undefined;
      if (req.query.storeId && isNaN(storeId!)) {
        return res.status(400).json({ message: "Invalid store ID" });
      }
      
      const jobs = await storage.getMaintenanceJobs(storeId);
      res.json(jobs);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/maintenance-jobs/:id", async (req, res, next) => {
    try {
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      
      const job = await storage.getMaintenanceJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Maintenance job not found" });
      }
      
      res.json(job);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/maintenance-jobs", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const result = insertMaintenanceJobSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid job data", errors: result.error.format() });
      }
      
      const job = await storage.createMaintenanceJob(result.data);
      res.status(201).json(job);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/maintenance-jobs/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const jobId = parseInt(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      
      const result = updateMaintenanceJobSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid job data", errors: result.error.format() });
      }
      
      const updatedJob = await storage.updateMaintenanceJob(jobId, result.data);
      if (!updatedJob) {
        return res.status(404).json({ message: "Maintenance job not found" });
      }
      
      res.json(updatedJob);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
