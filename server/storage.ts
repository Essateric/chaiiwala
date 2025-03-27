import { users, stores, regions, inventory, staffSchedules, tasks, checklists, checklistItems, announcements } from "@shared/schema";
import type { 
  User, InsertUser, 
  Store, InsertStore, 
  Region, InsertRegion, 
  Inventory, InsertInventory, 
  StaffSchedule, InsertStaffSchedule, 
  Task, InsertTask, 
  Checklist, InsertChecklist, 
  ChecklistItem, InsertChecklistItem, 
  Announcement, InsertAnnouncement 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

// Create a type for the session store
type SessionStore = ReturnType<typeof createMemoryStore>;
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByStore(storeId: number): Promise<User[]>;
  getUsersByRegion(regionId: number): Promise<User[]>;

  // Stores
  getStore(id: number): Promise<Store | undefined>;
  getStores(): Promise<Store[]>;
  getStoresByRegion(regionId: number): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, store: Partial<Store>): Promise<Store | undefined>;

  // Regions
  getRegion(id: number): Promise<Region | undefined>;
  getRegions(): Promise<Region[]>;
  createRegion(region: InsertRegion): Promise<Region>;

  // Inventory
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  getInventoryByStore(storeId: number): Promise<Inventory[]>;
  getLowStockItems(storeId: number): Promise<Inventory[]>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, item: Partial<Inventory>): Promise<Inventory | undefined>;

  // Staff Schedules
  getStaffSchedule(id: number): Promise<StaffSchedule | undefined>;
  getStaffSchedulesByStore(storeId: number): Promise<StaffSchedule[]>;
  getStaffSchedulesByUser(userId: number): Promise<StaffSchedule[]>;
  createStaffSchedule(schedule: InsertStaffSchedule): Promise<StaffSchedule>;
  updateStaffSchedule(id: number, schedule: Partial<StaffSchedule>): Promise<StaffSchedule | undefined>;
  deleteStaffSchedule(id: number): Promise<boolean>;

  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  getTasksByStore(storeId: number): Promise<Task[]>;
  getTasksByUser(userId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;

  // Checklists
  getChecklist(id: number): Promise<Checklist | undefined>;
  getChecklistsByStore(storeId: number): Promise<Checklist[]>;
  createChecklist(checklist: InsertChecklist): Promise<Checklist>;
  updateChecklist(id: number, checklist: Partial<Checklist>): Promise<Checklist | undefined>;

  // Checklist Items
  getChecklistItem(id: number): Promise<ChecklistItem | undefined>;
  getChecklistItemsByChecklist(checklistId: number): Promise<ChecklistItem[]>;
  createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem>;
  updateChecklistItem(id: number, item: Partial<ChecklistItem>): Promise<ChecklistItem | undefined>;
  resetWeeklyChecklists(): Promise<void>;

  // Announcements
  getAnnouncement(id: number): Promise<Announcement | undefined>;
  getAnnouncementsByStore(storeId: number): Promise<Announcement[]>;
  getAnnouncementsByRegion(regionId: number): Promise<Announcement[]>;
  getGlobalAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;

  // Session store
  sessionStore: SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private stores: Map<number, Store>;
  private regions: Map<number, Region>;
  private inventory: Map<number, Inventory>;
  private staffSchedules: Map<number, StaffSchedule>;
  private tasks: Map<number, Task>;
  private checklists: Map<number, Checklist>;
  private checklistItems: Map<number, ChecklistItem>;
  private announcements: Map<number, Announcement>;
  
  sessionStore: SessionStore;
  currentUserId: number;
  currentStoreId: number;
  currentRegionId: number;
  currentInventoryId: number;
  currentScheduleId: number;
  currentTaskId: number;
  currentChecklistId: number;
  currentChecklistItemId: number;
  currentAnnouncementId: number;

  constructor() {
    this.users = new Map();
    this.stores = new Map();
    this.regions = new Map();
    this.inventory = new Map();
    this.staffSchedules = new Map();
    this.tasks = new Map();
    this.checklists = new Map();
    this.checklistItems = new Map();
    this.announcements = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    this.currentUserId = 1;
    this.currentStoreId = 1;
    this.currentRegionId = 1;
    this.currentInventoryId = 1;
    this.currentScheduleId = 1;
    this.currentTaskId = 1;
    this.currentChecklistId = 1;
    this.currentChecklistItemId = 1;
    this.currentAnnouncementId = 1;
    
    // Initialize with sample data
    this.initializeData();
  }
  
  private initializeData() {
    // Create admin user
    const adminUser: InsertUser = {
      username: "admin",
      password: "$2b$10$dKLfHMBJtqTH2O7mwFW/6eNMYOWHzq7p.ZmYS1/fMbZ96qKU4D/iy", // password is 'admin123'
      name: "Admin User",
      role: "admin",
      email: "admin@chaiiwala.com",
      storeId: null,
      regionId: null
    };
    
    this.createUser(adminUser);
    
    // Create a region
    const region: InsertRegion = {
      name: "North West"
    };
    
    this.createRegion(region).then(createdRegion => {
      // Create a store in the region
      const store: InsertStore = {
        name: "Manchester Central",
        location: "Manchester",
        address: "123 Smith Street, Manchester, M1 2AB",
        regionId: createdRegion.id
      };
      
      this.createStore(store).then(createdStore => {
        // Create a store manager
        const storeManager: InsertUser = {
          username: "manager",
          password: "$2b$10$dKLfHMBJtqTH2O7mwFW/6eNMYOWHzq7p.ZmYS1/fMbZ96qKU4D/iy", // password is 'admin123'
          name: "Store Manager",
          role: "store_manager",
          email: "manager@chaiiwala.com",
          storeId: createdStore.id,
          regionId: createdRegion.id
        };
        
        this.createUser(storeManager).then(createdManager => {
          // Create some inventory items
          const tea: InsertInventory = {
            name: "Chai Tea",
            itemCode: "TEA001",
            quantity: 85,
            unit: "kg",
            threshold: 20,
            storeId: createdStore.id
          };
          
          const milk: InsertInventory = {
            name: "Milk",
            itemCode: "MILK001",
            quantity: 15,
            unit: "liters",
            threshold: 20,
            storeId: createdStore.id
          };
          
          const sugar: InsertInventory = {
            name: "Sugar",
            itemCode: "SUGAR001",
            quantity: 25,
            unit: "kg",
            threshold: 10,
            storeId: createdStore.id
          };
          
          Promise.all([
            this.createInventoryItem(tea),
            this.createInventoryItem(milk),
            this.createInventoryItem(sugar)
          ]).then(_ => {
            // Create a checklist
            const checklist: InsertChecklist = {
              title: "Morning Opening Procedures",
              description: "Tasks to complete when opening the store",
              isWeekly: false,
              storeId: createdStore.id
            };
            
            this.createChecklist(checklist).then(createdChecklist => {
              // Add checklist items
              const items = [
                { title: "Clean the counters", checklistId: createdChecklist.id, isCompleted: false },
                { title: "Start the tea brewing", checklistId: createdChecklist.id, isCompleted: false },
                { title: "Check stock levels", checklistId: createdChecklist.id, isCompleted: false },
                { title: "Turn on all equipment", checklistId: createdChecklist.id, isCompleted: false }
              ];
              
              items.forEach(item => this.createChecklistItem(item));
            });
            
            // Create a task
            const task: InsertTask = {
              title: "Order more milk",
              description: "Milk stock is getting low, please order more",
              assignedTo: createdManager.id,
              dueDate: new Date(Date.now() + 86400000), // tomorrow
              status: "to_do",
              priority: "high",
              storeId: createdStore.id,
              createdBy: 1 // admin
            };
            
            this.createTask(task);
            
            // Create an announcement
            const announcement: InsertAnnouncement = {
              title: "New chai recipe",
              content: "We have updated our signature chai recipe. Please check the updated preparation instructions.",
              fromUser: 1, // admin
              priority: "high",
              storeId: createdStore.id,
              regionId: null,
              isGlobal: false
            };
            
            this.createAnnouncement(announcement);
          });
        });
      });
    });
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || "staff",
      email: insertUser.email || null,
      storeId: insertUser.storeId || null,
      regionId: insertUser.regionId || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }
  
  async getUsersByStore(storeId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.storeId === storeId);
  }
  
  async getUsersByRegion(regionId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.regionId === regionId);
  }
  
  // Store Methods
  async getStore(id: number): Promise<Store | undefined> {
    return this.stores.get(id);
  }
  
  async getStores(): Promise<Store[]> {
    return Array.from(this.stores.values());
  }
  
  async getStoresByRegion(regionId: number): Promise<Store[]> {
    return Array.from(this.stores.values()).filter(store => store.regionId === regionId);
  }
  
  async createStore(store: InsertStore): Promise<Store> {
    const id = this.currentStoreId++;
    const newStore: Store = { 
      ...store, 
      id,
      address: store.address || null,
      regionId: store.regionId || null
    };
    this.stores.set(id, newStore);
    return newStore;
  }
  
  async updateStore(id: number, storeData: Partial<Store>): Promise<Store | undefined> {
    const store = this.stores.get(id);
    if (!store) return undefined;
    
    const updatedStore = { ...store, ...storeData };
    this.stores.set(id, updatedStore);
    return updatedStore;
  }
  
  // Region Methods
  async getRegion(id: number): Promise<Region | undefined> {
    return this.regions.get(id);
  }
  
  async getRegions(): Promise<Region[]> {
    return Array.from(this.regions.values());
  }
  
  async createRegion(region: InsertRegion): Promise<Region> {
    const id = this.currentRegionId++;
    const newRegion: Region = { ...region, id };
    this.regions.set(id, newRegion);
    return newRegion;
  }
  
  // Inventory Methods
  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    return this.inventory.get(id);
  }
  
  async getInventoryByStore(storeId: number): Promise<Inventory[]> {
    return Array.from(this.inventory.values()).filter(item => item.storeId === storeId);
  }
  
  async getLowStockItems(storeId: number): Promise<Inventory[]> {
    return Array.from(this.inventory.values())
      .filter(item => item.storeId === storeId && item.quantity <= item.threshold);
  }
  
  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const id = this.currentInventoryId++;
    const newItem: Inventory = { 
      ...item, 
      id,
      quantity: item.quantity || 0,
      threshold: item.threshold || 10
    };
    this.inventory.set(id, newItem);
    return newItem;
  }
  
  async updateInventoryItem(id: number, itemData: Partial<Inventory>): Promise<Inventory | undefined> {
    const item = this.inventory.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...itemData };
    this.inventory.set(id, updatedItem);
    return updatedItem;
  }
  
  // Staff Schedule Methods
  async getStaffSchedule(id: number): Promise<StaffSchedule | undefined> {
    return this.staffSchedules.get(id);
  }
  
  async getStaffSchedulesByStore(storeId: number): Promise<StaffSchedule[]> {
    return Array.from(this.staffSchedules.values()).filter(schedule => schedule.storeId === storeId);
  }
  
  async getStaffSchedulesByUser(userId: number): Promise<StaffSchedule[]> {
    return Array.from(this.staffSchedules.values()).filter(schedule => schedule.userId === userId);
  }
  
  async createStaffSchedule(schedule: InsertStaffSchedule): Promise<StaffSchedule> {
    const id = this.currentScheduleId++;
    const newSchedule: StaffSchedule = { ...schedule, id };
    this.staffSchedules.set(id, newSchedule);
    return newSchedule;
  }
  
  async updateStaffSchedule(id: number, scheduleData: Partial<StaffSchedule>): Promise<StaffSchedule | undefined> {
    const schedule = this.staffSchedules.get(id);
    if (!schedule) return undefined;
    
    const updatedSchedule = { ...schedule, ...scheduleData };
    this.staffSchedules.set(id, updatedSchedule);
    return updatedSchedule;
  }
  
  async deleteStaffSchedule(id: number): Promise<boolean> {
    return this.staffSchedules.delete(id);
  }
  
  // Task Methods
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }
  
  async getTasksByStore(storeId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.storeId === storeId);
  }
  
  async getTasksByUser(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.assignedTo === userId);
  }
  
  async createTask(task: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const newTask: Task = { 
      ...task, 
      id, 
      createdAt: new Date(),
      status: task.status || "to_do",
      priority: task.priority || "medium",
      description: task.description || null,
      assignedTo: task.assignedTo || null,
      dueDate: task.dueDate || null,
      storeId: task.storeId || null
    };
    this.tasks.set(id, newTask);
    return newTask;
  }
  
  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...taskData };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }
  
  // Checklist Methods
  async getChecklist(id: number): Promise<Checklist | undefined> {
    return this.checklists.get(id);
  }
  
  async getChecklistsByStore(storeId: number): Promise<Checklist[]> {
    return Array.from(this.checklists.values()).filter(checklist => checklist.storeId === storeId);
  }
  
  async createChecklist(checklist: InsertChecklist): Promise<Checklist> {
    const id = this.currentChecklistId++;
    const newChecklist: Checklist = { 
      ...checklist, 
      id,
      description: checklist.description || null,
      isWeekly: checklist.isWeekly ?? true
    };
    this.checklists.set(id, newChecklist);
    return newChecklist;
  }
  
  async updateChecklist(id: number, checklistData: Partial<Checklist>): Promise<Checklist | undefined> {
    const checklist = this.checklists.get(id);
    if (!checklist) return undefined;
    
    const updatedChecklist = { ...checklist, ...checklistData };
    this.checklists.set(id, updatedChecklist);
    return updatedChecklist;
  }
  
  // Checklist Item Methods
  async getChecklistItem(id: number): Promise<ChecklistItem | undefined> {
    return this.checklistItems.get(id);
  }
  
  async getChecklistItemsByChecklist(checklistId: number): Promise<ChecklistItem[]> {
    return Array.from(this.checklistItems.values()).filter(item => item.checklistId === checklistId);
  }
  
  async createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem> {
    const id = this.currentChecklistItemId++;
    const newItem: ChecklistItem = { 
      ...item, 
      id,
      isCompleted: item.isCompleted ?? false,
      completedBy: item.completedBy || null,
      completedAt: item.completedAt || null 
    };
    this.checklistItems.set(id, newItem);
    return newItem;
  }
  
  async updateChecklistItem(id: number, itemData: Partial<ChecklistItem>): Promise<ChecklistItem | undefined> {
    const item = this.checklistItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...itemData };
    this.checklistItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async resetWeeklyChecklists(): Promise<void> {
    // Reset all weekly checklist items to uncompleted
    const weeklyChecklists = Array.from(this.checklists.values()).filter(cl => cl.isWeekly);
    
    for (const checklist of weeklyChecklists) {
      const items = await this.getChecklistItemsByChecklist(checklist.id);
      
      for (const item of items) {
        await this.updateChecklistItem(item.id, {
          isCompleted: false,
          completedBy: null,
          completedAt: null
        });
      }
    }
  }
  
  // Announcement Methods
  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    return this.announcements.get(id);
  }
  
  async getAnnouncementsByStore(storeId: number): Promise<Announcement[]> {
    return Array.from(this.announcements.values())
      .filter(ann => ann.storeId === storeId || ann.isGlobal);
  }
  
  async getAnnouncementsByRegion(regionId: number): Promise<Announcement[]> {
    return Array.from(this.announcements.values())
      .filter(ann => ann.regionId === regionId || ann.isGlobal);
  }
  
  async getGlobalAnnouncements(): Promise<Announcement[]> {
    return Array.from(this.announcements.values()).filter(ann => ann.isGlobal);
  }
  
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const id = this.currentAnnouncementId++;
    const newAnnouncement: Announcement = { 
      ...announcement, 
      id, 
      createdAt: new Date(),
      priority: announcement.priority || "normal",
      storeId: announcement.storeId || null,
      regionId: announcement.regionId || null,
      isGlobal: announcement.isGlobal ?? false
    };
    this.announcements.set(id, newAnnouncement);
    return newAnnouncement;
  }
}

export const storage = new MemStorage();
