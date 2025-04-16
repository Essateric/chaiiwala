import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardListIcon, PlusIcon, Loader2, X as XIcon, ImageIcon, CalendarIcon, ListIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobLogSchema } from "@shared/schema";
import { useJobLogs } from "@/hooks/use-joblogs";
import { useAuth } from "@/hooks/use-auth";
import { useStaffByStore } from "@/hooks/use-staff";
import { useStores } from "@/hooks/use-stores";
import { FileUpload } from "@/components/ui/file-upload";
import { z } from "zod";
import JobLogsCalendar from "./job-logs-calendar";

export default function JobLogsSection() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(
    user?.role === "store" && typeof user?.storeId === 'number' ? user.storeId : undefined
  );
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  
  // For store managers, always keep the store ID fixed to their assigned store
  useEffect(() => {
    if (user?.role === "store" && typeof user?.storeId === 'number') {
      setSelectedStoreId(user.storeId);
    }
  }, [user?.role, user?.storeId]);
  
  // Check if user can create maintenance logs
  // Only admin, regional, store, or maintenance role
  const canCreateLogs = 
    user?.role === "admin" || 
    user?.role === "regional" ||
    user?.role === "store" ||
    user?.role === "maintenance";
  
  // Get all stores
  const { stores, isLoading: isLoadingStores } = useStores();
  
  // Get store staff for the "Logged By" dropdown
  const initialStoreId = user?.role === "store" ? user?.storeId ?? 1 : 1; 
  const [formStoreId, setFormStoreId] = useState<number>(initialStoreId);
  const { staff: storeStaff, isLoading: isLoadingStaff } = useStaffByStore(formStoreId);

  // If user is a store manager, pass their store ID to ensure proper cache management
  const storeIdForQuery = user?.role === "store" && typeof user?.storeId === "number" ? user.storeId : undefined;
  const { 
    jobLogs: allJobLogs, 
    isLoading, 
    createJobLog, 
    isCreating 
  } = useJobLogs(storeIdForQuery);
  
  // Filter job logs based on selected store
  const jobLogs = React.useMemo(() => {
    if (!selectedStoreId) return allJobLogs;
    return allJobLogs.filter(log => log.storeId === selectedStoreId);
  }, [allJobLogs, selectedStoreId]);
  
  const form = useForm({
    resolver: zodResolver(insertJobLogSchema.extend({
      storeId: z.number(),
      logDate: z.string(),
      logTime: z.string(),
      description: z.string().min(5, "Description must be at least 5 characters"),
      loggedBy: z.string().min(2, "Name must be at least 2 characters"),
      flag: z.enum(["normal", "long_standing", "urgent"]),
      completionDate: z.string().nullable().optional(),
      attachments: z.array(z.string()).default([]),
      comments: z.string().nullable().optional(),
    })),
    defaultValues: {
      storeId: user?.storeId ?? 1,
      logDate: format(new Date(), "yyyy-MM-dd"),
      logTime: format(new Date(), "HH:mm"),
      description: "",
      loggedBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || user?.username || "",
      flag: "normal" as const,
      completionDate: null,
      attachments: [],
      comments: null,
    },
  });
  
  async function onSubmit(values: any) {
    try {
      const newJobLog = await createJobLog(values);
      console.log("New job log created:", newJobLog);
      
      // Close the dialog
      setOpen(false);
      
      // Reset the form for next use
      form.reset({
        storeId: values.storeId,
        logDate: format(new Date(), "yyyy-MM-dd"),
        logTime: format(new Date(), "HH:mm"),
        description: "",
        loggedBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || user?.username || "",
        flag: "normal" as const,
        completionDate: null,
        attachments: [],
        comments: null,
      });
    } catch (error) {
      console.error("Error submitting job log:", error);
    }
  }

  const getFlagBadgeClass = (flag: string) => {
    switch (flag) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "long_standing":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle>Job Logs</CardTitle>
          <CardDescription>
            Track and manage maintenance job logs for all equipment and facilities
          </CardDescription>
        </div>
        {(user?.role === "admin" || user?.role === "regional" || user?.role === "maintenance") && (
          <Select 
            value={selectedStoreId?.toString() || "all"} 
            onValueChange={(value) => {
              if (value === "all") {
                setSelectedStoreId(undefined);
              } else {
                setSelectedStoreId(parseInt(value));
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {!isLoadingStores && stores.map((store) => (
                <SelectItem key={store.id} value={store.id.toString()}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className={viewMode === "list" ? "bg-muted" : ""}
              onClick={() => setViewMode("list")}
            >
              <ListIcon className="h-4 w-4 mr-2" />
              List View
            </Button>
            <Button
              variant="outline"
              className={viewMode === "calendar" ? "bg-muted" : ""}
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar View
            </Button>
          </div>
          
          {/* Only show Create button for admin or maintenance staff */}
          {canCreateLogs && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Log New Job
                </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Create New Job Log</DialogTitle>
                  <DialogDescription>
                    Log a new maintenance job or issue that needs attention.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {(user?.role === "admin" || user?.role === "regional" || user?.role === "maintenance") && (
                      <FormField
                        control={form.control}
                        name="storeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Store Location</FormLabel>
                            <Select
                              value={field.value?.toString() || "1"}
                              onValueChange={(value) => {
                                const storeId = parseInt(value);
                                field.onChange(storeId);
                                setFormStoreId(storeId); // Update the form store ID to fetch appropriate staff
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a store" />
                              </SelectTrigger>
                              <SelectContent>
                                {!isLoadingStores && stores.map((store) => (
                                  <SelectItem key={store.id} value={store.id.toString()}>
                                    {store.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="logDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                value={field.value} 
                                disabled 
                                className="bg-muted cursor-not-allowed"
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-muted-foreground">
                              Automatically set to today's date
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="logTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                value={field.value} 
                                disabled 
                                className="bg-muted cursor-not-allowed"
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-muted-foreground">
                              Automatically set to current time
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="completionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To be completed by</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormDescription>
                            Set a target date for this maintenance task to be completed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe the maintenance issue" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="loggedBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Logged By</FormLabel>
                            <FormControl>
                              <Input 
                                value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || user?.username || ''} 
                                disabled 
                                className="bg-muted cursor-not-allowed"
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-muted-foreground">
                              Automatically assigned to your account
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="flag"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="long_standing">Long-standing</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="comments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comments (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Add any additional comments or context" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Job Log
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {/* View Mode Content */}
        {viewMode === "calendar" ? (
          <JobLogsCalendar 
            jobLogs={jobLogs} 
            stores={stores} 
            isLoading={isLoading || isLoadingStores} 
          />
        ) : (
          isLoading ? (
            <div className="w-full flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : jobLogs.length === 0 ? (
            <Alert>
              <ClipboardListIcon className="h-4 w-4 mr-2" />
              <AlertDescription>
                No job logs found. Click "Log New Job" to create your first job log.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden md:table-cell">Logged By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell w-[100px]">Store</TableHead>
                    <TableHead className="w-[80px] text-center">Image</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobLogs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <span className="hidden sm:inline">
                          {format(new Date(`${job.logDate}T${job.logTime}`), "EEE do MMM yyyy HH:mm", { locale: enUS })}
                        </span>
                        <span className="sm:hidden">
                          {format(new Date(`${job.logDate}T${job.logTime}`), "dd/MM/yy HH:mm")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{job.description}</div>
                        {job.completionDate && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Complete by: {job.completionDate}
                          </div>
                        )}
                        {job.comments && <div className="text-xs mt-1">{job.comments}</div>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{job.loggedBy}</TableCell>
                      <TableCell>
                        <span className={`text-xs rounded-full px-2 py-1 ${getFlagBadgeClass(job.flag)}`}>
                          {job.flag === "urgent" ? "Urgent" : job.flag === "long_standing" ? "Long-standing" : "Normal"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {stores.find((store) => store.id === job.storeId)?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-center">
                        {job.attachments && job.attachments.length > 0 ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full h-7 w-7">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Maintenance Images</DialogTitle>
                              </DialogHeader>
                              <div className="grid grid-cols-2 gap-2 py-4">
                                {job.attachments.map((img, index) => (
                                  <a key={index} href={img} target="_blank" rel="noopener noreferrer">
                                    <img 
                                      src={img} 
                                      alt={`Attachment ${index + 1}`} 
                                      className="w-full rounded-md border border-border"
                                      onError={(e) => {
                                        // Show placeholder on error
                                        (e.target as HTMLImageElement).src = 'https://placehold.co/100x80?text=Error';
                                      }} 
                                    />
                                  </a>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-xs text-muted-foreground">No images</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}