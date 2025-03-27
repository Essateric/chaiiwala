import { 
  User, InsertUser, 
  Store, InsertStore,
  Inventory, InsertInventory,
  Task, InsertTask,
  Checklist, InsertChecklist,
  ChecklistTask, InsertChecklistTask,
  Schedule, InsertSchedule,
  Announcement, InsertAnnouncement
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Session store
  sessionStore: session.SessionStore;

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
}

export class MemStorage implements IStorage {
  sessionStore: session.SessionStore;
  
  private users: Map<number, User>;
  private stores: Map<number, Store>;
  private inventory: Map<number, Inventory>;
  private tasks: Map<number, Task>;
  private checklists: Map<number, Checklist>;
  private checklistTasks: Map<number, ChecklistTask>;
  private schedules: Map<number, Schedule>;
  private announcements: Map<number, Announcement>;
  
  private userId: number;
  private storeId: number;
  private inventoryId: number;
  private taskId: number;
  private checklistId: number;
  private checklistTaskId: number;
  private scheduleId: number;
  private announcementId: number;

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

    // Initialize IDs
    this.userId = 1;
    this.storeId = 1;
    this.inventoryId = 1;
    this.taskId = 1;
    this.checklistId = 1;
    this.checklistTaskId = 1;
    this.scheduleId = 1;
    this.announcementId = 1;

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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllStaff(): Promise<{ id: number; name: string; role: string; color: string; }[]> {
    const staffColors = ["#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF33A8", "#33FFF6"];
    return Array.from(this.users.values())
      .filter(user => user.role === 'staff' || user.role === 'store')
      .map((user, index) => ({
        id: user.id,
        name: user.name,
        role: user.role === 'staff' ? 'Staff' : 'Store Manager',
        color: staffColors[index % staffColors.length]
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
      { username: "admin", password: hashPassword, name: "Admin User", role: "admin" },
      { username: "regional1", password: hashPassword, name: "Fatima Khan", role: "regional" },
      { username: "manager1", password: hashPassword, name: "Ahmed Khan", role: "store", storeId: 1 },
      { username: "manager2", password: hashPassword, name: "Sarah Smith", role: "store", storeId: 2 },
      { username: "staff1", password: hashPassword, name: "Mohammed Ali", role: "staff", storeId: 1 },
      { username: "staff2", password: hashPassword, name: "Jessica Patel", role: "staff", storeId: 2 },
      { username: "staff3", password: hashPassword, name: "David Chen", role: "staff", storeId: 3 }
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
      { name: "Karak Tea Bags", sku: "INV-005", category: "Tea & Chai", storeId: 6, quantity: "0 boxes", status: "out_of_stock", lastUpdated: new Date() }
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
  }
}

export const storage = new MemStorage();
