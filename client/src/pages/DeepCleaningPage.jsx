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
} from "../components/ui/dialog.jsx";
import { Button } from '../components/ui/button.jsx';
import { useToast } from '../hooks/use-toast.jsx';
import { useAuth } from '../hooks/UseAuth.jsx';
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import { supabase } from "../lib/supabaseClient.js";
import DeepCleaningKanban from "../components/DeepCleaningKanban.jsx";
import DeepCleaningFormComponent from "../components/DeepCleaningForm.jsx";
import DeepCleaningChecklistView from "../components/DeepCleaningChecklistView.jsx";

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

  const [stores, setStores] = useState([]);
  const [cleaningTasks, setCleaningTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [events, setEvents] = useState([]);

  const [view, setView] = useState(
  profile?.permissions === "store" ? "checklist" : "kanban"
);
useEffect(() => {
  if (profile) {
    setView(profile.permissions === "store" ? "checklist" : "kanban");
  }
}, [profile]);

  // Fetch stores
  useEffect(() => {
    async function fetchStores() {
      const { data, error } = await supabase.from('stores').select('id, name');
      if (!error) setStores(data || []);
    }
    fetchStores();
  }, []);

  // Fetch cleaning task options
  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase.from('deep_cleaning_tasks').select('id, dc_task');
      if (!error) setCleaningTasks(data || []);
    }
    fetchTasks();
  }, []);

  const visibleStores =
    profile?.permissions === 'admin'
      ? stores
      : stores.filter(store => profile?.store_ids?.includes(store.id));

  // Fetch existing deep cleaning events
  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase.from('deep_cleaning').select('*');
      let filteredEvents = data || [];

      if (profile?.permissions === 'store' && profile.store_ids?.[0]) {
        filteredEvents = filteredEvents.filter(event => event.store_id === profile.store_ids[0]);
      } else if (
        (profile?.permissions === 'admin' || profile?.permissions === 'regional') &&
        selectedStore !== 'all'
      ) {
        filteredEvents = filteredEvents.filter(event => event.store_id === Number(selectedStore));
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

  // Open modal on calendar slot click
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

const resolvedStoreId =
  profile?.permissions === 'store'
    ? profile.store_ids?.[0]
    : data.storeId || '';

      console.log("🧠 raw form data:", data);
console.log("🧠 resolved store id:", resolvedStoreId);

if (!resolvedStoreId || resolvedStoreId === '') {
  toast({
    title: 'Missing Store',
    description: 'Please select a store before submitting.',
    variant: 'destructive',
  });
  return;
}


  if (!data.task || data.task.trim() === '') {
    toast({
      title: 'Missing Task',
      description: 'Please select a task before submitting.',
      variant: 'destructive'
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
        title: 'Missing Time',
        description: 'Please select start and end times.',
        variant: 'destructive'
      });
      return;
    }

    const [startHours, startMinutes] = data.startTime.split(':').map(Number);
    const [endHours, endMinutes] = data.endTime.split(':').map(Number);
    startDate.setHours(startHours, startMinutes, 0, 0);
    endDate.setHours(endHours, endMinutes, 0, 0);
  }

  const storeName = stores.find(s => s.id === Number(resolvedStoreId))?.name || '';

  // Final validation before sending
  const payload = {
    task: data.task,
    start: startDate.toISOString(),
    end_time: endDate.toISOString(),
    store_id: resolvedStoreId,
    store_name: storeName,
    created_by: profile?.id,
    created_at: new Date().toISOString(),
    anytime: data.anytime
  };

  // Check that no required fields are missing
  const requiredFields = ['task', 'start', 'end_time', 'store_id', 'created_by'];
  for (const key of requiredFields) {
    if (!payload[key]) {
      toast({
        title: 'Missing Data',
        description: `The field "${key}" is missing or invalid.`,
        variant: 'destructive'
      });
      return;
    }
  }

  console.log("✅ Final validated payload to Supabase:", payload);

  setIsLoading(true);

  const { data: insertData, error } = await supabase
    .from('deep_cleaning')
    .insert([payload])
    .select()
    .single();

  if (!error) {
    toast({
      title: 'Deep cleaning task scheduled',
      description: `${data.task} scheduled for ${storeName} on ${startDate.toDateString()}`
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
  let friendlyMessage = "Something went wrong while saving the task.";

  if (error.message.includes('store_id')) {
    friendlyMessage = "Please select a valid store before submitting.";
  } else if (error.message.includes('task')) {
    friendlyMessage = "Please select a valid task before submitting.";
  }

  toast({
    title: "Error",
    description: friendlyMessage,
    variant: "destructive"
  });

  console.error("Supabase insert error:", error);
  setIsLoading(false);
}};

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

  const getEventTitle = (event) => {
    let timeLabel = '';
    if (event.anytime) {
      timeLabel = '(Anytime)';
    } else if (event.start && event.end) {
      timeLabel =
        ' (' +
        format(event.start, 'HH:mm') +
        '-' +
        format(event.end, 'HH:mm') +
        ')';
    }
    if ((profile?.permissions === 'admin' || profile?.permissions === 'regional') && event.store_name) {
      return `${event.task}${timeLabel} - ${event.store_name}`;
    }
    return `${event.task}${timeLabel}`;
  };

 return (
  <DashboardLayout title="Deep Cleaning">
    {/* Toggle at top of page */}
    <div className="flex items-center justify-end gap-2 mb-3">
      <Button
        variant={view === "checklist" ? "default" : "outline"}
        onClick={() => setView("checklist")}
      >
        Checklist
      </Button>
      <Button
        variant={view === "kanban" ? "default" : "outline"}
        onClick={() => setView("kanban")}
      >
        Kanban
      </Button>
    </div>

    {/* Conditional render based on view */}
    {view === "checklist" ? (
      <DeepCleaningChecklistView profile={profile} />
    ) : (
      <DeepCleaningKanban />
    )}

    {/* Modals below */}
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Deep Cleaning Task</DialogTitle>
          <DialogDescription>
            {selectedDate && `Schedule for ${format(selectedDate, 'MMMM dd, yyyy')}`}
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
        {/* Task details */}
        <DialogFooter>
          <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
            Close
          </Button>
          {!selectedTask?.completed_at && (
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
);}