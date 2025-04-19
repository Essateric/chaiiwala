import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardListIcon, PlusIcon, Loader2, X as XIcon, ImageIcon, CalendarIcon, ListIcon, ChevronLeft, ChevronRight, AtSign } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";

export default function JobLogsSection() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(
    user?.role === "store" && typeof user?.storeId === 'number' ? user.storeId : undefined
  );
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJobLog, setSelectedJobLog] = useState<number | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const itemsPerPage = 10;
  
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
  const filteredJobLogs = React.useMemo(() => {
    if (!selectedStoreId) return allJobLogs;
    return allJobLogs.filter(log => log.storeId === selectedStoreId);
  }, [allJobLogs, selectedStoreId]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredJobLogs.length / itemsPerPage);
  
  // Get current page items
  const jobLogs = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredJobLogs.slice(startIndex, endIndex);
  }, [filteredJobLogs, currentPage, itemsPerPage]);
  
  const form = useForm({
    resolver: zodResolver(insertJobLogSchema.extend({
      storeId: z.number(),
      title: z.string().min(3, "Title must be at least 3 characters"),
      category: z.enum(["electrical", "plumbing", "building", "other"]),
      logDate: z.string(),
      logTime: z.string(),
      description: z.string().min(5, "Description must be at least 5 characters"),
      loggedBy: z.string().min(2, "Name must be at least 2 characters"),
      flag: z.enum(["normal", "long_standing", "urgent"]),
      attachments: z.array(z.string()).default([]),
      comments: z.string().nullable().optional(),
    })),
    defaultValues: {
      storeId: user?.storeId ?? 1,
      title: "",
      category: "other" as const,
      logDate: format(new Date(), "yyyy-MM-dd"),
      logTime: format(new Date(), "HH:mm"),
      description: "",
      loggedBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || user?.username || "",
      flag: "normal" as const,
      attachments: [],
      comments: null,
    },
  });
  
  function handleImageUpload(imageUrl: string) {
    const currentAttachments = form.getValues("attachments") || [];
    form.setValue("attachments", [...currentAttachments, imageUrl]);
    setUploadedImages([...uploadedImages, imageUrl]);
  }

  function handleRemoveImage(index: number) {
    const currentAttachments = [...form.getValues("attachments")];
    currentAttachments.splice(index, 1);
    form.setValue("attachments", currentAttachments);
    
    const newUploadedImages = [...uploadedImages];
    newUploadedImages.splice(index, 1);
    setUploadedImages(newUploadedImages);
  }
  
  async function onSubmit(values: any) {
    try {
      const newJobLog = await createJobLog(values);
      console.log("New job log created:", newJobLog);
      
      // Close the dialog
      setOpen(false);
      
      // Reset the form for next use
      form.reset({
        storeId: values.storeId,
        title: "",
        category: "other" as const,
        logDate: format(new Date(), "yyyy-MM-dd"),
        logTime: format(new Date(), "HH:mm"),
        description: "",
        loggedBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || user?.username || "",
        flag: "normal" as const,
        attachments: [],
        comments: null,
      });
      setUploadedImages([]);
    } catch (error) {
      console.error("Error submitting job log:", error);
    }
  }

  // Function to render job category badge
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "electrical":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Electrical</Badge>;
      case "plumbing":
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Plumbing</Badge>;
      case "building":
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Building</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">Other</Badge>;
    }
  };

  // Function to render priority/flag badge
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

  // Job log detail dialog
  const JobLogDetails = ({ jobLog }: { jobLog: any }) => {
    const [comment, setComment] = useState("");
    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    const [mentionedUsers, setMentionedUsers] = useState<number[]>([]);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState("");
    const [cursorPosition, setCursorPosition] = useState(0);
    const { toast } = useToast();
    
    // Fetch comments for this job log
    const { data: comments = [], isLoading: isLoadingComments, refetch: refetchComments } = useQuery<any[]>({
      queryKey: [`/api/joblogs/${jobLog.id}/comments`],
      enabled: !!jobLog.id,
    });
    
    // Fetch all staff for mentions
    const { data: staffList = [] } = useQuery<{ id: number; name: string; role: string; }[]>({
      queryKey: ['/api/staff'],
      enabled: !!jobLog.id,
    });
    
    // Add comment mutation
    const addCommentMutation = useMutation({
      mutationFn: async (commentData: { comment: string, mentionedUsers: number[] }) => {
        const response = await fetch(`/api/joblogs/${jobLog.id}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(commentData),
        });
        
        if (!response.ok) {
          throw new Error('Failed to add comment');
        }
        
        return response.json();
      },
      onSuccess: () => {
        toast({
          title: "Comment added",
          description: "Your comment has been added successfully",
        });
        setComment("");
        setMentionedUsers([]);
        refetchComments();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to add comment: " + error.message,
          variant: "destructive",
        });
      }
    });
    
    // Handle @ mentions
    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setComment(value);
      
      // Handle @ mentions
      if (value.includes('@')) {
        const lastAtIndex = value.lastIndexOf('@');
        const cursorPos = e.target.selectionStart;
        
        if (cursorPos > lastAtIndex) {
          const searchTerm = value.substring(lastAtIndex + 1, cursorPos).trim();
          setUserSearchTerm(searchTerm);
          setShowUserMenu(true);
          setCursorPosition(cursorPos);
        } else {
          setShowUserMenu(false);
        }
      } else {
        setShowUserMenu(false);
      }
    };
    
    // Handle user selection from mention menu
    const handleUserSelect = (userId: number, userName: string) => {
      const beforeAt = comment.substring(0, comment.lastIndexOf('@'));
      const afterCursor = comment.substring(cursorPosition);
      const newComment = `${beforeAt}@${userName} ${afterCursor}`;
      
      setComment(newComment);
      setShowUserMenu(false);
      
      // Add user to mentioned users if not already included
      if (!mentionedUsers.includes(userId)) {
        setMentionedUsers([...mentionedUsers, userId]);
      }
      
      // Focus the textarea and set cursor position after the inserted name
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        const newCursorPos = beforeAt.length + userName.length + 2; // +2 for @ and space
        setTimeout(() => {
          if (commentInputRef.current) {
            commentInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);
      }
    };
    
    // Submit comment
    const handleSubmitComment = () => {
      if (!comment.trim()) return;
      
      addCommentMutation.mutate({
        comment,
        mentionedUsers
      });
    };
    
    // Format comment date
    const formatCommentDate = (dateString: string) => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    };
    
    return (
      <Dialog open={!!jobLog} onOpenChange={(open) => !open && setSelectedJobLog(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {jobLog.title}
              {getCategoryBadge(jobLog.category)}
            </DialogTitle>
            <DialogDescription>
              Created by {jobLog.loggedBy} on {jobLog.logDate} at {jobLog.logTime}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{jobLog.description}</p>
            </div>
            
            {jobLog.attachments && jobLog.attachments.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Attachments</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {jobLog.attachments.map((url: string, index: number) => (
                    <div key={index} className="relative group">
                      <img 
                        src={url} 
                        alt={`Attachment ${index + 1}`} 
                        className="rounded-md object-cover w-full h-40"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="bg-white rounded-full p-2"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-medium mb-2">Comments</h3>
              <div className="space-y-4 mb-4 max-h-60 overflow-y-auto bg-muted/50 p-3 rounded-md">
                {isLoadingComments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No comments yet
                  </div>
                ) : (
                  comments.map((comment: any) => {
                    const commenter = staffList.find(staff => staff.id === comment.commentedBy);
                    return (
                      <div key={comment.id} className="bg-background rounded p-3 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-medium">{commenter?.name || 'Unknown User'}</div>
                          <div className="text-xs text-muted-foreground">{formatCommentDate(comment.commentedAt)}</div>
                        </div>
                        <div className="text-sm">
                          {comment.comment.split(' ').map((word: string, i: number) => {
                            // Highlight mentions with @ symbol
                            if (word.startsWith('@')) {
                              return <span key={i} className="text-primary font-medium">{word} </span>;
                            }
                            return <span key={i}>{word} </span>;
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="relative">
                <Textarea 
                  ref={commentInputRef}
                  placeholder="Add a comment... Use @ to mention someone"
                  value={comment}
                  onChange={handleCommentChange}
                  className="min-h-24"
                />
                
                {showUserMenu && (
                  <div className="absolute z-10 w-full max-h-40 overflow-y-auto mt-1 bg-background border rounded-md shadow-md">
                    {staffList
                      .filter(staff => 
                        staff.name.toLowerCase().includes(userSearchTerm.toLowerCase())
                      )
                      .map(staff => (
                        <div
                          key={staff.id}
                          className="px-3 py-2 hover:bg-muted cursor-pointer"
                          onClick={() => handleUserSelect(staff.id, staff.name)}
                        >
                          <div className="font-medium">{staff.name}</div>
                          <div className="text-xs text-muted-foreground">{staff.role}</div>
                        </div>
                      ))}
                  </div>
                )}
                
                <Button 
                  size="sm" 
                  className="mt-2" 
                  disabled={!comment.trim() || addCommentMutation.isPending}
                  onClick={handleSubmitComment}
                >
                  {addCommentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Comment"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
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
              
              <DialogContent className="sm:max-w-[650px]">
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
                    
                    {/* New fields: Title and Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Brief title of the issue" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="electrical">Electrical</SelectItem>
                                <SelectItem value="plumbing">Plumbing</SelectItem>
                                <SelectItem value="building">Building</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe the maintenance issue in detail" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Image Upload */}
                    <FormField
                      control={form.control}
                      name="attachments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Images</FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              <FileUpload 
                                onUploadComplete={handleImageUpload}
                                placeholder="Upload images of the issue"
                                buttonText="Upload Image"
                              />
                              
                              {uploadedImages.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                  {uploadedImages.map((url, index) => (
                                    <div key={index} className="relative group">
                                      <img 
                                        src={url} 
                                        alt={`Uploaded ${index + 1}`} 
                                        className="h-24 w-full object-cover rounded-md"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveImage(index)}
                                        className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white hover:bg-black/80 transition"
                                      >
                                        <XIcon className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
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
                    
                    <DialogFooter>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Job Log
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {viewMode === "list" ? (
          <>
            {isLoading ? (
              <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : jobLogs.length === 0 ? (
              <Alert className="my-4">
                <AlertDescription>
                  No job logs found. 
                  {canCreateLogs && " Click 'Log New Job' to create a new maintenance request."}
                </AlertDescription>
              </Alert>
            ) : (
              <div>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Date & Time</TableHead>
                        <TableHead>Title / Category</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Logged By</TableHead>
                        <TableHead className="w-[100px]">Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobLogs.map((log) => {
                        const storeName = stores.find(s => s.id === log.storeId)?.name || `Store ${log.storeId}`;
                        return (
                          <TableRow 
                            key={log.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedJobLog(log.id)}
                          >
                            <TableCell className="font-medium">
                              {log.logDate}<br />
                              <span className="text-xs text-muted-foreground">{log.logTime}</span>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{log.title || 'No title'}</div>
                              {getCategoryBadge(log.category || 'other')}
                            </TableCell>
                            <TableCell>{storeName}</TableCell>
                            <TableCell>{log.loggedBy}</TableCell>
                            <TableCell>
                              <Badge className={getFlagBadgeClass(log.flag)}>
                                {log.flag === "long_standing" ? "Long-standing" : 
                                  log.flag.charAt(0).toUpperCase() + log.flag.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous Page</span>
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next Page</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <JobLogsCalendar 
            jobLogs={filteredJobLogs}
            stores={stores || []}
            isLoading={isLoading}
          />
        )}
        
        {/* Job log detail dialog */}
        {selectedJobLog !== null && (
          <JobLogDetails 
            jobLog={filteredJobLogs.find(log => log.id === selectedJobLog)} 
          />
        )}
      </CardContent>
    </Card>
  );
}