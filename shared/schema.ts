import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum('role', ['admin', 'regional', 'store', 'staff']);
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'completed']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);
export const inventoryStatusEnum = pgEnum('inventory_status', ['in_stock', 'low_stock', 'out_of_stock', 'on_order']);
export const jobFlagEnum = pgEnum('job_flag', ['normal', 'long_standing', 'urgent']);
export const accessLevelEnum = pgEnum('access_level', ['Shop Limited Access', 'Senior Manager Access', 'Admin Access']);
export const eventStatusEnum = pgEnum('event_status', ['pending', 'confirmed', 'completed', 'cancelled']);

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  name: text("name").notNull(), // Keeping this for backward compatibility
  email: text("email").notNull(),
  title: text("title"), // Job title
  role: roleEnum("role").notNull().default('staff'), // Role for permissions
  permissions: text("permissions").array(), // Array of specific permissions
  storeId: integer("store_id"),
});

// Stores Table
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  area: integer("area").notNull(),
  manager: text("manager").notNull(),
});

// Inventory Table
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  category: text("category").notNull(),
  storeId: integer("store_id").notNull(),
  quantity: text("quantity").notNull(),
  status: inventoryStatusEnum("status").notNull().default('in_stock'),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Tasks Table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  storeId: integer("store_id").notNull(),
  assignedTo: integer("assigned_to").notNull(),
  dueDate: text("due_date").notNull(),
  status: taskStatusEnum("status").notNull().default('todo'),
  priority: priorityEnum("priority").notNull().default('medium'),
});

// Checklists Table
export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), 
  assignedTo: text("assigned_to").notNull(),
  dueDate: text("due_date"),
  storeId: integer("store_id").notNull(),
});

// Checklist Tasks Table
export const checklistTasks = pgTable("checklist_tasks", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull(),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
});

// Staff Schedule Table
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  day: integer("day").notNull(), // 0-6 (Sunday-Saturday)
  start: text("start_time").notNull(),
  end: text("end_time").notNull(),
  storeId: integer("store_id").notNull(),
});

// Announcements Table
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  category: text("category").notNull(),
  important: boolean("important").notNull().default(false),
  likes: integer("likes").notNull().default(0),
});

// Job Logs Table
export const jobLogs = pgTable("job_logs", {
  id: serial("id").primaryKey(),
  logDate: text("log_date").notNull(), // Date of the job log in YYYY-MM-DD format
  logTime: text("log_time").notNull(), // Time of the job log in HH:MM format
  loggedBy: text("logged_by").notNull(), // Name of person who logged the job
  storeId: integer("store_id").notNull(), // Store where the job is logged
  description: text("description").notNull(), // Description of the job
  completionDate: text("completion_date"), // Date by which the job should be completed
  attachment: text("attachment"), // Legacy field - single attachment URL or path
  attachments: text("attachments").array(), // URLs or paths to any uploaded attachments (new format)
  comments: text("comments"), // Additional comments
  flag: jobFlagEnum("flag").notNull().default('normal'), // Flag for job status (normal, long_standing, urgent)
  createdAt: timestamp("created_at").notNull().defaultNow(), // Timestamp when the job was logged
});

// Manager Details Table
export const managerDetails = pgTable("manager_details", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // Reference to user table
  phoneNumber: text("phone_number").notNull(),
  accessLevel: accessLevelEnum("access_level").notNull().default('Shop Limited Access'),
  dateOfJoining: text("date_of_joining").notNull(),
  lastLoginDate: text("last_login_date").notNull(),
});

// Stock Configuration Table
export const stockConfig = pgTable("stock_config", {
  id: serial("id").primaryKey(),
  itemCode: text("item_code").notNull().unique(), // Unique code for the item
  name: text("name").notNull(), // Item name
  category: text("category").notNull(), // Category (Food, Drinks, Packaging, Other)
  lowStockThreshold: integer("low_stock_threshold").notNull(), // Threshold for low stock alert
  createdAt: timestamp("created_at").notNull().defaultNow(), // When the item was added
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // When the item was last updated
});

// Event Orders Table
export const eventOrders = pgTable("event_orders", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull(), // Store handling the event
  eventDate: text("event_date").notNull(), // Date of the event
  eventTime: text("event_time").notNull(), // Time of the event
  venue: text("venue").notNull(), // Venue/location of the event
  product: text("product").notNull(), // Product ordered
  quantity: integer("quantity").notNull(), // Quantity of the product
  bookingDate: text("booking_date").notNull(), // Date when the booking was made
  bookingTime: text("booking_time").notNull(), // Time when the booking was made
  customerName: text("customer_name").notNull(), // Name of the customer
  customerPhone: text("customer_phone").notNull(), // Customer's phone number
  customerEmail: text("customer_email"), // Customer's email (optional)
  bookedBy: text("booked_by").notNull(), // Person who booked the event
  status: eventStatusEnum("status").notNull().default('pending'), // Status of the event order
  notes: text("notes"), // Additional notes
  createdAt: timestamp("created_at").notNull().defaultNow(), // Timestamp when the event was created
});

// Session table (used by connect-pg-simple)
// This must match the table structure expected by connect-pg-simple
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey().notNull(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Schema Validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertStoreSchema = createInsertSchema(stores).omit({ id: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, lastUpdated: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertChecklistSchema = createInsertSchema(checklists).omit({ id: true });
export const insertChecklistTaskSchema = createInsertSchema(checklistTasks).omit({ id: true });
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, date: true, likes: true });
export const insertJobLogSchema = createInsertSchema(jobLogs).omit({ id: true, createdAt: true });
export const insertManagerDetailsSchema = createInsertSchema(managerDetails).omit({ id: true });
export const insertEventOrderSchema = createInsertSchema(eventOrders).omit({ id: true, createdAt: true });
export const insertStockConfigSchema = createInsertSchema(stockConfig).omit({ id: true, createdAt: true, updatedAt: true });

// Type Exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Checklist = typeof checklists.$inferSelect;
export type InsertChecklist = z.infer<typeof insertChecklistSchema>;

export type ChecklistTask = typeof checklistTasks.$inferSelect;
export type InsertChecklistTask = z.infer<typeof insertChecklistTaskSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

export type JobLog = typeof jobLogs.$inferSelect;
export type InsertJobLog = z.infer<typeof insertJobLogSchema>;

export type ManagerDetails = typeof managerDetails.$inferSelect;
export type InsertManagerDetails = z.infer<typeof insertManagerDetailsSchema>;

export type EventOrder = typeof eventOrders.$inferSelect;
export type InsertEventOrder = z.infer<typeof insertEventOrderSchema>;

export type StockConfig = typeof stockConfig.$inferSelect;
export type InsertStockConfig = z.infer<typeof insertStockConfigSchema>;

export type Session = typeof session.$inferSelect;
