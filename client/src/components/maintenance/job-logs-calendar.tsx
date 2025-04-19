import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, SlotInfo, View } from 'react-big-calendar';
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
import { CalendarX, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  
  // Define initial variables
  const isMaintenance = user?.role === 'maintenance';
  const isAdminUser = user?.role === 'admin';
  const isRegionalMgr = user?.role === 'regional';
  const canViewMonthView = isAdminUser || isRegionalMgr;
  
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(
    user?.role === "store" && typeof user?.storeId === 'number' ? user.storeId : undefined
  );
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2025, 3, 15));
  const [currentView, setCurrentView] = useState<View>(user?.role === 'maintenance' ? "day" : "month");
  
  // State to hold current time for the "time now" indicator
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Update current time every minute
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // update every minute
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Create events from job logs
  const calendarEvents = useMemo(() => {
    if (!Array.isArray(jobLogs) || jobLogs.length === 0) {
      return [];
    }
    
    // Filter to only include job logs that have a scheduled date and time
    const scheduledJobs = jobLogs.filter(job => job.logDate && job.logTime);
    
    // Convert job logs to calendar events
    const events: CalendarEvent[] = scheduledJobs.map(job => {
      // Parse the date and time
      const [year, month, day] = job.logDate!.split('-').map(n => parseInt(n));
      const [hour, minute] = job.logTime!.split(':').map(n => parseInt(n));
      
      const start = new Date(year, month - 1, day, hour, minute);
      const end = new Date(start);
      end.setHours(end.getHours() + 1); // Default to 1 hour duration
      
      // Find store name
      const store = stores.find(s => s.id === job.storeId);
      
      return {
        id: job.id,
        title: job.title || 'Maintenance Job',
        start,
        end,
        storeId: job.storeId,
        storeName: store ? store.name : 'Unknown Store',
        flag: job.flag as 'normal' | 'urgent' | 'long_standing',
        description: job.description || 'No description',
        loggedBy: job.loggedBy || 'Unknown'
      };
    });
    
    console.log("Created events from job logs:", events.length);
    return events;
  }, [jobLogs, stores]);

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
  
  // Custom toolbar to show store filter and view controls based on user role
  const CustomToolbar = (props: any) => {
    const { label, onNavigate, onView, views } = props;
    
    // Only show store filter to admin and regional managers
    const canFilterByStore = user?.role === 'admin' || user?.role === 'regional';
    const canViewMonthView = user?.role === 'admin' || user?.role === 'regional';
    
    // Function to handle view changes based on role
    const handleViewChange = (view: string) => {
      // If user is maintenance and tries to select month view, default to week view
      if (!canViewMonthView && view === 'month') {
        onView('week');
        toast({
          title: "View restricted",
          description: "Month view is only available to admin and regional managers",
          variant: "default"
        });
      } else {
        onView(view);
      }
    };
    
    return (
      <div className="flex flex-col gap-2 mb-4 px-2">
        <div className="flex justify-between items-center">
          <div className="text-xl font-semibold">{label}</div>
          
          {/* Navigation buttons */}
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onNavigate('TODAY')}
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onNavigate('PREV')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onNavigate('NEXT')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          {/* View toggle buttons */}
          <div className="flex">
            {views.map((view: string) => {
              // For maintenance users, disable month view
              const isDisabled = view === 'month' && !canViewMonthView;
              
              return (
                <Button
                  key={view}
                  variant={props.view === view ? "default" : "outline"}
                  size="sm"
                  className="capitalize mr-1"
                  onClick={() => handleViewChange(view)}
                  disabled={isDisabled}
                >
                  {view}
                </Button>
              );
            })}
          </div>
          
          {/* Store filter */}
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
      </div>
    );
  };
  
  // Time Now Indicator component - removed as per user request
  
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
  
  // Console log user role
  console.log('User role:', user?.role, 'isMaintenance:', isMaintenance);
  
  // Handle drag start
  const handleDragStart = (job: JobLog) => {
    console.log(`Starting drag for job ${job.id}: ${job.description}`);
    setDraggedJob(job);
    
    // Add visual feedback - highlight the calendar
    const calendarEl = calendarRef.current;
    if (calendarEl) {
      calendarEl.classList.add('border-primary', 'border-2');
    }
    
    // Show toast for better UX
    toast({
      title: "Dragging job",
      description: "Drop on the calendar to schedule this job",
      duration: 3000,
    });
  };
  
  // Handle drag end
  const handleDragEnd = () => {
    console.log("Drag ended");
    
    // Remove visual feedback
    const calendarEl = calendarRef.current;
    if (calendarEl) {
      calendarEl.classList.remove('border-primary', 'border-2');
    }
    
    // Keep draggedJob state for a small delay to allow drop handling
    setTimeout(() => {
      setDraggedJob(null);
    }, 100);
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
    console.log("Calendar slot selected with info:", slotInfo);

    // Only process this as a drop if there's a job being dragged
    if (!draggedJob) {
      // If not dragging, this is just a normal click/selection, do nothing special
      console.log("No job being dragged when slot selected");
      return;
    }
    
    // Format date and time from the drop position
    const logDate = format(slotInfo.start, 'yyyy-MM-dd');
    const logTime = format(slotInfo.start, 'HH:mm');
    
    console.log(`Calendar slot drop: Scheduling job ${draggedJob.id} for ${logDate} at ${logTime}`);
    
    // Update the job log with the new date and time
    updateJobLogMutation.mutate({
      id: draggedJob.id,
      data: {
        logDate,
        logTime
      }
    }, {
      onSuccess: () => {
        // Show a toast to indicate the action
        toast({
          title: "Job scheduled",
          description: `Job scheduled for ${logDate} at ${logTime}`,
          className: "toast-drag-indicator",
        });
        
        // Force refresh calendar events
        queryClient.invalidateQueries({ queryKey: ['/api/joblogs'] });
      }
    });
    
    // Clear the dragged job
    setDraggedJob(null);
    
    // Remove any visual feedback
    const calendarEl = calendarRef.current;
    if (calendarEl) {
      calendarEl.classList.remove('calendar-drop-target', 'pulse-animation');
      calendarEl.classList.remove('border-primary', 'border-2');
    }
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
  
  // Render drag indicator if job is being dragged
  const renderDragIndicator = () => {
    if (!draggedJob) return null;
    
    // Determine badge color based on flag
    let badgeColor = "#3b82f6"; // Default blue
    switch (draggedJob.flag) {
      case 'urgent':
        badgeColor = "#ef4444"; // Red
        break;
      case 'long_standing':
        badgeColor = "#eab308"; // Yellow
        break;
    }
    
    // Get store name
    const storeName = stores.find(store => store.id === draggedJob.storeId)?.name || 'Unknown Store';
    
    return (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div className="bg-background border border-input shadow-lg rounded-md p-4 max-w-md animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: badgeColor }} />
            <p className="text-sm font-medium">Dragging {draggedJob.flag === 'urgent' ? 'urgent' : draggedJob.flag === 'long_standing' ? 'long-standing' : 'normal'} job</p>
          </div>
          <p className="font-bold mb-1">{draggedJob.description}</p>
          <p className="text-xs text-muted-foreground mb-2">From: {storeName}</p>
          <div className="bg-muted text-xs p-2 rounded">
            <p>Drop anywhere on the calendar to schedule this job</p>
            <p>• Drop on a specific date to schedule for that date</p>
            <p>• Drop on the empty area for default scheduling</p>
          </div>
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
          {isMaintenance && (
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
          <div className="flex calendar-container" style={{ height: 600 }}>
            {/* Left panel with draggable job cards - only visible for maintenance staff */}
            {isMaintenance && (
              <div className="w-1/4 pr-4 border-r calendar-sidebar">
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
                            draggable="true"
                            onDragStart={(e) => {
                              console.log("Drag started for job:", job.id);
                              // Set job ID as data transfer
                              e.dataTransfer.setData("application/json", JSON.stringify({ jobId: job.id }));
                              // Allow both copy and move operations
                              e.dataTransfer.effectAllowed = "copyMove";
                              // Set a visual drag image (optional)
                              try {
                                const dragImage = document.createElement('div');
                                dragImage.className = 'p-2 bg-white shadow rounded border border-primary';
                                dragImage.textContent = job.description?.substring(0, 30) || 'Job';
                                document.body.appendChild(dragImage);
                                e.dataTransfer.setDragImage(dragImage, 20, 20);
                                setTimeout(() => document.body.removeChild(dragImage), 0);
                              } catch (err) {
                                console.log("Could not set custom drag image");
                              }
                              handleDragStart(job);
                            }}
                            onDragEnd={handleDragEnd}
                            className={`bg-card border rounded-md p-3 shadow-sm hover:shadow-md transition-all duration-150 
                              ${isScheduled ? 'border-green-500' : 'border-amber-500'} 
                              hover:border-primary`}
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
            <div 
              className={isMaintenance ? "w-3/4 relative calendar-main" : "w-full relative calendar-main"} 
              ref={calendarRef}
              onDragEnter={(e) => {
                if (isMaintenance) {
                  e.preventDefault();
                  e.currentTarget.classList.add('calendar-drop-target', 'pulse-animation');
                }
              }}
              onDragOver={(e) => {
                // Allow drops on the calendar container
                if (isMaintenance) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('calendar-drop-target', 'pulse-animation');
              }}
              onDrop={(e) => {
                console.log("Drop event on calendar container:", e);
                e.preventDefault();
                e.currentTarget.classList.remove('calendar-drop-target', 'pulse-animation');
                
                // Try to get the job ID from the data transfer
                let jobId: number | null = null;
                
                try {
                  // First try to get from the application/json format
                  const jsonData = e.dataTransfer.getData("application/json");
                  if (jsonData) {
                    const data = JSON.parse(jsonData);
                    jobId = parseInt(data.jobId);
                  }
                } catch (err) {
                  console.log("Could not parse JSON data from drop");
                }
                
                // If we couldn't get the job ID from data transfer, use the draggedJob state
                if (!jobId && draggedJob) {
                  jobId = draggedJob.id;
                }
                
                // If we have a job ID, schedule it
                if (jobId) {
                  // Use current date/time if dropped directly on container
                  const now = new Date();
                  const logDate = format(now, 'yyyy-MM-dd');
                  const logTime = format(now, 'HH:mm');
                  
                  console.log(`Direct drop: Scheduling job ${jobId} for ${logDate} at ${logTime}`);
                  
                  updateJobLogMutation.mutate({
                    id: jobId,
                    data: {
                      logDate,
                      logTime
                    }
                  }, {
                    onSuccess: () => {
                      toast({
                        title: "Job scheduled",
                        description: `Job scheduled for today at ${logTime}`,
                        className: "toast-drag-indicator",
                      });
                      
                      // Force refresh data
                      queryClient.invalidateQueries({ queryKey: ['/api/joblogs'] });
                    }
                  });
                } else {
                  console.log("No job ID found in drop event");
                  toast({
                    title: "Scheduling failed",
                    description: "Could not identify the job to schedule. Please try again.",
                    variant: "destructive"
                  });
                }
                
                // Clear the dragged job
                setDraggedJob(null);
              }}
            >
              {calendarEvents.length === 0 ? (
                <div 
                  className="h-full flex flex-col items-center justify-center p-8 border border-dashed rounded-md"
                  onDragOver={(e) => {
                    if (isMaintenance) {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-primary", "bg-primary/5");
                      e.dataTransfer.dropEffect = "copy";
                    }
                  }}
                  onDragLeave={(e) => {
                    if (isMaintenance) {
                      e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                    }
                  }}
                  onDrop={(e) => {
                    if (isMaintenance && draggedJob) {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                      
                      // Schedule for tomorrow at 9 AM by default
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(9, 0, 0, 0);
                      
                      const logDate = format(tomorrow, 'yyyy-MM-dd');
                      const logTime = '09:00';
                      
                      console.log(`Empty calendar drop: Scheduling job ${draggedJob.id} for ${logDate} at ${logTime}`);
                      
                      updateJobLogMutation.mutate({
                        id: draggedJob.id,
                        data: {
                          logDate,
                          logTime
                        }
                      }, {
                        onSuccess: () => {
                          toast({
                            title: "Job scheduled",
                            description: `Job scheduled for tomorrow at 9:00 AM`,
                          });
                          
                          // Force refresh data
                          queryClient.invalidateQueries({ queryKey: ['/api/joblogs'] });
                        }
                      });
                      
                      setDraggedJob(null);
                    }
                  }}
                >
                  <CalendarX className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No jobs scheduled</p>
                  <p className="text-sm text-muted-foreground text-center">
                    {isMaintenance 
                      ? "Drag a job from the left panel to schedule it on the calendar" 
                      : "No maintenance jobs are currently scheduled"}
                  </p>
                </div>
              ) : (
                <div className="relative h-full">
                  <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    eventPropGetter={eventStyleGetter}
                    defaultView={isMaintenance ? "day" : "month"}
                    views={['month', 'week', 'day']}
                    date={currentDate}
                    view={currentView}
                    onView={(view) => {
                      console.log('Calendar view changed to:', view);
                      setCurrentView(view);
                    }}
                    onNavigate={(date) => {
                      console.log('Calendar navigated to:', date);
                      setCurrentDate(date);
                    }}
                    min={new Date(0, 0, 0, 7, 0)} // Start at 7am
                    max={new Date(0, 0, 0, 19, 0)} // End at 7pm
                    selectable={isMaintenance}
                    onSelectSlot={(slotInfo) => {
                      console.log("Slot selected:", slotInfo);
                      handleDropOnCalendar(slotInfo);
                    }}
                    components={{
                      toolbar: (props) => <CustomToolbar {...props} />,
                      event: EventComponent
                    }}
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
                </div>
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