import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useAnnouncements } from "@/hooks/use-announcements";
import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  title: z.string().min(3, { message: "Title is required" }),
  content: z.string().min(10, { message: "Content must be at least 10 characters" }),
  priority: z.string().default("normal"),
  storeId: z.coerce.number().optional().nullable(),
  regionId: z.coerce.number().optional().nullable(),
  isGlobal: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { 
    announcements, 
    isLoading, 
    createAnnouncement,
    isCreating
  } = useAnnouncements();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      priority: "normal",
      storeId: user?.storeId || null,
      regionId: user?.regionId || null,
      isGlobal: false,
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      // If global is selected, clear store and region IDs
      if (data.isGlobal) {
        data.storeId = null;
        data.regionId = null;
      }
      
      await createAnnouncement(data);
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Announcement created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create announcement.",
        variant: "destructive"
      });
    }
  };

  // Watch the isGlobal field to conditionally show/hide other fields
  const isGlobal = form.watch("isGlobal");

  // Filter announcements based on priority or scope
  const filteredAnnouncements = announcements?.filter(announcement => {
    if (filter === "all") return true;
    if (filter === "high") return announcement.priority === "high";
    if (filter === "medium") return announcement.priority === "medium";
    if (filter === "normal") return announcement.priority === "normal";
    if (filter === "global") return announcement.isGlobal;
    if (filter === "regional") return announcement.regionId !== null;
    if (filter === "store") return announcement.storeId !== null;
    return true;
  });

  return (
    <DashboardLayout 
      title="Announcements" 
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Announcements" }
      ]}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Announcements & Communications</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Tabs
                defaultValue="all"
                value={filter}
                onValueChange={setFilter}
                className="w-full sm:w-auto"
              >
                <TabsList className="grid grid-cols-3 sm:grid-cols-7 w-full sm:w-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="high">High</TabsTrigger>
                  <TabsTrigger value="medium">Medium</TabsTrigger>
                  <TabsTrigger value="normal">Normal</TabsTrigger>
                  <TabsTrigger value="global">Global</TabsTrigger>
                  <TabsTrigger value="regional">Regional</TabsTrigger>
                  <TabsTrigger value="store">Store</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {(user?.role === "admin" || user?.role === "regional_manager" || user?.role === "store_manager") && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#D4AF37] hover:bg-[#B89527]">
                      <Plus className="h-4 w-4 mr-2" />
                      New Announcement
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Announcement</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Announcement title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Announcement content" 
                                  className="resize-none min-h-[100px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="normal">Normal</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {user?.role === "admin" && (
                          <FormField
                            control={form.control}
                            name="isGlobal"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Global Announcement</FormLabel>
                                  <div className="text-sm text-gray-500">
                                    This announcement will be visible to all users
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                        
                        {!isGlobal && user?.role === "admin" && (
                          <FormField
                            control={form.control}
                            name="regionId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Region (Optional)</FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                                  defaultValue={field.value?.toString() || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a region" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="">None</SelectItem>
                                    <SelectItem value="1">Midlands</SelectItem>
                                    <SelectItem value="2">London</SelectItem>
                                    <SelectItem value="3">North West</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
                        {!isGlobal && (user?.role === "admin" || user?.role === "regional_manager") && (
                          <FormField
                            control={form.control}
                            name="storeId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Store (Optional)</FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                                  defaultValue={field.value?.toString() || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a store" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="">None</SelectItem>
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
                        )}
                        
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
                            ) : "Create Announcement"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAnnouncements?.length ? (
                filteredAnnouncements.map(announcement => (
                  <div key={announcement.id} className="border rounded-lg p-4">
                    <AnnouncementCard announcement={announcement} expanded />
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500">No announcements found</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
