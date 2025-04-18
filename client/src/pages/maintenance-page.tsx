import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WrenchIcon, ActivityIcon, CheckCircleIcon, ClipboardListIcon, PlusIcon, Loader2, X as XIcon, ImageIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobLogSchema } from "@shared/schema";
import { useJobLogs } from "@/hooks/use-joblogs";
import { useAuth } from "@/hooks/use-auth";
import { useStaffByStore } from "@/hooks/use-staff";
import { useStores } from "@/hooks/use-stores";
import { FileUpload } from "@/components/ui/file-upload";
import { z } from "zod";

// Component for Job Logs
function JobLogsSection() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(
    user?.role === "store" ? user?.storeId ?? undefined : undefined
  );
  
  // Check if user can create maintenance logs
  // Only admin or users with maintenance permission
  const canCreateLogs = 
    user?.role === "admin" || 
    (user?.permissions && user.permissions.includes("maintenance"));
  
  // Get all stores
  const { stores, isLoading: isLoadingStores } = useStores();
  
  // Get store staff for the "Logged By" dropdown
  const initialStoreId = user?.role === "store" ? user?.storeId ?? 1 : 1; 
  const [formStoreId, setFormStoreId] = useState<number>(initialStoreId);
  const { staff: storeStaff, isLoading: isLoadingStaff } = useStaffByStore(formStoreId);

  const { jobLogs: allJobLogs, isLoading, createJobLog, isCreating } = useJobLogs();
  
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
      await createJobLog(values);
      setOpen(false);
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
        {(user?.role === "admin" || user?.role === "regional") && (
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
          <Button
            variant="outline"
            className="mr-2"
            onClick={() => setSelectedStoreId(undefined)}
          >
            {selectedStoreId ? "View All Jobs" : "Filter Jobs"}
          </Button>
          
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
                    {(user?.role === "admin" || user?.role === "regional") && (
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
                      name="attachments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attachments (Images)</FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              <FileUpload
                                onUploadComplete={(imageUrl) => {
                                  // Add the new image URL to the attachments array
                                  const updatedAttachments = [...(field.value || []), imageUrl];
                                  field.onChange(updatedAttachments);
                                }}
                                placeholder="Click to upload maintenance issue images"
                                buttonText="Upload Image"
                              />
                              
                              <div className="mt-4">
                                {(field.value || []).length > 0 ? (
                                  <div>
                                    <h4 className="mb-2 text-sm font-medium">Attached Images ({(field.value || []).length})</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {(field.value || []).map((img, index) => (
                                        <div key={index} className="relative group">
                                          <img 
                                            src={img} 
                                            alt={`Attachment ${index + 1}`}
                                            className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded-md border" 
                                          />
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                              const updatedAttachments = [...(field.value || [])];
                                              updatedAttachments.splice(index, 1);
                                              field.onChange(updatedAttachments);
                                            }}
                                          >
                                            <XIcon className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No images attached yet</p>
                                )}
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Upload images of the maintenance issue (optional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="comments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comments (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any additional comments" {...field} 
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
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
                        {format(new Date(`${job.logDate}T${job.logTime}`), "dd/MM/yy HH:mm", { locale: enUS })}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium max-w-[120px] sm:max-w-[220px] truncate">
                      {job.description}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{job.loggedBy}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 sm:px-2.5 py-1 text-xs font-medium ${getFlagBadgeClass(job.flag)}`}>
                        {job.flag === "normal" && "Normal"}
                        {job.flag === "long_standing" && <span><span className="hidden sm:inline">Long-standing</span><span className="sm:hidden">Long</span></span>}
                        {job.flag === "urgent" && "Urgent"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {stores.find(store => store.id === job.storeId)?.name || `Store ID: ${job.storeId}`}
                    </TableCell>
                    <TableCell className="w-[80px]">
                      {job.attachments && job.attachments.length > 0 ? (
                        <div className="flex justify-start gap-1">
                          {job.attachments.slice(0, 3).map((attachment, index) => (
                            <a 
                              key={index}
                              href={attachment} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-block"
                            >
                              <img 
                                src={attachment} 
                                alt={`Attachment ${index + 1}`} 
                                className="w-8 h-8 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                              />
                            </a>
                          ))}
                          {job.attachments.length > 3 && (
                            <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center text-xs font-medium">
                              +{job.attachments.length - 3}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MaintenancePage() {
  return (
    <DashboardLayout title="Maintenance">
      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Maintenance Tasks</CardTitle>
            <CardDescription>
              Track and manage maintenance tasks for all equipment and facilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upcoming">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="p-4">
                <Alert>
                  <WrenchIcon className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    No upcoming maintenance tasks scheduled. Click "Create Maintenance Task" to add a new task.
                  </AlertDescription>
                </Alert>
              </TabsContent>
              <TabsContent value="active" className="p-4">
                <Alert>
                  <ActivityIcon className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    No active maintenance tasks. Maintenance tasks in progress will appear here.
                  </AlertDescription>
                </Alert>
              </TabsContent>
              <TabsContent value="completed" className="p-4">
                <Alert>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    No completed maintenance tasks. Completed tasks will be shown here for record keeping.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Job Logs Section */}
        <JobLogsSection />
      </div>
    </DashboardLayout>
  );
}