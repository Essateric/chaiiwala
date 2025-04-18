import { 
  User, InsertUser, users,
  Store, InsertStore, stores,
  Inventory, InsertInventory, inventory,
  Task, InsertTask, tasks,
  Checklist, InsertChecklist, checklists,
  ChecklistTask, InsertChecklistTask, checklistTasks,
  Schedule, InsertSchedule, schedules,
  Announcement, InsertAnnouncement, announcements,
  JobLog, InsertJobLog, jobLogs,
  EventOrder, InsertEventOrder, eventOrders,
  StockConfig, InsertStockConfig, stockConfig,
  StockCategory, InsertStockCategory, stockCategories,
  StoreStockLevel, InsertStoreStockLevel, storeStockLevels,
  Permission, InsertPermission, permissions,
  MaintenanceCategory, InsertMaintenanceCategory, maintenanceCategories,
  MaintenanceSubcategory, InsertMaintenanceSubcategory, maintenanceSubcategories
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, desc, gte, sql, asc, gt, not, isNull, or } from "drizzle-orm";
import createMemoryStore from "memorystore";

let PostgresSessionStore;
let sessionStore: session.Store;

// Create the appropriate session store based on database availability
if (process.env.DATABASE_URL && pool) {
  PostgresSessionStore = connectPg(session);
  sessionStore = new PostgresSessionStore({ 
    pool,
    createTableIfMissing: true, 
    tableName: 'session'
  });
  console.log("Using PostgreSQL session store");
} else {
  const MemoryStore = createMemoryStore(session);
  sessionStore = new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  });
  console.log("Using memory session store");
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Use the already configured session store
    this.sessionStore = sessionStore;
    
    // Only try to initialize data if database is available
    if (process.env.DATABASE_URL && pool && db) {
      // Initialize the database with seed data if needed
      this.initializeData();
    } else {
      console.log("Skipping database initialization - no database connection available");
    }
  }
  
  private async initializeData() {
    // Check if we have any stores in the database - if not, seed initial data
    const storesExist = await db.select().from(stores).limit(1);
    if (storesExist.length === 0) {
      console.log("Seeding initial data to database...");
      this.seedInitialData();
    }
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
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllStaff(): Promise<{ id: number; name: string; role: string; color: string; storeId?: number; }[]> {
    const staffColors = ["#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF33A8", "#33FFF6"];
    
    const staffUsers = await db.select().from(users)
      .where(
        or(
          eq(users.role, 'staff'),
          eq(users.role, 'store')
        )
      );
    
    return staffUsers.map((user, index) => ({
      id: user.id,
      name: user.name,
      role: user.role === 'staff' ? 'Staff' : 'Store Manager',
      color: staffColors[index % staffColors.length],
      storeId: user.storeId || undefined
    }));
  }
  
  async getStaffByStore(storeId: number): Promise<{ id: number; name: string; role: string; }[]> {
    const staffUsers = await db.select().from(users)
      .where(
        and(
          or(
            eq(users.role, 'staff'),
            eq(users.role, 'store')
          ),
          eq(users.storeId, storeId)
        )
      );
    
    return staffUsers.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role === 'staff' ? 'Staff' : 'Store Manager'
    }));
  }

  // Store methods
  async getAllStores(): Promise<Store[]> {
    return await db.select().from(stores);
  }

  async getStore(id: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async createStore(insertStore: InsertStore): Promise<Store> {
    const [store] = await db.insert(stores).values(insertStore).returning();
    return store;
  }

  // Inventory methods
  async getAllInventory(): Promise<Inventory[]> {
    return await db.select().from(inventory);
  }

  async createInventoryItem(insertInventory: InsertInventory): Promise<Inventory> {
    const [item] = await db.insert(inventory).values({
      ...insertInventory,
      lastUpdated: new Date()
    }).returning();
    return item;
  }

  async updateInventoryItem(id: number, data: Partial<Inventory>): Promise<Inventory | undefined> {
    const [updatedItem] = await db.update(inventory)
      .set({
        ...data,
        lastUpdated: new Date()
      })
      .where(eq(inventory.id, id))
      .returning();
    
    return updatedItem;
  }

  // Task methods
  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTodayTasks(): Promise<{ id: string; title: string; location: string; dueDate: string; completed: boolean; }[]> {
    const tasksList = await db.select({
      t: tasks,
      s: stores
    })
    .from(tasks)
    .leftJoin(stores, eq(tasks.storeId, stores.id))
    .orderBy(asc(tasks.dueDate))
    .limit(3);
    
    return tasksList.map(({ t, s }) => ({
      id: t.id.toString(),
      title: t.title,
      location: s ? s.name : 'Unknown',
      dueDate: t.dueDate,
      completed: t.status === 'completed'
    }));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task | undefined> {
    const [updatedTask] = await db.update(tasks)
      .set(data)
      .where(eq(tasks.id, id))
      .returning();
    
    return updatedTask;
  }

  // Checklist methods
  async getAllChecklists(): Promise<(Checklist & { tasks: ChecklistTask[] })[]> {
    const checklistList = await db.select().from(checklists);
    const result: (Checklist & { tasks: ChecklistTask[] })[] = [];
    
    for (const checklist of checklistList) {
      const checklistTaskList = await db.select()
        .from(checklistTasks)
        .where(eq(checklistTasks.checklistId, checklist.id));
      
      result.push({
        ...checklist,
        tasks: checklistTaskList
      });
    }
    
    return result;
  }

  async createChecklist(insertChecklist: InsertChecklist): Promise<Checklist> {
    const [checklist] = await db.insert(checklists).values(insertChecklist).returning();
    
    // Create some default tasks for the checklist
    const defaultTasks = [
      "Verify inventory levels",
      "Clean work area",
      "Check equipment",
      "Update daily log"
    ];
    
    for (const title of defaultTasks) {
      await this.createChecklistTask({
        checklistId: checklist.id,
        title,
        completed: false
      });
    }
    
    return checklist;
  }

  async createChecklistTask(insertTask: InsertChecklistTask): Promise<ChecklistTask> {
    const [task] = await db.insert(checklistTasks).values(insertTask).returning();
    return task;
  }

  async updateChecklistTask(
    checklistId: number, 
    taskId: number, 
    completed: boolean, 
    completedData: { completedAt?: Date; completedBy?: string } = {}
  ): Promise<ChecklistTask | undefined> {
    // Combine the completed flag with any completedData
    const updateData = { 
      completed, 
      ...completedData
    };
    
    const [task] = await db.update(checklistTasks)
      .set(updateData)
      .where(
        and(
          eq(checklistTasks.id, taskId),
          eq(checklistTasks.checklistId, checklistId)
        )
      )
      .returning();
    
    return task;
  }

  // Schedule methods
  async getAllSchedules(): Promise<{ id: string; staffId: number; staffName: string; role: string; start: string; end: string; day: number; }[]> {
    const scheduleList = await db.select({
      s: schedules,
      u: users
    })
    .from(schedules)
    .leftJoin(users, eq(schedules.staffId, users.id));
    
    return scheduleList.map(({ s, u }) => ({
      id: s.id.toString(),
      staffId: s.staffId,
      staffName: u ? u.name : 'Unknown',
      role: u ? u.role : 'unknown',
      start: s.start,
      end: s.end,
      day: s.day
    }));
  }

  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const [schedule] = await db.insert(schedules).values(insertSchedule).returning();
    return schedule;
  }

  async deleteSchedule(id: number): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }

  // Announcement methods
  async getAllAnnouncements(): Promise<Announcement[]> {
    return await db.select().from(announcements);
  }

  async getRecentAnnouncements(): Promise<{ id: string; title: string; description: string; date: string; isHighlighted: boolean; }[]> {
    const announcementList = await db.select()
      .from(announcements)
      .orderBy(desc(announcements.date))
      .limit(2);
    
    return announcementList.map(announcement => ({
      id: announcement.id.toString(),
      title: announcement.title,
      description: announcement.content,
      date: this.formatAnnouncementDate(announcement.date),
      isHighlighted: announcement.important
    }));
  }

  async createAnnouncement(insertAnnouncement: InsertAnnouncement): Promise<Announcement> {
    const [announcement] = await db.insert(announcements)
      .values({
        ...insertAnnouncement,
        date: new Date(),
        likes: 0
      })
      .returning();
    
    return announcement;
  }

  async likeAnnouncement(id: number): Promise<Announcement | undefined> {
    const [announcement] = await db.select().from(announcements).where(eq(announcements.id, id));
    if (!announcement) return undefined;
    
    const [updatedAnnouncement] = await db.update(announcements)
      .set({ likes: announcement.likes + 1 })
      .where(eq(announcements.id, id))
      .returning();
    
    return updatedAnnouncement;
  }

  // Job Logs methods
  async getAllJobLogs(): Promise<JobLog[]> {
    return await db.select().from(jobLogs);
  }

  async getJobLogsByStore(storeId: number): Promise<JobLog[]> {
    return await db.select()
      .from(jobLogs)
      .where(eq(jobLogs.storeId, storeId));
  }

  async getJobLog(id: number): Promise<JobLog | undefined> {
    const [jobLog] = await db.select().from(jobLogs).where(eq(jobLogs.id, id));
    return jobLog;
  }

  async createJobLog(insertJobLog: InsertJobLog): Promise<JobLog> {
    const [jobLog] = await db.insert(jobLogs)
      .values({
        ...insertJobLog,
        createdAt: new Date()
      })
      .returning();
    
    return jobLog;
  }

  async updateJobLog(id: number, data: Partial<JobLog>): Promise<JobLog | undefined> {
    const [updatedJobLog] = await db.update(jobLogs)
      .set(data)
      .where(eq(jobLogs.id, id))
      .returning();
    
    return updatedJobLog;
  }
  
  // Stock Categories methods
  async getAllStockCategories(): Promise<StockCategory[]> {
    return await db.select().from(stockCategories);
  }

  async getStockCategory(id: number): Promise<StockCategory | undefined> {
    const [category] = await db.select().from(stockCategories).where(eq(stockCategories.id, id));
    return category;
  }

  async getCategoryByPrefix(prefix: string): Promise<StockCategory | undefined> {
    const [category] = await db.select().from(stockCategories).where(eq(stockCategories.prefix, prefix));
    return category;
  }

  async createStockCategory(insertCategory: InsertStockCategory): Promise<StockCategory> {
    const now = new Date();
    const [category] = await db.insert(stockCategories)
      .values({
        ...insertCategory,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return category;
  }

  async updateStockCategory(id: number, data: Partial<StockCategory>): Promise<StockCategory | undefined> {
    const [updatedCategory] = await db.update(stockCategories)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(stockCategories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteStockCategory(id: number): Promise<void> {
    await db.delete(stockCategories).where(eq(stockCategories.id, id));
  }
  
  // Stock Config methods
  async getAllStockConfig(): Promise<StockConfig[]> {
    return await db.select().from(stockConfig);
  }

  async getStockConfigByItemCode(itemCode: string): Promise<StockConfig | undefined> {
    const [config] = await db.select().from(stockConfig).where(eq(stockConfig.itemCode, itemCode));
    return config;
  }

  async getStockConfigItem(id: number): Promise<StockConfig | undefined> {
    const [config] = await db.select().from(stockConfig).where(eq(stockConfig.id, id));
    return config;
  }

  async createStockConfigItem(insertStockConfig: InsertStockConfig): Promise<StockConfig> {
    const now = new Date();
    const [item] = await db.insert(stockConfig)
      .values({
        ...insertStockConfig,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return item;
  }

  async updateStockConfigItem(id: number, data: Partial<StockConfig>): Promise<StockConfig | undefined> {
    const [updatedItem] = await db.update(stockConfig)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(stockConfig.id, id))
      .returning();
    return updatedItem;
  }

  // Stock Levels methods
  async getAllStockLevels(): Promise<StoreStockLevel[]> {
    return await db.select().from(storeStockLevels);
  }

  async getStockLevelsByStore(storeId: number): Promise<StoreStockLevel[]> {
    return await db.select()
      .from(storeStockLevels)
      .where(eq(storeStockLevels.storeId, storeId));
  }

  async getStockLevel(storeId: number, stockItemId: number): Promise<StoreStockLevel | undefined> {
    const [stockLevel] = await db.select()
      .from(storeStockLevels)
      .where(
        and(
          eq(storeStockLevels.storeId, storeId),
          eq(storeStockLevels.stockItemId, stockItemId)
        )
      );
    return stockLevel;
  }

  async updateStockLevel(storeId: number, stockItemId: number, quantity: number, updatedBy: number): Promise<StoreStockLevel> {
    // Check if the stock level already exists for this store and item
    const existingLevel = await this.getStockLevel(storeId, stockItemId);
    
    if (existingLevel) {
      // Update existing level
      const [updatedLevel] = await db.update(storeStockLevels)
        .set({
          quantity,
          lastUpdated: new Date(),
          updatedBy
        })
        .where(
          and(
            eq(storeStockLevels.storeId, storeId),
            eq(storeStockLevels.stockItemId, stockItemId)
          )
        )
        .returning();
      return updatedLevel;
    } else {
      // Create new level
      const [newLevel] = await db.insert(storeStockLevels)
        .values({
          storeId,
          stockItemId,
          quantity,
          lastUpdated: new Date(),
          updatedBy
        })
        .returning();
      return newLevel;
    }
  }
  
  // Event Orders methods
  async getAllEventOrders(): Promise<EventOrder[]> {
    return await db.select().from(eventOrders);
  }

  async getEventOrdersByStore(storeId: number): Promise<EventOrder[]> {
    return await db.select()
      .from(eventOrders)
      .where(eq(eventOrders.storeId, storeId));
  }

  async getEventOrder(id: number): Promise<EventOrder | undefined> {
    const [eventOrder] = await db.select().from(eventOrders).where(eq(eventOrders.id, id));
    return eventOrder;
  }

  async createEventOrder(insertEventOrder: InsertEventOrder): Promise<EventOrder> {
    const [eventOrder] = await db.insert(eventOrders)
      .values({
        ...insertEventOrder,
        createdAt: new Date()
      })
      .returning();
    
    return eventOrder;
  }

  async updateEventOrder(id: number, data: Partial<EventOrder>): Promise<EventOrder | undefined> {
    const [updatedEventOrder] = await db.update(eventOrders)
      .set(data)
      .where(eq(eventOrders.id, id))
      .returning();
    
    return updatedEventOrder;
  }

  // Helper methods
  private formatAnnouncementDate(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  // Seed data
  private async seedInitialData() {
    try {
      // Seed stores - updated from CSV data
      const storeData: InsertStore[] = [
        { name: "Cheetham Hill", address: "74 Bury Old Rd, Manchester M8 5BW", area: 1, manager: "MGR_CH" },
        { name: "Oxford Road", address: "149 Oxford Rd, Manchester M1 7EE", area: 1, manager: "MGR_OX" },
        { name: "Old Trafford", address: "89 Ayres Rd, Old Trafford, Stretford, M16 7GS", area: 1, manager: "MGR_OT" },
        { name: "Trafford Centre", address: "Kiosk K14, The Trafford Centre, Trafford Blvd, Trafford M17 8AA", area: 2, manager: "MGR_TC" },
        { name: "Stockport", address: "884-886 Stockport Rd, Levenshulme, Manchester M19 3BN", area: 1, manager: "MGR_SR" },
        { name: "Rochdale", address: "35 Milkstone Rd, Rochdale OL11 1EB", area: 2, manager: "MGR_RD" },
        { name: "Oldham", address: "66 George St, Oldham OL1 1LS", area: 2, manager: "MGR_OL" },
        { name: "Wilmslow Road", address: "123 Wilmslow Rd Manchester M14 5TB", area: 1, manager: "MGR_WR" },
        { name: "Deansgate", address: "456 Deansgate Manchester M3 4LY", area: 1, manager: "MGR_DG" },
        { name: "Birmingham", address: "789 High Street, Birmingham B1 2AA", area: 3, manager: "MGR_BH" }
      ];
      
      for (const store of storeData) {
        await this.createStore(store);
      }
      
      // Seed inventory items with real data across different stores
      const inventoryData: InsertInventory[] = [
        { name: "Chai Masala", sku: "CM001", category: "Spices", storeId: 1, quantity: "45 boxes", status: "in_stock" },
        { name: "Tea bags (Assam)", sku: "TB002", category: "Tea", storeId: 1, quantity: "12 boxes", status: "low_stock" },
        { name: "Cardamom", sku: "CD003", category: "Spices", storeId: 1, quantity: "30 bags", status: "in_stock" },
        { name: "Ginger powder", sku: "GP004", category: "Spices", storeId: 2, quantity: "0 bags", status: "out_of_stock" },
        { name: "Milk powder", sku: "MP005", category: "Dairy", storeId: 2, quantity: "15 bags", status: "in_stock" },
        { name: "Sugar", sku: "SG006", category: "Sweeteners", storeId: 3, quantity: "50 kg", status: "in_stock" },
        { name: "Paper cups", sku: "PC007", category: "Packaging", storeId: 3, quantity: "10 packs", status: "low_stock" },
        { name: "Samosa pastry", sku: "SP008", category: "Food", storeId: 4, quantity: "8 packs", status: "low_stock" },
        { name: "Paper bags", sku: "PB009", category: "Packaging", storeId: 5, quantity: "100 pcs", status: "in_stock" },
        { name: "Paneer", sku: "PN010", category: "Dairy", storeId: 6, quantity: "5 kg", status: "on_order" },
        { name: "Chai Masala", sku: "CM0011", category: "Spices", storeId: 8, quantity: "35 boxes", status: "in_stock" },
        { name: "Tea bags (Assam)", sku: "TB0012", category: "Tea", storeId: 9, quantity: "25 boxes", status: "in_stock" },
        { name: "Disposable cups", sku: "DC011", category: "Packaging", storeId: 8, quantity: "200 pcs", status: "in_stock" },
        { name: "Teapots", sku: "TP012", category: "Equipment", storeId: 9, quantity: "12 units", status: "in_stock" },
        { name: "Saffron", sku: "SF013", category: "Spices", storeId: 1, quantity: "2 bottles", status: "low_stock" }
      ];
      
      for (const item of inventoryData) {
        await this.createInventoryItem(item);
      }
  
      // Seed users with password 'password123'
      const hashPassword = 'c8680ca3ea7be0ac4fef3954ccf3bb114ba12f8fab964e0a6f55ff9386c022a4f4a78e71343bd0e2213c11c86266a8c1a13d507752bdd80b492ae04a5ee9f2b6.b6e5be78c42ffc3595c7352fbd88fe9f'; 
      
      const userData: InsertUser[] = [
        // Admin with unlimited access
        { 
          username: "shabnam", 
          password: hashPassword, 
          firstName: "Shabnam", 
          lastName: "Essa", 
          name: "Shabnam Essa", 
          email: "shabnam@chaiiwala.com", 
          title: "CEO", 
          role: "admin", 
          permissions: ["all_access", "admin_panel", "reports"],
          storeId: null
        },
        
        // Regional manager with access to all stores and highest permissions
        { 
          username: "usman", 
          password: hashPassword, 
          firstName: "Usman", 
          lastName: "Aftab", 
          name: "Usman Aftab", 
          email: "usman.aftab@chaiiwala.co.uk", 
          title: "Regional Director", 
          role: "regional", 
          permissions: ["view_all_stores", "inventory_management", "staff_scheduling", "reporting", "task_management", "all_features"],
          storeId: null
        },
        
        // Store manager with access limited to Stockport Road store
        { 
          username: "jubayed", 
          password: hashPassword, 
          firstName: "Jubayed", 
          lastName: "Chowdhury", 
          name: "Jubayed Chowdhury", 
          email: "jubayed@chaiiwala.com", 
          title: "Store Manager", 
          role: "store", 
          storeId: 5, 
          permissions: ["manage_store", "view_inventory", "staff_scheduling"] 
        },
        
        // Original seed data with updated fields
        { 
          username: "admin", 
          password: hashPassword, 
          firstName: "Admin", 
          lastName: "User", 
          name: "Admin User", 
          email: "admin@chaiiwala.com",
          title: "System Administrator",
          role: "admin", 
          permissions: ["all_access"],
          storeId: null
        },
        { 
          username: "regional1", 
          password: hashPassword, 
          firstName: "Fatima", 
          lastName: "Khan", 
          name: "Fatima Khan", 
          email: "fatima@chaiiwala.com",
          title: "Regional Manager",
          role: "regional", 
          permissions: ["view_all_stores", "inventory_management"],
          storeId: null
        },
        { 
          username: "manager1", 
          password: hashPassword, 
          firstName: "Ahmed", 
          lastName: "Khan", 
          name: "Ahmed Khan", 
          email: "ahmed@chaiiwala.com",
          title: "Store Manager",
          role: "store", 
          storeId: 1, 
          permissions: ["manage_store"] 
        },
        { 
          username: "manager2", 
          password: hashPassword, 
          firstName: "Sarah", 
          lastName: "Smith", 
          name: "Sarah Smith", 
          email: "sarah@chaiiwala.com",
          title: "Store Manager",
          role: "store", 
          storeId: 2, 
          permissions: ["manage_store"] 
        },
        { 
          username: "staff1", 
          password: hashPassword, 
          firstName: "Mohammed", 
          lastName: "Ali", 
          name: "Mohammed Ali", 
          email: "mohammed@chaiiwala.com",
          title: "Store Associate",
          role: "staff", 
          storeId: 1, 
          permissions: ["basic_access"] 
        },
        { 
          username: "staff2", 
          password: hashPassword, 
          firstName: "Jessica", 
          lastName: "Patel", 
          name: "Jessica Patel", 
          email: "jessica@chaiiwala.com",
          title: "Store Associate",
          role: "staff", 
          storeId: 2, 
          permissions: ["basic_access"] 
        },
        // Store managers for the new locations
        { 
          username: "imran", 
          password: hashPassword, 
          firstName: "Imran", 
          lastName: "Khan", 
          name: "Imran Khan", 
          email: "imran@chaiiwala.com",
          title: "Store Manager",
          role: "store", 
          storeId: 8, // Wilmslow Road
          permissions: ["manage_store", "view_inventory", "staff_scheduling"] 
        },
        { 
          username: "zahra", 
          password: hashPassword, 
          firstName: "Zahra", 
          lastName: "Ali", 
          name: "Zahra Ali", 
          email: "zahra@chaiiwala.com",
          title: "Store Manager",
          role: "store", 
          storeId: 9, // Deansgate
          permissions: ["manage_store", "view_inventory", "staff_scheduling"] 
        }
      ];
      
      for (const user of userData) {
        await this.createUser(user);
      }
      
      console.log("Database seeded with initial data.");
    } catch (error) {
      console.error("Error seeding database:", error);
    }
  }
  
  // Maintenance Categories methods
  async getAllMaintenanceCategories(): Promise<MaintenanceCategory[]> {
    return await db.select().from(maintenanceCategories);
  }
  
  async getMaintenanceCategory(id: number): Promise<MaintenanceCategory | undefined> {
    const [category] = await db.select()
      .from(maintenanceCategories)
      .where(eq(maintenanceCategories.id, id));
    return category;
  }
  
  async createMaintenanceCategory(insertCategory: InsertMaintenanceCategory): Promise<MaintenanceCategory> {
    const [category] = await db.insert(maintenanceCategories)
      .values({
        ...insertCategory,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return category;
  }
  
  async updateMaintenanceCategory(id: number, data: Partial<MaintenanceCategory>): Promise<MaintenanceCategory | undefined> {
    const [updatedCategory] = await db.update(maintenanceCategories)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(maintenanceCategories.id, id))
      .returning();
    return updatedCategory;
  }
  
  async deleteMaintenanceCategory(id: number): Promise<void> {
    // This will cascade delete subcategories due to foreign key constraint
    await db.delete(maintenanceCategories)
      .where(eq(maintenanceCategories.id, id));
  }
  
  // Maintenance Subcategories methods
  async getAllMaintenanceSubcategories(): Promise<MaintenanceSubcategory[]> {
    return await db.select().from(maintenanceSubcategories);
  }
  
  async getMaintenanceSubcategoryById(id: number): Promise<MaintenanceSubcategory | undefined> {
    const [subcategory] = await db.select()
      .from(maintenanceSubcategories)
      .where(eq(maintenanceSubcategories.id, id));
    return subcategory;
  }
  
  async getMaintenanceSubcategoriesByCategoryId(categoryId: number): Promise<MaintenanceSubcategory[]> {
    return await db.select()
      .from(maintenanceSubcategories)
      .where(eq(maintenanceSubcategories.categoryId, categoryId));
  }
  
  async createMaintenanceSubcategory(insertSubcategory: InsertMaintenanceSubcategory): Promise<MaintenanceSubcategory> {
    const [subcategory] = await db.insert(maintenanceSubcategories)
      .values({
        ...insertSubcategory,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return subcategory;
  }
  
  async updateMaintenanceSubcategory(id: number, data: Partial<MaintenanceSubcategory>): Promise<MaintenanceSubcategory | undefined> {
    const [updatedSubcategory] = await db.update(maintenanceSubcategories)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(maintenanceSubcategories.id, id))
      .returning();
    return updatedSubcategory;
  }
  
  async deleteMaintenanceSubcategory(id: number): Promise<void> {
    await db.delete(maintenanceSubcategories)
      .where(eq(maintenanceSubcategories.id, id));
  }
}

import { IStorage } from "./storage";
import { or } from "drizzle-orm/expressions";