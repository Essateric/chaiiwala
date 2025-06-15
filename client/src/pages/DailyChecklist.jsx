import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import ChecklistItem from "../components/checklists/checklist-item.jsx";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import DailyStockCheck from "../components/checklists/DailyStockCheck.jsx";
import { useAuth } from "../hooks/UseAuth.jsx"; // Make sure you have this hook

export default function DailyChecklist() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checklists, setChecklists] = useState([]);

  // Fetch today's checklist from Supabase
  useEffect(() => {
    async function fetchChecklist() {
      if (!user?.id) {
        setChecklists([]);
        setLoading(false);
        return;
      }
      setLoading(true);

      const today = new Date().toISOString().split("T")[0];

      // Fetch all checklist rows for today/user/store
      const { data, error } = await supabase
        .from("daily_checklist")
        .select("*")
        .eq("user_id", user.id)
        .eq("checklist_date", today)
        .order("id");

      if (error) {
        console.error("Error loading checklist:", error);
        setChecklists([]);
      } else if (data && data.length > 0) {
        setChecklists([
          {
            id: 1,
            title: "Daily Store Checklist",
            description: "Key actions for managers to complete every day.",
            dueDate: "Today",
            category: "Operations",
            assignedTo: "Store Manager",
            tasks: data.map((task) => ({
              id: task.id,
              title: task.title,
              status: task.status || "pending",
              completed_at: task.completed_at,
              completed_by: task.completed_by,
            }))
          }
        ]);
      } else {
        setChecklists([]);
      }
      setLoading(false);
    }

    fetchChecklist();
  }, [user]);

  // Cycle status: pending -> in progress -> completed -> pending
  const nextStatus = (current) => {
    if (current === "pending") return "in progress";
    if (current === "in progress") return "completed";
    return "pending";
  };

  // Handles a status cycle and DB update
  const handleTaskToggle = async (checklistId, taskId) => {
    const checklist = checklists.find((c) => c.id === checklistId);
    const task = checklist?.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newStatus = nextStatus(task.status);
    const completed_at = newStatus === "completed" ? new Date().toISOString() : null;
    const completed_by = newStatus === "completed" ? user?.id : null;

    // Update UI instantly
    setChecklists((prev) =>
      prev.map((cl) =>
        cl.id === checklistId
          ? {
              ...cl,
              tasks: cl.tasks.map((t) =>
                t.id === taskId
                  ? { ...t, status: newStatus, completed_at, completed_by }
                  : t
              )
            }
          : cl
      )
    );

    // Update DB always (no sample/demo tasks anymore)
    await supabase
      .from("daily_checklist")
      .update({
        status: newStatus,
        completed_at,
        completed_by
      })
      .eq("id", taskId);
  };

  return (
    <DashboardLayout title="Daily Checklist">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Daily Checklist</h1>
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : checklists.length === 0 ? (
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
              onTaskToggle={(clId, taskId) => handleTaskToggle(clId, taskId)}
            />
          ))
        )}
        <DailyStockCheck />
      </div>
    </DashboardLayout>
  );
}
