import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum('role', ['admin', 'regional', 'store', 'staff']);
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'completed']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);
export const inventoryStatusEnum = pgEnum('inventory_status', ['in_stock', 'low_stock', 'out_of_stock', 'on_order']);

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  role: roleEnum("role").notNull().default('staff'),
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

// Schema Validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertStoreSchema = createInsertSchema(stores).omit({ id: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, lastUpdated: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertChecklistSchema = createInsertSchema(checklists).omit({ id: true });
export const insertChecklistTaskSchema = createInsertSchema(checklistTasks).omit({ id: true });
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, date: true, likes: true });

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
