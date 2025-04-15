import { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { JobLog } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
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
    user?.role === "store" ? user?.storeId : undefined
  );
  
  // Convert job logs to calendar events
  const calendarEvents = useMemo((): CalendarEvent[] => {
    return jobLogs
      .filter(job => !selectedStoreId || job.storeId === selectedStoreId)
      .map(job => {
        // Create start date from logDate and logTime
        const startDate = new Date(`${job.logDate}T${job.logTime}`);
        
        // Create end date - set to 1 hour after start for display purposes
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);
        
        // Find store name
        const storeName = stores.find(store => store.id === job.storeId)?.name || 'Unknown Store';
        
        return {
          id: job.id,
          title: job.description,
          start: startDate,
          end: endDate,
          storeId: job.storeId,
          storeName,
          flag: job.flag,
          description: job.description,
          loggedBy: job.loggedBy
        };
      });
  }, [jobLogs, selectedStoreId, stores]);
  
  // Define custom event styling based on job flag
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor;
    let borderColor;
    
    switch (event.flag) {
      case 'urgent':
        backgroundColor = '#ef4444';
        borderColor = '#b91c1c';
        break;
      case 'long_standing':
        backgroundColor = '#eab308';
        borderColor = '#a16207';
        break;
      default:
        backgroundColor = '#3b82f6';
        borderColor = '#1d4ed8';
    }
    
    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white',
        borderRadius: '4px',
        border: 'none',
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
        {canFilterByStore && (
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
                {stores.map(store => (
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
  
  return (
    <Card className="overflow-hidden mt-4">
      <CardHeader className="pb-2">
        <CardTitle>Job Logs Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 600 }}>
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
              const eventObj = event as CalendarEvent;
              return `${eventObj.description}\nStore: ${eventObj.storeName}\nLogged by: ${eventObj.loggedBy}\nStatus: ${eventObj.flag}`;
            }}
            popup
            views={['month', 'week', 'day']}
          />
        </div>
      </CardContent>
    </Card>
  );
}