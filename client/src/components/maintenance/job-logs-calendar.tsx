import { useState, useMemo, useRef, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, SlotInfo } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { JobLog } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CalendarX, Loader2 } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

// Setup calendar localizer
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Define event type for calendar
interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  storeId: number;
  storeName: string;
  flag: 'normal' | 'urgent' | 'long_standing';
  description: string;
  loggedBy: string;
}

interface JobLogsCalendarProps {
  jobLogs: JobLog[];
  stores: Array<{ id: number; name: string }>;
  isLoading: boolean;
}

export default function JobLogsCalendar({ jobLogs, stores, isLoading }: JobLogsCalendarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(
    user?.role === "store" && typeof user?.storeId === 'number' ? user.storeId : undefined
  );
  
  // Helper function to create mock job events for testing
  const createSimpleEvents = () => {
    // First check if stores is available and has items
    if (!stores || !Array.isArray(stores) || stores.length === 0) {
      console.log('No stores available for generating events');
      return [];
    }
    
    // Create events for the next 7 days
    const events = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // Create 1-3 events per day
      const numEvents = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < numEvents; j++) {
        const hour = 9 + Math.floor(Math.random() * 8); // Between 9 AM and 5 PM
        
        const start = new Date(date);
        start.setHours(hour, 0, 0);
        
        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        
        // Safely get a valid store
        const randomStoreIndex = Math.floor(Math.random() * stores.length);
        const randomStore = stores[randomStoreIndex];
        const storeId = randomStore?.id || 1;
        const storeName = randomStore?.name || 'Unknown Store';
        
        const flagTypes = ['normal', 'urgent', 'long_standing'] as const;
        const flag = flagTypes[Math.floor(Math.random() * flagTypes.length)];
        
        events.push({
          id: i * 10 + j,
          title: `Maintenance Job ${i}-${j}`,
          start,
          end,
          storeId,
          storeName,
          flag,
          description: `Sample maintenance job ${i}-${j}`,
          loggedBy: 'System'
        });
      }
    }
    
    return events;
  };
  
  // Create hardcoded events to debug calendar display issues
  const calendarEvents = useMemo(() => {
    // Create a few events for April 2025 (matching the forced calendar date)
    const events: CalendarEvent[] = [
      {
        id: 1001,
        title: "Test Urgent Job",
        start: new Date(2025, 3, 12, 10, 0), // April 12, 2025 at 10:00 AM
        end: new Date(2025, 3, 12, 11, 0),   // April 12, 2025 at 11:00 AM
        storeId: 1,
        storeName: "Cheetham Hill",
        flag: "urgent",
        description: "Test urgent job - please ignore",
        loggedBy: "System Test"
      },
      {
        id: 1002,
        title: "Test Normal Job",
        start: new Date(2025, 3, 15, 14, 0), // April 15, 2025 at 2:00 PM
        end: new Date(2025, 3, 15, 15, 0),   // April 15, 2025 at 3:00 PM
        storeId: 1,
        storeName: "Cheetham Hill",
        flag: "normal",
        description: "Test normal job - please ignore",
        loggedBy: "System Test"
      },
      {
        id: 1003,
        title: "Test Long Standing Job",
        start: new Date(2025, 3, 18, 9, 0),  // April 18, 2025 at 9:00 AM
        end: new Date(2025, 3, 18, 10, 0),   // April 18, 2025 at 10:00 AM
        storeId: 1,
        storeName: "Cheetham Hill",
        flag: "long_standing",
        description: "Test long standing job - please ignore",
        loggedBy: "System Test"
      }
    ];
    
    console.log("Created fixed test events for calendar display:", events.length);
    return events;
  }, []);
  // Define custom event styling based on job flag
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor;
    
    switch (event.flag) {
      case 'urgent':
        backgroundColor = '#ef4444'; // red
        break;
      case 'long_standing':
        backgroundColor = '#eab308'; // yellow
        break;
      default:
        backgroundColor = '#3b82f6'; // blue
    }
    
    console.log(`Styling event ${event.id} with flag ${event.flag}, color: ${backgroundColor}`);
    
    return {
      style: {
        backgroundColor,
        color: 'white',
        borderRadius: '4px',
        borderStyle: 'none',
        display: 'block',
        opacity: 0.9,
        border: '2px solid black', // Add border to make events more visible
        padding: '2px',
      }
    };
  };
  
  // Custom toolbar to show store filter for admins and regional managers
  const CustomToolbar = ({ label }: { label: string }) => {
    // Only show store filter to admin and regional managers
    const canFilterByStore = user?.role === 'admin' || user?.role === 'regional';
    
    return (
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="text-xl font-semibold">{label}</div>
        {canFilterByStore && stores && stores.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter by store:</span>
            <Select 
              value={selectedStoreId?.toString() || "all"} 
              onValueChange={(value) => {
                setSelectedStoreId(value === "all" ? undefined : parseInt(value));
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores && stores.map(store => (
                  <SelectItem key={store.id} value={store.id.toString()}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
  };
  
  // Custom event component to show more details
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    let badgeVariant: "default" | "destructive" | "outline" | "secondary" | null | undefined;
    
    switch (event.flag) {
      case 'urgent':
        badgeVariant = "destructive";
        break;
      case 'long_standing':
        badgeVariant = "secondary";
        break;
      default:
        badgeVariant = "default";
    }
    
    return (
      <div className="text-xs">
        <strong>{event.title.length > 25 ? `${event.title.substring(0, 22)}...` : event.title}</strong>
        <div className="flex items-center mt-1 gap-1">
          <Badge variant={badgeVariant} className="text-[10px] py-0 px-1">
            {event.flag === 'urgent' ? 'Urgent' : event.flag === 'long_standing' ? 'Long Standing' : 'Normal'}
          </Badge>
          <span className="text-[10px] truncate">
            {event.storeName}
          </span>
        </div>
      </div>
    );
  };
  
  // Handle loading state and errors
  if (isLoading) {
    return (
      <Card className="overflow-hidden mt-4">
        <CardHeader className="pb-2">
          <CardTitle>Job Logs Calendar</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center" style={{ height: 600 }}>
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <svg className="animate-spin h-8 w-8 text-chai-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p>Loading job logs calendar...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Check if we have valid job logs and stores data
  const hasValidData = Array.isArray(jobLogs) && jobLogs.length > 0 && Array.isArray(stores);
  
  // List of jobs to drag and drop (only shown to maintenance staff)
  // We'll show all jobs for maintenance staff to be able to reschedule them
  const [draggableJobs, setDraggableJobs] = useState<JobLog[]>(() => {
    // Initialize with all job logs
    if (!Array.isArray(jobLogs)) return [];
    
    console.log('All jobLogs:', JSON.stringify(jobLogs));
    return [...jobLogs];
  });
  
  // State to track dragged job
  const [draggedJob, setDraggedJob] = useState<JobLog | null>(null);
  
  // Reference to the calendar element
  const calendarRef = useRef<HTMLDivElement>(null);
  
  // Is user maintenance staff?
  const isMaintenanceStaff = user?.role === 'maintenance';
  console.log('User role:', user?.role, 'isMaintenanceStaff:', isMaintenanceStaff);
  
  // Handle drag start
  const handleDragStart = (job: JobLog) => {
    setDraggedJob(job);
  };
  
  // Handle drag end
  const handleDragEnd = () => {
    setDraggedJob(null);
  };
  
  // Create a mutation for updating job logs
  const updateJobLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<JobLog> }) => {
      return apiRequest('PATCH', `/api/joblogs/${id}`, data);
    },
    onSuccess: () => {
      // Invalidate the joblogs query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/joblogs'] });
      console.log('Job log updated successfully');
    },
    onError: (error) => {
      console.error('Error updating job log:', error);
    }
  });
  
  // Handle drop on calendar
  const handleDropOnCalendar = (slotInfo: SlotInfo) => {
    if (!draggedJob) return;
    
    // Format date and time from the drop position
    const logDate = format(slotInfo.start, 'yyyy-MM-dd');
    const logTime = format(slotInfo.start, 'HH:mm');
    
    // Update the job log with the new date and time
    updateJobLogMutation.mutate({
      id: draggedJob.id,
      data: {
        logDate,
        logTime
      }
    });
    
    // No need to update the draggable jobs list since all jobs remain draggable
    // We'll just let the query invalidation refresh the list
    
    // Clear the dragged job
    setDraggedJob(null);
  };
  
  // Mutation to reset job dates (clear logDate and logTime)
  const resetJobMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('PATCH', `/api/joblogs/${id}`, {
        logDate: null,
        logTime: null
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/joblogs'] });
      toast({
        title: "Job reset",
        description: "The job has been reset and is now available for scheduling.",
      });
    },
    onError: (error) => {
      console.error('Error resetting job:', error);
      toast({
        title: "Failed to reset job",
        description: "Could not reset the job. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // This function would be used to handle the calendar's drop event
  const handleOnDropFromOutside = useCallback(
    ({ start }: { start: Date }) => {
      if (draggedJob) {
        // Format date and time from the drop position
        const logDate = format(start, 'yyyy-MM-dd');
        const logTime = format(start, 'HH:mm');
        
        // Update the job log with the new date and time
        updateJobLogMutation.mutate({
          id: draggedJob.id,
          data: {
            logDate,
            logTime
          }
        });
        
        // Clear dragged job
        setDraggedJob(null);
      }
    },
    [draggedJob, updateJobLogMutation]
  );
  
  // Render drag indicator if job is being dragged
  const renderDragIndicator = () => {
    if (!draggedJob) return null;
    
    return (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div className="bg-primary-foreground shadow-lg rounded-md p-4 max-w-md">
          <p>Drop on calendar to schedule:</p>
          <p className="font-bold">{draggedJob.description}</p>
        </div>
      </div>
    );
  };
  
  // Get a random job to reset for testing
  const getRandomJob = () => {
    if (!Array.isArray(jobLogs) || jobLogs.length === 0) return null;
    
    // Filter jobs that have a logDate and logTime (scheduled jobs)
    const scheduledJobs = jobLogs.filter(job => job.logDate && job.logTime);
    if (scheduledJobs.length === 0) return null;
    
    // Return a random job from the scheduled jobs
    return scheduledJobs[Math.floor(Math.random() * scheduledJobs.length)];
  };
  
  // Handle resetting a job for testing
  const handleResetJob = () => {
    const jobToReset = getRandomJob();
    if (!jobToReset) {
      toast({
        title: "No jobs available",
        description: "There are no scheduled jobs to reset.",
        variant: "destructive"
      });
      return;
    }
    
    resetJobMutation.mutate(jobToReset.id);
  };

  return (
    <Card className="overflow-hidden mt-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Job Logs Calendar</CardTitle>
          {isMaintenanceStaff && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetJob}
              disabled={resetJobMutation.isPending}
            >
              {resetJobMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <CalendarX className="mr-2 h-4 w-4" />
                  Reset a job for testing
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasValidData ? (
          <div className="flex justify-center items-center" style={{ height: 600 }}>
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No job logs available to display</p>
              <p className="text-sm text-muted-foreground">Create new maintenance job logs to see them on the calendar</p>
            </div>
          </div>
        ) : (
          <div className="flex" style={{ height: 600 }}>
            {/* Left panel with draggable job cards - only visible for maintenance staff */}
            {isMaintenanceStaff && (
              <div className="w-1/4 pr-4 border-r">
                <h3 className="text-sm font-semibold mb-2">Maintenance Jobs</h3>
                <p className="text-xs text-muted-foreground mb-2">Drag any job to the calendar to schedule/reschedule it</p>
                
                <ScrollArea className="h-[550px]">
                  <div className="space-y-2">
                    {draggableJobs.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-2">No jobs available</p>
                        <p className="text-xs text-muted-foreground">Create new maintenance job logs to see them here</p>
                      </div>
                    ) : (
                      draggableJobs.map(job => {
                        // Determine badge color based on flag
                        let badgeVariant: "default" | "destructive" | "outline" | "secondary" = "default";
                        switch (job.flag) {
                          case 'urgent':
                            badgeVariant = "destructive";
                            break;
                          case 'long_standing':
                            badgeVariant = "secondary";
                            break;
                        }
                        
                        // Get store name
                        const storeName = stores.find(store => store.id === job.storeId)?.name || 'Unknown Store';
                        
                        // Show scheduling status 
                        const isScheduled = job.logDate && job.logTime;
                        
                        return (
                          <div
                            key={job.id}
                            draggable
                            onDragStart={() => handleDragStart(job)}
                            onDragEnd={handleDragEnd}
                            className={`bg-card border rounded-md p-3 shadow-sm cursor-move hover:shadow-md transition-shadow ${isScheduled ? 'border-green-500' : 'border-amber-500'}`}
                          >
                            <h4 className="font-medium text-sm mb-1 line-clamp-2">{job.description || 'No description'}</h4>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-xs">
                                <Badge variant={badgeVariant} className="text-[10px] py-0">
                                  {job.flag === 'urgent' ? 'Urgent' : job.flag === 'long_standing' ? 'Long Standing' : 'Normal'}
                                </Badge>
                                <span className="text-muted-foreground">{storeName}</span>
                              </div>
                              {isScheduled && (
                                <div className="flex items-center justify-between text-xs">
                                  <Badge variant="outline" className="text-[10px] py-0 border-green-500 text-green-500">
                                    Scheduled
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {job.logDate} @ {job.logTime}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {/* Calendar */}
            <div className={isMaintenanceStaff ? "w-3/4" : "w-full"} ref={calendarRef}>
              {calendarEvents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed rounded-md">
                  <CalendarX className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No jobs scheduled</p>
                  <p className="text-sm text-muted-foreground text-center">
                    {isMaintenanceStaff 
                      ? "Drag a job from the left panel to schedule it on the calendar" 
                      : "No maintenance jobs are currently scheduled"}
                  </p>
                </div>
              ) : (
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  eventPropGetter={eventStyleGetter}
                  defaultView="month"
                  views={['month', 'week', 'day']}
                  date={new Date(2025, 3, 15)}
                  onNavigate={(date) => console.log('Calendar navigated to:', date)}
                  
                  // Add back the drag-and-drop functionality
                  selectable={isMaintenanceStaff}
                  onSelectSlot={(slotInfo) => {
                    console.log("Slot selected:", slotInfo);
                    handleDropOnCalendar(slotInfo);
                  }}
                  
                  // Add back the custom components
                  components={{
                    toolbar: (props) => <CustomToolbar {...props} />,
                    event: EventComponent
                  }}
                  
                  // Add drop functionality
                  onDropFromOutside={handleOnDropFromOutside}
                  
                  // Enable drag and drop
                  draggableAccessor={() => true}
                  
                  // Add tooltip for events
                  tooltipAccessor={(event) => {
                    try {
                      const eventObj = event as CalendarEvent;
                      return `${eventObj.description}\nStore: ${eventObj.storeName}\nLogged by: ${eventObj.loggedBy}\nStatus: ${eventObj.flag}`;
                    } catch (error) {
                      console.error("Error generating tooltip", error);
                      return "Error displaying details";
                    }
                  }}
                  popup
                />
              )}
            </div>
            
            {/* Drag indicator */}
            {renderDragIndicator()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}