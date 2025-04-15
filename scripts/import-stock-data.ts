import { db } from "../server/db";
import { stockCategories, stockConfig } from "../shared/schema";
import { eq } from "drizzle-orm";
import { parse } from 'csv-parse/sync';
import fs from "fs";
import path from "path";

interface StockItem {
  itemCode: string;
  name: string;
  category: string;
  price: number;
  lowStockThreshold: number;
  sku: string;
}

/**
 * This function ensures all required categories exist in the database
 */
async function ensureCategories() {
  console.log("Setting up stock categories...");
  
  // Define categories we expect to have
  const requiredCategories = [
    { name: "Food", prefix: "BP", description: "Food items" },
    { name: "Drinks", prefix: "DP", description: "Drink products" },
    { name: "Packaging", prefix: "FPFC", description: "Food packaging items" },
    { name: "Dry Food", prefix: "DF", description: "Dry food items" },
    { name: "Miscellaneous", prefix: "MS", description: "Miscellaneous items" },
    { name: "Frozen Food", prefix: "FZ", description: "Frozen food items" },
    { name: "Stickers", prefix: "ST", description: "Sticker items" },
    { name: "Syrups", prefix: "SY", description: "Syrups and sauces" }
  ];
  
  for (const category of requiredCategories) {
    // Check if category already exists
    const existing = await db.select().from(stockCategories).where(eq(stockCategories.prefix, category.prefix));
    
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

/**
 * Returns the most appropriate category name based on the item code prefix or category information
 */
function determineCategory(itemCode: string, categoryText: string): string {
  // First try to match by itemCode prefix
  if (itemCode.startsWith("BP")) return "Food";
  if (itemCode.startsWith("DP")) return "Drinks";
  if (itemCode.startsWith("FPFC")) return "Packaging";
  if (itemCode.startsWith("DF")) return "Dry Food";
  if (itemCode.startsWith("MS")) return "Miscellaneous";
  if (itemCode.startsWith("FZ")) return "Frozen Food";
  if (itemCode.startsWith("FPG")) return "Food";
  if (itemCode.startsWith("PP")) return "Packaging";
  if (itemCode.startsWith("FPBC")) return "Food";
  if (itemCode.startsWith("FF")) return "Frozen Food";
  if (itemCode.startsWith("BBF")) return "Food";
  if (itemCode.startsWith("BBA")) return "Food";
  if (itemCode.startsWith("SE")) return "Miscellaneous";
  if (itemCode.startsWith("Other")) return "Miscellaneous";
  if (itemCode.startsWith("NHSPP")) return "Miscellaneous";
  
  // If no match by prefix, try the category text
  if (categoryText === "Frozen Food") return "Frozen Food";
  if (categoryText === "Dry Food") return "Dry Food";
  if (categoryText === "Misc") return "Miscellaneous";
  if (categoryText === "Drinks") return "Drinks";
  
  // Default fallback
  return "Miscellaneous";
}

async function extractStockItems() {
  console.log("Extracting stock items from CSV...");
  
  // Read the CSV file
  const filePath = path.join(process.cwd(), 'attached_assets', 'stock_order_sheet_categorized.csv');
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
  
  // Parse the CSV data
  const records = parse(fileContent, {
    columns: false,
    skip_empty_lines: true
  });
  
  // Skip header row
  records.shift();
  
  // Prepare to store all extracted items
  const stockItems: StockItem[] = [];
  
  // Process each row
  for (const row of records) {
    // Check if this is a section header or empty row
    if (!row[0] || row[0] === "Drinks" || row[0] === "Total Order Value:" || 
        row[0] === "Total Order Weight:" || row[0] === "Total Number of Boxes:" || 
        row[0] === "Item Code" || row[0] === " Dry Food " || row[0] === "Misc") {
      continue;
    }
    
    // Left side of the sheet (columns 0-6)
    if (row[0] && row[1] && row[0].match(/^[A-Z]+\d+$/)) {
      const itemCode = row[0];
      const name = row[1];
      const price = Number(row[4]) || 0;
      const category = determineCategory(itemCode, row[16] || "");
      
      // Create a SKU from the item code
      const sku = `CHW-${itemCode}`;
      
      // Add to our collection
      stockItems.push({
        itemCode,
        name,
        category,
        price: Math.round(price * 100), // Convert to pence
        lowStockThreshold: 5, // Default value
        sku
      });
    }
    
    // Right side of the sheet (columns 7-15)
    if (row[7] && row[8] && row[7].match(/^[A-Z]+\d+$/)) {
      const itemCode = row[7];
      const name = row[8];
      const price = Number(row[11]) || 0;
      const category = determineCategory(itemCode, row[16] || "");
      
      // Create a SKU from the item code
      const sku = `CHW-${itemCode}`;
      
      // Add to our collection
      stockItems.push({
        itemCode,
        name,
        category,
        price: Math.round(price * 100), // Convert to pence
        lowStockThreshold: 5, // Default value
        sku
      });
    }
  }
  
  console.log(`Extracted ${stockItems.length} items from the CSV file`);
  
  // Import unique stock items (avoid duplicates)
  const uniqueItems = stockItems.reduce((acc, current) => {
    const x = acc.find(item => item.itemCode === current.itemCode);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, [] as StockItem[]);
  
  console.log(`Found ${uniqueItems.length} unique stock items`);
  return uniqueItems;
}

async function importStockOrderSheet() {
  // Get all stock items from CSV
  const uniqueItems = await extractStockItems();
  console.log(`Importing ${uniqueItems.length} unique stock items...`);
  
  // Get all existing item codes from the database
  const existingItems = await db.select({ itemCode: stockConfig.itemCode }).from(stockConfig);
  const existingItemCodes = new Set(existingItems.map(item => item.itemCode));
  
  console.log(`Found ${existingItemCodes.size} existing items in database`);
  
  // Filter out items that already exist in the database
  const itemsToAdd = uniqueItems.filter(item => !existingItemCodes.has(item.itemCode));
  console.log(`Remaining items to add: ${itemsToAdd.length}`);
  
  if (itemsToAdd.length === 0) {
    console.log("All items already imported, nothing to do.");
    return 0;
  }
  
  // Process in batches of 30 items
  const batchSize = 30;
  const batches = Math.ceil(itemsToAdd.length / batchSize);
  
  let totalAdded = 0;
  
  for (let i = 0; i < batches; i++) {
    console.log(`Processing batch ${i + 1} of ${batches}...`);
    const start = i * batchSize;
    const end = Math.min(start + batchSize, itemsToAdd.length);
    const batch = itemsToAdd.slice(start, end);
    
    // Prepare all items in the batch for insertion
    const now = new Date();
    const batchValues = batch.map(item => ({
      itemCode: item.itemCode,
      name: item.name,
      category: item.category,
      lowStockThreshold: item.lowStockThreshold,
      price: item.price,
      sku: item.sku,
      createdAt: now,
      updatedAt: now
    }));
    
    // Insert batch of items
    const inserted = await db.insert(stockConfig).values(batchValues).returning();
    
    for (const item of inserted) {
      console.log(`Added item: ${item.name} (${item.itemCode})`);
    }
    
    totalAdded += inserted.length;
    console.log(`Batch ${i + 1} complete. Progress: ${totalAdded}/${itemsToAdd.length} items processed`);
  }
  
  console.log(`Import complete. Added ${totalAdded} new items.`);
  return totalAdded;
}

async function main() {
  try {
    console.log("Starting stock data import from CSV...");
    
    // Ensure categories exist
    await ensureCategories();
    
    // Import stock order sheet
    const itemCount = await importStockOrderSheet();
    
    console.log(`\nStock data import completed successfully! Added ${itemCount} stock items.`);
  } catch (error) {
    console.error("Error importing stock data:", error);
  } finally {
    // Just exit the process - no need to close the connection with Neon serverless
    process.exit(0);
  }
}

main();