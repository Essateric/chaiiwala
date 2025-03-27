import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import CalendarView from "@/components/schedule/calendar-view";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types for schedule data
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

export default function SchedulePage() {
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [newShiftData, setNewShiftData] = useState({
    staffId: 0,
    day: 0,
    start: "09:00",
    end: "17:00"
  });
  const { toast } = useToast();

  // Fetch shifts and staff data
  const { data: shifts = [] } = useQuery<ShiftData[]>({
    queryKey: ["/api/schedule/shifts"],
  });

  const { data: staff = [] } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
  });

  // Add shift mutation
  const addShiftMutation = useMutation({
    mutationFn: async (shiftData: Omit<ShiftData, "id" | "staffName" | "role">) => {
      const res = await apiRequest("POST", "/api/schedule/shifts", shiftData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/shifts"] });
      setShowAddShiftDialog(false);
      toast({
        title: "Shift Added",
        description: "New shift has been added to the schedule.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add shift: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Remove shift mutation
  const removeShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      await apiRequest("DELETE", `/api/schedule/shifts/${shiftId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/shifts"] });
      toast({
        title: "Shift Removed",
        description: "Shift has been removed from the schedule.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove shift: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleAddShift = (staffId: number, day: number) => {
    setNewShiftData({
      ...newShiftData,
      staffId,
      day
    });
    setShowAddShiftDialog(true);
  };

  const submitNewShift = () => {
    const { staffId, day, start, end } = newShiftData;
    if (staffId && start && end) {
      addShiftMutation.mutate({
        staffId,
        day,
        start,
        end
      });
    }
  };

  const handleRemoveShift = (shiftId: string) => {
    removeShiftMutation.mutate(shiftId);
  };

  return (
    <DashboardLayout title="Staff Schedule">
      <div className="mb-6">
        <h2 className="text-2xl font-montserrat font-bold mb-1">Staff Scheduling</h2>
        <p className="text-gray-600">Manage staff shifts and schedules across all locations</p>
      </div>
      
      {/* Calendar View */}
      <CalendarView 
        shifts={shifts}
        staff={staff}
        onAddShift={handleAddShift}
        onRemoveShift={handleRemoveShift}
      />
      
      {/* Add Shift Dialog */}
      <Dialog open={showAddShiftDialog} onOpenChange={setShowAddShiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Shift</DialogTitle>
            <DialogDescription>
              Enter the details for the new shift.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={newShiftData.start}
                  onChange={(e) => setNewShiftData({...newShiftData, start: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={newShiftData.end}
                  onChange={(e) => setNewShiftData({...newShiftData, end: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-select">Staff Member</Label>
              <Select 
                value={newShiftData.staffId.toString()} 
                onValueChange={(value) => setNewShiftData({...newShiftData, staffId: parseInt(value)})}
              >
                <SelectTrigger id="staff-select">
                  <SelectValue placeholder="Select a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddShiftDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-chai-gold hover:bg-yellow-600" 
              onClick={submitNewShift}
              disabled={addShiftMutation.isPending}
            >
              {addShiftMutation.isPending ? "Adding..." : "Add Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
