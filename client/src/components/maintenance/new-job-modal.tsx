import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface Store {
  id: number;
  name: string;
}

const formSchema = z.object({
  storeId: z.number().int().positive(),
  description: z.string().min(5, "Description is required and must be at least 5 characters"),
  priority: z.enum(["normal", "medium", "high", "urgent"]),
  comments: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStoreId?: number | null;
}

export function NewJobModal({ isOpen, onClose, defaultStoreId }: NewJobModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date] = useState(new Date().toISOString().split('T')[0]);
  
  // Get stores for the dropdown
  const { data: stores, isLoading: loadingStores } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
  });

  // Setup form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storeId: defaultStoreId || undefined,
      description: "",
      priority: "normal",
      comments: "",
    },
  });

  // When defaultStoreId changes, update the form
  useState(() => {
    if (defaultStoreId) {
      form.setValue('storeId', defaultStoreId);
    }
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (jobData: FormValues) => {
      if (!user) throw new Error("User is not authenticated");
      
      const payload = {
        ...jobData,
        loggedBy: user.id,
        status: "pending",
      };
      
      const res = await apiRequest("POST", "/api/maintenance-jobs", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Job created",
        description: "The maintenance job has been created successfully",
      });
      
      // Invalidate queries to refresh the job list
      if (defaultStoreId) {
        queryClient.invalidateQueries({ queryKey: [`/api/maintenance-jobs?storeId=${defaultStoreId}`] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-jobs'] });
      
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: FormValues) {
    createJobMutation.mutate(values);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#262a38] text-gray-200">
        <DialogHeader>
          <DialogTitle>Create New Job Log</DialogTitle>
          <DialogDescription className="text-gray-400">
            Log a new maintenance job or issue that needs attention.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Store Location */}
            <FormField
              control={form.control}
              name="storeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store Location</FormLabel>
                  <Select
                    disabled={loadingStores || createJobMutation.isPending || !!defaultStoreId}
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-[#2d3142] border-gray-700">
                        <SelectValue placeholder="Select a store" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#2d3142] border-gray-700">
                      {stores?.map((store) => (
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
            
            {/* Date - Display only */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <FormLabel className="block text-sm font-medium">Date</FormLabel>
                <Input 
                  value={date} 
                  disabled 
                  className="bg-[#2d3142] border-gray-700 text-gray-400"
                />
              </div>
            </div>
            
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the maintenance issue"
                      className="bg-[#2d3142] border-gray-700 min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Logged By and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel className="block text-sm font-medium">Logged By</FormLabel>
                <Input 
                  value={user?.fullName || ""} 
                  disabled 
                  className="bg-[#2d3142] border-gray-700 text-gray-400"
                />
              </div>
              
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-[#2d3142] border-gray-700">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#2d3142] border-gray-700">
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Comments */}
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional comments"
                      className="bg-[#2d3142] border-gray-700"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className="border-gray-700 bg-[#1c1f2a] hover:bg-[#262a38] text-gray-200"
                disabled={createJobMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[#d4af37] hover:bg-[#c4a535] text-black"
                disabled={createJobMutation.isPending}
              >
                {createJobMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
