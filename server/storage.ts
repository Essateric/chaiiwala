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
      { name: "Chocolate Dream Cake (16 per box)", sku: "FRZ-020", category: "Frozen Food", storeId: 4, quantity: "5 boxes", status: "in_stock", lastUpdated: new Date() }
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
