import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from "@/lib/queryClient";
import { User as SelectUser } from "@shared/schema";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, UsersIcon } from 'lucide-react';

export default function SchedulePage() {
  const { toast } = useToast();
  
  // Fetch user data directly
  const { data: user } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Sample schedule data (would be fetched from API in real implementation)
  const scheduleData = [
    { day: 'Monday', staff: [
      { name: 'John Doe', role: 'Manager', shift: '9:00 AM - 5:00 PM' },
      { name: 'Jane Smith', role: 'Barista', shift: '10:00 AM - 6:00 PM' },
    ]},
    { day: 'Tuesday', staff: [
      { name: 'Alice Johnson', role: 'Manager', shift: '9:00 AM - 5:00 PM' },
      { name: 'Bob Brown', role: 'Barista', shift: '2:00 PM - 10:00 PM' },
    ]},
    { day: 'Wednesday', staff: [
      { name: 'John Doe', role: 'Manager', shift: '9:00 AM - 5:00 PM' },
      { name: 'Charlie Davis', role: 'Barista', shift: '10:00 AM - 6:00 PM' },
    ]},
    { day: 'Thursday', staff: [
      { name: 'Alice Johnson', role: 'Manager', shift: '9:00 AM - 5:00 PM' },
      { name: 'Jane Smith', role: 'Barista', shift: '2:00 PM - 10:00 PM' },
    ]},
    { day: 'Friday', staff: [
      { name: 'John Doe', role: 'Manager', shift: '9:00 AM - 5:00 PM' },
      { name: 'Bob Brown', role: 'Barista', shift: '10:00 AM - 6:00 PM' },
      { name: 'Charlie Davis', role: 'Barista', shift: '2:00 PM - 10:00 PM' },
    ]},
    { day: 'Saturday', staff: [
      { name: 'Alice Johnson', role: 'Manager', shift: '9:00 AM - 5:00 PM' },
      { name: 'Jane Smith', role: 'Barista', shift: '10:00 AM - 6:00 PM' },
      { name: 'Bob Brown', role: 'Barista', shift: '2:00 PM - 10:00 PM' },
    ]},
    { day: 'Sunday', staff: [
      { name: 'Charlie Davis', role: 'Manager', shift: '10:00 AM - 6:00 PM' },
      { name: 'John Doe', role: 'Barista', shift: '11:00 AM - 7:00 PM' },
    ]}
  ];

  return (
    <DashboardLayout title="Staff Schedule">
      <div className="py-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <p className="text-xs sm:text-sm text-white">
              Manage staff schedules and shift assignments
            </p>
          </div>
          <div className="mt-2 md:mt-0 flex items-center">
            <span className="text-xs sm:text-sm text-white">Welcome, {user?.name || 'User'}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Staff Scheduled</CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">
                employees on rotation
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Schedule Period</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Weekly</div>
              <p className="text-xs text-muted-foreground">
                updated every Sunday
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Schedule Display */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Weekly Staff Schedule</h2>
            <p className="text-sm text-gray-500 mb-6">Click on a shift to manage details or request changes</p>
            
            <div className="space-y-6">
              {scheduleData.map((day, index) => (
                <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <h3 className="font-medium text-lg mb-2">{day.day}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {day.staff.map((person, staffIndex) => (
                      <div 
                        key={staffIndex} 
                        className="bg-gray-50 p-4 rounded-md border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => toast({ title: "Schedule Feature Coming Soon", description: "Shift management will be available in the next update." })}
                      >
                        <div className="font-medium">{person.name}</div>
                        <div className="text-sm text-gray-500">{person.role}</div>
                        <div className="mt-2 text-chai-gold font-semibold">{person.shift}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            className="px-4 py-2 bg-chai-gold text-white rounded-md hover:bg-opacity-90 transition-colors"
            onClick={() => toast({ title: "Schedule Feature Coming Soon", description: "Full schedule management will be available in the next update." })}
          >
            Update Schedule
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}