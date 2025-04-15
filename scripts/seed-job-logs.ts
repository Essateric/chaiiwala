import { db } from "../server/db";
import { jobLogs } from "../shared/schema";

async function seedJobLogs() {
  try {
    console.log("Starting to seed job logs data...");
    
    // Sample job logs data for each store
    const jobLogsData = [
      // Cheetham Hill (Store ID: 1)
      {
        logDate: "2025-04-10",
        logTime: "09:15",
        loggedBy: "MGR_CH",
        storeId: 1,
        description: "AC unit in kitchen making unusual noise. Requires inspection.",
        completionDate: "2025-04-20",
        comments: "Medium priority, still functional but noticeable noise increase over last week.",
        flag: "normal" as const,
        attachments: []
      },
      {
        logDate: "2025-04-08",
        logTime: "14:30",
        loggedBy: "MGR_CH",
        storeId: 1,
        description: "Floor tiles cracked near entrance. Potential trip hazard.",
        completionDate: "2025-04-15",
        comments: "Need to replace 3-4 tiles. Have contacted contractor.",
        flag: "urgent" as const,
        attachments: []
      },
      {
        logDate: "2025-03-15",
        logTime: "11:20",
        loggedBy: "Shabnam Essa",
        storeId: 1,
        description: "Point of sale system freezing periodically during peak hours.",
        completionDate: "2025-04-01",
        comments: "IT support has been notified. May need system update or replacement.",
        flag: "long_standing" as const,
        attachments: []
      },
      
      // Oxford Road (Store ID: 2)
      {
        logDate: "2025-04-05",
        logTime: "16:45",
        loggedBy: "MGR_OX",
        storeId: 2,
        description: "Front door hinge broken - door doesn't close properly.",
        completionDate: "2025-04-12",
        comments: "Security risk - needs immediate attention.",
        flag: "urgent" as const,
        attachments: []
      },
      {
        logDate: "2025-04-02",
        logTime: "10:30",
        loggedBy: "MGR_OX",
        storeId: 2,
        description: "Graffiti on exterior wall needs cleaning/repainting.",
        completionDate: "2025-04-16",
        comments: "Affects brand image. Professional cleaner may be required.",
        flag: "normal" as const,
        attachments: []
      },
      
      // Old Trafford (Store ID: 3)
      {
        logDate: "2025-04-12",
        logTime: "08:30",
        loggedBy: "MGR_OT",
        storeId: 3,
        description: "Coffee machine leaking water from base. Needs urgent repair.",
        completionDate: "2025-04-14",
        comments: "High priority, affecting service speed.",
        flag: "urgent" as const,
        attachments: []
      },
      {
        logDate: "2025-03-28",
        logTime: "13:15",
        loggedBy: "MGR_OT",
        storeId: 3,
        description: "Back room shelving unit unstable and needs securing to wall.",
        completionDate: "2025-04-10",
        comments: "Health and safety concern for staff. Temporary solution in place.",
        flag: "normal" as const,
        attachments: []
      },
      
      // Trafford Centre (Store ID: 4)
      {
        logDate: "2025-04-01",
        logTime: "19:20",
        loggedBy: "MGR_TC",
        storeId: 4,
        description: "Digital menu board display flickering, right side unreadable.",
        completionDate: "2025-04-08",
        comments: "Customers having trouble reading menu. Temporary paper menu in use.",
        flag: "normal" as const,
        attachments: []
      },
      {
        logDate: "2025-03-20",
        logTime: "11:45",
        loggedBy: "MGR_TC",
        storeId: 4,
        description: "Water leak from ceiling in customer seating area.",
        completionDate: "2025-03-22",
        comments: "Centre management notified. Area cordoned off for safety.",
        flag: "urgent" as const,
        attachments: []
      },
      
      // Stockport (Store ID: 5)
      {
        logDate: "2025-04-07",
        logTime: "09:40",
        loggedBy: "MGR_SR",
        storeId: 5,
        description: "Outdoor signage light flickering. Need electrician to check wiring.",
        completionDate: "2025-04-21",
        comments: "Not urgent but needs addressing for brand image.",
        flag: "normal" as const,
        attachments: []
      },
      {
        logDate: "2025-02-15",
        logTime: "14:10",
        loggedBy: "MGR_SR",
        storeId: 5,
        description: "Persistent issue with exhaust fan in kitchen. Not extracting efficiently.",
        completionDate: "2025-03-15",
        comments: "Ongoing issue for over a month. Health inspection due soon.",
        flag: "long_standing" as const,
        attachments: []
      },
      
      // Rochdale (Store ID: 6)
      {
        logDate: "2025-04-09",
        logTime: "12:30",
        loggedBy: "MGR_RD",
        storeId: 6,
        description: "Refrigerator temperature fluctuating. Food safety concern.",
        completionDate: "2025-04-11",
        comments: "Items moved to backup unit. Engineer scheduled for tomorrow.",
        flag: "urgent" as const,
        attachments: []
      },
      {
        logDate: "2025-03-30",
        logTime: "10:15",
        loggedBy: "MGR_RD",
        storeId: 6,
        description: "Staff toilet flush mechanism broken. Needs replacement parts.",
        completionDate: "2025-04-06",
        comments: "Temporary workaround in place. Parts ordered.",
        flag: "normal" as const,
        attachments: []
      },
      
      // Oldham (Store ID: 7)
      {
        logDate: "2025-04-11",
        logTime: "15:25",
        loggedBy: "MGR_OL",
        storeId: 7,
        description: "Espresso machine steam wand clogged. Affecting milk drinks quality.",
        completionDate: "2025-04-13",
        comments: "Cleaning solution attempt failed. Needs professional service.",
        flag: "normal" as const,
        attachments: []
      },
      {
        logDate: "2025-03-25",
        logTime: "17:40",
        loggedBy: "MGR_OL",
        storeId: 7,
        description: "Counter surface cracked in multiple places. Difficult to clean properly.",
        completionDate: "2025-04-25",
        comments: "Hygiene concern. Looking into replacement options.",
        flag: "long_standing" as const,
        attachments: []
      },
      {
        logDate: "2025-04-03",
        logTime: "08:50",
        loggedBy: "MGR_OL",
        storeId: 7,
        description: "Back door security lock malfunctioning. Sometimes doesn't lock properly.",
        completionDate: "2025-04-05",
        comments: "Security risk. Temporary additional bolt added.",
        flag: "urgent" as const,
        attachments: []
      }
    ];
    
    console.log(`Inserting ${jobLogsData.length} job logs...`);
    
    // Clear existing job logs
    await db.delete(jobLogs);
    
    // Insert job logs into database
    for (const jobLog of jobLogsData) {
      await db.insert(jobLogs).values({
        logDate: jobLog.logDate,
        logTime: jobLog.logTime,
        loggedBy: jobLog.loggedBy,
        storeId: jobLog.storeId,
        description: jobLog.description,
        completionDate: jobLog.completionDate,
        comments: jobLog.comments,
        flag: jobLog.flag,
        attachments: jobLog.attachments
      });
    }
    
    console.log("Successfully seeded job logs data!");
  } catch (error) {
    console.error("Failed to seed job logs:", error);
  }
}

// Run the seed function
seedJobLogs();