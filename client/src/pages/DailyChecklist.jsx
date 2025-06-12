import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import ChecklistItem from "../components/checklists/checklist-item.jsx";
import { useAuth } from "../hooks/UseAuth.jsx";
import { Badge } from "../components/ui/badge.jsx";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import { Loader2 } from "lucide-react";
import DailyStockCheck from "../components/checklists/DailyStockCheck.jsx";


const ALLOWED_ROLES = ["store"]; // Sample checklist data (replace with DB later)
const sampleChecklists = [
  {
    id: 1,
    title: "Daily Cleaning",
    description: "All the essential cleaning tasks for your store.",
    dueDate: "Today",
    category: "Cleaning",
    assignedTo: "Store Manager",
    tasks: [
      { id: 101, title: "Wipe all tables", completed: false },
      { id: 102, title: "Sweep and mop floor", completed: true },
      { id: 103, title: "Sanitise till area", completed: false },
    ]
  },
  {
    id: 2,
    title: "Event Orders",
    description: "Prepare for today's booked events.",
    dueDate: "Today",
    category: "Orders",
    assignedTo: "Store Manager",
    tasks: [
      { id: 301, title: "Pack event 123 - 10am", completed: false },
      { id: 302, title: "Double-check order details", completed: true },
    ]
  }
];

export default function DailyChecklist() {
  // Use state if you want to toggle checkboxes for demo
  const [checklists, setChecklists] = useState(sampleChecklists);
  

  // Toggle logic for demo only
  const handleTaskToggle = (checklistId, taskId, completed) => {
    setChecklists((prev) =>
      prev.map((checklist) =>
        checklist.id === checklistId
          ? {
              ...checklist,
              tasks: checklist.tasks.map((task) =>
                task.id === taskId ? { ...task, completed } : task
              )
            }
          : checklist
      )
    );
  };
  

  return (
    <DashboardLayout title="Daily Checklist">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Daily Checklist</h1>
        {checklists.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No daily tasks found for today.
          </div>
        ) : (
          checklists.map((checklist) => (
            <ChecklistItem
              key={checklist.id}
              id={checklist.id}
              title={checklist.title}
              description={checklist.description}
              tasks={checklist.tasks}
              dueDate={checklist.dueDate}
              category={checklist.category}
              assignedTo={checklist.assignedTo}
              onTaskToggle={handleTaskToggle}
            />
          ))
        )}
            <DailyStockCheck />
      </div>
      
    </DashboardLayout>
  );
}