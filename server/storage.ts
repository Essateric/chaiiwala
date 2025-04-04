import { 
  User, InsertUser, 
  Store, InsertStore,
  Inventory, InsertInventory,
  Task, InsertTask,
  Checklist, InsertChecklist,
  ChecklistTask, InsertChecklistTask,
  Schedule, InsertSchedule,
  Announcement, InsertAnnouncement,
  JobLog, InsertJobLog
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllStaff(): Promise<{ id: number; name: string; role: string; color: string; }[]>;

  // Store methods
  getAllStores(): Promise<Store[]>;
  getStore(id: number): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;

  // Inventory methods
  getAllInventory(): Promise<Inventory[]>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, data: Partial<Inventory>): Promise<Inventory | undefined>;

  // Task methods
  getAllTasks(): Promise<Task[]>;
  getTodayTasks(): Promise<{ id: string; title: string; location: string; dueDate: string; completed: boolean; }[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, data: Partial<Task>): Promise<Task | undefined>;

  // Checklist methods
  getAllChecklists(): Promise<(Checklist & { tasks: ChecklistTask[] })[]>;
  createChecklist(checklist: InsertChecklist): Promise<Checklist>;
  createChecklistTask(task: InsertChecklistTask): Promise<ChecklistTask>;
  updateChecklistTask(checklistId: number, taskId: number, completed: boolean): Promise<ChecklistTask | undefined>;

  // Schedule methods
  getAllSchedules(): Promise<{ id: string; staffId: number; staffName: string; role: string; start: string; end: string; day: number; }[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;

  // Announcement methods
  getAllAnnouncements(): Promise<Announcement[]>;
  getRecentAnnouncements(): Promise<{ id: string; title: string; description: string; date: string; isHighlighted: boolean; }[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  likeAnnouncement(id: number): Promise<Announcement | undefined>;
  
  // Job Logs methods
  getAllJobLogs(): Promise<JobLog[]>;
  getJobLogsByStore(storeId: number): Promise<JobLog[]>;
  getJobLog(id: number): Promise<JobLog | undefined>;
  createJobLog(jobLog: InsertJobLog): Promise<JobLog>;
  updateJobLog(id: number, data: Partial<JobLog>): Promise<JobLog | undefined>;
}

export class MemStorage implements IStorage {
  sessionStore: session.Store;
  
  private users: Map<number, User>;
  private stores: Map<number, Store>;
  private inventory: Map<number, Inventory>;
  private tasks: Map<number, Task>;
  private checklists: Map<number, Checklist>;
  private checklistTasks: Map<number, ChecklistTask>;
  private schedules: Map<number, Schedule>;
  private announcements: Map<number, Announcement>;
  private jobLogs: Map<number, JobLog>;
  
  private userId: number;
  private storeId: number;
  private inventoryId: number;
  private taskId: number;
  private checklistId: number;
  private checklistTaskId: number;
  private scheduleId: number;
  private announcementId: number;
  private jobLogId: number;

  constructor() {
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

    // Initialize storage
    this.users = new Map();
    this.stores = new Map();
    this.inventory = new Map();
    this.tasks = new Map();
    this.checklists = new Map();
    this.checklistTasks = new Map();
    this.schedules = new Map();
    this.announcements = new Map();
    this.jobLogs = new Map();

    // Initialize IDs
    this.userId = 1;
    this.storeId = 1;
    this.inventoryId = 1;
    this.taskId = 1;
    this.checklistId = 1;
    this.checklistTaskId = 1;
    this.scheduleId = 1;
    this.announcementId = 1;
    this.jobLogId = 1;

    // Seed data
    this.seedInitialData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    
    // Ensure the user has all required fields
    const user: User = { 
      ...insertUser, 
      id,
      firstName: insertUser.firstName || "",
      lastName: insertUser.lastName || "",
      name: insertUser.name || `${insertUser.firstName || ""} ${insertUser.lastName || ""}`.trim(),
      email: insertUser.email || "",
      title: insertUser.title || null,
      permissions: insertUser.permissions || [] 
    };
    
    this.users.set(id, user);
    return user;
  }

  async getAllStaff(): Promise<{ id: number; name: string; role: string; color: string; storeId?: number; }[]> {
    const staffColors = ["#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF33A8", "#33FFF6"];
    return Array.from(this.users.values())
      .filter(user => user.role === 'staff' || user.role === 'store')
      .map((user, index) => ({
        id: user.id,
        name: user.name,
        role: user.role === 'staff' ? 'Staff' : 'Store Manager',
        color: staffColors[index % staffColors.length],
        storeId: user.storeId
      }));
  }
  
  async getStaffByStore(storeId: number): Promise<{ id: number; name: string; role: string; }[]> {
    return Array.from(this.users.values())
      .filter(user => (user.role === 'staff' || user.role === 'store') && user.storeId === storeId)
      .map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role === 'staff' ? 'Staff' : 'Store Manager'
      }));
  }

  // Store methods
  async getAllStores(): Promise<Store[]> {
    return Array.from(this.stores.values());
  }

  async getStore(id: number): Promise<Store | undefined> {
    return this.stores.get(id);
  }

  async createStore(insertStore: InsertStore): Promise<Store> {
    const id = this.storeId++;
    const store: Store = { ...insertStore, id };
    this.stores.set(id, store);
    return store;
  }

  // Inventory methods
  async getAllInventory(): Promise<Inventory[]> {
    return Array.from(this.inventory.values());
  }

  async createInventoryItem(insertInventory: InsertInventory): Promise<Inventory> {
    const id = this.inventoryId++;
    const item: Inventory = { 
      ...insertInventory, 
      id, 
      lastUpdated: new Date()
    };
    this.inventory.set(id, item);
    return item;
  }

  async updateInventoryItem(id: number, data: Partial<Inventory>): Promise<Inventory | undefined> {
    const item = this.inventory.get(id);
    if (!item) return undefined;
    
    const updatedItem: Inventory = { 
      ...item, 
      ...data, 
      lastUpdated: new Date() 
    };
    this.inventory.set(id, updatedItem);
    return updatedItem;
  }

  // Task methods
  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTodayTasks(): Promise<{ id: string; title: string; location: string; dueDate: string; completed: boolean; }[]> {
    const tasks = Array.from(this.tasks.values());
    
    return tasks.slice(0, 3).map(task => {
      const store = this.stores.get(task.storeId);
      return {
        id: task.id.toString(),
        title: task.title,
        location: store ? store.name : 'Unknown',
        dueDate: task.dueDate,
        completed: task.status === 'completed'
      };
    });
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskId++;
    const task: Task = { ...insertTask, id };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask: Task = { ...task, ...data };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  // Checklist methods
  async getAllChecklists(): Promise<(Checklist & { tasks: ChecklistTask[] })[]> {
    const checklists = Array.from(this.checklists.values());
    const allTasks = Array.from(this.checklistTasks.values());
    
    return checklists.map(checklist => {
      const tasks = allTasks.filter(task => task.checklistId === checklist.id);
      return {
        ...checklist,
        tasks
      };
    });
  }

  async createChecklist(insertChecklist: InsertChecklist): Promise<Checklist> {
    const id = this.checklistId++;
    const checklist: Checklist = { ...insertChecklist, id };
    this.checklists.set(id, checklist);
    
    // Create some default tasks for the checklist
    const defaultTasks = [
      "Verify inventory levels",
      "Clean work area",
      "Check equipment",
      "Update daily log"
    ];
    
    defaultTasks.forEach(title => {
      this.createChecklistTask({
        checklistId: id,
        title,
        completed: false
      });
    });
    
    return checklist;
  }

  async createChecklistTask(insertTask: InsertChecklistTask): Promise<ChecklistTask> {
    const id = this.checklistTaskId++;
    const task: ChecklistTask = { ...insertTask, id };
    this.checklistTasks.set(id, task);
    return task;
  }

  async updateChecklistTask(checklistId: number, taskId: number, completed: boolean): Promise<ChecklistTask | undefined> {
    const task = this.checklistTasks.get(taskId);
    if (!task || task.checklistId !== checklistId) return undefined;
    
    const updatedTask: ChecklistTask = { ...task, completed };
    this.checklistTasks.set(taskId, updatedTask);
    return updatedTask;
  }

  // Schedule methods
  async getAllSchedules(): Promise<{ id: string; staffId: number; staffName: string; role: string; start: string; end: string; day: number; }[]> {
    const schedules = Array.from(this.schedules.values());
    
    return schedules.map(schedule => {
      const staff = this.users.get(schedule.staffId);
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
    const id = this.scheduleId++;
    const schedule: Schedule = { ...insertSchedule, id };
    this.schedules.set(id, schedule);
    return schedule;
  }

  async deleteSchedule(id: number): Promise<void> {
    this.schedules.delete(id);
  }

  // Announcement methods
  async getAllAnnouncements(): Promise<Announcement[]> {
    return Array.from(this.announcements.values());
  }

  async getRecentAnnouncements(): Promise<{ id: string; title: string; description: string; date: string; isHighlighted: boolean; }[]> {
    const announcements = Array.from(this.announcements.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return announcements.slice(0, 2).map(announcement => ({
      id: announcement.id.toString(),
      title: announcement.title,
      description: announcement.content,
      date: this.formatAnnouncementDate(announcement.date),
      isHighlighted: announcement.important
    }));
  }

  async createAnnouncement(insertAnnouncement: InsertAnnouncement): Promise<Announcement> {
    const id = this.announcementId++;
    const announcement: Announcement = { 
      ...insertAnnouncement, 
      id, 
      date: new Date(),
      likes: 0
    };
    this.announcements.set(id, announcement);
    return announcement;
  }

  async likeAnnouncement(id: number): Promise<Announcement | undefined> {
    const announcement = this.announcements.get(id);
    if (!announcement) return undefined;
    
    const updatedAnnouncement: Announcement = { 
      ...announcement, 
      likes: announcement.likes + 1 
    };
    this.announcements.set(id, updatedAnnouncement);
    return updatedAnnouncement;
  }

  // Job Logs methods
  async getAllJobLogs(): Promise<JobLog[]> {
    return Array.from(this.jobLogs.values());
  }

  async getJobLogsByStore(storeId: number): Promise<JobLog[]> {
    return Array.from(this.jobLogs.values())
      .filter(log => log.storeId === storeId);
  }

  async getJobLog(id: number): Promise<JobLog | undefined> {
    return this.jobLogs.get(id);
  }

  async createJobLog(insertJobLog: InsertJobLog): Promise<JobLog> {
    const id = this.jobLogId++;
    const jobLog: JobLog = {
      ...insertJobLog,
      id,
      createdAt: new Date()
    };
    this.jobLogs.set(id, jobLog);
    return jobLog;
  }

  async updateJobLog(id: number, data: Partial<JobLog>): Promise<JobLog | undefined> {
    const jobLog = this.jobLogs.get(id);
    if (!jobLog) return undefined;
    
    const updatedJobLog: JobLog = {
      ...jobLog,
      ...data
    };
    this.jobLogs.set(id, updatedJobLog);
    return updatedJobLog;
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
  private seedInitialData() {
    // Initialize jobLogId
    this.jobLogId = 1;
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
    
    storeData.forEach(store => {
      this.createStore(store);
    });

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
        permissions: ["all_access", "admin_panel", "reports"]
      },
      
      // Regional manager with access to all stores and highest permissions
      { 
        username: "usman", 
        password: 'c8680ca3ea7be0ac4fef3954ccf3bb114ba12f8fab964e0a6f55ff9386c022a4f4a78e71343bd0e2213c11c86266a8c1a13d507752bdd80b492ae04a5ee9f2b6.b6e5be78c42ffc3595c7352fbd88fe9f', // password123
        firstName: "Usman", 
        lastName: "Aftab", 
        name: "Usman Aftab", 
        email: "usman.aftab@chaiiwala.co.uk", 
        title: "Regional Director", 
        role: "regional", 
        permissions: ["view_all_stores", "inventory_management", "staff_scheduling", "reporting", "task_management", "all_features"]
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
        permissions: ["all_access"] 
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
        permissions: ["view_all_stores", "inventory_management"] 
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
      { 
        username: "staff3", 
        password: hashPassword, 
        firstName: "David", 
        lastName: "Chen", 
        name: "David Chen", 
        email: "david@chaiiwala.com",
        title: "Store Associate",
        role: "staff", 
        storeId: 3, 
        permissions: ["basic_access"] 
      },
      { 
        username: "aisha", 
        password: hashPassword, 
        firstName: "Aisha", 
        lastName: "Khan", 
        name: "Aisha Khan", 
        email: "aisha@chaiiwala.com",
        title: "Team Lead",
        role: "staff", 
        storeId: 1, 
        permissions: ["basic_access"] 
      },
      { 
        username: "liam", 
        password: hashPassword, 
        firstName: "Liam", 
        lastName: "Smith", 
        name: "Liam Smith", 
        email: "liam@chaiiwala.com",
        title: "Barista",
        role: "staff", 
        storeId: 1, 
        permissions: ["basic_access"] 
      },
      { 
        username: "raj", 
        password: hashPassword, 
        firstName: "Raj", 
        lastName: "Patel", 
        name: "Raj Patel", 
        email: "raj@chaiiwala.com",
        title: "Team Lead",
        role: "staff", 
        storeId: 2, 
        permissions: ["basic_access"] 
      },
      { 
        username: "emily", 
        password: hashPassword, 
        firstName: "Emily", 
        lastName: "Johnson", 
        name: "Emily Johnson", 
        email: "emily@chaiiwala.com",
        title: "Barista",
        role: "staff", 
        storeId: 2, 
        permissions: ["basic_access"] 
      },
      { 
        username: "jayesh", 
        password: hashPassword, 
        firstName: "Jayesh", 
        lastName: "Mehta", 
        name: "Jayesh Mehta", 
        email: "jayesh@chaiiwala.com",
        title: "Team Lead",
        role: "staff", 
        storeId: 3, 
        permissions: ["basic_access"] 
      },
      { 
        username: "sonya", 
        password: hashPassword, 
        firstName: "Sonya", 
        lastName: "Williams", 
        name: "Sonya Williams", 
        email: "sonya@chaiiwala.com",
        title: "Barista",
        role: "staff", 
        storeId: 3, 
        permissions: ["basic_access"] 
      }
    ];
    
    userData.forEach(user => {
      this.createUser(user);
    });

    // Seed inventory
    const inventoryData: InsertInventory[] = [
      { name: "Chai Masala", sku: "INV-001", category: "Tea & Chai", storeId: 2, quantity: "5 kg", status: "low_stock", lastUpdated: new Date() },
      { name: "Milk", sku: "INV-002", category: "Beverages", storeId: 1, quantity: "24 liters", status: "in_stock", lastUpdated: new Date() },
      { name: "To-Go Cups (16oz)", sku: "INV-003", category: "Packaging", storeId: 4, quantity: "150 pcs", status: "on_order", lastUpdated: new Date() },
      { name: "Sugar", sku: "INV-004", category: "Food Ingredients", storeId: 3, quantity: "12 kg", status: "in_stock", lastUpdated: new Date() },
      { name: "Karak Tea Bags", sku: "INV-005", category: "Tea & Chai", storeId: 6, quantity: "0 boxes", status: "out_of_stock", lastUpdated: new Date() },
      
      // Packaging items from the provided list
      { name: "Leak-proof box for sandwiches/cheesecakes", sku: "PKG-001", category: "Packaging", storeId: 1, quantity: "200 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Hot drink cups 8oz", sku: "PKG-002", category: "Packaging", storeId: 1, quantity: "500 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Sip through lids", sku: "PKG-003", category: "Packaging", storeId: 1, quantity: "450 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Large 12oz Cups", sku: "PKG-004", category: "Packaging", storeId: 1, quantity: "350 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Large 12oz Lids", sku: "PKG-005", category: "Packaging", storeId: 1, quantity: "300 pcs", status: "low_stock", lastUpdated: new Date() },
      { name: "4oz Hot Drink Cup", sku: "PKG-006", category: "Packaging", storeId: 1, quantity: "200 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Greaseproof paper Chaiiwala times paper", sku: "PKG-007", category: "Packaging", storeId: 2, quantity: "400 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Printed Greaseproof Paper Bag", sku: "PKG-008", category: "Packaging", storeId: 2, quantity: "250 pcs", status: "low_stock", lastUpdated: new Date() },
      { name: "Chaiiwala Napkins", sku: "PKG-009", category: "Packaging", storeId: 2, quantity: "1000 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "12oz Chaiiwala PET cup", sku: "PKG-010", category: "Packaging", storeId: 2, quantity: "300 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "12oz Chaiiwala PET dome lids", sku: "PKG-011", category: "Packaging", storeId: 2, quantity: "50 pcs", status: "low_stock", lastUpdated: new Date() },
      { name: "16oz Chaiiwala PET cup", sku: "PKG-012", category: "Packaging", storeId: 3, quantity: "400 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "16oz Chaiiwala PET dome lids", sku: "PKG-013", category: "Packaging", storeId: 3, quantity: "75 pcs", status: "low_stock", lastUpdated: new Date() },
      { name: "Chaiiwala Mugs", sku: "PKG-014", category: "Packaging", storeId: 3, quantity: "25 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "6 Cup Chaii Carrier", sku: "PKG-015", category: "Packaging", storeId: 3, quantity: "100 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Printed paper carrier bag EXTRA LARGE", sku: "PKG-016", category: "Packaging", storeId: 3, quantity: "150 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Printed paper carrier bag MEDIUM", sku: "PKG-017", category: "Packaging", storeId: 4, quantity: "175 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Printed No Handle Takeaway Bags", sku: "PKG-018", category: "Packaging", storeId: 4, quantity: "200 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Printed Dessert Container", sku: "PKG-019", category: "Packaging", storeId: 4, quantity: "100 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Dessert Container Lid", sku: "PKG-020", category: "Packaging", storeId: 4, quantity: "60 pcs", status: "low_stock", lastUpdated: new Date() },
      { name: "Dome Lids for dessert Container", sku: "PKG-021", category: "Packaging", storeId: 4, quantity: "80 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Printed Sleeve Slider box", sku: "PKG-022", category: "Packaging", storeId: 5, quantity: "125 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Slider box Insert", sku: "PKG-023", category: "Packaging", storeId: 5, quantity: "110 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Printed Rice Bowl", sku: "PKG-024", category: "Packaging", storeId: 5, quantity: "90 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Printed Rice Bowl Lid", sku: "PKG-025", category: "Packaging", storeId: 5, quantity: "50 pcs", status: "low_stock", lastUpdated: new Date() },
      { name: "Kids Meal Boxes", sku: "PKG-026", category: "Packaging", storeId: 5, quantity: "75 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Kids Booklets", sku: "PKG-027", category: "Packaging", storeId: 5, quantity: "60 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Crayons", sku: "PKG-028", category: "Packaging", storeId: 5, quantity: "150 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "3 Compartment Container", sku: "PKG-029", category: "Packaging", storeId: 6, quantity: "100 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "3 Compartment Container Lid", sku: "PKG-030", category: "Packaging", storeId: 6, quantity: "85 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Printed Straws", sku: "PKG-031", category: "Packaging", storeId: 6, quantity: "300 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Wooden Stirrer", sku: "PKG-032", category: "Packaging", storeId: 6, quantity: "400 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Wooden Knives", sku: "PKG-033", category: "Packaging", storeId: 6, quantity: "200 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Wooden Spoons", sku: "PKG-034", category: "Packaging", storeId: 6, quantity: "220 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Wooden Forks", sku: "PKG-035", category: "Packaging", storeId: 6, quantity: "210 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "2oz Sauce Container", sku: "PKG-036", category: "Packaging", storeId: 7, quantity: "250 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Cup Carrier (2cup)", sku: "PKG-037", category: "Packaging", storeId: 7, quantity: "120 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Cup Carrier (4cup)", sku: "PKG-038", category: "Packaging", storeId: 7, quantity: "100 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Black Bin Bags", sku: "PKG-039", category: "Packaging", storeId: 7, quantity: "150 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Blue Roll", sku: "PKG-040", category: "Packaging", storeId: 7, quantity: "50 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Hair nets", sku: "PKG-041", category: "Packaging", storeId: 7, quantity: "300 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Beard nets", sku: "PKG-042", category: "Packaging", storeId: 7, quantity: "200 pcs", status: "in_stock", lastUpdated: new Date() },
      { name: "Wheelie bin bags", sku: "PKG-043", category: "Packaging", storeId: 7, quantity: "40 pcs", status: "low_stock", lastUpdated: new Date() },
      
      // Drinks items from the provided list
      { name: "Zanti Cola 300ml", sku: "DRK-001", category: "Drinks", storeId: 1, quantity: "48 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Zanit Zero 330ml", sku: "DRK-002", category: "Drinks", storeId: 1, quantity: "36 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Karma Cola Sugar Free 300ml", sku: "DRK-003", category: "Drinks", storeId: 1, quantity: "24 bottles", status: "low_stock", lastUpdated: new Date() },
      { name: "Orangeade 300ml", sku: "DRK-004", category: "Drinks", storeId: 2, quantity: "60 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Lemoney Lemonade 300ml", sku: "DRK-005", category: "Drinks", storeId: 2, quantity: "48 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Irn Bru 330ml", sku: "DRK-006", category: "Drinks", storeId: 2, quantity: "36 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Rubicon Mango 500ml", sku: "DRK-007", category: "Drinks", storeId: 3, quantity: "24 bottles", status: "low_stock", lastUpdated: new Date() },
      { name: "Rubicon Passion 500ml", sku: "DRK-008", category: "Drinks", storeId: 3, quantity: "36 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "RAW Orange and Mango 500ml", sku: "DRK-009", category: "Drinks", storeId: 4, quantity: "48 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "RAW Raspberry & Blueberry 500ml", sku: "DRK-010", category: "Drinks", storeId: 4, quantity: "24 bottles", status: "low_stock", lastUpdated: new Date() },
      { name: "Simply Fruity Orange 330ml", sku: "DRK-011", category: "Drinks", storeId: 5, quantity: "48 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Simply Fruity Blackcurrent Apple 330ml", sku: "DRK-012", category: "Drinks", storeId: 5, quantity: "36 bottles", status: "in_stock", lastUpdated: new Date() },
      
      // Frozen Food items from the provided list
      { name: "Masala Beans", sku: "FRZ-001", category: "Frozen Food", storeId: 1, quantity: "20 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Daal", sku: "FRZ-002", category: "Frozen Food", storeId: 1, quantity: "15 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Mogo Sauce", sku: "FRZ-003", category: "Frozen Food", storeId: 1, quantity: "25 jars", status: "in_stock", lastUpdated: new Date() },
      { name: "Paneer Sauce", sku: "FRZ-004", category: "Frozen Food", storeId: 1, quantity: "18 jars", status: "in_stock", lastUpdated: new Date() },
      { name: "Chilli Chutney", sku: "FRZ-005", category: "Frozen Food", storeId: 1, quantity: "22 jars", status: "in_stock", lastUpdated: new Date() },
      { name: "Pau Bhaji", sku: "FRZ-006", category: "Frozen Food", storeId: 1, quantity: "10 packs", status: "low_stock", lastUpdated: new Date() },
      { name: "Kunafa Pisatchio Mix", sku: "FRZ-007", category: "Frozen Food", storeId: 2, quantity: "12 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Gajar Halwa (1 piece)", sku: "FRZ-008", category: "Frozen Food", storeId: 2, quantity: "30 pieces", status: "in_stock", lastUpdated: new Date() },
      { name: "Gulab Jaman (1 piece)", sku: "FRZ-009", category: "Frozen Food", storeId: 2, quantity: "35 pieces", status: "in_stock", lastUpdated: new Date() },
      { name: "Butter Chicken", sku: "FRZ-010", category: "Frozen Food", storeId: 2, quantity: "15 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Roti (50 per box)", sku: "FRZ-011", category: "Frozen Food", storeId: 2, quantity: "8 boxes", status: "low_stock", lastUpdated: new Date() },
      { name: "Orange Juice (12x250ml)", sku: "FRZ-012", category: "Frozen Food", storeId: 2, quantity: "5 cases", status: "in_stock", lastUpdated: new Date() },
      { name: "Mini Sugared Doughnuts 13.5g (4x1)", sku: "FRZ-013", category: "Frozen Food", storeId: 3, quantity: "12 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Triple Belgium Choclate (36 x 80g)", sku: "FRZ-014", category: "Frozen Food", storeId: 3, quantity: "4 boxes", status: "low_stock", lastUpdated: new Date() },
      { name: "Belgian Choclate Chunk Cookie (36x80g)", sku: "FRZ-015", category: "Frozen Food", storeId: 3, quantity: "5 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Victoria Sponge Swirl (12 per box)", sku: "FRZ-016", category: "Frozen Food", storeId: 3, quantity: "6 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Chocolate Hazelnut Cake (12 per box)", sku: "FRZ-017", category: "Frozen Food", storeId: 3, quantity: "4 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Biscoff Cookie Pie (16 per box)", sku: "FRZ-018", category: "Frozen Food", storeId: 3, quantity: "3 boxes", status: "low_stock", lastUpdated: new Date() },
      { name: "Rocky Road Cheesecake (16 per box)", sku: "FRZ-019", category: "Frozen Food", storeId: 4, quantity: "4 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Strawberry Cheesecake (16 per box)", sku: "FRZ-020", category: "Frozen Food", storeId: 4, quantity: "5 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Chocolate Fudge Cake (15 per box)", sku: "FRZ-021", category: "Frozen Food", storeId: 4, quantity: "3 boxes", status: "low_stock", lastUpdated: new Date() },
      { name: "Veg Samosas (60 per box)", sku: "FRZ-022", category: "Frozen Food", storeId: 5, quantity: "10 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Meat Samosas (60 per box)", sku: "FRZ-023", category: "Frozen Food", storeId: 5, quantity: "8 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Vegan Samosas (60 per box)", sku: "FRZ-024", category: "Frozen Food", storeId: 5, quantity: "5 boxes", status: "low_stock", lastUpdated: new Date() },
      { name: "Vegetable Pakora (1kg bag)", sku: "FRZ-025", category: "Frozen Food", storeId: 5, quantity: "15 bags", status: "in_stock", lastUpdated: new Date() },
      { name: "Onion Bhaji (1kg bag)", sku: "FRZ-026", category: "Frozen Food", storeId: 6, quantity: "12 bags", status: "in_stock", lastUpdated: new Date() },
      { name: "Deluxe Kulfis (20 per box)", sku: "FRZ-027", category: "Frozen Food", storeId: 6, quantity: "8 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Mango Kulfi (18 per box)", sku: "FRZ-028", category: "Frozen Food", storeId: 6, quantity: "6 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Pistachio Kulfi (18 per box)", sku: "FRZ-029", category: "Frozen Food", storeId: 6, quantity: "5 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Malai Kulfi (18 per box)", sku: "FRZ-030", category: "Frozen Food", storeId: 7, quantity: "4 boxes", status: "low_stock", lastUpdated: new Date() },
      { name: "Vanilla Ice Cream (5L)", sku: "FRZ-031", category: "Frozen Food", storeId: 7, quantity: "10 tubs", status: "in_stock", lastUpdated: new Date() },
      { name: "Chocolate Ice Cream (5L)", sku: "FRZ-032", category: "Frozen Food", storeId: 7, quantity: "8 tubs", status: "in_stock", lastUpdated: new Date() },
      { name: "Mango Ice Cream (5L)", sku: "FRZ-033", category: "Frozen Food", storeId: 7, quantity: "6 tubs", status: "in_stock", lastUpdated: new Date() },
      { name: "Chocolate Dream Cake (16 per box)", sku: "FRZ-036", category: "Frozen Food", storeId: 4, quantity: "5 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "NY Vanilla Cheesecake (16 per box)", sku: "FRZ-037", category: "Frozen Food", storeId: 4, quantity: "3 boxes", status: "low_stock", lastUpdated: new Date() },
      { name: "Biscoff Milk Cake 12 pack", sku: "FRZ-038", category: "Frozen Food", storeId: 4, quantity: "4 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Pistachio Milk Cake 12 pack", sku: "FRZ-039", category: "Frozen Food", storeId: 5, quantity: "3 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Date and Banana Milk Cake", sku: "FRZ-040", category: "Frozen Food", storeId: 5, quantity: "5 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Bhaklava Fudge Cake", sku: "FRZ-041", category: "Frozen Food", storeId: 5, quantity: "2 cakes", status: "low_stock", lastUpdated: new Date() },
      { name: "Chaii Cake", sku: "FRZ-042", category: "Frozen Food", storeId: 5, quantity: "4 cakes", status: "in_stock", lastUpdated: new Date() },
      { name: "Cheesecake Gulab Jamun (16 per box)", sku: "FRZ-043", category: "Frozen Food", storeId: 5, quantity: "3 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Rose Ice Cream (5L)", sku: "FRZ-044", category: "Frozen Food", storeId: 6, quantity: "6 tubs", status: "in_stock", lastUpdated: new Date() },
      { name: "Mango Ice Cream (5L)", sku: "FRZ-045", category: "Frozen Food", storeId: 6, quantity: "5 tubs", status: "in_stock", lastUpdated: new Date() },
      { name: "Vanilla Ice Cream (5L)", sku: "FRZ-046", category: "Frozen Food", storeId: 6, quantity: "4 tubs", status: "in_stock", lastUpdated: new Date() },
      { name: "Frozen Paratha (120) per box)", sku: "FRZ-047", category: "Frozen Food", storeId: 6, quantity: "3 boxes", status: "low_stock", lastUpdated: new Date() },
      { name: "Frozen mogo chips (500g x 20 per box)", sku: "FRZ-048", category: "Frozen Food", storeId: 6, quantity: "4 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Chicken Seekh Kebab", sku: "FRZ-049", category: "Frozen Food", storeId: 6, quantity: "15 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Veg Kebab", sku: "FRZ-050", category: "Frozen Food", storeId: 7, quantity: "10 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Chicken Nuggets (6x1kg)", sku: "FRZ-051", category: "Frozen Food", storeId: 7, quantity: "3 boxes", status: "in_stock", lastUpdated: new Date() },
      
      // Dry Food items
      { name: "Limbu Pani (5L)", sku: "DRY-001", category: "Dry Food", storeId: 1, quantity: "10 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Pink Chaii Mix (50 per box)", sku: "DRY-002", category: "Dry Food", storeId: 1, quantity: "8 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Garam Choc (10 x 1 kg)", sku: "DRY-003", category: "Dry Food", storeId: 1, quantity: "5 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Karak Chaii (25 per box)", sku: "DRY-004", category: "Dry Food", storeId: 1, quantity: "12 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Karak Coffee (50 per box)", sku: "DRY-005", category: "Dry Food", storeId: 1, quantity: "6 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Karak Chaii Sugar free (50 per box)", sku: "DRY-006", category: "Dry Food", storeId: 2, quantity: "4 boxes", status: "low_stock", lastUpdated: new Date() },
      { name: "Chaii Latte (1kg)", sku: "DRY-007", category: "Dry Food", storeId: 2, quantity: "8 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Vegan Chaii Powder", sku: "DRY-008", category: "Dry Food", storeId: 2, quantity: "6 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Monin Gingerbread Syrup (1L)", sku: "DRY-009", category: "Dry Food", storeId: 2, quantity: "4 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Monin Caramel Syrup (1L)", sku: "DRY-010", category: "Dry Food", storeId: 2, quantity: "5 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Lemon Tea Syrup (1L)", sku: "DRY-011", category: "Dry Food", storeId: 3, quantity: "6 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "French Vanilla syrup (1L)", sku: "DRY-012", category: "Dry Food", storeId: 3, quantity: "4 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Blue Curacao Syrup (70cl)", sku: "DRY-013", category: "Dry Food", storeId: 3, quantity: "3 bottles", status: "low_stock", lastUpdated: new Date() },
      { name: "Strawberry Syrup SF (1L)", sku: "DRY-014", category: "Dry Food", storeId: 3, quantity: "5 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Rooh Afza Syrup (12x800ml)", sku: "DRY-015", category: "Dry Food", storeId: 3, quantity: "2 cases", status: "low_stock", lastUpdated: new Date() },
      { name: "Watermelon & Lime Syrup (1.5L)", sku: "DRY-016", category: "Dry Food", storeId: 4, quantity: "4 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Tahitian Lime & Mint (1.5L)", sku: "DRY-017", category: "Dry Food", storeId: 4, quantity: "3 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Speculouse Sauce (1kg)", sku: "DRY-018", category: "Dry Food", storeId: 4, quantity: "5 jars", status: "in_stock", lastUpdated: new Date() },
      { name: "Raspberry Topping Sauce (1kg)", sku: "DRY-019", category: "Dry Food", storeId: 4, quantity: "4 jars", status: "in_stock", lastUpdated: new Date() },
      { name: "Pistachio Sauce (1L)", sku: "DRY-020", category: "Dry Food", storeId: 4, quantity: "3 bottles", status: "low_stock", lastUpdated: new Date() },
      { name: "Luxury White Chocolate Sauce", sku: "DRY-021", category: "Dry Food", storeId: 5, quantity: "6 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Milk Choc Topping Sauce", sku: "DRY-022", category: "Dry Food", storeId: 5, quantity: "7 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Frappe Powder (2kg)", sku: "DRY-023", category: "Dry Food", storeId: 5, quantity: "4 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Chicken Tikka Crisps x 24", sku: "DRY-024", category: "Dry Food", storeId: 5, quantity: "10 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Chilli & Lime Crisps x 24", sku: "DRY-025", category: "Dry Food", storeId: 5, quantity: "8 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Decaf Coffee Beans", sku: "DRY-026", category: "Dry Food", storeId: 6, quantity: "5 kg", status: "in_stock", lastUpdated: new Date() },
      { name: "Coffee Beans", sku: "DRY-027", category: "Dry Food", storeId: 6, quantity: "10 kg", status: "in_stock", lastUpdated: new Date() },
      { name: "Cake Rusk (50 per box)", sku: "DRY-028", category: "Dry Food", storeId: 6, quantity: "5 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Bombay Mix (40x50g)", sku: "DRY-029", category: "Dry Food", storeId: 6, quantity: "3 cases", status: "low_stock", lastUpdated: new Date() },
      { name: "Tandoori Peanuts (40x50g)", sku: "DRY-030", category: "Dry Food", storeId: 6, quantity: "4 cases", status: "in_stock", lastUpdated: new Date() },
      { name: "Chilli Lemon Corn Nuts (40x50g)", sku: "DRY-031", category: "Dry Food", storeId: 7, quantity: "5 cases", status: "in_stock", lastUpdated: new Date() },
      { name: "Madeira Loaf Cake (24)", sku: "DRY-032", category: "Dry Food", storeId: 7, quantity: "2 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Blueberry Muffin (20)", sku: "DRY-033", category: "Dry Food", storeId: 7, quantity: "3 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Belgian choclate Muffin (20)", sku: "DRY-034", category: "Dry Food", storeId: 7, quantity: "4 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Zesty Fruit Granola Bar (24)", sku: "DRY-035", category: "Dry Food", storeId: 7, quantity: "3 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Belgian Caramel Shortbread (24)", sku: "DRY-036", category: "Dry Food", storeId: 1, quantity: "4 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Chocolate Krispy (24)", sku: "DRY-037", category: "Dry Food", storeId: 1, quantity: "5 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Parle-G (144 per box)", sku: "DRY-038", category: "Dry Food", storeId: 1, quantity: "2 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Omelette Mix", sku: "DRY-039", category: "Dry Food", storeId: 1, quantity: "25 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Gunpowder Spice Mix (5x1kg)", sku: "DRY-040", category: "Dry Food", storeId: 2, quantity: "3 cases", status: "in_stock", lastUpdated: new Date() },
      { name: "Chaat Masala (10x500g)", sku: "DRY-041", category: "Dry Food", storeId: 2, quantity: "2 cases", status: "low_stock", lastUpdated: new Date() },
      { name: "Falooda mix Rose (20 per pack)", sku: "DRY-042", category: "Dry Food", storeId: 2, quantity: "4 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Falooda mix Mango (20 per pack)", sku: "DRY-043", category: "Dry Food", storeId: 2, quantity: "3 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "White Sugar Sachets (1000 per box)", sku: "DRY-044", category: "Dry Food", storeId: 3, quantity: "5 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Brown Sugar Sachets (1000 per box)", sku: "DRY-045", category: "Dry Food", storeId: 3, quantity: "4 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Salt Sachets (2000 per box)", sku: "DRY-046", category: "Dry Food", storeId: 3, quantity: "2 boxes", status: "low_stock", lastUpdated: new Date() },
      { name: "Pepper Sachets (2000 per box)", sku: "DRY-047", category: "Dry Food", storeId: 3, quantity: "3 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Yogurt and Mint Sauce", sku: "DRY-048", category: "Dry Food", storeId: 4, quantity: "15 jars", status: "in_stock", lastUpdated: new Date() },
      { name: "Burger Relish", sku: "DRY-049", category: "Dry Food", storeId: 4, quantity: "12 jars", status: "in_stock", lastUpdated: new Date() },
      { name: "Tamarind Sauce", sku: "DRY-050", category: "Dry Food", storeId: 4, quantity: "10 jars", status: "in_stock", lastUpdated: new Date() },
      { name: "Onion Chutney", sku: "DRY-051", category: "Dry Food", storeId: 4, quantity: "14 jars", status: "in_stock", lastUpdated: new Date() },
      { name: "Chick Peas", sku: "DRY-052", category: "Dry Food", storeId: 5, quantity: "20 tins", status: "in_stock", lastUpdated: new Date() },
      { name: "Poppadom Pellets (13kg)", sku: "DRY-053", category: "Dry Food", storeId: 5, quantity: "2 bags", status: "low_stock", lastUpdated: new Date() },
      { name: "Crispy Fried Onions (12X300G)", sku: "DRY-054", category: "Dry Food", storeId: 5, quantity: "4 cases", status: "in_stock", lastUpdated: new Date() },
      { name: "Sofra Cheese", sku: "DRY-055", category: "Dry Food", storeId: 5, quantity: "8 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Masala Sauce for Chips/Sandwiches", sku: "DRY-056", category: "Dry Food", storeId: 6, quantity: "12 jars", status: "in_stock", lastUpdated: new Date() },
      { name: "Naan", sku: "DRY-057", category: "Dry Food", storeId: 6, quantity: "40 pieces", status: "in_stock", lastUpdated: new Date() },
      { name: "Paani", sku: "DRY-058", category: "Dry Food", storeId: 6, quantity: "15 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Puri", sku: "DRY-059", category: "Dry Food", storeId: 6, quantity: "60 pieces", status: "in_stock", lastUpdated: new Date() },
      { name: "Chaiiwala Honey", sku: "DRY-060", category: "Dry Food", storeId: 7, quantity: "10 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Honey Tubs (1.36kg)", sku: "DRY-061", category: "Dry Food", storeId: 7, quantity: "5 tubs", status: "in_stock", lastUpdated: new Date() },
      
      // Miscellaneous items
      { name: "Small Urn (25 cup)", sku: "MISC-001", category: "Miscellaneous", storeId: 5, quantity: "5 units", status: "in_stock", lastUpdated: new Date() },
      { name: "Medium Urn (50 cup)", sku: "MISC-002", category: "Miscellaneous", storeId: 5, quantity: "4 units", status: "in_stock", lastUpdated: new Date() },
      { name: "Large Urn (100 cup)", sku: "MISC-003", category: "Miscellaneous", storeId: 5, quantity: "3 units", status: "in_stock", lastUpdated: new Date() },
      { name: "Extra Large Urn (200 cup)", sku: "MISC-004", category: "Miscellaneous", storeId: 5, quantity: "2 units", status: "low_stock", lastUpdated: new Date() },
      { name: "Faucet Kit (Tap for Urn)", sku: "MISC-005", category: "Miscellaneous", storeId: 5, quantity: "10 kits", status: "in_stock", lastUpdated: new Date() },
      { name: "Spout Kit (Screw for Urn)", sku: "MISC-006", category: "Miscellaneous", storeId: 6, quantity: "15 kits", status: "in_stock", lastUpdated: new Date() },
      { name: "Urn Vent Caps", sku: "MISC-007", category: "Miscellaneous", storeId: 6, quantity: "20 units", status: "in_stock", lastUpdated: new Date() },
      { name: "Urn Clip", sku: "MISC-008", category: "Miscellaneous", storeId: 6, quantity: "25 units", status: "in_stock", lastUpdated: new Date() },
      { name: "Small Urn Gasket (Rubber)", sku: "MISC-009", category: "Miscellaneous", storeId: 6, quantity: "12 units", status: "in_stock", lastUpdated: new Date() },
      { name: "Medium/Large Urn Gasket (Rubber)", sku: "MISC-010", category: "Miscellaneous", storeId: 6, quantity: "8 units", status: "low_stock", lastUpdated: new Date() },
      { name: "Extra Large Urn Gasket (Rubber)", sku: "MISC-011", category: "Miscellaneous", storeId: 7, quantity: "5 units", status: "low_stock", lastUpdated: new Date() },
      { name: "Coffee Machine Cleaner", sku: "MISC-012", category: "Miscellaneous", storeId: 7, quantity: "10 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Safet and Cleaning LOG", sku: "MISC-013", category: "Miscellaneous", storeId: 7, quantity: "15 books", status: "in_stock", lastUpdated: new Date() },
      { name: "Crib Sheets", sku: "MISC-014", category: "Miscellaneous", storeId: 7, quantity: "20 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Roband Grill Sheets (10 per box)", sku: "MISC-015", category: "Miscellaneous", storeId: 7, quantity: "5 boxes", status: "in_stock", lastUpdated: new Date() },
      { name: "Till Rolls (80x76)", sku: "MISC-016", category: "Miscellaneous", storeId: 1, quantity: "30 rolls", status: "in_stock", lastUpdated: new Date() },
      { name: "Large Thali", sku: "MISC-017", category: "Miscellaneous", storeId: 1, quantity: "40 units", status: "in_stock", lastUpdated: new Date() },
      { name: "Small Thali", sku: "MISC-018", category: "Miscellaneous", storeId: 1, quantity: "50 units", status: "in_stock", lastUpdated: new Date() },
      { name: "Steel bowls", sku: "MISC-019", category: "Miscellaneous", storeId: 1, quantity: "45 units", status: "in_stock", lastUpdated: new Date() },
      { name: "Steel Jugs (12 per pack)", sku: "MISC-020", category: "Miscellaneous", storeId: 2, quantity: "3 packs", status: "in_stock", lastUpdated: new Date() },
      { name: "Large Milk Pans", sku: "MISC-021", category: "Miscellaneous", storeId: 2, quantity: "8 units", status: "in_stock", lastUpdated: new Date() },
      { name: "Omelette Pan", sku: "MISC-022", category: "Miscellaneous", storeId: 2, quantity: "6 units", status: "in_stock", lastUpdated: new Date() },
      { name: "5ltr Napoli containers", sku: "MISC-023", category: "Miscellaneous", storeId: 2, quantity: "10 units", status: "in_stock", lastUpdated: new Date() },
      { name: "Monin 70cl Pump", sku: "MISC-024", category: "Miscellaneous", storeId: 3, quantity: "8 units", status: "in_stock", lastUpdated: new Date() },
      { name: "Monin 1ltr Pump", sku: "MISC-025", category: "Miscellaneous", storeId: 3, quantity: "6 units", status: "in_stock", lastUpdated: new Date() },
      { name: "Chaiiwala Pumps", sku: "MISC-026", category: "Miscellaneous", storeId: 3, quantity: "15 units", status: "in_stock", lastUpdated: new Date() },
      { name: "3000ml Jugs for eggs and faloodas", sku: "MISC-027", category: "Miscellaneous", storeId: 3, quantity: "5 units", status: "low_stock", lastUpdated: new Date() },
      { name: "Sanatiser", sku: "MISC-028", category: "Miscellaneous", storeId: 4, quantity: "20 bottles", status: "in_stock", lastUpdated: new Date() },
      { name: "Black Baskets", sku: "MISC-029", category: "Miscellaneous", storeId: 4, quantity: "30 units", status: "in_stock", lastUpdated: new Date() }
    ];
    
    inventoryData.forEach(item => {
      this.createInventoryItem(item);
    });

    // Seed tasks
    const taskData: InsertTask[] = [
      { title: "Review weekly inventory reports", description: "Check inventory levels across all stores", storeId: 1, assignedTo: 2, dueDate: "2023-07-15", status: "todo", priority: "medium" },
      { title: "Schedule staff for next week", description: "Ensure all shifts are covered", storeId: 2, assignedTo: 4, dueDate: "2023-07-14", status: "in_progress", priority: "high" },
      { title: "Follow up on low stock orders", description: "Contact suppliers for pending orders", storeId: 1, assignedTo: 3, dueDate: "2023-07-16", status: "todo", priority: "medium" },
      { title: "Train new staff on POS system", description: "Schedule 2-hour training session", storeId: 3, assignedTo: 5, dueDate: "2023-07-20", status: "todo", priority: "low" },
      { title: "Update menu pricing", description: "Implement new pricing structure", storeId: 4, assignedTo: 2, dueDate: "2023-07-25", status: "todo", priority: "high" }
    ];
    
    taskData.forEach(task => {
      this.createTask(task);
    });

    // Seed checklists
    const checklistData: InsertChecklist[] = [
      { title: "Morning Opening Procedures", description: "Tasks to complete before opening the store", category: "opening", assignedTo: "store_manager", storeId: 1 },
      { title: "Evening Closing Procedures", description: "Tasks to complete before closing the store", category: "closing", assignedTo: "staff", storeId: 2 },
      { title: "Weekly Health & Safety Check", description: "Ensure all safety protocols are followed", category: "health", assignedTo: "store_manager", dueDate: "2023-07-20", storeId: 3 }
    ];
    
    checklistData.forEach(checklist => {
      this.createChecklist(checklist);
    });

    // Seed schedules for staff
    const scheduleData: InsertSchedule[] = [
      { staffId: 5, day: 1, start: "09:00", end: "17:00", storeId: 1 },
      { staffId: 5, day: 2, start: "09:00", end: "17:00", storeId: 1 },
      { staffId: 5, day: 3, start: "12:00", end: "20:00", storeId: 1 },
      { staffId: 6, day: 1, start: "12:00", end: "20:00", storeId: 2 },
      { staffId: 6, day: 4, start: "09:00", end: "17:00", storeId: 2 },
      { staffId: 6, day: 5, start: "09:00", end: "17:00", storeId: 2 },
      { staffId: 7, day: 2, start: "12:00", end: "20:00", storeId: 3 },
      { staffId: 7, day: 3, start: "12:00", end: "20:00", storeId: 3 },
      { staffId: 7, day: 6, start: "10:00", end: "18:00", storeId: 3 }
    ];
    
    scheduleData.forEach(schedule => {
      this.createSchedule(schedule);
    });

    // Seed announcements
    const announcementData: InsertAnnouncement[] = [
      { 
        title: "New Chai Smoothie Launching Next Month", 
        content: "Training sessions will be scheduled starting next week.", 
        author: "Admin User", 
        category: "product", 
        important: true 
      },
      { 
        title: "Updated Health & Safety Guidelines", 
        content: "All store managers please review and implement immediately.", 
        author: "Fatima Khan", 
        category: "operations", 
        important: false 
      },
      { 
        title: "Staff Appreciation Week", 
        content: "Next week is Staff Appreciation Week. Special activities planned for all locations.", 
        author: "Admin User", 
        category: "hr", 
        important: true 
      }
    ];
    
    // Set dates to appear like they were posted at different times
    const now = new Date();
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(now.getDate() - 2);
    
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);
    
    this.createAnnouncement(announcementData[0])
      .then(announcement => {
        this.announcements.set(announcement.id, { ...announcement, date: twoDaysAgo });
      });
    
    this.createAnnouncement(announcementData[1])
      .then(announcement => {
        this.announcements.set(announcement.id, { ...announcement, date: oneWeekAgo });
      });
    
    this.createAnnouncement(announcementData[2])
      .then(announcement => {
        this.announcements.set(announcement.id, { ...announcement, date: twoWeeksAgo });
      });
      
    // Seed job logs
    const jobLogData: InsertJobLog[] = [
      {
        storeId: 1,
        description: "Coffee machine needs service - steam wand not working properly",
        logDate: "2023-07-15",
        logTime: "09:30",
        loggedBy: "Ahmed Khan",
        attachment: null,
        comments: "Engineer scheduled for tomorrow",
        flag: "normal"
      },
      {
        storeId: 1,
        description: "Refrigerator temperature fluctuating",
        logDate: "2023-07-14",
        logTime: "16:45",
        loggedBy: "Mohammed Ali",
        attachment: null,
        comments: "Called maintenance, waiting for callback",
        flag: "urgent"
      },
      {
        storeId: 2,
        description: "Payment terminal occasionally freezing during transactions",
        logDate: "2023-07-10",
        logTime: "14:20",
        loggedBy: "Sarah Smith",
        attachment: null,
        comments: "Support ticket opened with provider #45692",
        flag: "long_standing"
      },
      {
        storeId: 3,
        description: "Leaking pipe under sink in back kitchen",
        logDate: "2023-07-13",
        logTime: "11:15",
        loggedBy: "David Chen",
        attachment: null,
        comments: "Plumber booked for next Tuesday",
        flag: "normal"
      },
      {
        storeId: 5,
        description: "Front door hinge loose, door not closing properly",
        logDate: "2023-07-12",
        logTime: "08:00",
        loggedBy: "Jubayed Chowdhury",
        attachment: null,
        comments: "Temporary fix applied, needs proper repair",
        flag: "long_standing"
      }
    ];
    
    jobLogData.forEach(jobLog => {
      this.createJobLog(jobLog);
    });
  }
}

import { DatabaseStorage } from "./database-storage";

// Use database storage instead of in-memory storage
export const storage = new DatabaseStorage();
