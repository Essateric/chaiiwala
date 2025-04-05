import { db } from "../server/db";
import { jobLogs } from "../shared/schema";

async function importJobLogs() {
  try {
    console.log("Starting to import job logs data...");
    
    // Sample job logs data
    const jobLogsData = [
      {
        logDate: "2025-04-01",
        logTime: "09:15",
        loggedBy: "Shabnam Essa",
        storeId: 1, // Cheetham Hill
        description: "AC unit in kitchen making unusual noise. Requires inspection.",
        completionDate: "2025-04-10",
        comments: "Medium priority, still functional but noticeable noise increase over last week.",
        flag: "normal"
      },
      {
        logDate: "2025-04-02",
        logTime: "14:30",
        loggedBy: "Usman Aftab",
        storeId: 3, // Old Trafford
        description: "Coffee machine leaking water from base. Needs urgent repair.",
        completionDate: "2025-04-04",
        comments: "High priority, affecting service speed.",
        flag: "urgent"
      },
      {
        logDate: "2025-03-15",
        logTime: "10:45",
        loggedBy: "Jubayed",
        storeId: 5, // Stockport
        description: "Outdoor signage light flickering. Need electrician to check wiring.",
        completionDate: "2025-03-30",
        comments: "Not urgent but needs addressing for brand image.",
        flag: "normal"
      },
      {
        logDate: "2025-02-20",
        logTime: "16:00",
        loggedBy: "Imran",
        storeId: 8, // Wilmslow Road
        description: "Hood extraction fan not working properly in kitchen area.",
        completionDate: "2025-03-15",
        comments: "Issue has persisted for over a month. Health inspector mentioned it last visit.",
        flag: "long_standing"
      },
      {
        logDate: "2025-04-03",
        logTime: "08:15",
        loggedBy: "Zahra",
        storeId: 9, // Deansgate
        description: "Bathroom sink clogged - not draining properly.",
        completionDate: "2025-04-05",
        comments: "Need plumber visit. Customers have complained.",
        flag: "urgent"
      },
      {
        logDate: "2025-03-25",
        logTime: "11:30",
        loggedBy: "CH Manager",
        storeId: 1, // Cheetham Hill
        description: "Point of sale system freezing periodically during peak hours.",
        completionDate: "2025-04-08",
        comments: "IT support has been notified. May need system update or replacement.",
        flag: "normal"
      },
      {
        logDate: "2025-04-01",
        logTime: "17:45",
        loggedBy: "OX Manager",
        storeId: 2, // Oxford Road
        description: "Front door hinge broken - door doesn't close properly.",
        completionDate: "2025-04-03",
        comments: "Security risk - needs immediate attention.",
        flag: "urgent"
      }
    ];
    
    // Insert job logs into database
    for (const jobLog of jobLogsData) {
      await db.insert(jobLogs).values({
        ...jobLog,
        attachments: [],
        createdAt: new Date()
      });
    }
    
    console.log("Successfully imported job logs data!");
  } catch (error) {
    console.error("Failed to import job logs:", error);
  } finally {
    // Close the database connection
    await db.client.end?.();
    console.log("Database connection closed.");
  }
}

// Run the import
importJobLogs();