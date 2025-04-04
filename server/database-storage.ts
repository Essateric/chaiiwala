import { 
  User, InsertUser, 
  Store, InsertStore,
  Inventory, InsertInventory,
  Task, InsertTask,
  Checklist, InsertChecklist,
  ChecklistTask, InsertChecklistTask,
  Schedule, InsertSchedule,
  Announcement, InsertAnnouncement,
  JobLog, InsertJobLog,
  users, stores, inventory, tasks, checklists, checklistTasks, schedules, announcements, jobLogs
} from "@shared/schema";
import { db } from "./db";
import { IStorage } from "./storage";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq, desc, and } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: 'postgresql://neondb_owner:npg_OMSkt9XaI8lF@ep-plain-lab-a51kvi1m.us-east-2.aws.neon.tech/neondb?sslmode=require',
      },
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
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllStaff(): Promise<{ id: number; name: string; role: string; color: string; storeId?: number; }[]> {
    const staffColors = ["#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF33A8", "#33FFF6"];
    const staffUsers = await db.select().from(users)
      .where(eq(users.role, 'staff'))
      .or(eq(users.role, 'store'));
    
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
      .where(and(
        eq(users.storeId, storeId),
        eq(users.role, 'staff')
      ))
      .or(and(
        eq(users.storeId, storeId),
        eq(users.role, 'store')
      ));
    
    return staffUsers.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role === 'staff' ? 'Staff' : 'Store Manager'
    }));
  }

  // Store methods
  async getAllStores(): Promise<Store[]> {
    return db.select().from(stores);
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
    return db.select().from(inventory);
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
    return db.select().from(tasks);
  }

  async getTodayTasks(): Promise<{ id: string; title: string; location: string; dueDate: string; completed: boolean; }[]> {
    const allTasks = await db.select({
      id: tasks.id,
      title: tasks.title,
      storeId: tasks.storeId,
      dueDate: tasks.dueDate,
      status: tasks.status
    }).from(tasks).limit(3);
    
    const storeIds = [...new Set(allTasks.map(task => task.storeId))];
    const storeMap = new Map<number, string>();
    
    if (storeIds.length > 0) {
      const storeRecords = await db.select({
        id: stores.id,
        name: stores.name
      }).from(stores).where(eq(stores.id, storeIds[0]));
      
      for (const store of storeRecords) {
        storeMap.set(store.id, store.name);
      }
    }
    
    return allTasks.map(task => ({
      id: task.id.toString(),
      title: task.title,
      location: storeMap.get(task.storeId) || 'Unknown',
      dueDate: task.dueDate,
      completed: task.status === 'completed'
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
    const allChecklists = await db.select().from(checklists);
    const allTasks = await db.select().from(checklistTasks);
    
    // Group tasks by checklist id
    const tasksByChecklist = new Map<number, ChecklistTask[]>();
    for (const task of allTasks) {
      if (!tasksByChecklist.has(task.checklistId)) {
        tasksByChecklist.set(task.checklistId, []);
      }
      tasksByChecklist.get(task.checklistId)?.push(task);
    }
    
    // Add tasks to their checklists
    return allChecklists.map(checklist => ({
      ...checklist,
      tasks: tasksByChecklist.get(checklist.id) || []
    }));
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

  async updateChecklistTask(checklistId: number, taskId: number, completed: boolean): Promise<ChecklistTask | undefined> {
    const [updatedTask] = await db.update(checklistTasks)
      .set({ completed })
      .where(and(
        eq(checklistTasks.id, taskId),
        eq(checklistTasks.checklistId, checklistId)
      ))
      .returning();
    
    return updatedTask;
  }

  // Schedule methods
  async getAllSchedules(): Promise<{ id: string; staffId: number; staffName: string; role: string; start: string; end: string; day: number; }[]> {
    const allSchedules = await db.select().from(schedules);
    const staffIds = [...new Set(allSchedules.map(schedule => schedule.staffId))];
    const staffMap = new Map<number, { name: string; role: string }>();
    
    if (staffIds.length > 0) {
      const staffUsers = await db.select({
        id: users.id,
        name: users.name,
        role: users.role
      }).from(users).where(eq(users.id, staffIds[0]));
      
      for (const user of staffUsers) {
        staffMap.set(user.id, { name: user.name, role: user.role });
      }
    }
    
    return allSchedules.map(schedule => {
      const staff = staffMap.get(schedule.staffId);
      return {
        id: schedule.id.toString(),
        staffId: schedule.staffId,
        staffName: staff ? staff.name : 'Unknown',
        role: staff ? staff.role : 'unknown',
        start: schedule.start,
        end: schedule.end,
        day: schedule.day
      };
    });
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
    return db.select().from(announcements);
  }

  async getRecentAnnouncements(): Promise<{ id: string; title: string; description: string; date: string; isHighlighted: boolean; }[]> {
    const recentAnnouncements = await db.select().from(announcements)
      .orderBy(desc(announcements.date))
      .limit(2);
    
    return recentAnnouncements.map(announcement => ({
      id: announcement.id.toString(),
      title: announcement.title,
      description: announcement.content,
      date: this.formatAnnouncementDate(announcement.date),
      isHighlighted: announcement.important
    }));
  }

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

  async createAnnouncement(insertAnnouncement: InsertAnnouncement): Promise<Announcement> {
    const [announcement] = await db.insert(announcements).values({
      ...insertAnnouncement,
      date: new Date(),
      likes: 0
    }).returning();
    
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
    return db.select().from(jobLogs);
  }

  async getJobLogsByStore(storeId: number): Promise<JobLog[]> {
    return db.select().from(jobLogs).where(eq(jobLogs.storeId, storeId));
  }

  async getJobLog(id: number): Promise<JobLog | undefined> {
    const [jobLog] = await db.select().from(jobLogs).where(eq(jobLogs.id, id));
    return jobLog;
  }

  async createJobLog(insertJobLog: InsertJobLog): Promise<JobLog> {
    const [jobLog] = await db.insert(jobLogs).values({
      ...insertJobLog,
      createdAt: new Date()
    }).returning();
    
    return jobLog;
  }

  async updateJobLog(id: number, data: Partial<JobLog>): Promise<JobLog | undefined> {
    const [updatedJobLog] = await db.update(jobLogs)
      .set(data)
      .where(eq(jobLogs.id, id))
      .returning();
    
    return updatedJobLog;
  }

  // Seed data method that will be called to initialize the database with the demo data
  async seedInitialData() {
    // Check if data already exists
    const userCount = await db.select().from(users).limit(1);
    if (userCount.length > 0) {
      console.log("Data already exists, skipping seed");
      return;
    }

    console.log("Seeding initial data...");

    // Seed stores
    const storeData: InsertStore[] = [
      { name: "Cheetham Hill", address: "74 Bury Old Rd, Manchester M8 5BW", area: 1, manager: "MGR_CH" },
      { name: "Oxford Road", address: "149 Oxford Rd, Manchester M1 7EE", area: 1, manager: "MGR_OX" },
      { name: "Old Trafford", address: "Ayres Rd, Old Trafford, Stretford, M16 7GS", area: 1, manager: "MGR_OT" },
      { name: "Trafford Centre", address: "Kiosk K14, The Trafford Centre, Trafford Blvd", area: 2, manager: "MGR_TC" },
      { name: "Stockport", address: "884-886 Stockport Rd, Levenshulme, Manchester", area: 1, manager: "MGR_SR" },
      { name: "Rochdale", address: "35 Milkstone Rd, Rochdale OL11 1EB", area: 2, manager: "MGR_RD" },
      { name: "Oldham", address: "66 George St, Oldham OL1 1LS", area: 2, manager: "MGR_OL" }
    ];
    
    // Insert stores and get their ids
    const createdStores: Store[] = [];
    for (const store of storeData) {
      const [createdStore] = await db.insert(stores).values(store).returning();
      createdStores.push(createdStore);
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
        permissions: ["view_all_stores", "inventory_management", "staff_scheduling"],
        storeId: null
      },
      
      // Store manager with access to only their store
      { 
        username: "jubayed", 
        password: hashPassword, 
        firstName: "Jubayed", 
        lastName: "Ahmed", 
        name: "Jubayed Ahmed", 
        email: "jubayed@chaiiwala.co.uk", 
        title: "Store Manager", 
        role: "store", 
        permissions: ["store_management", "staff_scheduling"],
        storeId: 5 // Stockport Road
      },
      
      // Staff members
      { 
        username: "john", 
        password: hashPassword, 
        firstName: "John", 
        lastName: "Smith", 
        name: "John Smith", 
        email: "john@chaiiwala.co.uk", 
        title: "Staff", 
        role: "staff", 
        permissions: ["shift_management"],
        storeId: 1 // Cheetham Hill
      },
      { 
        username: "sarah", 
        password: hashPassword, 
        firstName: "Sarah", 
        lastName: "Johnson", 
        name: "Sarah Johnson", 
        email: "sarah@chaiiwala.co.uk", 
        title: "Staff", 
        role: "staff", 
        permissions: ["shift_management"],
        storeId: 2 // Oxford Road
      },
      { 
        username: "mike", 
        password: hashPassword, 
        firstName: "Mike", 
        lastName: "Williams", 
        name: "Mike Williams", 
        email: "mike@chaiiwala.co.uk", 
        title: "Staff", 
        role: "staff", 
        permissions: ["shift_management"],
        storeId: 3 // Old Trafford
      }
    ];
    
    // Insert users
    for (const user of userData) {
      await db.insert(users).values(user);
    }

    // Sample inventory items for different stores
    const inventoryData = [
      // Store 1 inventory (Cheetham Hill)
      { name: "Karak Tea", storeId: 1, sku: "KT-001", category: "Tea", quantity: "140 bags", status: "in_stock" },
      { name: "Masala Chai", storeId: 1, sku: "MC-001", category: "Tea", quantity: "95 bags", status: "in_stock" },
      { name: "Pink Tea", storeId: 1, sku: "PT-001", category: "Tea", quantity: "15 bags", status: "low_stock" },
      { name: "Milk", storeId: 1, sku: "MLK-001", category: "Dairy", quantity: "12 gallons", status: "low_stock" },
      { name: "Sugar", storeId: 1, sku: "SGR-001", category: "Sweeteners", quantity: "50 kg", status: "in_stock" },
      
      // Store 2 inventory (Oxford Road)
      { name: "Karak Tea", storeId: 2, sku: "KT-002", category: "Tea", quantity: "200 bags", status: "in_stock" },
      { name: "Masala Chai", storeId: 2, sku: "MC-002", category: "Tea", quantity: "65 bags", status: "in_stock" },
      { name: "Pink Tea", storeId: 2, sku: "PT-002", category: "Tea", quantity: "0 bags", status: "out_of_stock" },
      { name: "Milk", storeId: 2, sku: "MLK-002", category: "Dairy", quantity: "25 gallons", status: "in_stock" },
      { name: "Sugar", storeId: 2, sku: "SGR-002", category: "Sweeteners", quantity: "10 kg", status: "low_stock" },
    ];
    
    // Insert inventory items
    for (const item of inventoryData) {
      await db.insert(inventory).values({
        ...item,
        lastUpdated: new Date()
      });
    }

    // Sample tasks
    const taskData: InsertTask[] = [
      { 
        title: "Restock Karak Tea", 
        description: "Order new stock of Karak Tea from supplier", 
        storeId: 1, 
        assignedTo: 4, // John Smith 
        dueDate: "2025-04-07", 
        status: "todo",
        priority: "high"
      },
      { 
        title: "Clean coffee machines", 
        description: "Deep clean all coffee machines", 
        storeId: 2, 
        assignedTo: 5, // Sarah Johnson 
        dueDate: "2025-04-05", 
        status: "in_progress",
        priority: "medium"
      },
      { 
        title: "Staff training", 
        description: "Conduct training for new staff members", 
        storeId: 3, 
        assignedTo: 6, // Mike Williams 
        dueDate: "2025-04-10", 
        status: "todo",
        priority: "medium"
      },
      { 
        title: "Update menu boards", 
        description: "Update the menu boards with new pricing", 
        storeId: 5, // Stockport 
        assignedTo: 3, // Jubayed Ahmed 
        dueDate: "2025-04-03", 
        status: "completed",
        priority: "low"
      }
    ];
    
    // Insert tasks
    for (const task of taskData) {
      await db.insert(tasks).values(task);
    }

    // Sample checklists
    const checklistData: InsertChecklist[] = [
      {
        title: "Morning Opening Procedures",
        description: "Tasks to complete when opening the store in the morning",
        category: "Daily Operations",
        assignedTo: "Store Staff",
        dueDate: "2025-04-05",
        storeId: 1
      },
      {
        title: "Evening Closing Procedures",
        description: "Tasks to complete when closing the store in the evening",
        category: "Daily Operations",
        assignedTo: "Store Staff",
        dueDate: "2025-04-05",
        storeId: 2
      },
      {
        title: "Weekly Cleaning",
        description: "Deep cleaning tasks to complete weekly",
        category: "Cleaning",
        assignedTo: "Cleaning Staff",
        dueDate: "2025-04-09",
        storeId: 3
      }
    ];
    
    // Insert checklists and their tasks
    for (const checklist of checklistData) {
      const [createdChecklist] = await db.insert(checklists).values(checklist).returning();
      
      // Create default tasks for each checklist
      const checklistTasks = [
        "Verify inventory levels",
        "Clean work area",
        "Check equipment",
        "Update daily log"
      ];
      
      for (const taskTitle of checklistTasks) {
        await db.insert(checklistTasks).values({
          checklistId: createdChecklist.id,
          title: taskTitle,
          completed: false
        });
      }
    }

    // Sample staff schedules
    const scheduleData: InsertSchedule[] = [
      { staffId: 4, day: 1, start: "09:00", end: "17:00", storeId: 1 },
      { staffId: 4, day: 2, start: "09:00", end: "17:00", storeId: 1 },
      { staffId: 4, day: 3, start: "09:00", end: "17:00", storeId: 1 },
      { staffId: 5, day: 1, start: "12:00", end: "20:00", storeId: 2 },
      { staffId: 5, day: 2, start: "12:00", end: "20:00", storeId: 2 },
      { staffId: 5, day: 3, start: "12:00", end: "20:00", storeId: 2 },
      { staffId: 6, day: 4, start: "09:00", end: "17:00", storeId: 3 },
      { staffId: 6, day: 5, start: "09:00", end: "17:00", storeId: 3 },
      { staffId: 6, day: 6, start: "09:00", end: "17:00", storeId: 3 }
    ];
    
    // Insert schedules
    for (const schedule of scheduleData) {
      await db.insert(schedules).values(schedule);
    }

    // Sample announcements
    const announcementData: InsertAnnouncement[] = [
      {
        title: "New Summer Menu",
        content: "We are excited to announce our new summer menu with refreshing drinks and snacks!",
        author: "Shabnam Essa",
        category: "Menu Updates",
        important: true
      },
      {
        title: "Staff Appreciation Day",
        content: "We will be holding a staff appreciation day on May 15th. All staff members are invited to join for food and activities.",
        author: "Usman Aftab",
        category: "Events",
        important: false
      },
      {
        title: "Inventory System Update",
        content: "The inventory system will be updated on April 10th. Please make sure all inventory counts are up to date before then.",
        author: "Jubayed Ahmed",
        category: "Operations",
        important: true
      }
    ];
    
    // Insert announcements
    for (const announcement of announcementData) {
      await db.insert(announcements).values({
        ...announcement,
        date: new Date(),
        likes: Math.floor(Math.random() * 10)
      });
    }

    // Sample job logs with different flags
    const jobLogData: InsertJobLog[] = [
      {
        logDate: "2025-04-01",
        logTime: "09:30",
        loggedBy: "John Smith",
        storeId: 1,
        description: "Coffee machine not heating water properly",
        attachment: null,
        comments: "Technician has been called",
        flag: "normal"
      },
      {
        logDate: "2025-04-02",
        logTime: "14:15",
        loggedBy: "Sarah Johnson",
        storeId: 2,
        description: "Refrigerator temperature fluctuating",
        attachment: null,
        comments: "Needs immediate attention",
        flag: "urgent"
      },
      {
        logDate: "2025-03-15",
        logTime: "11:00",
        loggedBy: "Mike Williams",
        storeId: 3,
        description: "Leak in back room sink",
        attachment: null,
        comments: "Still waiting for plumber to schedule a visit",
        flag: "long_standing"
      },
      {
        logDate: "2025-04-03",
        logTime: "10:45",
        loggedBy: "Jubayed Ahmed",
        storeId: 5,
        description: "Front door lock not working properly",
        attachment: null,
        comments: "Security risk - needs immediate repair",
        flag: "urgent"
      }
    ];
    
    // Insert job logs
    for (const jobLog of jobLogData) {
      await db.insert(jobLogs).values({
        ...jobLog,
        createdAt: new Date()
      });
    }

    console.log("Initial data seeding complete!");
  }
}