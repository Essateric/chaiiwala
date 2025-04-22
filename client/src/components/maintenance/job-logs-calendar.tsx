import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, SlotInfo, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { CalendarX, Loader2, ChevronLeft, ChevronRight, RefreshCw, GripVertical } from 'lucide-react';
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

// Create a calendar component with drag and drop capabilities
const DnDCalendar = withDragAndDrop(Calendar);

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
  // Add reference to original job data for easier handling during drag operations
  originalJob?: JobLog;
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
  const calendarRef = useRef<HTMLDivElement>(null);
  
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
  
  // State for job details dialog
  const [selectedJob, setSelectedJob] = useState<JobLog | null>(null);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  
  // State for drag and drop functionality
  const [draggedJob, setDraggedJob] = useState<JobLog | null>(null);
  const [draggableJobs, setDraggableJobs] = useState<JobLog[]>([]);
  
  // Mutation for updating job logs
  const updateJobLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<JobLog> }) => {
      const res = await apiRequest('PATCH', `/api/joblogs/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate job logs cache
      queryClient.invalidateQueries({ queryKey: ['/api/joblogs'] });
    }
  });
  
  // State to hold current time for the "time now" indicator
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Update current time every minute
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // update every minute
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Function to manually refresh job logs and calendar - without toast
  const refreshCalendar = useCallback(() => {
    console.log("Manual calendar refresh initiated");
    return fetch('/api/joblogs')
      .then(res => res.json())
      .then(data => {
        // If we have valid data, update the draggable jobs and force a calendar refresh
        if (Array.isArray(data)) {
          setDraggableJobs(data);
          console.log("✅ Calendar refreshed with", data.length, "jobs");
          return data;
        }
        return null;
      })
      .catch(err => {
        console.error("❌ Error refreshing job logs:", err);
        return null;
      });
  }, []);
  
  // Setup initial calendar load
  useEffect(() => {
    // Initial refresh
    refreshCalendar();
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
          loggedBy: job.loggedBy || 'Unknown',
          originalJob: job // Store the original job data for easier access during drag operations
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
        cursor: isMaintenance ? 'grab' : 'pointer'
      }
    };
  };
  
  // Custom toolbar to show store filter and view controls based on user role
  const CustomToolbar = (toolbarProps: any) => {
    const { label, onNavigate, onView, views } = toolbarProps;
    
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
              onClick={() => {
                refreshCalendar();
                toast({
                  title: "Calendar refreshed",
                  description: "Calendar manually refreshed"
                });
              }}
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
                  variant={toolbarProps.view === view ? "default" : "outline"}
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
    
    return (
      <div 
        className="flex flex-col h-full p-1 overflow-hidden group" 
        style={{ cursor: isMaintenance ? 'grab' : 'pointer' }}
      >
        {/* Event header with title and time */}
        <div className="flex justify-between items-start mb-1">
          <div>
            <Badge variant={badgeVariant} className="mb-1 text-xs">
              {event.flag}
            </Badge>
            <div className="text-sm font-medium">{format(event.start, 'h:mm a')}</div>
          </div>
          
          {/* For maintenance staff, show drag handle */}
          {isMaintenance && (
            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 cursor-grab text-white" />
            </div>
          )}
        </div>
        
        {/* Event title and details */}
        <div className="text-xs line-clamp-2">{event.title}</div>
        <div className="text-[10px] line-clamp-1 mt-auto pt-1">
          {event.storeName}
        </div>
      </div>
    );
  };
  
  // Handle starting to move a job
  const handleStartMoveJob = (job: JobLog) => {
    setDraggedJob(job);
    
    toast({
      title: "Moving job",
      description: "Select a time slot on the calendar to schedule",
      duration: 3000,
    });
  };
  
  // Handle dropping a job on the calendar
  const handleDropOnCalendar = (slotInfo: SlotInfo) => {
    if (!draggedJob) {
      console.log("No job being dragged when handleDropOnCalendar called");
      return;
    }
    
    console.log("📋 handleDropOnCalendar called with:", slotInfo);
    console.log("🎯 Dropping job:", draggedJob);
    
    // Get new date and time from the slot
    let scheduleDate: Date;
    
    if (slotInfo.start) {
      scheduleDate = new Date(slotInfo.start);
    } else {
      console.error("No start time in slot info");
      return;
    }
    
    const logDate = format(scheduleDate, 'yyyy-MM-dd');
    const logTime = format(scheduleDate, 'HH:mm');
    
    console.log(`Scheduling job ${draggedJob.id} for ${logDate} at ${logTime}`);
    
    // Update the job with the new date/time
    updateJobLogMutation.mutate({
      id: draggedJob.id,
      data: { logDate, logTime }
    }, {
      onSuccess: () => {
        toast({
          title: "Job scheduled",
          description: `Job scheduled for ${logDate} at ${logTime}`,
        });
        setDraggedJob(null); // Reset dragged job
        refreshCalendar();
      }
    });
  };
  
  // Function to render a drag indicator
  const renderDragIndicator = () => {
    if (draggedJob) {
      return (
        <div className="fixed bottom-4 right-4 bg-primary text-white p-3 rounded-lg shadow-lg flex gap-2 items-center z-50">
          <span>Moving: {draggedJob.description || draggedJob.title}</span>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => setDraggedJob(null)}
          >
            Cancel
          </Button>
        </div>
      );
    }
    return null;
  };
  
  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Job Logs Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Sidebar with job logs to schedule (only for maintenance staff) */}
              {isMaintenance && (
                <div className="lg:w-1/4 mb-4 lg:mb-0">
                  <h3 className="text-lg font-semibold mb-2">Maintenance Jobs</h3>
                  <p className="text-sm text-muted-foreground mb-4">Click or drag a job to reschedule it</p>
                  
                  <ScrollArea className="h-[500px] pr-2">
                    <div className="space-y-2">
                      {draggableJobs
                        .filter(job => {
                          // For store role, only show jobs for their store
                          if (user?.role === 'store') {
                            return job.storeId === user.storeId;
                          }
                          // For other roles, filter by selected store if applicable
                          return selectedStoreId ? job.storeId === selectedStoreId : true;
                        })
                        .filter(job => !job.logDate || !job.logTime)
                        .map(job => {
                          const store = stores.find(s => s.id === job.storeId);
                          let badgeVariant: "default" | "destructive" | "outline" | "secondary" | null | undefined;
                          
                          switch (job.flag) {
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
                            <div
                              key={job.id}
                              className="border rounded-md p-3 cursor-pointer hover:shadow-md transition-all bg-card"
                              onClick={() => handleStartMoveJob(job)}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', String(job.id));
                                handleStartMoveJob(job);
                              }}
                            >
                              <div className="mb-1">
                                <Badge 
                                  variant={badgeVariant}
                                  className="text-xs"
                                >
                                  {job.flag}
                                </Badge>
                              </div>
                              <h4 className="font-medium text-sm mb-1">
                                {job.description || job.title || 'Maintenance Job'}
                              </h4>
                              <div className="text-xs text-muted-foreground flex flex-col">
                                <span className="truncate">{store?.name || 'Unknown'}</span>
                                {job.loggedBy && <span className="truncate">By: {job.loggedBy}</span>}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </ScrollArea>
                </div>
              )}
              
              {/* Calendar view */}
              <div className={`${isMaintenance ? 'lg:w-3/4' : 'w-full'} h-[600px]`}>
                {calendarEvents.length === 0 ? (
                  <div 
                    className="h-full border rounded-md flex flex-col items-center justify-center p-4 bg-muted/30"
                    onClick={(e) => {
                      if (draggedJob && isMaintenance) {
                        // If we're dragging a job, treat click as a drop
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const totalHeight = rect.height;
                        const percentage = y / totalHeight;
                        
                        // Calculate time based on position (7am - 7pm range)
                        const minutesSince7am = percentage * 12 * 60; // 12 hours in minutes
                        const hours = Math.floor(minutesSince7am / 60) + 7; // Add 7 for 7am start
                        const minutes = Math.floor(minutesSince7am % 60);
                        
                        // Create date for today with the calculated time
                        const slotDate = new Date();
                        slotDate.setHours(hours, minutes, 0, 0);
                        
                        handleDropOnCalendar({
                          start: slotDate,
                          end: new Date(slotDate.getTime() + 60 * 60 * 1000), // 1 hour later
                          slots: [slotDate],
                          action: 'click',
                        });
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
                  <div className="relative h-full" ref={calendarRef} data-role={user?.role || ""}>
                    {/* Current time indicator line - only show in day/week views */}
                    {(currentView === 'day' || currentView === 'week') && (
                      <TimeNowIndicator />
                    )}
                    <DnDCalendar
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
                        setCurrentView(view as View);
                      }}
                      onNavigate={(date) => {
                        console.log('Calendar navigated to:', date);
                        setCurrentDate(date);
                      }}
                      min={new Date(0, 0, 0, 7, 0)} // Start at 7am
                      max={new Date(0, 0, 0, 19, 0)} // End at 7pm
                      selectable={isMaintenance}
                      draggableAccessor={() => isMaintenance} // Only maintenance staff can drag events
                      resizable={false}
                      onEventDrop={(data: any) => {
                        if (!isMaintenance) return;
                        
                        // Get event and new start time from drop data
                        const { event, start } = data;
                        console.log("Event dropped:", event.id, "to", start);
                        
                        // Format date and time
                        const logDate = format(start, 'yyyy-MM-dd');
                        const logTime = format(start, 'HH:mm');
                        
                        // Update job with new date/time
                        updateJobLogMutation.mutate({
                          id: event.id,
                          data: { logDate, logTime }
                        }, {
                          onSuccess: () => {
                            toast({
                              title: "Job rescheduled",
                              description: `Job moved to ${logDate} at ${logTime}`,
                            });
                            refreshCalendar();
                          }
                        });
                      }}
                      onSelectSlot={(slotInfo: SlotInfo) => {
                        console.log("✅ SLOT SELECTED IN CALENDAR:", slotInfo);
                        console.log("📋 Current dragged job in onSelectSlot:", draggedJob);
                        console.log("📅 Selected slot start time:", slotInfo.start);
                        
                        // Only handle slot selection if we have a job being moved
                        if (!draggedJob) {
                          console.log("No job being moved when slot selected");
                          return;
                        }
                        
                        // Use handleDropOnCalendar for processing slot selection
                        handleDropOnCalendar(slotInfo);
                      }}
                      onSelectEvent={(event: any) => {
                        // Show job details in a dialog when clicked
                        const jobEvent = event as CalendarEvent;
                        const job = jobLogs.find(j => j.id === jobEvent.id);
                        
                        if (job) {
                          // Set the selected job and open the dialog
                          setSelectedJob(job);
                          setJobDialogOpen(true);
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

      {/* Job Details Dialog */}
      {selectedJob && (
        <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {selectedJob.title || "Maintenance Job"}
              </DialogTitle>
              <DialogDescription className="text-base space-y-4">
                <div className="mt-4">
                  <h3 className="font-semibold text-foreground mb-1">Description</h3>
                  <p>{selectedJob.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <h4 className="font-semibold text-foreground">Store</h4>
                    <p>{stores.find(s => s.id === selectedJob.storeId)?.name || 'Unknown'}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground">Status</h4>
                    <Badge 
                      variant={selectedJob.flag === 'urgent' ? 'destructive' : 
                              selectedJob.flag === 'long_standing' ? 'secondary' : 'default'}
                    >
                      {selectedJob.flag === 'urgent' ? 'Urgent' : 
                       selectedJob.flag === 'long_standing' ? 'Long Standing' : 'Normal'}
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground">Scheduled</h4>
                    <p>{selectedJob.logDate} at {selectedJob.logTime}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground">Logged by</h4>
                    <p>{selectedJob.loggedBy}</p>
                  </div>
                  
                  {selectedJob.category && (
                    <div>
                      <h4 className="font-semibold text-foreground">Category</h4>
                      <p>{selectedJob.category}</p>
                    </div>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            
            {isMaintenance && (
              <div className="space-y-3 mt-2">
                <h3 className="text-sm font-semibold">Reschedule this job:</h3>
                <div className="flex justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      // Set as the dragged job to allow repositioning
                      setDraggedJob(selectedJob);
                      setJobDialogOpen(false);
                      
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
                        id: selectedJob.id,
                        data: { 
                          logDate: tomorrowStr,
                          logTime: selectedJob.logTime
                        }
                      }, {
                        onSuccess: () => {
                          toast({
                            title: "Job rescheduled",
                            description: `Job moved to tomorrow (${tomorrowStr}) at ${selectedJob.logTime}`,
                          });
                          setJobDialogOpen(false);
                          refreshCalendar();
                        }
                      });
                    }}
                  >
                    Move to tomorrow
                  </Button>
                </div>
              </div>
            )}
            
            <DialogFooter className="flex justify-between items-center">
              <Button
                variant="default"
                onClick={() => {
                  // Navigate to detail page
                  navigate(`/maintenance/job/${selectedJob.id}`);
                  setJobDialogOpen(false);
                }}
              >
                View full details
              </Button>
              <DialogClose asChild>
                <Button variant="secondary">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}