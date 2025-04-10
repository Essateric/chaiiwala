import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format } from 'date-fns';
import { parse } from 'date-fns';
import { startOfWeek } from 'date-fns';
import { getDay } from 'date-fns';
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
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel 
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from "@/components/layout/dashboard-layout";

// Deep cleaning tasks
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

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface DeepCleaningEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  storeId?: number;
  storeName?: string;
  resource?: any;
}

interface AddEventFormValues {
  task: string;
  startTime: string;
  endTime: string;
  storeId?: string; // Added store selection
}

// Define interface for store locations
interface StoreLocation {
  id: number;
  name: string;
}

export default function DeepCleaningPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<DeepCleaningEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>(user?.storeId ? String(user.storeId) : 'all');
  
  // In a real app, we would fetch locations from an API like this:
  // const { data: locations = [] } = useQuery<StoreLocation[]>({
  //   queryKey: ["/api/locations"],
  // });

  // Mock store locations until API is ready
  const mockLocations: StoreLocation[] = [
    { id: 1, name: 'Cheetham Hill' },
    { id: 2, name: 'Oxford Road' },
    { id: 3, name: 'Old Trafford' },
    { id: 4, name: 'Fallowfield' },
    { id: 5, name: 'Stockport Road' },
    { id: 6, name: 'Rusholme' },
    { id: 7, name: 'Great Moor Street Bolton' },
    { id: 8, name: 'Bradford' }
  ];

  // Create form
  const form = useForm<AddEventFormValues>({
    defaultValues: {
      task: '',
      startTime: '09:00',
      endTime: '10:00',
      storeId: user?.role === 'store' ? String(user.storeId) : 
               selectedStore !== 'all' ? selectedStore : ''
    }
  });

  // Mock loading events
  useEffect(() => {
    // In a real app, you would fetch these from the API based on role and selected store
    const mockEvents: DeepCleaningEvent[] = [
      {
        id: '1',
        title: 'Clean Fridge Condensers',
        start: new Date(new Date().setDate(new Date().getDate() - 1)),
        end: new Date(new Date().setDate(new Date().getDate() - 1)),
        allDay: true,
        storeId: 1,
        storeName: 'Cheetham Hill'
      },
      {
        id: '2',
        title: 'Defrost Freezers',
        start: new Date(),
        end: new Date(),
        allDay: true,
        storeId: 2,
        storeName: 'Oxford Road'
      },
      {
        id: '3',
        title: 'Deep Clean Fryer',
        start: new Date(new Date().setDate(new Date().getDate() + 2)),
        end: new Date(new Date().setDate(new Date().getDate() + 2)),
        allDay: true,
        storeId: 3,
        storeName: 'Old Trafford'
      },
      {
        id: '4',
        title: 'Clean Air Vents',
        start: new Date(new Date().setDate(new Date().getDate() + 1)),
        end: new Date(new Date().setDate(new Date().getDate() + 1)),
        allDay: true,
        storeId: 5,
        storeName: 'Stockport Road'
      }
    ];
    
    // Filter events based on user role and selected store
    let filteredEvents = [...mockEvents];
    
    if (user?.role === 'store' && user.storeId) {
      // Store managers can only see their own store's events
      filteredEvents = filteredEvents.filter(event => event.storeId === user.storeId);
    } else if ((user?.role === 'admin' || user?.role === 'regional') && selectedStore !== 'all') {
      // Admin and regional managers can filter by specific store
      filteredEvents = filteredEvents.filter(event => event.storeId === Number(selectedStore));
    }
    
    setEvents(filteredEvents);
  }, [user, selectedStore]);

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start);
    setIsModalOpen(true);
    
    // Reset form with appropriate store ID based on user role
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

  const handleEventSelect = (event: DeepCleaningEvent) => {
    toast({
      title: event.title,
      description: `Scheduled for ${format(event.start, 'MMMM dd, yyyy')}`,
    });
  };

  const onSubmit = (data: AddEventFormValues) => {
    if (!selectedDate) return;
    
    setIsLoading(true);
    
    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);
    
    // Parse time strings
    const [startHours, startMinutes] = data.startTime.split(':').map(Number);
    const [endHours, endMinutes] = data.endTime.split(':').map(Number);
    
    startDate.setHours(startHours, startMinutes, 0);
    endDate.setHours(endHours, endMinutes, 0);
    
    // Determine store ID and name based on user role and selection
    let storeId: number | undefined;
    let storeName: string | undefined;
    
    if (user?.role === 'store' && user.storeId) {
      // Store managers can only add tasks for their own store
      storeId = user.storeId;
      storeName = mockLocations.find(s => s.id === storeId)?.name;
    } else if (data.storeId) {
      // Admin/regional managers can select a store
      storeId = Number(data.storeId);
      storeName = mockLocations.find(s => s.id === storeId)?.name;
    }
    
    // Create new event
    const newEvent: DeepCleaningEvent = {
      id: Date.now().toString(),
      title: data.task,
      start: startDate,
      end: endDate,
      storeId,
      storeName
    };
    
    // Wait briefly to simulate API call
    setTimeout(() => {
      setEvents([...events, newEvent]);
      setIsLoading(false);
      setIsModalOpen(false);
      
      const storeInfo = storeName ? ` for ${storeName}` : '';
      toast({
        title: 'Deep cleaning task scheduled',
        description: `${data.task} scheduled${storeInfo} on ${format(startDate, 'MMMM dd, yyyy')}`,
      });
    }, 500);
  };

  // This function gets the store name for display based on event's storeId
  const getEventTitle = (event: DeepCleaningEvent) => {
    if ((user?.role === 'admin' || user?.role === 'regional') && event.storeName) {
      return `${event.title} - ${event.storeName}`;
    }
    return event.title;
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
              
              {/* Store Filter - Only visible for admin and regional managers */}
              {(user?.role === 'admin' || user?.role === 'regional') && (
                <div className="flex items-center">
                  <Select 
                    value={selectedStore} 
                    onValueChange={setSelectedStore}
                  >
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
                step={60}
                showMultiDayTimes
                className="rounded-md border"
              />
            </div>
          </div>
        </div>
      </DashboardLayout>
      
      {/* New Task Dialog */}
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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
              
              {/* Store selection field - Only visible for admin and regional managers */}
              {(user?.role === 'admin' || user?.role === 'regional') && (
                <FormField
                  control={form.control}
                  name="storeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Location</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
    </>
  );
}