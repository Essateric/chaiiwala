import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar, Views } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import localizer from "@/lib/CalendarConfig";
import { supabase } from "@/lib/supabaseClient";

const DragAndDropCalendar = withDragAndDrop(Calendar);

export default function MaintenanceCalendar({ jobLogs = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isOverDropZone, setIsOverDropZone] = useState(false);

  const [events, setEvents] = useState(() =>
    jobLogs.map((log) => ({
      id: log.id,
      title: log.title,
      start: log.booking_start ? new Date(log.booking_start) : new Date(log.logDate),
      end: log.booking_end ? new Date(log.booking_end) : new Date(new Date(log.logDate).getTime() + 60 * 60 * 1000),
      resource: log,
    }))
  );

  const dragFromOutsideItem = useCallback(() => {
    const dragged = window.__externalDragItem;
    console.log("\ud83d\udce6 dragFromOutsideItem triggered:", dragged);
    if (dragged) {
      console.log("\ud83e\uddea dragged.title:", dragged.title);
      console.log("\ud83e\uddea dragged.id:", dragged.id);
      return dragged;
    }
    return null;
  }, []);

  useEffect(() => {
    console.log("\ud83e\udd72 isOverDropZone:", isOverDropZone);
  }, [isOverDropZone]);

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

  const handleExternalDrop = async ({ start }) => {
    const dragged = window.__externalDragItem;
    if (!dragged || !dragged.id) {
      console.error("❌ Dragged item missing or invalid:", dragged);
      return;
    }
  
    console.log("🕒 Drop Start:", start);
    const dropStart = new Date(start);
    const dropEnd = new Date(dropStart.getTime() + 60 * 60 * 1000);
  
    console.log("📅 booking_start (local):", dropStart.toISOString());
    console.log("📅 booking_end (local):", dropEnd.toISOString());

    const newEvent = {
      id: dragged.id,
      title: dragged.title,
      start: dropStart,
      end: dropEnd,
      allDay: false,
      resource: {
        ...dragged,
        booking_start: dropStart.toISOString(),
        booking_end: dropEnd.toISOString(),
      },
    };

    setEvents((prev) => [...prev, newEvent]);
    window.__externalDragItem = null;

    try {
      const { error } = await supabase
        .from("joblogs")
        .update({
          booking_start: dropStart.toISOString(),
          booking_end: dropEnd.toISOString(),
        })
        .eq("id", dragged.id);

      if (error) {
        console.error("\u274c Failed to update job log:", error.message);
      } else {
        console.log("\u2705 booking_start and booking_end saved to DB");
      }
    } catch (err) {
      console.error("\u274c Supabase update error:", err.message);
    }
  };

   const onEventResize = ({ event, start, end }) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, start, end } : e))
    );
  };

  const onEventDrop = ({ event, start, end }) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, start, end } : e))
    );
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
            <Button variant="outline" onClick={() => handleNavigate("TODAY")}>Today</Button>
            <Button variant="outline" size="icon" onClick={() => handleNavigate("NEXT")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
  onDragEnter={() => setIsOverDropZone(true)}
  onDragLeave={() => setIsOverDropZone(false)}
  onDrop={() => setIsOverDropZone(false)}
  onDragOver={(e) => e.preventDefault()} // ✅ This allows drop!
  className={`relative h-[700px] transition-all ${
    isOverDropZone ? "ring-2 ring-green-500 ring-offset-2" : ""
  }`}
>
          <DragAndDropCalendar
            localizer={localizer}
            events={events}
            date={currentDate}
            view={Views.DAY}
            views={[Views.DAY, Views.WEEK, Views.MONTH]}
            onNavigate={setCurrentDate}
            onView={() => {}}
            step={60}
            timeslots={1}
            popup
            resizable
            startAccessor="start"
            endAccessor="end"
            dragFromOutsideItem={dragFromOutsideItem}
            handleDragStart={() => {}}
            onDropFromOutside={handleExternalDrop}
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
            allDayAccessor={null}
            showMultiDayTimes
            style={{ height: "100%" }}
            draggableAccessor={() => false}
            selectable
          />
        </div>
      </CardContent>
    </Card>
  );
}
