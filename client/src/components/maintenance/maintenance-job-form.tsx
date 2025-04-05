import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { insertMaintenanceJobSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Extend schema to make sure we have proper client-side validation
const maintenanceJobFormSchema = insertMaintenanceJobSchema.extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

type MaintenanceJobFormValues = z.infer<typeof maintenanceJobFormSchema>;

interface MaintenanceJobFormProps {
  storeId: number;
  onSuccess: () => void;
}

export default function MaintenanceJobForm({ storeId, onSuccess }: MaintenanceJobFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scheduleMaintenance, setScheduleMaintenance] = useState(false);
  
  const form = useForm<MaintenanceJobFormValues>({
    resolver: zodResolver(maintenanceJobFormSchema),
    defaultValues: {
      storeId,
      title: "",
      description: "",
      priority: "normal",
      status: "open",
      reportedBy: user?.id,
      comments: "",
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (values: MaintenanceJobFormValues) => {
      const res = await apiRequest("POST", "/api/maintenance", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Job created",
        description: "Maintenance job has been created successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to create job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MaintenanceJobFormValues) => {
    createJobMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue Title</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Brief description of the issue" 
                  className="bg-dark border-gray-700"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Detailed Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the maintenance issue in detail" 
                  className="bg-dark border-gray-700 min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="bg-dark border-gray-700">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-dark-secondary border-gray-700">
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="bg-dark border-gray-700">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-dark-secondary border-gray-700">
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <input 
            type="checkbox" 
            id="schedule" 
            className="h-4 w-4 rounded border-gray-700 bg-dark text-gold"
            checked={scheduleMaintenance}
            onChange={() => setScheduleMaintenance(!scheduleMaintenance)}
          />
          <label htmlFor="schedule" className="text-sm text-gray-300">Schedule maintenance for a future date</label>
        </div>
        
        {scheduleMaintenance && (
          <FormField
            control={form.control}
            name="scheduledDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled Date</FormLabel>
                <FormControl>
                  <Input 
                    type="datetime-local" 
                    className="bg-dark border-gray-700"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Comments</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any additional information" 
                  className="bg-dark border-gray-700"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            className="border-gray-700"
            onClick={onSuccess}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-gold hover:bg-gold-dark text-dark font-medium"
            disabled={createJobMutation.isPending}
          >
            {createJobMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
