import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/UseAuth';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";

// Calendar localizer setup
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Color logic for calendar cards
function getTaskColor(task) {
  if (task.completed_at) return 'green';
  const created = new Date(task.created_at || task.start);
  const now = new Date();
  const ageInDays = (now - created) / (1000 * 60 * 60 * 24);
  if (ageInDays >= 7) return 'orange';
  return 'blue';
}

export default function DeepCleaningPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // State
  const [stores, setStores] = useState([]);
  const [cleaningTasks, setCleaningTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [events, setEvents] = useState([]);

  // Fetch stores from Supabase
  useEffect(() => {
    async function fetchStores() {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name');
      if (!error) setStores(data || []);
    }
    fetchStores();
  }, []);

  // Fetch deep cleaning tasks from Supabase (dc_task)
  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase
        .from('deep_cleaning_tasks')
        .select('id, dc_task');
      if (!error) setCleaningTasks(data || []);
    }
    fetchTasks();
  }, []);

  // Only show relevant stores in dropdown for admin/regional
  const visibleStores =
    profile?.permissions === 'admin'
      ? stores
      : stores.filter(store => profile?.store_ids?.includes(store.id));

  // Form setup
  const form = useForm({
    defaultValues: {
      task: '',
      startTime: '09:00',
      endTime: '10:00',
      storeId:
        profile?.permissions === 'store'
          ? String(profile?.store_ids?.[0])
          : selectedStore !== 'all'
            ? selectedStore
            : ''
    }
  });

  // Fetch events from Supabase
  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from('deep_cleaning')
        .select('*');
      let filteredEvents = data || [];
      // Store managers: only see their own store
      if (profile?.permissions === 'store' && profile.store_ids?.[0]) {
        filteredEvents = filteredEvents.filter(
          event => event.store_id === profile.store_ids[0]
        );
      }
      // Regional/admin: filter by selected store
      else if (
        (profile?.permissions === 'admin' || profile?.permissions === 'regional') &&
        selectedStore !== 'all'
      ) {
        filteredEvents = filteredEvents.filter(
          event => event.store_id === Number(selectedStore)
        );
      }
      setEvents(
        filteredEvents.map(ev => ({
          ...ev,
          start: new Date(ev.start),
          end: new Date(ev.end_time)
        }))
      );
    }
    fetchEvents();
  }, [profile, selectedStore, isLoading, stores]);

  // Calendar slot select handler
  const handleSelectSlot = ({ start }) => {
    setSelectedDate(start);
    setIsModalOpen(true);
    const storeId =
      profile?.permissions === 'store'
        ? String(profile.store_ids?.[0])
        : selectedStore !== 'all'
          ? selectedStore
          : '';
    form.reset({
      task: '',
      startTime: '09:00',
      endTime: '10:00',
      storeId
    });
  };

  // Calendar event select handler
  const handleEventSelect = (event) => {
    setSelectedTask(event);
    setViewDialogOpen(true);
  };

  // Create new cleaning task
  const onSubmit = async (data) => {
    if (!selectedDate) return;
    setIsLoading(true);

    // Compose start/end from selected date and form times
    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);
    const [startHours, startMinutes] = data.startTime.split(':').map(Number);
    const [endHours, endMinutes] = data.endTime.split(':').map(Number);
    startDate.setHours(startHours, startMinutes, 0, 0);
    endDate.setHours(endHours, endMinutes, 0, 0);

    // Lookup correct store ID/name
    let storeId = null, storeName = '';
    if (profile?.permissions === 'store' && profile.store_ids?.[0]) {
      storeId = profile.store_ids[0];
      storeName = stores.find(s => s.id === storeId)?.name || '';
    } else if (data.storeId) {
      storeId = Number(data.storeId);
      storeName = stores.find(s => s.id === storeId)?.name || '';
    }

    // The selected task (from dc_task) string
    const taskName = data.task;

    // Save to Supabase
    const { data: insertData, error } = await supabase
      .from('deep_cleaning')
      .insert([
        {
          task: taskName, // Store the dc_task string!
          start: startDate.toISOString(),
          end_time: endDate.toISOString(),
          store_id: storeId,
          store_name: storeName,
          created_by: profile?.id,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (!error) {
      toast({
        title: 'Deep cleaning task scheduled',
        description: `${taskName} scheduled for ${storeName} on ${format(
          startDate,
          'MMMM dd, yyyy'
        )}`
      });
      setIsLoading(false);
      setIsModalOpen(false);
      setEvents(prev => [
        ...prev,
        {
          ...insertData,
          start: new Date(insertData.start),
          end: new Date(insertData.end_time)
        }
      ]);
    } else {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Mark task as complete
  const markTaskComplete = async () => {
    if (!selectedTask) return;
    const now = new Date();
    const { error } = await supabase
      .from('deep_cleaning')
      .update({ completed_at: now.toISOString() })
      .eq('id', selectedTask.id);

    if (!error) {
      toast({
        title: 'Task marked as complete!',
        description: `${selectedTask.task} is now completed.`,
      });
      setEvents((prev) =>
        prev.map((task) =>
          task.id === selectedTask.id
            ? { ...task, completed_at: now.toISOString() }
            : task
        )
      );
      setViewDialogOpen(false);
      setSelectedTask(null);
    } else {
      toast({
        title: 'Error',
        description: 'Could not mark as complete.',
        variant: 'destructive',
      });
    }
  };

  // Calendar card color logic
  const eventPropGetter = (event) => {
    const color = getTaskColor(event);
    return {
      style: {
        backgroundColor: color,
        borderColor: color,
        color: 'white'
      }
    };
  };

  // Calendar event title logic
  const getEventTitle = (event) => {
    if ((profile?.permissions === 'admin' || profile?.permissions === 'regional') && event.store_name) {
      return `${event.task} - ${event.store_name}`;
    }
    return event.task;
  };

  return (
    <>
      <DashboardLayout title="Deep Cleaning Schedule">
        <div className="container mx-auto p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Deep Cleaning Schedule</h1>
            <p className="text-gray-400">
              Plan and schedule deep cleaning tasks for your store.
              Click on a date to add a new cleaning task.
            </p>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4">
              <Button
                className="bg-chai-gold hover:bg-yellow-600"
                onClick={() => {
                  const today = new Date();
                  handleSelectSlot({ start: today });
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add New Task
              </Button>
              {(profile?.permissions === 'admin' || profile?.permissions === 'regional') && (
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
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div style={{ height: 600 }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                titleAccessor={getEventTitle}
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleEventSelect}
                defaultView="week"
                views={['month', 'week', 'day']}
                showMultiDayTimes
                className="rounded-md border"
                eventPropGetter={eventPropGetter}
                min={new Date(1980, 1, 1, 9, 0, 0)}
                max={new Date(1980, 1, 1, 21, 0, 0)}
                step={60}
                timeslots={1}
                scrollToTime={new Date(1980, 1, 1, 9, 0)}
              />
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Modal for scheduling new task */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Deep Cleaning Task</DialogTitle>
            <DialogDescription>
              {selectedDate && `Schedule for ${format(selectedDate, 'MMMM dd, yyyy')}`}
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
              {(profile?.permissions === 'admin' || profile?.permissions === 'regional') && (
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
                    'Schedule Task'
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
    </>
  );
}
