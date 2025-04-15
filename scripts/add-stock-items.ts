import { db } from "../server/db";
import { stockCategories, stockConfig } from "../shared/schema";
import { eq } from "drizzle-orm";

async function addStockCategories() {
  console.log("Adding stock categories...");
  
  // Define stock categories to add
  const categoriesToAdd = [
    { name: "Food", prefix: "BP", description: "Basic food items" },
    { name: "Drinks", prefix: "DP", description: "Drink products" },
    { name: "Packaging", prefix: "FPFC", description: "Food packaging items" },
    { name: "Dry Food", prefix: "DF", description: "Dry food items" },
    { name: "Miscellaneous", prefix: "MS", description: "Miscellaneous items" },
    { name: "Frozen Food", prefix: "FZ", description: "Frozen food items" }
  ];
  
  for (const category of categoriesToAdd) {
    // Check if category already exists
    const existing = await db.select().from(stockCategories).where(eq(stockCategories.name, category.name));
    
    if (existing.length === 0) {
      // Add category
      const now = new Date();
      const [newCategory] = await db.insert(stockCategories).values({
        name: category.name,
        prefix: category.prefix,
        description: category.description,
        createdAt: now,
        updatedAt: now
      }).returning();
      
      console.log(`Added category: ${newCategory.name} (${newCategory.prefix})`);
    } else {
      console.log(`Category ${category.name} already exists, skipping...`);
    }
  }
}

async function addStockItems() {
  console.log("\nAdding stock items...");
  
  // Get categories
  const categories = await db.select().from(stockCategories);
  
  // Define stock items to add
  const itemsToAdd = [
    { 
      itemCode: "BP401", 
      name: "Masala Beans", 
      category: "Food",
      lowStockThreshold: 5, 
      price: 399, // in pence (£3.99)
      sku: "CHW-MB-001"
    },
    { 
      itemCode: "BP402", 
      name: "Daal", 
      category: "Food",
      lowStockThreshold: 4, 
      price: 299, // in pence (£2.99)
      sku: "CHW-DA-001"
    },
    { 
      itemCode: "BP440", 
      name: "Mogo Sauce", 
      category: "Food",
      lowStockThreshold: 6, 
      price: 199, // in pence (£1.99)
      sku: "CHW-MS-001"
    },
    { 
      itemCode: "DP196", 
      name: "Orange Juice (12x250ml)", 
      category: "Drinks",
      lowStockThreshold: 3, 
      price: 699, // in pence (£6.99)
      sku: "CHW-OJ-001"
    },
    { 
      itemCode: "FPFC204", 
      name: "Karak Chaii Sugar free (50 per box)", 
      category: "Drinks",
      lowStockThreshold: 2, 
      price: 2499, // in pence (£24.99)
      sku: "CHW-KC-001"
    },
    { 
      itemCode: "DF001", 
      name: "Rice (5kg)", 
      category: "Dry Food",
      lowStockThreshold: 3, 
      price: 899, // in pence (£8.99)
      sku: "CHW-RC-001"
    },
    { 
      itemCode: "MS101", 
      name: "Cleaning Spray", 
      category: "Miscellaneous",
      lowStockThreshold: 2, 
      price: 299, // in pence (£2.99)
      sku: "CHW-CS-001"
    },
    { 
      itemCode: "FZ201", 
      name: "Frozen Samosas (Box of 24)", 
      category: "Frozen Food",
      lowStockThreshold: 4, 
      price: 1299, // in pence (£12.99)
      sku: "CHW-FS-001"
    }
  ];
  
  for (const item of itemsToAdd) {
    // Check if item already exists
    const existing = await db.select().from(stockConfig).where(eq(stockConfig.itemCode, item.itemCode));
    
    if (existing.length === 0) {
      // Add item
      const now = new Date();
      const [newItem] = await db.insert(stockConfig).values({
        itemCode: item.itemCode,
        name: item.name,
        category: item.category,
        lowStockThreshold: item.lowStockThreshold,
        price: item.price,
        sku: item.sku,
        createdAt: now,
        updatedAt: now
      }).returning();
      
      console.log(`Added item: ${newItem.name} (${newItem.itemCode})`);
    } else {
      console.log(`Item ${item.name} already exists, skipping...`);
    }
  }
}

async function main() {
  try {
    console.log("Starting stock data import...");
    
    // Add categories first
    await addStockCategories();
    
    // Then add stock items
    await addStockItems();
    
    console.log("\nStock data import completed successfully!");
  } catch (error) {
    console.error("Error importing stock data:", error);
  } finally {
    // Just exit the process - no need to close the connection with Neon serverless
    process.exit(0);
  }
}

main();