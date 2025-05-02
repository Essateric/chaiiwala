import { useState } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function StaffCalendar({ 
  schedules, 
  weekStart, 
  readOnly,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting
}) {
  const { toast } = useToast();
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getDayName = (date) => format(date, 'EEE');
  const getDayNumber = (date) => format(date, 'd');

  const getShiftColor = (userId) => {
    switch (userId % 4) {
      case 0: return "bg-[#FDE68A]";
      case 1: return "bg-[#93C5FD]";
      case 2: return "bg-[#C4B5FD]";
      case 3: return "bg-[#A7F3D0]";
      default: return "bg-gray-200";
    }
  };

  const formatShiftTime = (startTime, endTime) => {
    return `${format(startTime, 'ha')}-${format(endTime, 'ha')}`;
  };

  const getStaffName = (userId) => {
    const staffMap = {
      3: "Sarah Khan",
      4: "Amit Patel",
    };
    return staffMap[userId] || `Staff ${userId}`;
  };

  const getSchedulesForDay = (day) => {
    return schedules.filter(schedule => 
      schedule.day === getDayName(day) || 
      (schedule.startTime && isSameDay(new Date(schedule.startTime), day))
    );
  };

  const handleDragStart = (e, schedule) => {
    if (readOnly) return;
    e.dataTransfer.setData('text/plain', schedule.id.toString());
  };

  const handleDragOver = (e) => {
    if (readOnly) return;
    e.preventDefault();
  };

  const handleDrop = async (e, day) => {
    if (readOnly) return;
    e.preventDefault();
    const scheduleId = parseInt(e.dataTransfer.getData('text/plain'));
    const schedule = schedules.find(s => s.id === scheduleId);

    if (schedule && onUpdate) {
      try {
        const originalStart = new Date(schedule.startTime);
        const originalEnd = new Date(schedule.endTime);

        const newStart = new Date(day);
        newStart.setHours(originalStart.getHours(), originalStart.getMinutes());

        const newEnd = new Date(day);
        newEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes());

        await onUpdate(scheduleId, {
          startTime: newStart,
          endTime: newEnd,
          day: getDayName(day),
        });

        toast({
          title: "Schedule Updated",
          description: "The shift has been moved successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to move the shift.",
          variant: "destructive",
        });
      }
    }
  };

  const handleScheduleClick = (schedule) => {
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
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-full grid grid-cols-7">
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
