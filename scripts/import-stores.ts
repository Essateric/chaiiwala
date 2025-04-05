import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { db } from "../server/db";
import { stores } from "../shared/schema";
import chalk from "chalk";

interface StoreCSVRow {
  name: string;
  address: string;
  area: string;
  manager: string;
}

async function importStores() {
  try {
    console.log(chalk.blue("Starting store locations import..."));
    
    // Read CSV file
    const csvData = readFileSync("./attached_assets/store_locations.csv", "utf8");
    
    // Parse CSV
    const records: StoreCSVRow[] = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
    });
    
    console.log(chalk.green(`Found ${records.length} store locations to import`));
    
    // Check if data already exists to avoid duplicates
    const existingStores = await db.select().from(stores);
    const existingStoreNames = new Set(existingStores.map(store => store.name));
    
    // Filter out records that already exist
    const newRecords = records.filter(record => !existingStoreNames.has(record.name));
    
    if (newRecords.length === 0) {
      console.log(chalk.yellow("All store locations already exist in the database. No new records to import."));
      return;
    }
    
    // Insert new records
    const storeData = newRecords.map(record => ({
      name: record.name,
      address: record.address,
      area: parseInt(record.area),
      manager: record.manager
    }));
    
    await db.insert(stores).values(storeData);
    
    console.log(chalk.green(`Successfully imported ${storeData.length} new store locations`));
    
    // Display all stores after import
    const allStores = await db.select().from(stores);
    console.log(chalk.blue("Current store locations in database:"));
    console.table(allStores.map(s => ({ id: s.id, name: s.name, manager: s.manager })));
    
  } catch (error) {
    console.error(chalk.red("Error importing store locations:"), error);
  } finally {
    process.exit(0);
  }
}

importStores();