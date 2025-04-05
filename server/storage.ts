import { users, stores, storeStaff, inventory, maintenanceJobs, announcements } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { User, Store, StoreStaff, Inventory, MaintenanceJob, Announcement } from "@shared/schema";
import { InsertUser, InsertStore, InsertStoreStaff, InsertInventory, InsertMaintenanceJob, InsertAnnouncement } from "@shared/schema";

// PostgreSQL session store
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store
  sessionStore: session.SessionStore;
  
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Store management
  getStores(): Promise<Store[]>;
  getStore(id: number): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, store: Partial<InsertStore>): Promise<Store | undefined>;
  
  // Store staff management
  getStoreStaff(storeId: number): Promise<(StoreStaff & { user: User })[]>;
  assignStaffToStore(storeStaff: InsertStoreStaff): Promise<StoreStaff>;
  removeStaffFromStore(storeId: number, userId: number): Promise<void>;
  
  // Inventory management
  getInventory(storeId: number): Promise<Inventory[]>;
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, item: Partial<InsertInventory>): Promise<Inventory | undefined>;
  
  // Maintenance management
  getMaintenanceJobs(storeId?: number): Promise<MaintenanceJob[]>;
  getMaintenanceJob(id: number): Promise<MaintenanceJob | undefined>;
  createMaintenanceJob(job: InsertMaintenanceJob): Promise<MaintenanceJob>;
  updateMaintenanceJob(id: number, job: Partial<InsertMaintenanceJob>): Promise<MaintenanceJob | undefined>;
  getMaintenanceStats(storeId?: number): Promise<any>;
  
  // Announcements
  getAnnouncements(storeId?: number): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Store management
  async getStores(): Promise<Store[]> {
    return await db.select().from(stores);
  }

  async getStore(id: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [newStore] = await db.insert(stores).values(store).returning();
    return newStore;
  }

  async updateStore(id: number, store: Partial<InsertStore>): Promise<Store | undefined> {
    const [updatedStore] = await db
      .update(stores)
      .set(store)
      .where(eq(stores.id, id))
      .returning();
    return updatedStore;
  }

  // Store staff management
  async getStoreStaff(storeId: number): Promise<(StoreStaff & { user: User })[]> {
    const result = await db
      .select({
        staff: storeStaff,
        user: users,
      })
      .from(storeStaff)
      .where(eq(storeStaff.storeId, storeId))
      .innerJoin(users, eq(storeStaff.userId, users.id));
    
    // Transform the result to match the expected format
    return result.map(r => ({
      ...r.staff,
      user: r.user,
    }));
  }

  async assignStaffToStore(staffData: InsertStoreStaff): Promise<StoreStaff> {
    const [newStaffAssignment] = await db
      .insert(storeStaff)
      .values(staffData)
      .returning();
    return newStaffAssignment;
  }

  async removeStaffFromStore(storeId: number, userId: number): Promise<void> {
    await db
      .delete(storeStaff)
      .where(
        and(
          eq(storeStaff.storeId, storeId),
          eq(storeStaff.userId, userId)
        )
      );
  }

  // Inventory management
  async getInventory(storeId: number): Promise<Inventory[]> {
    return await db
      .select()
      .from(inventory)
      .where(eq(inventory.storeId, storeId));
  }

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    const [item] = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id));
    return item;
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const [newItem] = await db
      .insert(inventory)
      .values(item)
      .returning();
    return newItem;
  }

  async updateInventoryItem(id: number, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const [updatedItem] = await db
      .update(inventory)
      .set({ ...item, lastUpdated: new Date() })
      .where(eq(inventory.id, id))
      .returning();
    return updatedItem;
  }

  // Maintenance management
  async getMaintenanceJobs(storeId?: number): Promise<MaintenanceJob[]> {
    if (storeId) {
      return await db
        .select()
        .from(maintenanceJobs)
        .where(eq(maintenanceJobs.storeId, storeId))
        .orderBy(maintenanceJobs.createdAt);
    } else {
      return await db
        .select()
        .from(maintenanceJobs)
        .orderBy(maintenanceJobs.createdAt);
    }
  }

  async getMaintenanceJob(id: number): Promise<MaintenanceJob | undefined> {
    const [job] = await db
      .select()
      .from(maintenanceJobs)
      .where(eq(maintenanceJobs.id, id));
    return job;
  }

  async createMaintenanceJob(job: InsertMaintenanceJob): Promise<MaintenanceJob> {
    const [newJob] = await db
      .insert(maintenanceJobs)
      .values(job)
      .returning();
    return newJob;
  }

  async updateMaintenanceJob(id: number, job: Partial<InsertMaintenanceJob>): Promise<MaintenanceJob | undefined> {
    const [updatedJob] = await db
      .update(maintenanceJobs)
      .set(job)
      .where(eq(maintenanceJobs.id, id))
      .returning();
    return updatedJob;
  }

  async getMaintenanceStats(storeId?: number): Promise<any> {
    // Base query to get all maintenance jobs
    let query = db.select().from(maintenanceJobs);
    
    // Filter by store if storeId is provided
    if (storeId) {
      query = query.where(eq(maintenanceJobs.storeId, storeId));
    }

    const jobs = await query;
    
    // Calculate stats
    const openJobs = jobs.filter(job => job.status !== 'resolved');
    const resolvedJobs = jobs.filter(job => job.status === 'resolved');
    const highPriorityJobs = openJobs.filter(job => job.priority === 'high');
    const pendingApprovals = jobs.filter(job => job.status === 'pending_review');
    
    // Calculate average resolution time for resolved jobs
    let avgResolutionTime = 0;
    if (resolvedJobs.length > 0) {
      const totalResolutionTime = resolvedJobs.reduce((total, job) => {
        if (job.completedDate) {
          const creationDate = new Date(job.createdAt);
          const completionDate = new Date(job.completedDate);
          const timeDiff = completionDate.getTime() - creationDate.getTime();
          return total + (timeDiff / (1000 * 60 * 60 * 24)); // Convert to days
        }
        return total;
      }, 0);
      avgResolutionTime = totalResolutionTime / resolvedJobs.length;
    }
    
    // Get jobs created in the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const jobsLastWeek = jobs.filter(job => new Date(job.createdAt) >= oneWeekAgo);
    
    return {
      openJobs: openJobs.length,
      resolvedJobs: resolvedJobs.length,
      highPriorityJobs: highPriorityJobs.length,
      pendingApprovals: pendingApprovals.length,
      avgResolutionTime,
      jobsLastWeek: jobsLastWeek.length,
      priorityDistribution: {
        high: jobs.filter(job => job.priority === 'high').length,
        medium: jobs.filter(job => job.priority === 'medium').length,
        normal: jobs.filter(job => job.priority === 'normal').length,
        low: jobs.filter(job => job.priority === 'low').length,
      }
    };
  }

  // Announcements
  async getAnnouncements(storeId?: number): Promise<Announcement[]> {
    const allAnnouncements = await db
      .select()
      .from(announcements)
      .orderBy(announcements.createdAt);
    
    if (!storeId) {
      return allAnnouncements;
    }
    
    // Filter announcements for the specific store
    return allAnnouncements.filter(announcement => {
      if (announcement.isGlobal) return true;
      if (announcement.targetStores) {
        const targetStores = announcement.targetStores as number[];
        return targetStores.includes(storeId);
      }
      return false;
    });
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db
      .insert(announcements)
      .values(announcement)
      .returning();
    return newAnnouncement;
  }
}

export const storage = new DatabaseStorage();
