import { users, type User, type InsertUser, stores, type Store, type InsertStore, maintenanceJobs, type MaintenanceJob, type InsertMaintenanceJob, type UpdateMaintenanceJob } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Store methods
  getAllStores(): Promise<Store[]>;
  getStore(id: number): Promise<Store | undefined>;
  getStoresByManager(managerId: number): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  
  // Maintenance job methods
  getMaintenanceJobs(storeId?: number): Promise<MaintenanceJob[]>;
  getMaintenanceJob(id: number): Promise<MaintenanceJob | undefined>;
  createMaintenanceJob(job: InsertMaintenanceJob): Promise<MaintenanceJob>;
  updateMaintenanceJob(id: number, job: UpdateMaintenanceJob): Promise<MaintenanceJob | undefined>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Store methods
  async getAllStores(): Promise<Store[]> {
    return await db.select().from(stores).orderBy(stores.name);
  }

  async getStore(id: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async getStoresByManager(managerId: number): Promise<Store[]> {
    return await db.select().from(stores).where(eq(stores.managerId, managerId));
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [newStore] = await db
      .insert(stores)
      .values(store)
      .returning();
    return newStore;
  }

  // Maintenance job methods
  async getMaintenanceJobs(storeId?: number): Promise<MaintenanceJob[]> {
    if (storeId) {
      return await db
        .select()
        .from(maintenanceJobs)
        .where(eq(maintenanceJobs.storeId, storeId))
        .orderBy(desc(maintenanceJobs.loggedAt));
    }
    
    return await db
      .select()
      .from(maintenanceJobs)
      .orderBy(desc(maintenanceJobs.loggedAt));
  }

  async getMaintenanceJob(id: number): Promise<MaintenanceJob | undefined> {
    const [job] = await db.select().from(maintenanceJobs).where(eq(maintenanceJobs.id, id));
    return job;
  }

  async createMaintenanceJob(job: InsertMaintenanceJob): Promise<MaintenanceJob> {
    const [newJob] = await db
      .insert(maintenanceJobs)
      .values(job)
      .returning();
    return newJob;
  }

  async updateMaintenanceJob(id: number, job: UpdateMaintenanceJob): Promise<MaintenanceJob | undefined> {
    const [updatedJob] = await db
      .update(maintenanceJobs)
      .set(job)
      .where(eq(maintenanceJobs.id, id))
      .returning();
    return updatedJob;
  }
}

export const storage = new DatabaseStorage();
