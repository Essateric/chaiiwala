import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AnnouncementCard from "@/components/announcements/announcement-card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: Date;
  category: string;
  important: boolean;
  likes: number;
}

export default function AnnouncementsPage() {
  const [showAddAnnouncementDialog, setShowAddAnnouncementDialog] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { toast } = useToast();
  const { user } = useAuth();

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    category: "general",
    important: false
  });

  // Fetch announcements
  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  // Filter announcements based on category
  const filteredAnnouncements = categoryFilter === "all" 
    ? announcements 
    : announcements.filter(announcement => announcement.category === categoryFilter);

  // Like announcement mutation
  const likeAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/announcements/${id}/like`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to like announcement: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Add announcement mutation
  const addAnnouncementMutation = useMutation({
    mutationFn: async (data: typeof newAnnouncement) => {
      const res = await apiRequest("POST", "/api/announcements", {
        ...data,
        author: user?.name || "Unknown"
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/recent"] });
      setShowAddAnnouncementDialog(false);
      setNewAnnouncement({
        title: "",
        content: "",
        category: "general",
        important: false
      });
      toast({
        title: "Announcement Created",
        description: "Your announcement has been posted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create announcement: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleLikeAnnouncement = (id: string) => {
    likeAnnouncementMutation.mutate(id);
  };

  const handleAddAnnouncement = () => {
    setShowAddAnnouncementDialog(true);
  };

  const submitNewAnnouncement = () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    addAnnouncementMutation.mutate(newAnnouncement);
  };

  return (
    <DashboardLayout title="Announcements">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-montserrat font-bold mb-1">Announcements and Communications</h2>
          <p className="text-gray-600">Important updates and communications for all team members</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'regional' || user?.role === 'store') && (
          <div className="mt-4 md:mt-0">
            <Button className="bg-chai-gold hover:bg-yellow-600" onClick={handleAddAnnouncement}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Post Announcement
            </Button>
          </div>
        )}
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-full sm:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="product">Product Updates</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="hr">HR & Staff</SelectItem>
                <SelectItem value="promotion">Promotions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-500">
            Showing {filteredAnnouncements.length} announcements
          </div>
        </div>
      </div>
      
      {/* Announcements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAnnouncements.length === 0 ? (
          <div className="col-span-full p-8 bg-white rounded-lg shadow text-center">
            <p className="text-gray-500 mb-4">No announcements found</p>
          </div>
        ) : (
          filteredAnnouncements.map(announcement => (
            <AnnouncementCard
              key={announcement.id}
              id={announcement.id}
              title={announcement.title}
              content={announcement.content}
              author={announcement.author}
              date={announcement.date}
              category={announcement.category}
              important={announcement.important}
              likes={announcement.likes}
              onLike={handleLikeAnnouncement}
            />
          ))
        )}
      </div>
      
      {/* Create Announcement Dialog */}
      <Dialog open={showAddAnnouncementDialog} onOpenChange={setShowAddAnnouncementDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Post New Announcement</DialogTitle>
            <DialogDescription>
              Create a new announcement to share with the team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Announcement Title</Label>
              <Input
                id="title"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                placeholder="Enter announcement title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                placeholder="Enter announcement content"
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={newAnnouncement.category} 
                  onValueChange={(value) => setNewAnnouncement({...newAnnouncement, category: value})}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="product">Product Updates</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="hr">HR & Staff</SelectItem>
                    <SelectItem value="promotion">Promotions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end space-x-2 mb-2">
                <Checkbox 
                  id="important"
                  checked={newAnnouncement.important}
                  onCheckedChange={(checked) => 
                    setNewAnnouncement({...newAnnouncement, important: !!checked})
                  }
                />
                <Label htmlFor="important" className="text-base">
                  Mark as Important
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAnnouncementDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-chai-gold hover:bg-yellow-600" 
              onClick={submitNewAnnouncement}
              disabled={addAnnouncementMutation.isPending}
            >
              {addAnnouncementMutation.isPending ? "Posting..." : "Post Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
