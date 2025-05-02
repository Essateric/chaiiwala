import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar, Views } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import localizer from "@/lib/CalendarConfig";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from 'react-dnd-html5-backend';

const DragAndDropCalendar = withDragAndDrop(Calendar);

export default function MaintenanceCalendar({ jobLogs = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState(() =>
    jobLogs.map((log) => ({
      id: log.id,
      title: log.title,
      start: new Date(log.logDate),
      end: new Date(new Date(log.logDate).getTime() + 60 * 60 * 1000),
      resource: log,
    }))
  );

  const handleNavigate = (action) => {
    const newDate = new Date(currentDate);
    if (action === "TODAY") {
      setCurrentDate(new Date());
    } else if (action === "PREV") {
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else if (action === "NEXT") {
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const onEventResize = ({ event, start, end }) => {
    const updated = events.map((e) =>
      e.id === event.id ? { ...e, start, end } : e
    );
    setEvents(updated);
  };

  const onEventDrop = ({ event, start, end }) => {
    const updated = events.map((e) =>
      e.id === event.id ? { ...e, start, end } : e
    );
    setEvents(updated);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex justify-between flex-wrap items-center gap-2">
          <div>
            <CardTitle>Maintenance Calendar</CardTitle>
            <CardDescription>
              View and schedule tasks. Drag to reschedule.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => handleNavigate("PREV")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => handleNavigate("TODAY")}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleNavigate("NEXT")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[700px]">
        <DndProvider backend={HTML5Backend}>
          <DragAndDropCalendar
            localizer={localizer}
            events={events}
            defaultView={Views.WEEK}
            views={[Views.DAY, Views.WEEK, Views.MONTH]}
            step={60}
            timeslots={1}
            date={currentDate}
            onNavigate={(date) => setCurrentDate(date)}
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
            resizable
            style={{ height: "100%" }}
            popup
          />
          </DndProvider>
        </div>
      </CardContent>
    </Card>
  );
}
