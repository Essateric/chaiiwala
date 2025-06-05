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

// Tasks list
const DEEP_CLEANING_TASKS = [
  "Bins Area (Inside and Out)",
  "Door Mats",
  "Skirting Boards",
  "Remove Chewing Gum from Under Tables/Chairs",
  "Table Legs and Backs",
  "Chair Legs and Backs",
  "Booth Seating/Padded Seats",
  "Mirrors",
  "Outside Signage",
  "Shop Front and Window",
  "Outside Barriers and Poles",
  "Outside Point of Sale (A-Frame, etc.)",
  "Shutters",
  "Fly Zapper",
  "Cup Dispensers",
  "Drinks Fridge (Remove Items and Clean)",
  "Cake Fridge",
  "Ice Machine",
  "Behind Counter and Shelving",
  "Fryer (Change Oil)",
  "Canopy (Including Filters)",
  "Air Vents",
  "Team Areas",
  "Behind Sink/Cookers and Tables",
  "All Fridges in Kitchen",
  "Clean Fridge Condensers (Scheduled Once Per Week)",
  "Defrost Freezers (Scheduled Once Per Week)",
  "Descale Steam Arm and Check Filters on All Water Dispensers"
];

// Color logic for calendar cards
function getTaskColor(task) {
  if (task.completed_at) return 'green';
  const created = new Date(task.created_at || task.start);
  const now = new Date();
  const ageInDays = (now - created) / (1000 * 60 * 60 * 24);
  if (ageInDays >= 7) return 'orange';
  return 'blue';
}

// Locales for date-fns
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function DeepCleaningPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Dialog/modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState(user?.storeId ? String(user.storeId) : 'all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // EVENTS STATE
  const [events, setEvents] = useState([]);

  // Replace this with Supabase fetch if you want
  const mockLocations = [
    { id: 1, name: 'Cheetham Hill' },
    { id: 2, name: 'Oxford Road' },
    { id: 3, name: 'Old Trafford' },
    { id: 4, name: 'Fallowfield' },
    { id: 5, name: 'Stockport Road' },
    { id: 6, name: 'Rusholme' },
    { id: 7, name: 'Great Moor Street Bolton' },
    { id: 8, name: 'Bradford' }
  ];

  // FORM
  const form = useForm({
    defaultValues: {
      task: '',
      startTime: '09:00',
      endTime: '10:00',
      storeId: user?.role === 'store' ? String(user.storeId) :
        selectedStore !== 'all' ? selectedStore : ''
    }
  });

  // Fetch events from Supabase
  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from('deep_cleaning')
        .select('*');
      let filteredEvents = data || [];
      // Filter by role/store
      if (user?.role === 'store' && user.storeId) {
        filteredEvents = filteredEvents.filter(event => event.store_id === user.storeId);
      } else if ((user?.role === 'admin' || user?.role === 'regional') && selectedStore !== 'all') {
        filteredEvents = filteredEvents.filter(event => event.store_id === Number(selectedStore));
      }
      // Convert string dates to Date objects for Calendar
      setEvents(filteredEvents.map(ev => ({
        ...ev,
        start: new Date(ev.start),
        end: new Date(ev.end_time) // <--- Important fix!
      })));
    }
    fetchEvents();
  }, [user, selectedStore, isLoading]);

  // When clicking on calendar slot
  const handleSelectSlot = ({ start }) => {
    setSelectedDate(start);
    setIsModalOpen(true);
    const storeId = user?.role === 'store'
      ? String(user.storeId)
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

  // When clicking on an event card
  const handleEventSelect = (event) => {
    setSelectedTask(event);
    setViewDialogOpen(true);
  };

  // Create a new cleaning task
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

    let storeId = null, storeName = '';
    if (user?.role === 'store' && user.storeId) {
      storeId = user.storeId;
      storeName = mockLocations.find(s => s.id === storeId)?.name;
    } else if (data.storeId) {
      storeId = Number(data.storeId);
      storeName = mockLocations.find(s => s.id === storeId)?.name;
    }

    // --- Save to Supabase ---
    const { data: insertData, error } = await supabase
      .from('deep_cleaning')
      .insert([{
        task: data.task,
        start: startDate.toISOString(),
        end_time: endDate.toISOString(), // <-- This is the DB field
        store_id: storeId,
        store_name: storeName,
        created_by: user?.id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (!error) {
      toast({
        title: 'Deep cleaning task scheduled',
        description: `${data.task} scheduled for ${storeName} on ${format(startDate, 'MMMM dd, yyyy')}`,
      });
      setIsLoading(false);
      setIsModalOpen(false);
      setEvents(prev => [...prev, {
        ...insertData,
        start: new Date(insertData.start),
        end: new Date(insertData.end_time) // <-- calendar uses "end"
      }]);
    } else {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Mark a task as complete
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
    if ((user?.role === 'admin' || user?.role === 'regional') && event.store_name) {
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
              <Button className="bg-chai-gold hover:bg-yellow-600" onClick={() => {
                const today = new Date();
                handleSelectSlot({ start: today });
              }}>
                <Plus className="mr-2 h-4 w-4" /> Add New Task
              </Button>
              {(user?.role === 'admin' || user?.role === 'regional') && (
                <div className="flex items-center">
                  <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger className="w-[200px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by Store" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stores</SelectItem>
                      {mockLocations.map(store => (
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
                min={new Date(1980, 1, 1, 9, 0, 0)}   // 9:00 AM
                max={new Date(1980, 1, 1, 21, 0, 0)}   // 9:00 PM
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
                          {DEEP_CLEANING_TASKS.map(task => (
                            <SelectItem key={task} value={task}>
                              {task}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              {(user?.role === 'admin' || user?.role === 'regional') && (
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
                            {mockLocations.map(store => (
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
