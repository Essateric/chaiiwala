import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { UploadedFile } from "express-fileupload";
import { 
  insertStoreSchema, 
  insertInventorySchema, 
  insertTaskSchema,
  insertChecklistSchema,
  insertChecklistTaskSchema,
  insertScheduleSchema,
  insertAnnouncementSchema,
  insertJobLogSchema,
  insertJobLogCommentSchema,
  insertEventOrderSchema,
  insertPermissionSchema,
  insertStockCategorySchema,
  insertMaintenanceCategorySchema,
  insertMaintenanceSubcategorySchema,
  insertUserNotificationSchema,
  taskStatusEnum,
  priorityEnum,
  inventoryStatusEnum,
  jobFlagEnum,
  eventStatusEnum,
  accessLevelEnum,
  InsertJobLogComment
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

  // User management routes
  app.patch("/api/users/:id", isAuthenticated, hasRole(["admin", "regional"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.updateUser(userId, req.body);
      
      if (user) {
        console.log(`Updated user ${userId}:`, req.body);
        res.json({ success: true, user });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Auth test endpoint for debugging Netlify deployments
  app.get("/api/auth-test", (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user || null,
      sessionID: req.sessionID,
      cookies: req.headers.cookie,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isNetlify: !!process.env.NETLIFY
      }
    });
  });

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
    // If storeId is provided as a query parameter, filter checklists by store
    if (req.query.storeId) {
      const storeId = parseInt(req.query.storeId as string);
      const allChecklists = await storage.getAllChecklists();
      const filteredChecklists = allChecklists.filter(checklist => checklist.storeId === storeId);
      res.json(filteredChecklists);
    } else {
      const checklists = await storage.getAllChecklists();
      res.json(checklists);
    }
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
      
      // If task is being marked as completed, record who completed it and when
      const completedData = completed ? {
        completedAt: new Date(),
        completedBy: req.user?.username || 'Unknown user'
      } : {};
      
      const updatedTask = await storage.updateChecklistTask(checklistId, taskId, completed, completedData);
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
  
  app.get("/api/staff/store/:storeId", isAuthenticated, async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    const staff = await storage.getStaffByStore(storeId);
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
  
  // Job log comments and notifications are defined later in the file

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

  // Job log comments
  app.get("/api/joblogs/:jobLogId/comments", isAuthenticated, async (req, res) => {
    try {
      const jobLogId = parseInt(req.params.jobLogId);
      const comments = await storage.getJobLogComments(jobLogId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job log comments" });
    }
  });

  app.post("/api/joblogs/:jobLogId/comments", isAuthenticated, async (req, res) => {
    try {
      const jobLogId = parseInt(req.params.jobLogId);
      const { comment, mentionedUsers } = req.body;
      
      if (!comment || !comment.trim()) {
        return res.status(400).json({ message: "Comment text is required" });
      }
      
      // Check if req.user is available (should be due to isAuthenticated middleware)
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const commentData: InsertJobLogComment = {
        jobLogId: jobLogId,
        comment: comment.trim(),
        commentedBy: req.user.id
      };
      
      const newComment = await storage.createJobLogComment(commentData);
      
      // Process notifications for mentioned users if any
      if (mentionedUsers && mentionedUsers.length > 0) {
        const jobLog = await storage.getJobLog(jobLogId);
        
        if (jobLog) {
          for (const userId of mentionedUsers) {
            // Don't create notification for the commenter themselves
            if (userId !== req.user.id) {
              await storage.createNotification({
                userId: parseInt(userId),
                title: `You were mentioned in a comment`,
                message: `${req.user.name} mentioned you in a comment on "${jobLog.title}"`,
                sourceType: 'mention',
                sourceId: jobLogId,
                read: false
              });
            }
          }
        }
      }
      
      res.status(201).json(newComment);
    } catch (error) {
      console.error("Error adding job log comment:", error);
      res.status(500).json({ message: "Failed to add comment" });
    }
  });
  
  // User notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user!.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(id);
      if (notification) {
        res.json(notification);
      } else {
        res.status(404).json({ message: "Notification not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });
  
  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteNotification(id);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Notification not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });
  
  // Upload image for job log
  app.post("/api/upload/joblog-image", isAuthenticated, async (req: Request, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "No file was uploaded" });
      }

      const uploadedFile = req.files.image as UploadedFile;
      
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
      if (!allowedTypes.includes(uploadedFile.mimetype)) {
        return res.status(400).json({ 
          message: "Invalid file type. Only JPG, PNG, and GIF images are allowed." 
        });
      }

      // Generate unique filename
      const fileName = `${uuidv4()}${path.extname(uploadedFile.name)}`;
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const uploadPath = path.join(uploadsDir, fileName);

      // Move the file to the uploads directory
      await uploadedFile.mv(uploadPath);

      // Return the URL path to the uploaded file
      const fileUrl = `/uploads/${fileName}`;
      res.json({ 
        success: true, 
        fileUrl,
        message: "File uploaded successfully" 
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file", error: (error as Error).message });
    }
  });

  // Serve uploaded files
  app.get("/uploads/:fileName", (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
    res.sendFile(filePath);
  });

  // Event Orders
  app.get("/api/event-orders", isAuthenticated, async (req, res) => {
    const eventOrders = await storage.getAllEventOrders();
    res.json(eventOrders);
  });

  app.get("/api/event-orders/store/:storeId", isAuthenticated, async (req, res) => {
    const storeId = parseInt(req.params.storeId);
    const eventOrders = await storage.getEventOrdersByStore(storeId);
    res.json(eventOrders);
  });

  app.get("/api/event-orders/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const eventOrder = await storage.getEventOrder(id);
    if (eventOrder) {
      res.json(eventOrder);
    } else {
      res.status(404).json({ message: "Event order not found" });
    }
  });

  app.post("/api/event-orders", isAuthenticated, hasRole(["admin", "regional", "store"]), async (req, res) => {
    try {
      const eventOrderData = insertEventOrderSchema.parse(req.body);
      const eventOrder = await storage.createEventOrder(eventOrderData);
      res.status(201).json(eventOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create event order" });
      }
    }
  });

  app.patch("/api/event-orders/:id", isAuthenticated, hasRole(["admin", "regional", "store"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedEventOrder = await storage.updateEventOrder(id, req.body);
      if (updatedEventOrder) {
        res.json(updatedEventOrder);
      } else {
        res.status(404).json({ message: "Event order not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update event order" });
    }
  });

  // Permissions
  app.get("/api/permissions", isAuthenticated, async (req, res) => {
    const permissions = await storage.getAllPermissions();
    res.json(permissions);
  });

  app.get("/api/permissions/role/:role", isAuthenticated, async (req, res) => {
    const role = req.params.role;
    const permissions = await storage.getPermissionsByRole(role);
    res.json(permissions);
  });

  app.get("/api/permissions/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const permission = await storage.getPermission(id);
    if (permission) {
      res.json(permission);
    } else {
      res.status(404).json({ message: "Permission not found" });
    }
  });

  app.post("/api/permissions", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const permissionData = insertPermissionSchema.parse(req.body);
      const permission = await storage.createPermission(permissionData);
      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create permission" });
      }
    }
  });

  app.patch("/api/permissions/:id", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedPermission = await storage.updatePermission(id, req.body);
      if (updatedPermission) {
        res.json(updatedPermission);
      } else {
        res.status(404).json({ message: "Permission not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update permission" });
    }
  });

  app.delete("/api/permissions/:id", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePermission(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete permission" });
    }
  });

  // Enhance the current user API to include related permissions
  app.get("/api/user/permissions", isAuthenticated, async (req, res) => {
    try {
      // Make sure req.user exists before accessing its properties
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Get the current user's role
      const userRole = req.user.role;
      const userStoreId = req.user.storeId;
      
      // Define standard permissions based on role
      const permissions = {
        // Common permissions for all roles
        canViewDashboard: true,
        
        // Role-specific permissions
        canAccessAllStores: userRole === 'admin' || userRole === 'regional',
        canEditStockConfig: userRole === 'admin' || userRole === 'regional',
        canEditStockLevels: true, // All authenticated users can edit stock levels for their store
        canViewReports: userRole === 'admin' || userRole === 'regional',
        canEditStoreDetails: userRole === 'admin',
        canManageUsers: userRole === 'admin',
        canCreateAnnouncements: userRole === 'admin' || userRole === 'regional',
        hasStoreAccess: userRole === 'store' && userStoreId !== null,
        canAccessEventOrders: true,
        canAccessDeepCleaning: true,
        canAccessJobLogs: true,
        storeId: userStoreId
      };
      
      // Return both the user and their permissions
      res.json({
        user: req.user,
        permissions: permissions
      });
    } catch (error) {
      console.error("Error retrieving user permissions:", error);
      res.status(500).json({ message: "Failed to retrieve user permissions" });
    }
  });

  // Stock Configuration Items
  app.get("/api/stock-config", isAuthenticated, async (req, res) => {
    try {
      const stockItems = await storage.getAllStockConfig();
      res.json(stockItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve stock configuration items" });
    }
  });

  app.post("/api/stock-config", isAuthenticated, hasRole(["admin", "regional"]), async (req, res) => {
    try {
      const stockItemData = insertStockConfigSchema.parse(req.body);
      const stockItem = await storage.createStockConfigItem(stockItemData);
      res.status(201).json(stockItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create stock configuration item" });
      }
    }
  });

  app.patch("/api/stock-config/:id", isAuthenticated, hasRole(["admin", "regional"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedStockItem = await storage.updateStockConfigItem(id, req.body);
      if (updatedStockItem) {
        res.json(updatedStockItem);
      } else {
        res.status(404).json({ message: "Stock configuration item not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update stock configuration item" });
    }
  });

  // Stock Categories
  app.get("/api/stock-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getAllStockCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stock categories" });
    }
  });
  
  app.get("/api/stock-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getStockCategory(id);
      if (category) {
        res.json(category);
      } else {
        res.status(404).json({ message: "Category not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stock category" });
    }
  });
  
  app.post("/api/stock-categories", isAuthenticated, hasRole(["admin", "regional"]), async (req, res) => {
    try {
      const categoryData = insertStockCategorySchema.parse(req.body);
      const category = await storage.createStockCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });
  
  app.patch("/api/stock-categories/:id", isAuthenticated, hasRole(["admin", "regional"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedCategory = await storage.updateStockCategory(id, req.body);
      if (updatedCategory) {
        res.json(updatedCategory);
      } else {
        res.status(404).json({ message: "Category not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update category" });
    }
  });
  
  app.delete("/api/stock-categories/:id", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteStockCategory(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Store Stock Levels
  app.get("/api/stock-levels/:storeId", isAuthenticated, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      
      // Check if user has permission to access this store's data
      const userRole = req.user.role;
      const userStoreId = req.user.storeId;
      
      if (userRole !== 'admin' && userRole !== 'regional' && userStoreId !== storeId) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to access this store's data" });
      }
      
      const stockLevels = await storage.getStockLevelsByStore(storeId);
      res.json(stockLevels);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve store stock levels" });
    }
  });

  app.get("/api/stock-levels", isAuthenticated, hasRole(["admin", "regional"]), async (req, res) => {
    try {
      const stockLevels = await storage.getAllStockLevels();
      res.json(stockLevels);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve all stock levels" });
    }
  });

  app.post("/api/stock-levels/update", isAuthenticated, async (req, res) => {
    try {
      const { storeId, stockItemId, quantity, updatedBy } = req.body;
      
      // Check if user has permission to update this store's data
      const userRole = req.user.role;
      const userStoreId = req.user.storeId;
      
      if (userRole !== 'admin' && userRole !== 'regional' && userStoreId !== storeId) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to update this store's data" });
      }
      
      const stockLevel = await storage.updateStockLevel(storeId, stockItemId, quantity, updatedBy);
      res.status(200).json(stockLevel);
    } catch (error) {
      res.status(500).json({ message: "Failed to update stock level" });
    }
  });
  
  // Add a PATCH endpoint for updating stock levels (used by the store stock update page)
  app.patch("/api/stock-levels/:storeId/:stockItemId", isAuthenticated, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const stockItemId = parseInt(req.params.stockItemId);
      const { quantity } = req.body;
      
      // Check if user has permission to update this store's data
      const userRole = req.user.role;
      const userStoreId = req.user.storeId;
      
      if (userRole !== 'admin' && userRole !== 'regional' && userStoreId !== storeId) {
        return res.status(403).json({ message: "Forbidden: You don't have permission to update this store's data" });
      }
      
      // Use the user's ID as the updatedBy parameter
      const updatedBy = req.user.id;
      
      const stockLevel = await storage.updateStockLevel(storeId, stockItemId, quantity, updatedBy);
      res.status(200).json(stockLevel);
    } catch (error) {
      console.error("Error updating stock level:", error);
      res.status(500).json({ message: "Failed to update stock level" });
    }
  });
  
  // Maintenance Categories
  app.get("/api/maintenance/categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getAllMaintenanceCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance categories" });
    }
  });
  
  app.get("/api/maintenance/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getMaintenanceCategory(id);
      if (category) {
        res.json(category);
      } else {
        res.status(404).json({ message: "Maintenance category not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance category" });
    }
  });
  
  app.post("/api/maintenance/categories", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const categoryData = insertMaintenanceCategorySchema.parse(req.body);
      const category = await storage.createMaintenanceCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create maintenance category" });
      }
    }
  });
  
  app.patch("/api/maintenance/categories/:id", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedCategory = await storage.updateMaintenanceCategory(id, req.body);
      if (updatedCategory) {
        res.json(updatedCategory);
      } else {
        res.status(404).json({ message: "Maintenance category not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update maintenance category" });
    }
  });
  
  app.delete("/api/maintenance/categories/:id", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMaintenanceCategory(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete maintenance category" });
    }
  });
  
  // Maintenance Subcategories
  app.get("/api/maintenance/subcategories", isAuthenticated, async (req, res) => {
    try {
      const subcategories = await storage.getAllMaintenanceSubcategories();
      res.json(subcategories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance subcategories" });
    }
  });
  
  app.get("/api/maintenance/subcategories/category/:categoryId", isAuthenticated, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const subcategories = await storage.getMaintenanceSubcategoriesByCategoryId(categoryId);
      res.json(subcategories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subcategories for category" });
    }
  });
  
  app.get("/api/maintenance/subcategories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const subcategory = await storage.getMaintenanceSubcategoryById(id);
      if (subcategory) {
        res.json(subcategory);
      } else {
        res.status(404).json({ message: "Maintenance subcategory not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance subcategory" });
    }
  });
  
  app.post("/api/maintenance/subcategories", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const subcategoryData = insertMaintenanceSubcategorySchema.parse(req.body);
      const subcategory = await storage.createMaintenanceSubcategory(subcategoryData);
      res.status(201).json(subcategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create maintenance subcategory" });
      }
    }
  });
  
  app.patch("/api/maintenance/subcategories/:id", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedSubcategory = await storage.updateMaintenanceSubcategory(id, req.body);
      if (updatedSubcategory) {
        res.json(updatedSubcategory);
      } else {
        res.status(404).json({ message: "Maintenance subcategory not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update maintenance subcategory" });
    }
  });
  
  app.delete("/api/maintenance/subcategories/:id", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMaintenanceSubcategory(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete maintenance subcategory" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
