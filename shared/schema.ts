import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'regional_manager', 'store_manager']);
export const jobPriorityEnum = pgEnum('job_priority', ['normal', 'medium', 'high', 'urgent']);
export const jobStatusEnum = pgEnum('job_status', ['pending', 'in_progress', 'completed', 'cancelled']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed']);

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default('store_manager'),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stores
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  phone: text("phone").notNull(),
  managerId: integer("manager_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inventory items
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  minStockLevel: integer("min_stock_level").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Store inventory
export const storeInventory = pgTable("store_inventory", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Staff
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  position: text("position").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  joinedDate: timestamp("joined_date").defaultNow(),
});

// Maintenance jobs
export const maintenanceJobs = pgTable("maintenance_jobs", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  description: text("description").notNull(),
  priority: jobPriorityEnum("priority").notNull().default('normal'),
  status: jobStatusEnum("status").notNull().default('pending'),
  loggedBy: integer("logged_by").references(() => users.id).notNull(),
  loggedAt: timestamp("logged_at").defaultNow(),
  assignedTo: integer("assigned_to").references(() => users.id),
  completedAt: timestamp("completed_at"),
  comments: text("comments"),
});

// Tasks and checklists
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default('pending'),
  dueDate: timestamp("due_date"),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Announcements
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isGlobal: boolean("is_global").notNull().default(false),
});

// Announcement store targets (if not global)
export const announcementTargets = pgTable("announcement_targets", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").references(() => announcements.id).notNull(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
});

// Define relations
export const storesRelations = relations(stores, ({ one, many }) => ({
  manager: one(users, { fields: [stores.managerId], references: [users.id] }),
  inventory: many(storeInventory),
  maintenanceJobs: many(maintenanceJobs),
  tasks: many(tasks),
  staff: many(staff),
}));

export const usersRelations = relations(users, ({ many }) => ({
  managedStores: many(stores),
  createdAnnouncements: many(announcements, { relationName: "createdAnnouncements" }),
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
  loggedMaintenanceJobs: many(maintenanceJobs, { relationName: "loggedMaintenanceJobs" }),
  assignedMaintenanceJobs: many(maintenanceJobs, { relationName: "assignedMaintenanceJobs" }),
}));

// Create schemas and types
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  role: true,
});

export const insertStoreSchema = createInsertSchema(stores).pick({
  name: true,
  address: true,
  city: true,
  phone: true,
  managerId: true,
});

export const insertMaintenanceJobSchema = createInsertSchema(maintenanceJobs).pick({
  storeId: true,
  description: true,
  priority: true,
  status: true,
  loggedBy: true,
  comments: true,
  assignedTo: true,
});

export const updateMaintenanceJobSchema = createInsertSchema(maintenanceJobs).pick({
  description: true,
  priority: true,
  status: true,
  comments: true,
  assignedTo: true,
}).partial();

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof stores.$inferSelect;

export type InsertMaintenanceJob = z.infer<typeof insertMaintenanceJobSchema>;
export type UpdateMaintenanceJob = z.infer<typeof updateMaintenanceJobSchema>;
export type MaintenanceJob = typeof maintenanceJobs.$inferSelect;
