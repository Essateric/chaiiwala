// src/pages/DeepCleaningPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { format, startOfWeek } from "date-fns"; // ⬅️ added startOfWeek
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog.jsx";
import { Button } from "../components/ui/button.jsx";
import { useToast } from "../hooks/use-toast.jsx";
import { useAuth } from "../hooks/UseAuth.jsx";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import { supabase } from "../lib/supabaseClient.js";
import DeepCleaningFormComponent from "../components/DeepCleaningForm.jsx";
import DeepCleaningChecklistView from "../components/DeepCleaningChecklistView.jsx";
// ⛔ removed: DeepCleaningAdminDayView import

export default function DeepCleaningPage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const isStoreManager = profile?.permissions === "store";
  const isRegionalOrAdmin =
    profile?.permissions === "admin" || profile?.permissions === "regional";

  const [stores, setStores] = useState([]);
  const [cleaningTasks, setCleaningTasks] = useState([]);

  // “Add task” dialog
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // “View task” dialog (kept — used for store managers)
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Store selector for regional/admin
  const [selectedStoreId, setSelectedStoreId] = useState("all");

  // ✅ NEW: compute the “week commencing” date (Monday start)
  const weekCommencingDate = useMemo(
    () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    []
  );
  // Load stores
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (!error) setStores(data || []);
    })();
  }, []);

  // 👉 Auto-pick first store for regional/admin so the table shows immediately
  useEffect(() => {
    if (isRegionalOrAdmin && selectedStoreId === "all" && stores.length > 0) {
      setSelectedStoreId(String(stores[0].id));
    }
  }, [isRegionalOrAdmin, selectedStoreId, stores]);

  // Load task options
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("deep_cleaning_tasks")
        .select("id, dc_task");
      if (!error) setCleaningTasks(data || []);
    })();
  }, []);

  // Handlers (used by dialogs / store-manager flow)
  const handleSelectSlot = ({ start }) => {
    setSelectedDate(start);
    setIsModalOpen(true);
  };
  const handleEventSelect = (event) => {
    setSelectedTask(event);
    setViewDialogOpen(true);
  };

  const onSubmit = async (data) => {
    if (!selectedDate) return;

    // Resolve store id for insert
    const resolvedStoreId = isStoreManager
      ? profile?.store_ids?.[0]
      : data.storeId || "";

    if (!resolvedStoreId || resolvedStoreId === "") {
      toast({
        title: "Missing Store",
        description: "Please select a store before submitting.",
        variant: "destructive",
      });
      return;
    }
    if (!data.task || data.task.trim() === "") {
      toast({
        title: "Missing Task",
        description: "Please select a task before submitting.",
        variant: "destructive",
      });
      return;
    }

    let startDate = new Date(selectedDate);
    let endDate = new Date(selectedDate);

    if (data.anytime) {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      if (!data.startTime || !data.endTime) {
        toast({
          title: "Missing Time",
          description: "Please select start and end times.",
          variant: "destructive",
        });
        return;
      }
      const [sh, sm] = data.startTime.split(":").map(Number);
      const [eh, em] = data.endTime.split(":").map(Number);
      startDate.setHours(sh, sm, 0, 0);
      endDate.setHours(eh, em, 0, 0);
    }

    const storeName =
      stores.find((s) => String(s.id) === String(resolvedStoreId))?.name || "";

    const payload = {
      task: data.task,
      start: startDate.toISOString(),
      end_time: endDate.toISOString(),
      store_id: resolvedStoreId,
      store_name: storeName,
      created_by: profile?.id,
      created_at: new Date().toISOString(),
      anytime: data.anytime,
    };

    for (const key of ["task", "start", "end_time", "store_id", "created_by"]) {
      if (!payload[key]) {
        toast({
          title: "Missing Data",
          description: `The field "${key}" is missing or invalid.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    const { error } = await supabase.from("deep_cleaning").insert([payload]);

    if (!error) {
      toast({
        title: "Deep cleaning task scheduled",
        description: `${data.task} scheduled for ${storeName} on ${startDate.toDateString()}`,
      });
      setIsLoading(false);
      setIsModalOpen(false);
    } else {
      let friendly = "Something went wrong while saving the task.";
      if (error.message.includes("store_id")) friendly = "Please select a valid store.";
      if (error.message.includes("task")) friendly = "Please select a valid task.";

      toast({ title: "Error", description: friendly, variant: "destructive" });
      setIsLoading(false);
    }
  };

  const markTaskComplete = async () => {
    if (!selectedTask) return;
    const now = new Date();
    const { error } = await supabase
      .from("deep_cleaning")
      .update({ completed_at: now.toISOString() })
      .eq("id", selectedTask.id);

    if (!error) {
      toast({
        title: "Task marked as complete!",
        description: `${selectedTask.task} is now completed.`,
      });
      setViewDialogOpen(false);
      setSelectedTask(null);
    } else {
      toast({
        title: "Error",
        description: "Could not mark as complete.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout title="Deep Cleaning">

      {isStoreManager ? (
        // Store manager: interactive checklist for their own store
        <DeepCleaningChecklistView profile={profile} />
      ) : (
        <>
          {/* Regional/Admin: store selector + read-only weekly checklist */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Regional / Admin View</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Store:</label>
              <select
                className="border bg-white rounded px-2 py-1 text-sm"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
              >
                <option value="all">All Stores</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Read-only checklist table for the selected store */}
          {selectedStoreId !== "all" ? (
            <div className="mt-2">
              <DeepCleaningChecklistView
                profile={profile}
                readOnly
                storeIdOverride={Number(selectedStoreId)}
                key={`ro-${selectedStoreId}`} // re-render on change
              />
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Select a store to view its checklist (read-only).
            </div>
          )}
        </>
      )}

      {/* Dialogs (kept; used by store managers) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Deep Cleaning Task</DialogTitle>
            <DialogDescription>
              {selectedDate && `Schedule for ${format(selectedDate, "MMMM dd, yyyy")}`}
            </DialogDescription>
          </DialogHeader>
          <DeepCleaningFormComponent
            profile={profile}
            stores={stores}
            cleaningTasks={cleaningTasks}
            selectedDate={selectedDate}
            onSubmit={onSubmit}
            isLoading={isLoading}
            setIsModalOpen={setIsModalOpen}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>{selectedTask?.task}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {/* Only store managers can mark complete from this dialog */}
            {!selectedTask?.completed_at && isStoreManager && (
              <Button
                onClick={markTaskComplete}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                Mark Complete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
