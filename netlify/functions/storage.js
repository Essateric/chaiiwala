// Netlify-compatible storage (JavaScript version)
import session from "express-session";
import createMemoryStore from "memorystore";

// Create memory store
const MemoryStore = createMemoryStore(session);

// Storage implementation for Netlify functions
export class MemStorage {
  constructor() {
    // Create a memory store for sessions
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize storage maps
    this.users = new Map();
    this.stores = new Map();
    this.inventory = new Map();
    this.tasks = new Map();
    this.checklists = new Map();
    this.checklistTasks = new Map();
    this.schedules = new Map();
    this.announcements = new Map();
    
    // Initialize counters
    this.userId = 0;
    this.storeId = 0;
    this.inventoryId = 0;
    this.taskId = 0;
    this.checklistId = 0;
    this.checklistTaskId = 0;
    this.scheduleId = 0;
    this.announcementId = 0;
    
    // Seed initial data
    this.seedInitialData();
  }
  
  async getUser(id) {
    return this.users.get(id);
  }
  
  async getUserByUsername(username) {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }
  
  async createUser(insertUser) {
    const id = ++this.userId;
    
    // Default values for optional fields
    const storeId = insertUser.storeId ?? null;
    const title = insertUser.title ?? null;
    const permissions = insertUser.permissions ?? null;
    const role = insertUser.role ?? "staff";
    
    const user = { 
      id, 
      username: insertUser.username,
      password: insertUser.password,
      firstName: insertUser.firstName,
      lastName: insertUser.lastName,
      name: insertUser.name,
      email: insertUser.email,
      title: title,
      role: role,
      permissions: permissions,
      storeId: storeId
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async getAllStaff() {
    return Array.from(this.users.values())
      .filter(user => user.role === "staff")
      .map(user => ({
        id: user.id,
        name: user.name,
        role: user.role,
        color: this.getRandomColor(user.id)
      }));
  }
  
  getRandomColor(seed) {
    const colors = [
      "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
      "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
      "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
      "#ec4899", "#f43f5e"
    ];
    return colors[seed % colors.length];
  }
  
  async getAllStores() {
    return Array.from(this.stores.values());
  }
  
  async getStore(id) {
    return this.stores.get(id);
  }
  
  async createStore(insertStore) {
    const id = ++this.storeId;
    const store = { ...insertStore, id };
    this.stores.set(id, store);
    return store;
  }
  
  async getAllInventory() {
    return Array.from(this.inventory.values());
  }
  
  async createInventoryItem(insertInventory) {
    const id = ++this.inventoryId;
    
    const item = { 
      id, 
      name: insertInventory.name,
      storeId: insertInventory.storeId,
      sku: insertInventory.sku,
      category: insertInventory.category,
      quantity: insertInventory.quantity,
      status: insertInventory.status || "in_stock",
      lastUpdated: new Date()
    };
    
    this.inventory.set(id, item);
    return item;
  }
  
  async updateInventoryItem(id, data) {
    const item = this.inventory.get(id);
    if (!item) return undefined;
    
    const updatedItem = { 
      ...item,
      ...data,
      lastUpdated: new Date()
    };
    
    this.inventory.set(id, updatedItem);
    return updatedItem;
  }
  
  async getAllTasks() {
    return Array.from(this.tasks.values());
  }
  
  async getTodayTasks() {
    const today = new Date().toISOString().split('T')[0];
    return Array.from(this.tasks.values())
      .filter(task => task.dueDate.includes(today))
      .map(task => ({
        id: task.id.toString(),
        title: task.title,
        location: `Store ${task.storeId}`,
        dueDate: task.dueDate,
        completed: task.status === "completed",
      }));
  }
  
  async createTask(insertTask) {
    const id = ++this.taskId;
    
    // Default values for optional fields
    const status = insertTask.status || "todo";
    const description = insertTask.description || null;
    const priority = insertTask.priority || "medium";
    
    const task = { 
      id, 
      title: insertTask.title,
      storeId: insertTask.storeId,
      assignedTo: insertTask.assignedTo,
      dueDate: insertTask.dueDate,
      status,
      description,
      priority
    };
    
    this.tasks.set(id, task);
    return task;
  }
  
  async updateTask(id, data) {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...data };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async getAllChecklists() {
    return Array.from(this.checklists.values()).map(checklist => {
      const tasks = Array.from(this.checklistTasks.values())
        .filter(task => task.checklistId === checklist.id);
      
      return {
        ...checklist,
        tasks,
      };
    });
  }
  
  async createChecklist(insertChecklist) {
    const id = ++this.checklistId;
    
    const checklist = { 
      id, 
      title: insertChecklist.title,
      storeId: insertChecklist.storeId,
      category: insertChecklist.category,
      description: insertChecklist.description,
      assignedTo: insertChecklist.assignedTo,
      dueDate: insertChecklist.dueDate || null
    };
    
    this.checklists.set(id, checklist);
    return checklist;
  }
  
  async createChecklistTask(insertTask) {
    const id = ++this.checklistTaskId;
    
    const task = { 
      id, 
      title: insertTask.title,
      checklistId: insertTask.checklistId,
      completed: insertTask.completed || false
    };
    
    this.checklistTasks.set(id, task);
    return task;
  }
  
  async updateChecklistTask(checklistId, taskId, completed) {
    const task = Array.from(this.checklistTasks.values())
      .find(task => task.id === taskId && task.checklistId === checklistId);
    
    if (!task) return undefined;
    
    const updatedTask = { ...task, completed };
    this.checklistTasks.set(task.id, updatedTask);
    return updatedTask;
  }
  
  async getAllSchedules() {
    return Array.from(this.schedules.values()).map(schedule => {
      const staff = this.users.get(schedule.staffId);
      return {
        id: schedule.id.toString(),
        staffId: schedule.staffId,
        staffName: staff?.name || "Unknown Staff",
        role: staff?.role || "staff",
        start: schedule.start,
        end: schedule.end,
        day: schedule.day,
      };
    });
  }
  
  async createSchedule(insertSchedule) {
    const id = ++this.scheduleId;
    
    const schedule = { 
      id, 
      staffId: insertSchedule.staffId,
      storeId: insertSchedule.storeId,
      day: insertSchedule.day,
      start: insertSchedule.start,
      end: insertSchedule.end,
    };
    
    this.schedules.set(id, schedule);
    return schedule;
  }
  
  async deleteSchedule(id) {
    this.schedules.delete(id);
  }
  
  async getAllAnnouncements() {
    return Array.from(this.announcements.values());
  }
  
  async getRecentAnnouncements() {
    return Array.from(this.announcements.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
      .map(announcement => ({
        id: announcement.id.toString(),
        title: announcement.title,
        description: announcement.content.substring(0, 100) + (announcement.content.length > 100 ? "..." : ""),
        date: this.formatAnnouncementDate(announcement.date),
        isHighlighted: announcement.important || false,
      }));
  }
  
  async createAnnouncement(insertAnnouncement) {
    const id = ++this.announcementId;
    
    const announcement = { 
      id, 
      title: insertAnnouncement.title,
      content: insertAnnouncement.content,
      category: insertAnnouncement.category,
      author: insertAnnouncement.author,
      date: new Date(),
      important: insertAnnouncement.important || false,
      likes: 0
    };
    
    this.announcements.set(id, announcement);
    return announcement;
  }
  
  async likeAnnouncement(id) {
    const announcement = this.announcements.get(id);
    if (!announcement) return undefined;
    
    const updatedAnnouncement = { 
      ...announcement,
      likes: announcement.likes + 1
    };
    
    this.announcements.set(id, updatedAnnouncement);
    return updatedAnnouncement;
  }
  
  formatAnnouncementDate(date) {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60); // minutes
    
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff} minute${diff === 1 ? "" : "s"} ago`;
    
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
    
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  
  seedInitialData() {
    // Common function to hash password for seeding
    const hashPassword = 'c8680ca3ea7be0ac4fef3954ccf3bb114ba12f8fab964e0a6f55ff9386c022a4f4a78e71343bd0e2213c11c86266a8c1a13d507752bdd80b492ae04a5ee9f2b6.b6e5be78c42ffc3595c7352fbd88fe9f'; // password123
    
    // Seed users
    const userData = [
      { 
        username: "shabnam", 
        password: hashPassword, 
        firstName: "Shabnam", 
        lastName: "Qureshi", 
        name: "Shabnam Qureshi", 
        email: "shabnam@chaiiwala.com", 
        title: "Director of Operations", 
        role: "admin", 
        permissions: ["all_access", "user_management", "system_settings"]
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
      }
    ];
    
    userData.forEach(user => {
      this.createUser(user);
    });

    // Seed stores
    const storeData = [
      {
        name: "Chaiiwala London Bridge", 
        address: "142 Long Lane, London SE1 4BS, United Kingdom", 
        city: "London", 
        region: "Greater London", 
        phone: "+44-20-7407-1234", 
        email: "londonbridge@chaiiwala.com", 
        openingHours: "Mon-Sat: 9am-10pm, Sun: 10am-8pm"
      },
      {
        name: "Chaiiwala Birmingham", 
        address: "60-62 Ladypool Road, Birmingham B12 8JU, United Kingdom", 
        city: "Birmingham", 
        region: "West Midlands", 
        phone: "+44-121-446-5678", 
        email: "birmingham@chaiiwala.com", 
        openingHours: "Mon-Sun: 8am-11pm"
      },
      {
        name: "Chaiiwala Manchester Rusholme", 
        address: "183-185 Wilmslow Road, Manchester M14 5AP, United Kingdom", 
        city: "Manchester", 
        region: "Greater Manchester", 
        phone: "+44-161-224-9012", 
        email: "manchester@chaiiwala.com", 
        openingHours: "Mon-Sun: 8am-12am"
      },
      {
        name: "Chaiiwala Leicester", 
        address: "98 London Road, Leicester LE2 0QS, United Kingdom", 
        city: "Leicester", 
        region: "Leicestershire", 
        phone: "+44-116-254-3456", 
        email: "leicester@chaiiwala.com", 
        openingHours: "Mon-Sun: 9am-11pm"
      },
      {
        name: "Chaiiwala Stockport Road", 
        address: "165 Stockport Road, Manchester M12 4WH, United Kingdom", 
        city: "Manchester", 
        region: "Greater Manchester", 
        phone: "+44-161-273-7890", 
        email: "stockportroad@chaiiwala.com", 
        openingHours: "Mon-Sun: 8am-11pm"
      },
      {
        name: "Chaiiwala Coventry", 
        address: "124 Far Gosford Street, Coventry CV1 5EA, United Kingdom", 
        city: "Coventry", 
        region: "West Midlands", 
        phone: "+44-24-7622-1234", 
        email: "coventry@chaiiwala.com", 
        openingHours: "Mon-Sun: 8am-10pm"
      },
      {
        name: "Chaiiwala Bradford", 
        address: "50 Great Horton Road, Bradford BD7 1AL, United Kingdom", 
        city: "Bradford", 
        region: "West Yorkshire", 
        phone: "+44-1274-733456", 
        email: "bradford@chaiiwala.com", 
        openingHours: "Mon-Sun: 9am-10pm"
      }
    ];
    
    storeData.forEach(store => {
      this.createStore(store);
    });
    
    // Add essential inventory items as a starting point
    const inventoryData = [
      { name: "Chai Masala", sku: "INV-001", category: "Tea & Chai", storeId: 2, quantity: "5 kg", status: "low_stock" },
      { name: "Milk", sku: "INV-002", category: "Beverages", storeId: 1, quantity: "24 liters", status: "in_stock" },
      { name: "To-Go Cups (16oz)", sku: "INV-003", category: "Packaging", storeId: 4, quantity: "150 pcs", status: "on_order" },
      { name: "Sugar", sku: "INV-004", category: "Food Ingredients", storeId: 3, quantity: "12 kg", status: "in_stock" },
      { name: "Karak Tea Bags", sku: "INV-005", category: "Tea & Chai", storeId: 6, quantity: "0 boxes", status: "out_of_stock" }
    ];
    
    inventoryData.forEach(item => {
      this.createInventoryItem(item);
    });
    
    // Add some tasks
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const taskData = [
      { 
        title: "Deep clean coffee machines", 
        description: "Perform full deep cleaning of all coffee machines", 
        storeId: 1, 
        assignedTo: 8, 
        dueDate: today, 
        status: "in_progress", 
        priority: "high" 
      },
      { 
        title: "Restock inventory", 
        description: "Restock all low inventory items for weekend rush", 
        storeId: 2, 
        assignedTo: 9, 
        dueDate: today, 
        status: "todo", 
        priority: "medium"
      },
      { 
        title: "Staff training", 
        description: "Conduct training for new staff members on cash register", 
        storeId: 3, 
        assignedTo: 10, 
        dueDate: tomorrowStr, 
        status: "todo", 
        priority: "medium" 
      },
      { 
        title: "Waste inspection", 
        description: "Perform waste audit and implement reduction strategies", 
        storeId: 5, 
        assignedTo: 3, 
        dueDate: today, 
        status: "todo", 
        priority: "low" 
      },
      { 
        title: "Monthly health inspection", 
        description: "Prepare for monthly health inspection scheduled for tomorrow", 
        storeId: 5, 
        assignedTo: 3, 
        dueDate: today, 
        status: "todo", 
        priority: "high" 
      }
    ];
    
    taskData.forEach(task => {
      this.createTask(task);
    });
    
    // Add some checklists
    const checklistData = [
      {
        title: "Morning Opening Procedures",
        description: "Tasks to complete when opening the store",
        category: "Daily Operations",
        storeId: 1,
        assignedTo: "Opening Staff"
      },
      {
        title: "Evening Closing Procedures",
        description: "Tasks to complete before closing the store",
        category: "Daily Operations",
        storeId: 1,
        assignedTo: "Closing Staff"
      },
      {
        title: "Weekly Equipment Maintenance",
        description: "Maintenance tasks for restaurant equipment",
        category: "Maintenance",
        storeId: 2,
        assignedTo: "Store Manager"
      },
      {
        title: "Monthly Inventory Check",
        description: "Full inventory audit tasks",
        category: "Inventory",
        storeId: 3,
        assignedTo: "Inventory Team"
      },
      {
        title: "Health and Safety Check",
        description: "Regular health and safety compliance check",
        category: "Compliance",
        storeId: 5,
        assignedTo: "Store Manager"
      }
    ];
    
    // Create checklists and their items
    checklistData.forEach(checklist => {
      this.createChecklist(checklist).then(newChecklist => {
        // Add items to the first checklist (Morning Opening)
        if (newChecklist.title === "Morning Opening Procedures") {
          const items = [
            { title: "Turn on all equipment", checklistId: newChecklist.id },
            { title: "Check refrigerator temperatures", checklistId: newChecklist.id },
            { title: "Prepare chai stations", checklistId: newChecklist.id },
            { title: "Count initial cash drawer", checklistId: newChecklist.id },
            { title: "Set up dining area", checklistId: newChecklist.id }
          ];
          items.forEach(item => this.createChecklistTask(item));
        }
        
        // Add items to the second checklist (Evening Closing)
        if (newChecklist.title === "Evening Closing Procedures") {
          const items = [
            { title: "Clean all equipment", checklistId: newChecklist.id },
            { title: "Restock supplies for next day", checklistId: newChecklist.id },
            { title: "Empty and clean trash bins", checklistId: newChecklist.id },
            { title: "Count final cash drawer", checklistId: newChecklist.id },
            { title: "Lock all doors and set alarm", checklistId: newChecklist.id }
          ];
          items.forEach(item => this.createChecklistTask(item));
        }
        
        // Add items to the health and safety checklist
        if (newChecklist.title === "Health and Safety Check") {
          const items = [
            { title: "Check fire extinguishers", checklistId: newChecklist.id },
            { title: "Inspect first aid kit", checklistId: newChecklist.id },
            { title: "Test smoke alarms", checklistId: newChecklist.id },
            { title: "Check emergency exits", checklistId: newChecklist.id },
            { title: "Review food safety logs", checklistId: newChecklist.id },
            { title: "Inspect staff hygiene practices", checklistId: newChecklist.id }
          ];
          items.forEach(item => this.createChecklistTask(item));
        }
      });
    });
    
    // Seed announcements
    const announcementData = [
      {
        title: "New Summer Menu Items",
        content: "We're excited to announce our new summer menu featuring refreshing mango lassi, cold brew chai, and summer berry desserts. Training materials are available in the staff portal.",
        category: "Menu Update",
        author: "Head Office",
        important: true
      },
      {
        title: "Upcoming Bank Holiday Hours",
        content: "Please note that all locations will operate on reduced hours (10am-6pm) during the upcoming bank holiday on August 28. Please adjust staff schedules accordingly.",
        category: "Operational",
        author: "Operations Team"
      },
      {
        title: "Sustainability Initiative Launch",
        content: "Starting next month, we're transitioning to 100% compostable packaging across all stores. New stock will arrive next week and training sessions will be conducted at each location.",
        category: "Company News",
        author: "Sustainability Team",
        important: true
      },
      {
        title: "Staff Recognition: Manchester Team",
        content: "Congratulations to the Manchester Stockport Road team for achieving the highest customer satisfaction scores this quarter! A special appreciation event will be held next Friday.",
        category: "Recognition",
        author: "HR Department"
      },
      {
        title: "System Maintenance Notice",
        content: "The POS system will undergo scheduled maintenance this Sunday from 11pm to 3am. Please complete all end-of-day procedures before 10:30pm.",
        category: "IT Update",
        author: "IT Support"
      }
    ];
    
    // Create announcements with distributed dates over the past month
    announcementData.forEach((announcement, index) => {
      this.createAnnouncement(announcement).then(newAnnouncement => {
        // Adjust dates to spread over the last month
        const date = new Date();
        date.setDate(date.getDate() - (index * 5)); // 0, 5, 10, 15, 20 days ago
        
        const updated = this.announcements.get(newAnnouncement.id);
        if (updated) {
          updated.date = date;
          this.announcements.set(updated.id, updated);
        }
        
        // Add some random likes
        if (index > 0) {
          const likes = Math.floor(Math.random() * 15);
          for (let i = 0; i < likes; i++) {
            this.likeAnnouncement(newAnnouncement.id);
          }
        }
      });
    });
    
    // Seed staff schedules for the current week
    const days = [0, 1, 2, 3, 4, 5, 6]; // 0 = Sunday, 1 = Monday, etc.
    const staffIds = [3, 8, 9, 10]; // Staff IDs from the users array
    
    staffIds.forEach(staffId => {
      const user = this.users.get(staffId);
      const storeId = user ? user.storeId || 1 : 1;
      
      // Create 4-5 shifts per staff member across the week
      const shiftsCount = 4 + Math.floor(Math.random() * 2);
      const assignedDays = [];
      
      while (assignedDays.length < shiftsCount) {
        const day = days[Math.floor(Math.random() * days.length)];
        if (!assignedDays.includes(day)) {
          assignedDays.push(day);
          
          // Morning or evening shift
          const isMorning = Math.random() > 0.5;
          const start = isMorning ? "08:00" : "15:00";
          const end = isMorning ? "16:00" : "23:00";
          
          const schedule = {
            staffId,
            storeId,
            day,
            start,
            end
          };
          
          this.createSchedule(schedule);
        }
      }
    });
  }
}

export const storage = new MemStorage();