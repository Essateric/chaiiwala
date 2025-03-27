import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ShiftData {
  id: string;
  staffId: number;
  staffName: string;
  role: string;
  start: string;
  end: string;
  day: number; // 0-6 (Sunday-Saturday)
}

interface StaffMember {
  id: number;
  name: string;
  role: string;
  color: string;
}

interface CalendarViewProps {
  shifts: ShiftData[];
  staff: StaffMember[];
  onAddShift: (staffId: number, day: number) => void;
  onRemoveShift: (shiftId: string) => void;
}

export default function CalendarView({ shifts, staff, onAddShift, onRemoveShift }: CalendarViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState("all");
  const { toast } = useToast();

  // Generate day headers
  const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const startOfWeek = new Date(currentWeek);
  startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());

  const dayHeaders = weekDays.map((day, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    return {
      day,
      date: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      dateObj: date,
      dayNum: index
    };
  });

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const handleAddShift = (staffId: number, day: number) => {
    onAddShift(staffId, day);
    toast({
      title: "Shift Added",
      description: "New shift has been added to the schedule.",
    });
  };

  const handleRemoveShift = (shiftId: string) => {
    onRemoveShift(shiftId);
    toast({
      title: "Shift Removed",
      description: "Shift has been removed from the schedule.",
    });
  };

  // Group shifts by staff member
  const shiftsByStaff = staff.map((staffMember) => {
    const staffShifts = shifts.filter((shift) => shift.staffId === staffMember.id);
    return {
      ...staffMember,
      shifts: staffShifts
    };
  });

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between mb-4">
          <div>
            <CardTitle>Staff Schedule</CardTitle>
            <CardDescription>
              Week of {startOfWeek.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <Button variant="outline" size="icon" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="1">Cheetham Hill</SelectItem>
                <SelectItem value="2">Oxford Road</SelectItem>
                <SelectItem value="3">Old Trafford</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Calendar Grid */}
            <div className="grid grid-cols-[150px_repeat(7,1fr)] border border-gray-200 rounded-lg">
              {/* Header Row */}
              <div className="bg-gray-50 p-2 border-b border-r border-gray-200 font-medium">
                Staff
              </div>
              {dayHeaders.map((header) => (
                <div 
                  key={header.dayNum} 
                  className={cn(
                    "bg-gray-50 p-2 text-center border-b border-r border-gray-200",
                    header.dateObj.toDateString() === new Date().toDateString() ? "bg-yellow-50" : ""
                  )}
                >
                  <div className="font-medium">{header.day}</div>
                  <div className="text-sm text-gray-500">{header.date}</div>
                </div>
              ))}

              {/* Staff Rows */}
              {shiftsByStaff.map((staffMember) => (
                <React.Fragment key={staffMember.id}>
                  {/* Staff Name Cell */}
                  <div className="p-2 border-b border-r border-gray-200 flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: staffMember.color }} 
                    />
                    <div>
                      <div className="font-medium">{staffMember.name}</div>
                      <div className="text-xs text-gray-500">{staffMember.role}</div>
                    </div>
                  </div>

                  {/* Day Cells */}
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const dayShifts = staffMember.shifts.filter(shift => shift.day === dayIndex);
                    return (
                      <div 
                        key={dayIndex} 
                        className={cn(
                          "p-2 border-b border-r border-gray-200 min-h-[100px] relative",
                          dayHeaders[dayIndex].dateObj.toDateString() === new Date().toDateString() ? "bg-yellow-50" : ""
                        )}
                      >
                        {dayShifts.map(shift => (
                          <div 
                            key={shift.id} 
                            className="bg-blue-100 mb-1 p-1 text-xs rounded relative group"
                          >
                            <div className="font-medium">{shift.start} - {shift.end}</div>
                            <button 
                              onClick={() => handleRemoveShift(shift.id)}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3 text-gray-500 hover:text-red-500" />
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => handleAddShift(staffMember.id, dayIndex)}
                          className="absolute bottom-1 right-1 text-gray-400 hover:text-chai-gold"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
