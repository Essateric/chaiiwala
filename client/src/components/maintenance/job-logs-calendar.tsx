import { useState, useMemo, useRef, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, SlotInfo } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { JobLog } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(
    user?.role === "store" && typeof user?.storeId === 'number' ? user.storeId : undefined
  );
  
  // Convert job logs to calendar events
  const calendarEvents = useMemo((): CalendarEvent[] => {
    if (!Array.isArray(jobLogs)) return [];
    
    return jobLogs
      .filter(job => !selectedStoreId || job.storeId === selectedStoreId)
      .map(job => {
        try {
          // Create start date from logDate and logTime
          const startDate = new Date(`${job.logDate}T${job.logTime}`);
          
          // Create end date - set to 1 hour after start for display purposes
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 1);
          
          // Find store name with defensive check
          let storeName = 'Unknown Store';
          if (Array.isArray(stores)) {
            storeName = stores.find(store => store && store.id === job.storeId)?.name || 'Unknown Store';
          }
          
          return {
            id: job.id,
            title: job.description || 'No description',
            start: startDate,
            end: endDate,
            storeId: job.storeId,
            storeName,
            flag: job.flag,
            description: job.description || 'No description',
            loggedBy: job.loggedBy || 'Unknown'
          };
        } catch (error) {
          console.error("Error processing job log:", job, error);
          return null; // This will be filtered out below
        }
      })
      .filter((event): event is CalendarEvent => event !== null);
  }, [jobLogs, selectedStoreId, stores]);
  
  // Define custom event styling based on job flag
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor;
    
    switch (event.flag) {
      case 'urgent':
        backgroundColor = '#ef4444';
        break;
      case 'long_standing':
        backgroundColor = '#eab308';
        break;
      default:
        backgroundColor = '#3b82f6';
    }
    
    return {
      style: {
        backgroundColor,
        color: 'white',
        borderRadius: '4px',
        borderStyle: 'none',
        display: 'block',
        opacity: 0.9,
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
  
  // List of pending jobs (only shown to maintenance staff)
  const [pendingJobs, setPendingJobs] = useState<JobLog[]>(() => {
    // Initialize with job logs that haven't been scheduled yet
    // (those without logDate or logTime)
    if (!Array.isArray(jobLogs)) return [];
    
    console.log('All jobLogs:', JSON.stringify(jobLogs));
    const filtered = jobLogs.filter(job => !job.logDate || !job.logTime);
    console.log('Filtered pending jobs:', JSON.stringify(filtered));
    
    return filtered;
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
    
    // Update the pending jobs list
    const updatedPendingJobs = pendingJobs.filter(job => job.id !== draggedJob.id);
    setPendingJobs(updatedPendingJobs);
    
    // Clear the dragged job
    setDraggedJob(null);
  };
  
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
        
        // Update pending jobs list
        const updatedPendingJobs = pendingJobs.filter(job => job.id !== draggedJob.id);
        setPendingJobs(updatedPendingJobs);
        
        // Clear dragged job
        setDraggedJob(null);
      }
    },
    [draggedJob, pendingJobs, updateJobLogMutation]
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
  
  return (
    <Card className="overflow-hidden mt-4">
      <CardHeader className="pb-2">
        <CardTitle>Job Logs Calendar</CardTitle>
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
                <h3 className="text-sm font-semibold mb-2">Pending Jobs</h3>
                <p className="text-xs text-muted-foreground mb-2">Drag a job to the calendar to schedule it</p>
                
                <ScrollArea className="h-[550px]">
                  <div className="space-y-2">
                    {pendingJobs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No pending jobs</p>
                    ) : (
                      pendingJobs.map(job => {
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
                        
                        return (
                          <div
                            key={job.id}
                            draggable
                            onDragStart={() => handleDragStart(job)}
                            onDragEnd={handleDragEnd}
                            className="bg-card border rounded-md p-3 shadow-sm cursor-move hover:shadow-md transition-shadow"
                          >
                            <h4 className="font-medium text-sm mb-1 line-clamp-2">{job.description || 'No description'}</h4>
                            <div className="flex items-center justify-between text-xs">
                              <Badge variant={badgeVariant} className="text-[10px] py-0">
                                {job.flag === 'urgent' ? 'Urgent' : job.flag === 'long_standing' ? 'Long Standing' : 'Normal'}
                              </Badge>
                              <span className="text-muted-foreground">{storeName}</span>
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
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventStyleGetter}
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
                views={['month', 'week', 'day']}
                selectable={true}
                onSelectSlot={handleDropOnCalendar}
              />
            </div>
            
            {/* Drag indicator */}
            {renderDragIndicator()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}