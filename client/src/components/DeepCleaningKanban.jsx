import React, { useState, useEffect } from "react";
import { format, addDays, subDays, startOfDay } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Loader2, Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/UseAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";

const TASKS_PER_PAGE = 10;
const DAYS_SHOWN = 7;

export default function DeepCleaningKanban() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [stores, setStores] = useState([]);
  const [cleaningTasks, setCleaningTasks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [columnPages, setColumnPages] = useState({}); // {dateString: pageNum}
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // --- Board date range ---
  const [boardStartDate, setBoardStartDate] = useState(startOfDay(new Date()));

  // Fetch stores and cleaning task types
  useEffect(() => {
    async function fetchStores() {
      const { data } = await supabase.from("stores").select("id, name");
      setStores(data || []);
    }
    async function fetchCleaningTasks() {
      const { data } = await supabase.from("deep_cleaning_tasks").select("id, dc_task");
      setCleaningTasks(data || []);
    }
    fetchStores();
    fetchCleaningTasks();
  }, []);

  // Fetch deep cleaning tasks for the Kanban board
  useEffect(() => {
    async function fetchTasks() {
      let { data } = await supabase.from("deep_cleaning").select("*");
      if (!data) data = [];
      // Filter by permissions
      if (profile?.permissions === "store" && profile.store_ids?.[0]) {
        data = data.filter(task => task.store_id === profile.store_ids[0]);
      } else if (
        (profile?.permissions === "admin" || profile?.permissions === "regional") &&
        selectedStore !== "all"
      ) {
        data = data.filter(task => task.store_id === Number(selectedStore));
      }
      setTasks(data);
    }
    if (profile) fetchTasks();
  }, [profile, selectedStore, isLoading]);

  // Only show relevant stores for admin/regional
  const visibleStores =
    profile?.permissions === "admin"
      ? stores
      : stores.filter(store => profile?.store_ids?.includes(store.id));

  // Board visible days (default: today + next 6 days)
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) =>
    addDays(boardStartDate, i)
  );

  // Task input form setup
  const form = useForm({
    defaultValues: {
      task: "",
      startTime: "09:00",
      endTime: "10:00",
      storeId:
        profile?.permissions === "store"
          ? String(profile?.store_ids?.[0])
          : selectedStore !== "all"
          ? selectedStore
          : "",
      date: format(new Date(), "yyyy-MM-dd"),
      anytime: false
    }
  });

  // Handle add task
  const onSubmit = async data => {
    setIsLoading(true);
    const startDate = new Date(data.date);
    const endDate = new Date(data.date);

    // If "anytime", we don't care about times, but still store the date.
    if (!data.anytime) {
      const [startHours, startMinutes] = data.startTime.split(":").map(Number);
      const [endHours, endMinutes] = data.endTime.split(":").map(Number);
      startDate.setHours(startHours, startMinutes, 0, 0);
      endDate.setHours(endHours, endMinutes, 0, 0);
    }

    // Lookup correct store ID/name
    let storeId = null, storeName = "";
    if (profile?.permissions === "store" && profile.store_ids?.[0]) {
      storeId = profile.store_ids[0];
      storeName = stores.find(s => s.id === storeId)?.name || "";
    } else if (data.storeId) {
      storeId = Number(data.storeId);
      storeName = stores.find(s => s.id === storeId)?.name || "";
    }

    const taskName = data.task;
    const { error } = await supabase
      .from("deep_cleaning")
      .insert([
        {
          task: taskName,
          start: startDate.toISOString(),
          end_time: endDate.toISOString(),
          store_id: storeId,
          store_name: storeName,
          created_by: profile?.id,
          created_at: new Date().toISOString(),
          anytime: data.anytime
        }
      ]);
    setIsLoading(false);
    if (!error) {
      toast({
        title: "Deep cleaning task scheduled",
        description: `${taskName} scheduled for ${storeName} on ${format(startDate, "MMMM dd, yyyy")}`
      });
      setIsModalOpen(false);
      form.reset();
      setTasks([]); // force refresh
      setTimeout(() => setIsLoading(false), 200);
    } else {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Pagination helpers
  const getTasksForDay = day => {
    const dayString = format(day, "yyyy-MM-dd");
    return tasks.filter(
      t => format(new Date(t.start), "yyyy-MM-dd") === dayString
    );
  };
  const getColumnPage = dayString => columnPages[dayString] || 1;
  const setColumnPage = (dayString, pageNum) => {
    setColumnPages(p => ({ ...p, [dayString]: pageNum }));
  };

  // Mark as complete logic (for detail modal)
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
      setTasks(tasks =>
        tasks.map((task) =>
          task.id === selectedTask.id
            ? { ...task, completed_at: now.toISOString() }
            : task
        )
      );
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

  // --- Move board forward/back ---
  const handleNextBoard = () => setBoardStartDate(addDays(boardStartDate, DAYS_SHOWN));
  const handlePrevBoard = () => setBoardStartDate(subDays(boardStartDate, DAYS_SHOWN));

  return (
    <DashboardLayout title="Deep Cleaning Kanban">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-white mb-1">Deep Cleaning Kanban</h1>
        <p className="text-gray-400 mb-6">
          Each column is a day. Use board arrows to view other weeks. Each column shows up to 10 tasks with its own paging.
        </p>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4 mb-6">
          <Button className="bg-chai-gold hover:bg-yellow-600" onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add New Task
          </Button>
          {(profile?.permissions === "admin" || profile?.permissions === "regional") && (
            <div className="flex items-center">
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by Store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {visibleStores.map(store => (
                    <SelectItem key={store.id} value={String(store.id)}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {/* Board paging arrows */}
        <div className="flex items-center mb-2 gap-2">
          <Button size="sm" variant="outline" onClick={handlePrevBoard}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-200 font-semibold">
            {format(days[0], "MMM d")} - {format(days[DAYS_SHOWN - 1], "MMM d, yyyy")}
          </span>
          <Button size="sm" variant="outline" onClick={handleNextBoard}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        {/* Kanban board */}
       <div className="grid grid-cols-7 gap-4 w-full">
          {days.map(day => {
            const dayString = format(day, "yyyy-MM-dd");
            
            const allTasks = getTasksForDay(day);
            const page = getColumnPage(dayString);
            const pageCount = Math.ceil(allTasks.length / TASKS_PER_PAGE) || 1;
            const paginated = allTasks.slice(
              (page - 1) * TASKS_PER_PAGE,
              page * TASKS_PER_PAGE
            );
            return (
              <div
                key={dayString}
                className="bg-white rounded shadow flex-1 min-w-0 flex flex-col"

                style={{ height: 450 }}
              >
                <div className="font-semibold text-sm text-gray-700 p-2 border-b">{format(day, "EEE, MMM d")}</div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {paginated.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center">No tasks</div>
                  ) : (
                    paginated.map(task => (
                      <div
                        key={task.id}
                        className="bg-yellow-50 border rounded p-2 cursor-pointer"
                        onClick={() => {
                          setSelectedTask(task);
                          setViewDialogOpen(true);
                        }}
                      >
                        <div className="font-bold text-sm">{task.task}</div>
                        <div className="text-xs">{task.store_name}</div>
                        <div className="text-xs text-gray-500">
                          {task.anytime
                            ? "Anytime"
                            : `${format(new Date(task.start), "h:mmaaa")} - ${format(new Date(task.end_time), "h:mmaaa")}`}
                        </div>
                        {task.completed_at && (
                          <div className="text-xs text-green-600 font-semibold">Completed</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {pageCount > 1 && (
                  <div className="flex justify-between items-center p-1 border-t text-xs bg-yellow-100 rounded-b">
                    <Button size="sm" variant="ghost" disabled={page === 1}
                      onClick={() => setColumnPage(dayString, page - 1)}>Prev</Button>
                    <span>
                      Page {page} / {pageCount}
                    </span>
                    <Button size="sm" variant="ghost" disabled={page === pageCount}
                      onClick={() => setColumnPage(dayString, page + 1)}>Next</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Modal for scheduling new task */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Deep Cleaning Task</DialogTitle>
            <DialogDescription>
              Schedule a new task for any day and store.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="task"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task" />
                        </SelectTrigger>
                        <SelectContent>
                          {cleaningTasks.length === 0 ? (
                            <SelectItem value="No tasks available" disabled>No tasks available</SelectItem>
                          ) : (
                            cleaningTasks.map(task => (
                              <SelectItem key={task.id} value={task.dc_task}>
                                {task.dc_task}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              {(profile?.permissions === "admin" || profile?.permissions === "regional") && (
                <FormField
                  control={form.control}
                  name="storeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Location</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a store" />
                          </SelectTrigger>
                          <SelectContent>
                            {visibleStores.map(store => (
                              <SelectItem key={store.id} value={String(store.id)}>
                                {store.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <p className="text-xs text-gray-500">
                        Select which store this task is for
                      </p>
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <input
                        type="date"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="anytime"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={e => field.onChange(e.target.checked)}
                        id="anytime-checkbox"
                      />
                    </FormControl>
                    <FormLabel htmlFor="anytime-checkbox" className="!mb-0">
                      Task can be done anytime (no specific time)
                    </FormLabel>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <input
                          type="time"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          {...field}
                          disabled={form.watch('anytime')}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <input
                          type="time"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          {...field}
                          disabled={form.watch('anytime')}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-chai-gold hover:bg-yellow-600">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    "Schedule Task"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Modal for viewing/editing an existing task */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              {selectedTask?.task}
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="mb-4">
              <div><b>Date:</b> {format(selectedTask.start, "PPPP")}</div>
              <div><b>Store:</b> {selectedTask.store_name}</div>
              <div><b>Status:</b> {selectedTask.completed_at ? "Complete" : "Incomplete"}</div>
              <div><b>Created:</b> {format(selectedTask.created_at || selectedTask.start, "PPpp")}</div>
              {selectedTask.completed_at && (
                <div><b>Completed:</b> {format(selectedTask.completed_at, "PPpp")}</div>
              )}
              <div>
                <b>Time:</b> {selectedTask.anytime ? "Anytime" : `${format(selectedTask.start, 'HH:mm')} - ${format(selectedTask.end_time, 'HH:mm')}`}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {!selectedTask?.completed_at && (
              <Button onClick={markTaskComplete} className="bg-green-600 text-white hover:bg-green-700">
                Mark Complete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
