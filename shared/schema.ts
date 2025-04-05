import { pgTable, text, serial, integer, boolean, timestamp, json, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'regional_manager', 'store_manager']);
export const priorityEnum = pgEnum('priority', ['high', 'medium', 'normal', 'low']);
export const statusEnum = pgEnum('status', ['open', 'in_progress', 'pending_review', 'assigned', 'scheduled', 'resolved']);

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default('store_manager'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  storeStaff: many(storeStaff),
  maintenanceJobs: many(maintenanceJobs),
}));

// Stores
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  openingHours: json("opening_hours"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const storesRelations = relations(stores, ({ many }) => ({
  inventory: many(inventory),
  storeStaff: many(storeStaff),
  maintenanceJobs: many(maintenanceJobs),
}));

// Store Staff
export const storeStaff = pgTable("store_staff", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  userId: integer("user_id").notNull().references(() => users.id),
  position: text("position").notNull(),
  isManager: boolean("is_manager").default(false),
}, (table) => {
  return {
    storeUserIdx: uniqueIndex("store_user_idx").on(table.storeId, table.userId),
  };
});

export const storeStaffRelations = relations(storeStaff, ({ one }) => ({
  store: one(stores, {
    fields: [storeStaff.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [storeStaff.userId],
    references: [users.id],
  }),
}));

// Inventory
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(0),
  unit: text("unit").notNull(),
  costPerUnit: integer("cost_per_unit"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const inventoryRelations = relations(inventory, ({ one }) => ({
  store: one(stores, {
    fields: [inventory.storeId],
    references: [stores.id],
  }),
}));

// Maintenance Jobs
export const maintenanceJobs = pgTable("maintenance_jobs", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: priorityEnum("priority").notNull().default('normal'),
  status: statusEnum("status").notNull().default('open'),
  reportedBy: integer("reported_by").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  comments: text("comments"),
});

export const maintenanceJobsRelations = relations(maintenanceJobs, ({ one }) => ({
  store: one(stores, {
    fields: [maintenanceJobs.storeId],
    references: [stores.id],
  }),
  reporter: one(users, {
    fields: [maintenanceJobs.reportedBy],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [maintenanceJobs.assignedTo],
    references: [users.id],
  }),
}));

// Announcements
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isGlobal: boolean("is_global").default(false),
  targetStores: json("target_stores"),  // Array of store IDs
});

// Schemas for inserts
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertStoreSchema = createInsertSchema(stores).omit({ id: true, createdAt: true });
export const insertStoreStaffSchema = createInsertSchema(storeStaff).omit({ id: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, lastUpdated: true });
export const insertMaintenanceJobSchema = createInsertSchema(maintenanceJobs).omit({ id: true, createdAt: true, completedDate: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type StoreStaff = typeof storeStaff.$inferSelect;
export type InsertStoreStaff = z.infer<typeof insertStoreStaffSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type MaintenanceJob = typeof maintenanceJobs.$inferSelect;
export type InsertMaintenanceJob = z.infer<typeof insertMaintenanceJobSchema>;

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
