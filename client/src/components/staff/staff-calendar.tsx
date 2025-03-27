import { useState } from "react";
import { format, addDays, parse, isSameDay } from "date-fns";
import { StaffSchedule } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StaffCalendarProps {
  schedules: StaffSchedule[];
  weekStart: Date;
  readOnly: boolean;
  onUpdate?: (id: number, data: Partial<StaffSchedule>) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function StaffCalendar({ 
  schedules, 
  weekStart, 
  readOnly,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting
}: StaffCalendarProps) {
  const { toast } = useToast();
  const [selectedSchedule, setSelectedSchedule] = useState<StaffSchedule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  
  // Generate an array of dates for the week
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Get the day name (Mon, Tue, etc.) for a date
  const getDayName = (date: Date) => format(date, 'EEE');
  
  // Get the day number (1, 2, etc.) for a date
  const getDayNumber = (date: Date) => format(date, 'd');
  
  // Get shift color based on user ID to ensure consistent coloring
  const getShiftColor = (userId: number) => {
    switch (userId % 4) {
      case 0: return "bg-[#FDE68A]"; // yellow
      case 1: return "bg-[#93C5FD]"; // blue
      case 2: return "bg-[#C4B5FD]"; // purple
      case 3: return "bg-[#A7F3D0]"; // green
      default: return "bg-gray-200";
    }
  };
  
  // Format time (e.g., 8am-4pm)
  const formatShiftTime = (startTime: Date, endTime: Date) => {
    return `${format(startTime, 'ha')}-${format(endTime, 'ha')}`;
  };

  // Find the staff name (in a real app, would be fetched from API)
  const getStaffName = (userId: number) => {
    const staffMap: Record<number, string> = {
      3: "Sarah Khan",
      4: "Amit Patel"
    };
    return staffMap[userId] || `Staff ${userId}`;
  };
  
  // Get schedules for a specific day
  const getSchedulesForDay = (day: Date) => {
    return schedules.filter(schedule => 
      schedule.day === getDayName(day) || 
      (schedule.startTime && isSameDay(new Date(schedule.startTime), day))
    );
  };
  
  // Handle drag-and-drop (simplified for this implementation)
  const handleDragStart = (e: React.DragEvent, schedule: StaffSchedule) => {
    if (readOnly) return;
    e.dataTransfer.setData('text/plain', schedule.id.toString());
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
  };
  
  const handleDrop = async (e: React.DragEvent, day: Date) => {
    if (readOnly) return;
    e.preventDefault();
    const scheduleId = parseInt(e.dataTransfer.getData('text/plain'));
    const schedule = schedules.find(s => s.id === scheduleId);
    
    if (schedule && onUpdate) {
      try {
        // Create a new date by combining the target day with the original time
        const originalStart = new Date(schedule.startTime);
        const originalEnd = new Date(schedule.endTime);
        
        const newStart = new Date(day);
        newStart.setHours(originalStart.getHours(), originalStart.getMinutes());
        
        const newEnd = new Date(day);
        newEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes());
        
        await onUpdate(scheduleId, {
          startTime: newStart,
          endTime: newEnd,
          day: getDayName(day)
        });
        
        toast({
          title: "Schedule Updated",
          description: "The shift has been moved successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to move the shift.",
          variant: "destructive"
        });
      }
    }
  };
  
  const handleScheduleClick = (schedule: StaffSchedule) => {
    if (readOnly) return;
    setSelectedSchedule(schedule);
    setIsDialogOpen(true);
  };
  
  const handleDeleteSchedule = async () => {
    if (selectedSchedule && onDelete) {
      try {
        await onDelete(selectedSchedule.id);
        setIsDialogOpen(false);
        toast({
          title: "Schedule Deleted",
          description: "The shift has been deleted successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete the shift.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-full grid grid-cols-7">
          {/* Header row with day names */}
          {days.map((day, index) => (
            <div 
              key={index} 
              className={`text-center py-2 font-medium text-gray-500 text-sm bg-gray-50 ${
                [5, 6].includes(day.getDay()) ? 'bg-gray-100' : ''
              }`}
            >
              {format(day, 'EEE')}
            </div>
          ))}
          
          {/* Calendar days */}
          {days.map((day, index) => (
            <div 
              key={index}
              className={`min-h-[100px] border p-1 ${
                [5, 6].includes(day.getDay()) ? 'bg-gray-50' : ''
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              <div className="text-xs text-gray-500 ml-1">{getDayNumber(day)}</div>
              <div className="mt-1">
                {getSchedulesForDay(day).map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`rounded-md px-2 py-1 mb-1 text-xs cursor-pointer ${getShiftColor(schedule.userId)}`}
                    draggable={!readOnly}
                    onDragStart={(e) => handleDragStart(e, schedule)}
                    onClick={() => handleScheduleClick(schedule)}
                  >
                    {getStaffName(schedule.userId)} ({formatShiftTime(new Date(schedule.startTime), new Date(schedule.endTime))})
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Schedule Details Dialog */}
      {!readOnly && selectedSchedule && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Shift Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Staff Member</div>
                <div>{getStaffName(selectedSchedule.userId)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Day</div>
                <div>{selectedSchedule.day}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Time</div>
                <div>{formatShiftTime(new Date(selectedSchedule.startTime), new Date(selectedSchedule.endTime))}</div>
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : "Delete Shift"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the shift.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSchedule}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
