import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Loader2, PlusIcon, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/UseAuth";
import { useStores } from "@/hooks/use-stores";
import { useJobLogs } from "@/hooks/use-joblogs";
import { FileUpload } from "@/components/ui/file-upload";
import { useCategories } from "@/hooks/use-categories";
import { JobLogSchema } from "@/schemas/JobLogSchema";
import { useDrag } from "react-dnd";

const formSchema = JobLogSchema.extend({
  storeId: z.number(),
  title: z.string().min(3),
  description: z.string().min(5),
  category: z.string(),
  flag: z.enum(["normal", "long_standing", "urgent"]),
  ImageUpload: z.array(z.string()).default([]),
  comments: z.string().nullable().optional(),
  loggedBy: z.string(),
  logDate: z.string(),
  logTime: z.string(),
});

export default function JobLogsSection() {
  const { user, profile } = useAuth();
  console.log("👤 profile from useAuth:", profile);

  const { stores = [] } = useStores();
  const { categories } = useCategories();

  const storeId = ["admin", "regional", "maintenance"].includes(profile?.permissions)
    ? null
    : profile?.store_id;

  const { jobLogs, createJobLog, isCreating } = useJobLogs(storeId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState(undefined);

    const filteredLogs = useMemo(() => {
      if (!profile) return [];

      if (["admin", "regional", "maintenance"].includes(profile?.permissions)) {
        return jobLogs;
      }
      const currentStoreId = selectedStoreId ?? profile?.store_id;
      return jobLogs.filter((log) => log.storeId === currentStoreId);
    }, [jobLogs, selectedStoreId, profile?.permissions, profile?.store_id]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storeId: user?.storeId ?? 1,
      logDate: format(new Date(), "dd MMM yyyy"),
      logTime: format(new Date(), "hh:mmaaa"),
      title: "",
      category: "",
      description: "",
      loggedBy: user?.name ?? "",
      flag: "normal",
      ImageUpload: [],
      comments: "",
    },
  });

  const onSubmit = async (values) => {
    try {
      await createJobLog(values);
      form.reset();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error creating job log:", error.message || error);
    }
  };
  

  if (!profile) {
    return (
      <Card className="mt-6 p-6">
        <p className="text-sm text-muted-foreground">Loading maintenance tasks...</p>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex justify-between items-center">
        <div>
          <CardTitle>Maintenance Tasks</CardTitle>
          <CardDescription>View and create maintenance tasks</CardDescription>
        </div>
        {["admin", "regional"].includes(profile?.permissions) && (
          <Select onValueChange={(val) => setSelectedStoreId(val === "all" ? undefined : parseInt(val))}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="Filter by store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={String(store.id)}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex justify-end mb-4">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" /> Create Maintenance Task
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Maintenance Task</DialogTitle>
                <DialogDescription>Fill out the details below to create a new maintenance task.</DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Form fields omitted for brevity */}

                  <DialogFooter>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin bg-white" />}
                      Submit
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {filteredLogs.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {["admin", "regional", "maintenance"].includes(profile?.permissions)
              ? "No maintenance tasks found."
              : "No maintenance tasks found for this location."}
          </p>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="border p-4 mb-2 rounded shadow-sm">
              <strong>{log.title}</strong>
              <p>{log.description}</p>
              <p className="text-sm text-muted-foreground">{log.logDate} at {log.logTime}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
