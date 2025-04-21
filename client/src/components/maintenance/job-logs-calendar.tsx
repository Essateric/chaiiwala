import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, SlotInfo, View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { useLocation } from 'wouter';
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
import { CalendarX, Loader2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
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
  const [, navigate] = useLocation();
  
  // Define initial variables
  const isMaintenance = user?.role === 'maintenance';
  const isAdminUser = user?.role === 'admin';
  const isRegionalMgr = user?.role === 'regional';
  const canViewMonthView = isAdminUser || isRegionalMgr;
  
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(
    user?.role === "store" && typeof user?.storeId === 'number' ? user.storeId : undefined
  );
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
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
  
  // Function to manually refresh job logs and calendar
  const refreshCalendar = useCallback(() => {
    console.log("Manual calendar refresh initiated");
    return fetch('/api/joblogs')
      .then(res => res.json())
      .then(data => {
        // If we have valid data, update the draggable jobs and force a calendar refresh
        if (Array.isArray(data)) {
          setDraggableJobs(data);
          // Don't reset the current date - this preserves the user's selected date
          // We'll just trigger a re-render of the calendar events by using the same date
          console.log("✅ Calendar refreshed with", data.length, "jobs");
          toast({
            title: "Calendar refreshed",
            description: `Successfully loaded ${data.length} jobs from server`,
          });
          return data;
        }
        return null;
      })
      .catch(err => {
        console.error("❌ Error refreshing job logs:", err);
        toast({
          title: "Refresh failed",
          description: "Could not refresh calendar data. Please try again.",
          variant: "destructive"
        });
        return null;
      });
  }, [toast]);
  
  // Setup automatic refresh
  useEffect(() => {
    // Initial refresh
    refreshCalendar();
    
    // Set up an interval to refresh the job logs
    const intervalId = setInterval(() => {
      refreshCalendar();
    }, 5000); // Check every 5 seconds to avoid hammering the server
    
    return () => clearInterval(intervalId);
  }, [refreshCalendar]);
  
  // Create events from job logs - force dependency on the currentDate
  const calendarEvents = useMemo(() => {
    if (!Array.isArray(jobLogs) || jobLogs.length === 0) {
      console.log("No job logs available");
      return [];
    }
    
    // Force log the current date to show we're triggering a refresh
    console.log("Calendar refreshing with currentDate:", currentDate.toISOString());
    
    // Filter to only include job logs that have a scheduled date and time
    const scheduledJobs = jobLogs.filter(job => job.logDate && job.logTime);
    
    if (scheduledJobs.length === 0) {
      console.log("No scheduled jobs found");
      return [];
    }
    
    // Log the scheduled jobs to help with debugging
    console.log("Scheduled jobs:", scheduledJobs.map(job => `${job.id}: ${job.logDate} ${job.logTime}`));
    
    // Convert job logs to calendar events
    const events: CalendarEvent[] = scheduledJobs.map(job => {
      try {
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
          title: job.description || job.title || 'Maintenance Job',
          start,
          end,
          storeId: job.storeId,
          storeName: store ? store.name : 'Unknown Store',
          flag: job.flag as 'normal' | 'urgent' | 'long_standing',
          description: job.description || 'No description',
          loggedBy: job.loggedBy || 'Unknown'
        };
      } catch (err) {
        console.error('Error creating calendar event from job log:', job, err);
        return null;
      }
    }).filter(Boolean) as CalendarEvent[];
    
    console.log("Created events from job logs:", events.length, "from", scheduledJobs.length, "scheduled jobs");
    return events;
  }, [jobLogs, stores, currentDate]);

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
            {/* Manual refresh button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshCalendar}
              title="Manual refresh"
            >
              <RefreshCw className="h-4 w-4" />
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
  
  // Time Now Indicator component
  const TimeNowIndicator = () => {
    const now = new Date();
    const timeLinePosition = (now.getHours() - 7) * 60 + now.getMinutes(); // 7am = 0 minutes
    const totalMinutes = 12 * 60; // 12 hours from 7am to 7pm
    const percentOfDay = (timeLinePosition / totalMinutes) * 100;
    
    // Only show if the current time is between 7am and 7pm 
    if (percentOfDay < 0 || percentOfDay > 100) {
      return null;
    }
    
    return (
      <div 
        className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none"
        style={{ 
          top: `${percentOfDay}%`,
          borderColor: 'red'
        }}
      >
        <div 
          className="absolute -left-1 -top-2 rounded-full w-4 h-4 bg-red-500"
        />
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

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      
      // Update the job with empty dates to remove from calendar
      updateJobLogMutation.mutate({
        id: event.id,
        data: {
          logDate: undefined,
          logTime: undefined
        }
      }, {
        onSuccess: () => {
          toast({
            title: "Job removed",
            description: "Job has been removed from the calendar",
          });
          refreshCalendar();
        }
      });
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
      if (!isMaintenance) return;
      
      // Don't call preventDefault() as it will cancel the drag operation
      // Just stop propagation to prevent parent drag handlers from being triggered
      e.stopPropagation();
      
      console.log("Event drag started:", event.id);
      
      // Find the corresponding job log
      const job = jobLogs.find(j => j.id === event.id);
      if (job) {
        setDraggedJob(job);
        
        // Set drag data
        e.dataTransfer.setData("application/json", JSON.stringify({ 
          jobId: event.id,
          type: "existing-event" 
        }));
        e.dataTransfer.effectAllowed = "move";
        
        toast({
          title: "Moving event",
          description: "Drop on a time slot to reschedule this event",
          duration: 3000,
        });
      }
    };
    
    return (
      <div 
        className={`text-xs relative group ${isMaintenance ? 'cursor-move grab-handle' : ''}`}
        draggable={isMaintenance}
        onDragStart={handleDragStart}
        title={isMaintenance ? "Drag to reschedule this job" : ""}
      >
        <strong>{event.title.length > 25 ? `${event.title.substring(0, 22)}...` : event.title}</strong>
        <div className="flex items-center mt-1 gap-1">
          <Badge variant={badgeVariant} className="text-[10px] py-0 px-1">
            {event.flag === 'urgent' ? 'Urgent' : event.flag === 'long_standing' ? 'Long Standing' : 'Normal'}
          </Badge>
          <span className="text-[10px] truncate">
            {event.storeName}
          </span>
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] transition-opacity"
            title="Remove from calendar"
          >
            ×
          </button>
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
  
  // Check if we have valid stores data - we don't need jobs to display the calendar
  const hasValidData = Array.isArray(stores) && stores.length > 0;
  
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
  // State to track and display the current time position during dragging
  const [dragTimeDisplay, setDragTimeDisplay] = useState<string | null>(null);
  
  // Reference to the calendar element
  const calendarRef = useRef<HTMLDivElement>(null);
  
  // Create a mutation for updating job logs
  const updateJobLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<JobLog> }) => {
      return apiRequest('PATCH', `/api/joblogs/${id}`, data);
    },
    onSuccess: () => {
      // Invalidate the joblogs query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/joblogs'] });
      console.log('Job log updated successfully');
      
      // Use our direct refresh function to immediately update the calendar
      refreshCalendar().then(() => {
        console.log('Calendar refreshed after job update');
      });
    },
    onError: (error) => {
      console.error('Error updating job log:', error);
      toast({
        title: "Error updating job",
        description: "Could not update the maintenance job. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Console log user role
  console.log('User role:', user?.role, 'isMaintenance:', isMaintenance);
  
  // Handle click to start moving a job
  const handleStartMoveJob = (job: JobLog) => {
    console.log(`Starting to move job ${job.id}`);
    setDraggedJob(job);
    
    // Show toast for instructions
    toast({
      title: "Moving job",
      description: "Select a time slot on the calendar to reschedule this job",
      duration: 3000,
    });
  };
  

  
  // Handle drop on calendar
  const handleDropOnCalendar = (slotInfo: SlotInfo) => {
    console.log("🎬 CALENDAR SLOT SELECTED (handleDropOnCalendar):", slotInfo);
    console.log("📋 Current dragged job:", draggedJob);
    console.log("📅 Selected slot start time:", slotInfo.start);
    console.log("📅 Selected slot end time:", slotInfo.end);

    // Only process this as a drop if there's a job being dragged
    if (!draggedJob) {
      console.log("❌ No job being dragged when slot selected");
      return;
    }

    // Get the slot's time - ALWAYS use the exact time from the slot
    const slotDate = new Date(slotInfo.start);
    
    // Format date and time from the slot position
    const logDate = format(slotDate, 'yyyy-MM-dd');
    const logTime = format(slotDate, 'HH:mm');
    
    console.log(`🎯 Calendar slot drop: Scheduling job ${draggedJob.id} for ${logDate} at ${logTime}`);
    
    // Store the job ID before clearing the state
    const jobId = draggedJob.id;
    
    // Clear the dragged job state immediately to prevent multiple drops
    setDraggedJob(null);
    
    // Remove any visual feedback
    const calendarEl = calendarRef.current;
    if (calendarEl) {
      calendarEl.classList.remove('calendar-drop-target', 'pulse-animation');
      calendarEl.classList.remove('border-primary', 'border-2');
    }
    
    // Update the job log with the new date and time
    updateJobLogMutation.mutate({
      id: jobId,
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
        
        // Use our direct refresh function to immediately update the calendar with latest data
        refreshCalendar().then(() => {
          // After refresh, navigate to the date where the job was scheduled
          setCurrentDate(new Date(slotInfo.start));
        });
      },
      onError: (error) => {
        console.error("Failed to update job:", error);
        toast({
          title: "Failed to schedule job",
          description: "Could not schedule the job. Please try again.",
          variant: "destructive"
        });
      }
    });
  };
  
  // Mutation to reset job dates (clear logDate and logTime)
  const resetJobMutation = useMutation<Response, Error, number>({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest('PATCH', `/api/joblogs/${jobId}`, {
        logDate: '', // Empty string instead of undefined
        logTime: '', // Empty string instead of undefined
        completed: false
      });
      if (!response.ok) {
        throw new Error('Failed to reset job');
      }
      return response;
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/joblogs'] });
      toast({
        title: "Job reset",
        description: "The job has been reset and is now available for scheduling.",
      });
      
      // Force refresh calendar and data
      refreshCalendar();
      // Only update jobs in draggable jobs list that match the reset job ID
      setDraggableJobs(prevJobs => 
        prevJobs.map(job => {
          if (job.id !== jobId) return job;
          return {
            ...job, 
            logDate: '', // Empty string instead of undefined to satisfy the type
            logTime: ''  // Empty string instead of undefined to satisfy the type
          };
        })
      );
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
  
  // We'll no longer need the separate drag indicator
  const renderDragIndicator = () => {
    return null; // Return nothing since we're showing the time on the card itself
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
          <div 
            className="flex calendar-container" 
            style={{ height: 600 }}
            data-role={user?.role || 'none'}
          >
            {/* Left panel with draggable job cards - only visible for maintenance staff */}
            {isMaintenance && (
              <div className="w-1/4 pr-4 border-r calendar-sidebar">
                <h3 className="text-sm font-semibold mb-2">Maintenance Jobs</h3>
                <p className="text-xs text-muted-foreground mb-2">Click or drag a job to reschedule it</p>
                
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
                        
                        // Check if this job is currently being dragged and has a time display
                        const isDragging = draggedJob?.id === job.id && dragTimeDisplay;
                        
                        return (
                          <div
                            key={job.id}
                            onClick={() => handleStartMoveJob(job)}
                            draggable="true"
                            onDragStart={(e) => {
                              e.stopPropagation();
                              console.log(`Starting drag for job ${job.id}`);
                              
                              // Set the job to be moved
                              setDraggedJob(job);
                              
                              // Set drag data
                              e.dataTransfer.setData('application/json', JSON.stringify({ jobId: job.id }));
                              e.dataTransfer.effectAllowed = 'move';
                              
                              // Visual feedback
                              toast({
                                title: "Dragging job",
                                description: "Drag to a calendar slot to reschedule",
                                duration: 3000,
                              });
                            }}
                            onDragEnd={() => {
                              // Clear the dragged job state after a delay
                              setTimeout(() => {
                                setDraggedJob(null);
                                setDragTimeDisplay(null);
                              }, 100);
                            }}
                            className={`bg-card border relative rounded-md p-3 shadow-sm hover:shadow-md transition-all duration-150 
                              ${isScheduled ? 'border-green-500' : 'border-amber-500'} 
                              hover:border-primary 
                              ${isDragging ? 'ring-2 ring-primary' : ''}`}
                            style={{
                              position: isDragging ? 'fixed' : 'relative',
                              zIndex: isDragging ? 9999 : 'auto',
                              left: isDragging ? '50%' : 'auto',
                              top: isDragging ? '50%' : 'auto',
                              transform: isDragging ? 'translate(-50%, -50%)' : 'none',
                              opacity: isDragging ? 0.9 : 1,
                              width: isDragging ? '250px' : 'auto'
                            }}
                          >
                            {/* Time display directly on the dragged item */}
                            {isDragging && dragTimeDisplay && (
                              <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-primary text-white font-bold px-2 py-1 rounded-full text-sm shadow-md drag-time-badge">
                                {dragTimeDisplay}
                              </div>
                            )}
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
                  
                  // Calculate current time position for drag indicator
                  const calendarEl = calendarRef.current;
                  if (calendarEl && draggedJob) {
                    try {
                      // Find the time content area
                      const timeContent = calendarEl.querySelector('.rbc-time-view .rbc-time-content');
                      if (timeContent) {
                        const timeRect = timeContent.getBoundingClientRect();
                        
                        // Adjust Y position relative to time content
                        const adjustedY = e.clientY - timeRect.top;
                        
                        // Calculate time from position
                        const totalMinutes = 12 * 60; // 12 hours (7am-7pm)
                        const percentOfDay = Math.max(0, Math.min(1, adjustedY / timeRect.height));
                        const minutesFromTop = percentOfDay * totalMinutes;
                        
                        // Calculate hours and minutes with 15-minute increments
                        let hours = Math.floor(minutesFromTop / 60) + 7; // Add 7 as we start at 7am
                        
                        // Round to nearest 15-minute increment
                        const rawMinutes = Math.floor(minutesFromTop % 60);
                        const roundedIncrement = Math.round(rawMinutes / 15) * 15;
                        let minutes = roundedIncrement === 60 ? 0 : roundedIncrement;
                        
                        // If minutes rolled over to 0 due to rounding to 60, increment the hour
                        if (roundedIncrement === 60) {
                          hours += 1;
                        }
                        
                        // Format time string (ensure two digits for minutes)
                        const timeString = `${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
                        
                        // Update state to display in the drag indicator
                        setDragTimeDisplay(timeString);
                      }
                    } catch (err) {
                      console.error("Error calculating drag time:", err);
                    }
                  }
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
                  // We need to calculate where in the calendar the drop happened
                  let scheduleDate: Date;
                  
                  // Get calendar element for measurement
                  const calendarEl = calendarRef.current;
                  if (calendarEl) {
                    try {
                      // Get calendar dimensions
                      const calendarRect = calendarEl.getBoundingClientRect();
                      
                      // Get the drop position relative to the calendar
                      const dropX = e.clientX - calendarRect.left;
                      const dropY = e.clientY - calendarRect.top;
                      
                      // Calculate what time this corresponds to
                      
                      // First determine where in the day to schedule based on mouse position
                      let hours = 12;  // Default to noon if calculation fails
                      let minutes = 0;
                      
                      try {
                        // Find the calendar body - this is the area where time slots are displayed
                        // The calendar has a header at the top, so we need to find the actual time grid
                        const calendarBody = calendarEl.querySelector('.rbc-time-view .rbc-time-content');
                        
                        // Calendar spans 12 hours (7am to 7pm)
                        const totalMinutes = 12 * 60;
                        let percentOfDay = 0.5; // Default to middle of day (noon)
                        
                        // If we can find the time content div, use that for more accurate calculations
                        if (calendarBody) {
                          const timeBodyRect = calendarBody.getBoundingClientRect();
                          
                          // Adjust dropY to be relative to the time content area
                          const adjustedDropY = e.clientY - timeBodyRect.top;
                          
                          // Calculate minutes from top based on drop position percentage
                          percentOfDay = Math.max(0, Math.min(1, adjustedDropY / timeBodyRect.height));
                          const minutesFromTop = percentOfDay * totalMinutes;
                          
                          // Calculate hours and minutes with 15-minute increments
                          hours = Math.floor(minutesFromTop / 60) + 7; // Add 7 as we start at 7am
                          
                          // Round to nearest 15-minute increment (0, 15, 30, 45)
                          const rawMinutes = Math.floor(minutesFromTop % 60);
                          const roundedIncrement = Math.round(rawMinutes / 15) * 15;
                          minutes = roundedIncrement === 60 ? 0 : roundedIncrement;
                          
                          // If minutes rolled over to 0 due to rounding to 60, increment the hour
                          if (roundedIncrement === 60) {
                            hours += 1;
                          }
                          
                          console.log(`Using time content area: height=${timeBodyRect.height}px, adjustedY=${adjustedDropY}px`);
                          console.log(`📍 Drop detected at Y: ${adjustedDropY}px (${percentOfDay.toFixed(2)}% of height)`);
                        } else {
                          // Fallback to using the entire calendar height if we can't find the time content
                          const calendarHeight = calendarRect.height;
                          
                          // Calculate minutes from top based on drop position percentage
                          percentOfDay = dropY / calendarHeight;
                          const minutesFromTop = percentOfDay * totalMinutes;
                          
                          // Calculate hours and minutes with 15-minute increments
                          hours = Math.floor(minutesFromTop / 60) + 7; // Add 7 as we start at 7am
                          
                          // Round to nearest 15-minute increment (0, 15, 30, 45)
                          const rawMinutes = Math.floor(minutesFromTop % 60);
                          const roundedIncrement = Math.round(rawMinutes / 15) * 15;
                          minutes = roundedIncrement === 60 ? 0 : roundedIncrement;
                          
                          // If minutes rolled over to 0 due to rounding to 60, increment the hour
                          if (roundedIncrement === 60) {
                            hours += 1;
                          }
                          
                          console.log(`Using full calendar area: height=${calendarHeight}px, dropY=${dropY}px`);
                          console.log(`📍 Drop detected at Y: ${dropY}px (${percentOfDay.toFixed(2)}% of height)`);
                        }
                      } catch (err) {
                        console.error("Error in drop position calculation:", err);
                        // Continue with default noon time if there's an error
                      }
                      
                      // Validate hours are within our calendar bounds (7am to 7pm)
                      hours = Math.max(7, Math.min(19, hours));
                      
                      // Create the date object for the current day at the calculated time
                      scheduleDate = new Date(currentDate);
                      scheduleDate.setHours(hours, minutes, 0, 0);
                      
                      console.log(`📍 Calculated time: ${hours}:${minutes < 10 ? '0' + minutes : minutes}`);
                      
                    } catch (err) {
                      console.error("Error calculating drop time:", err);
                      
                      // Fallback to current time if calculation fails
                      scheduleDate = new Date();
                    }
                  } else {
                    // Fallback to current time if calendar element not found
                    scheduleDate = new Date();
                  }
                  
                  // Format date and time for API call
                  const logDate = format(scheduleDate, 'yyyy-MM-dd');
                  const logTime = format(scheduleDate, 'HH:mm');
                  
                  console.log(`📅 Direct drop: Scheduling job ${jobId} for ${logDate} at ${logTime}`);
                  
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
                        description: `Job scheduled for ${logDate} at ${logTime}`,
                        className: "toast-drag-indicator",
                      });
                      
                      // Force refresh data
                      queryClient.invalidateQueries({ queryKey: ['/api/joblogs'] });
                      
                      // Force refresh the calendar display immediately
                      setCurrentDate(new Date(currentDate));
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
                
                // Clear the dragged job and time display
                setDraggedJob(null);
                setDragTimeDisplay(null);
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
                          
                          // Force refresh the calendar display immediately
                          setCurrentDate(new Date(currentDate));
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
                      ? "Click or drag a job from the left panel to schedule it" 
                      : "No maintenance jobs are currently scheduled"}
                  </p>
                </div>
              ) : (
                <div className="relative h-full" ref={calendarRef}>
                  {/* Current time indicator line - only show in day/week views */}
                  {(currentView === 'day' || currentView === 'week') && (
                    <TimeNowIndicator />
                  )}
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
                    selectable={isMaintenance && draggedJob !== null}
                    onSelectSlot={(slotInfo) => {
                      console.log("✅ SLOT SELECTED IN CALENDAR:", slotInfo);
                      console.log("📋 Current dragged job in onSelectSlot:", draggedJob);
                      console.log("📅 Selected slot start time:", slotInfo.start);
                      console.log("📅 Selected slot end time:", slotInfo.end);
                      
                      // Only handle slot selection if we have a job being moved
                      if (!draggedJob) {
                        console.log("No job being moved when slot selected");
                        return;
                      }
                      
                      // Use handleDropOnCalendar for processing slot selection
                      handleDropOnCalendar(slotInfo);
                      
                      // Make sure we're using the actual slot time, not the current time
                      if (draggedJob) {
                        // Format date and time from the selected slot
                        // Always use the time from the slot that was selected
                        const slotDate = new Date(slotInfo.start);
                        const logDate = format(slotDate, 'yyyy-MM-dd');
                        const logTime = format(slotDate, 'HH:mm');
                        
                        // Get the job ID before clearing state
                        const jobId = draggedJob.id;
                        
                        // Clear dragged job immediately to prevent multiple operations
                        setDraggedJob(null);
                        
                        console.log(`🎯 Calendar onSelectSlot: Scheduling job ${jobId} for ${logDate} at ${logTime}`);
                        
                        // Update the job with the selected time from slotInfo.start
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
                              description: `Job scheduled for ${logDate} at ${logTime}`,
                            });
                            
                            // Direct refresh and navigate to date
                            refreshCalendar().then(() => {
                              setCurrentDate(new Date(slotInfo.start));
                            });
                          }
                        });
                      }
                    }}
                    onSelectEvent={(event) => {
                      // Show job details in a dialog when clicked
                      const jobEvent = event as CalendarEvent;
                      const job = jobLogs.find(j => j.id === jobEvent.id);
                      
                      if (job) {
                        // Find store name
                        const store = stores.find(s => s.id === job.storeId);
                        
                        // For maintenance staff, show reschedule options
                        if (isMaintenance) {
                          // Show a toast with actions for maintenance staff
                          toast({
                            title: job.title || "Maintenance Job",
                            description: (
                              <div className="space-y-3">
                                <p className="font-medium">{job.description}</p>
                                <div className="flex flex-col gap-1 text-xs">
                                  <div><strong>Store:</strong> {store?.name || 'Unknown'}</div>
                                  <div><strong>Scheduled:</strong> {job.logDate} at {job.logTime}</div>
                                  <div><strong>Status:</strong> {job.flag}</div>
                                  <div><strong>Logged by:</strong> {job.loggedBy}</div>
                                  {job.category && <div><strong>Category:</strong> {job.category}</div>}
                                </div>
                                <div className="flex flex-col gap-2 mt-2">
                                  <div className="text-xs font-semibold">Reschedule this job:</div>
                                  <div className="flex justify-between gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => {
                                        // Set as the dragged job to allow repositioning
                                        setDraggedJob(job);
                                        
                                        toast({
                                          title: "Moving job",
                                          description: "Select a time slot on the calendar to reschedule",
                                        });
                                      }}
                                    >
                                      Move to new time
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => {
                                        // Calculate tomorrow's date
                                        const tomorrow = new Date();
                                        tomorrow.setDate(tomorrow.getDate() + 1);
                                        const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
                                        
                                        // Update job to tomorrow, same time
                                        updateJobLogMutation.mutate({
                                          id: job.id,
                                          data: { 
                                            logDate: tomorrowStr,
                                            logTime: job.logTime
                                          }
                                        }, {
                                          onSuccess: () => {
                                            toast({
                                              title: "Job rescheduled",
                                              description: `Job moved to tomorrow (${tomorrowStr}) at ${job.logTime}`,
                                            });
                                            refreshCalendar();
                                          }
                                        });
                                      }}
                                    >
                                      Move to tomorrow
                                    </Button>
                                  </div>
                                  <Button
                                    size="sm" 
                                    variant="default"
                                    onClick={() => {
                                      // Navigate to detail page
                                      navigate(`/maintenance/job/${job.id}`);
                                    }}
                                  >
                                    View job details
                                  </Button>
                                </div>
                              </div>
                            ),
                            duration: 10000,
                          });
                          return;
                        }
                        
                        // For other roles, just show details
                        toast({
                          title: job.title || "Maintenance Job",
                          description: (
                            <div className="space-y-2">
                              <p className="font-medium">{job.description}</p>
                              <div className="flex flex-col gap-1 text-xs">
                                <div><strong>Store:</strong> {store?.name || 'Unknown'}</div>
                                <div><strong>Scheduled:</strong> {job.logDate} at {job.logTime}</div>
                                <div><strong>Status:</strong> {job.flag}</div>
                                <div><strong>Logged by:</strong> {job.loggedBy}</div>
                                {job.category && <div><strong>Category:</strong> {job.category}</div>}
                              </div>
                            </div>
                          ),
                          duration: 5000,
                        });
                      }
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
                    // These features are supported in React Big Calendar 
                    step={15} // 15-min increments
                    timeslots={4} // 4 slots per hour
                    slotPropGetter={() => ({
                      className: 'custom-time-slot',
                    })}
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