import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useStaffSchedule } from "@/hooks/use-staff-schedule";
import { StaffCalendar } from "@/components/staff/staff-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek } from "date-fns";

// Create a date/time picker component since we don't have a native one
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  userId: z.coerce.number({ required_error: "Staff member is required" }),
  storeId: z.coerce.number({ required_error: "Store is required" }),
  startTime: z.string().min(1, { message: "Start time is required" }),
  endTime: z.string().min(1, { message: "End time is required" }),
  day: z.string().min(1, { message: "Day is required" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function StaffSchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedStore, setSelectedStore] = useState<number | undefined>(user?.storeId);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { 
    staffSchedules, 
    isLoading, 
    createStaffSchedule, 
    updateStaffSchedule,
    deleteStaffSchedule,
    isCreating,
    isUpdating,
    isDeleting,
    staff
  } = useStaffSchedule(selectedStore);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: 0,
      storeId: user?.storeId || 0,
      startTime: "",
      endTime: "",
      day: "Mon",
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      // Convert start and end time strings to Date objects
      // Here we're assuming the format is "YYYY-MM-DDTHH:MM" from the datetime-local input
      const startDate = new Date(data.startTime);
      const endDate = new Date(data.endTime);

      await createStaffSchedule({
        ...data,
        startTime: startDate,
        endTime: endDate,
      });
      
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Staff schedule created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create staff schedule.",
        variant: "destructive"
      });
    }
  };

  const nextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  const prevWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  return (
    <DashboardLayout 
      title="Staff Schedule" 
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Staff Schedule" }
      ]}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Staff Schedule</CardTitle>
            <div className="flex items-center space-x-2">
              <Button size="icon" variant="outline" onClick={prevWeek}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 6l-6 6l6 6" />
                </svg>
              </Button>
              <span className="text-sm font-medium">
                {format(weekStart, "MMMM d")} - {format(addDays(weekStart, 6), "MMMM d, yyyy")}
              </span>
              <Button size="icon" variant="outline" onClick={nextWeek}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 6l6 6l-6 6" />
                </svg>
              </Button>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="ml-4 bg-[#D4AF37] hover:bg-[#B89527]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 mr-1">
                      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m-7-7h14" />
                    </svg>
                    New Shift
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Staff Shift</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Staff Member</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              defaultValue=""
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a staff member" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {/* Would normally fetch staff from API */}
                                <SelectItem value="3">Sarah Khan</SelectItem>
                                <SelectItem value="4">Amit Patel</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="storeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Store</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              defaultValue={String(user?.storeId || "")}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a store" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1">Leicester</SelectItem>
                                <SelectItem value="2">Birmingham</SelectItem>
                                <SelectItem value="3">London - Piccadilly</SelectItem>
                                <SelectItem value="4">Manchester</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="day"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Day</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a day" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Mon">Monday</SelectItem>
                                <SelectItem value="Tue">Tuesday</SelectItem>
                                <SelectItem value="Wed">Wednesday</SelectItem>
                                <SelectItem value="Thu">Thursday</SelectItem>
                                <SelectItem value="Fri">Friday</SelectItem>
                                <SelectItem value="Sat">Saturday</SelectItem>
                                <SelectItem value="Sun">Sunday</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline" type="button">Cancel</Button>
                        </DialogClose>
                        <Button 
                          type="submit" 
                          className="bg-[#D4AF37] hover:bg-[#B89527]"
                          disabled={isCreating}
                        >
                          {isCreating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : "Create Shift"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
            </div>
          ) : (
            <>
              <StaffCalendar 
                schedules={staffSchedules || []} 
                weekStart={weekStart}
                readOnly={false}
                onUpdate={updateStaffSchedule}
                onDelete={deleteStaffSchedule}
                isUpdating={isUpdating}
                isDeleting={isDeleting}
              />
              
              <div className="mt-4 flex items-center flex-wrap">
                {staff?.map(staffMember => (
                  <div key={staffMember.id} className="flex items-center mr-4 mb-2">
                    <div 
                      className="w-3 h-3 mr-1"
                      style={{ 
                        backgroundColor: 
                          staffMember.id % 4 === 0 ? "#FDE68A" : 
                          staffMember.id % 3 === 0 ? "#A7F3D0" : 
                          staffMember.id % 2 === 0 ? "#C4B5FD" : "#93C5FD" 
                      }}
                    ></div>
                    <span className="text-xs text-gray-600">{staffMember.name}</span>
                  </div>
                ))}
                <div className="ml-auto text-xs text-gray-500 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="inline-block h-4 w-4 mr-1">
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Drag and drop to reassign shifts
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
