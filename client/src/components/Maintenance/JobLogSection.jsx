import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Loader2, PlusIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import JobLogsGrid from "@/components/Maintenance/JobLogsGrid";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl
} from "@/components/ui/form";
import { useAuth } from "@/hooks/UseAuth";
import { useStores } from "@/hooks/use-stores";
import { useJobLogs } from "@/hooks/use-joblogs";
import { FileUpload } from "@/components/ui/file-upload";
import { useCategories } from "@/hooks/use-categories";
import { JobLogSchema } from "@/schemas/JobLogSchema";

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
  logTime: z.string()
});

export default function JobLogSection() {
  console.log("📍 Rendering JobLogSection");

  const { user, profile } = useAuth();
  const { stores = [] } = useStores();
  const { categories } = useCategories();
  const [showFullLogs, setShowFullLogs] = useState(false);

  const storeId = ["admin", "regional", "maintenance"].includes(profile?.permissions)
    ? null
    : profile?.store_id;

  const { jobLogs, createJobLog, isCreating } = useJobLogs(storeId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState(undefined);

  const isPrivileged = ["admin", "regional", "maintenance"].includes(profile?.permissions);

  const filteredLogs = useMemo(() => {
    if (!profile) return [];
    if (isPrivileged) {
      if (selectedStoreId) {
        return jobLogs.filter((log) => log.storeId === Number(selectedStoreId));
      }
      return jobLogs;
    }
    return jobLogs.filter((log) => log.storeId === profile.store_id);
  }, [jobLogs, selectedStoreId, profile]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storeId: user?.storeId ?? 1,
      logDate: format(new Date(), "dd MMM yyyy"),
      logTime: format(new Date(), "hh:mmaaa"),
      loggedBy: profile?.name ?? "",
      title: "",
      category: "",
      description: "",
      flag: "normal",
      ImageUpload: [],
      comments: ""
    }
  });

  const onSubmit = async (values) => {
    try {
      await createJobLog({
        ...values,
        user_id: user?.id,
        loggedBy: profile?.name || ""
      });
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
        {isPrivileged && (
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
                <DialogDescription>
                  Fill out the details below to create a new maintenance task.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="loggedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logged By</FormLabel>
                        <FormControl>
                          <input
                            type="text"
                            {...field}
                            readOnly
                            disabled
                            className="w-full border p-2 rounded bg-gray-100 text-gray-500"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="logDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <input
                            type="text"
                            {...field}
                            readOnly
                            className="input w-full border p-2 rounded bg-gray-100"
                          />
                        </FormControl>
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
                          <input
                            type="text"
                            {...field}
                            readOnly
                            className="input w-full border p-2 rounded bg-gray-100"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <input type="text" {...field} className="input w-full border p-2 rounded" />
                        </FormControl>
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
                          <textarea {...field} className="textarea w-full border p-2 rounded" rows={3} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <select {...field} className="select w-full border p-2 rounded">
                            <option value="">Select category</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.name}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="flag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <FormControl>
                          <select {...field} className="select w-full border p-2 rounded">
                            <option value="normal">Normal</option>
                            <option value="long_standing">Long Standing</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ImageUpload"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Upload Images</FormLabel>
                        <FormControl>
                          <FileUpload value={field.value} onChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comments (optional)</FormLabel>
                        <FormControl>
                          <textarea {...field} className="textarea w-full border p-2 rounded" rows={2} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="storeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store</FormLabel>
                        <FormControl>
                          <select {...field} className="select w-full border p-2 rounded">
                            {stores.map((store) => (
                              <option key={store.id} value={store.id}>
                                {store.name}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

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
        {console.log("🧪 Filtered logs:", filteredLogs.length)}
        {filteredLogs.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {isPrivileged
              ? "No maintenance tasks found."
              : "No maintenance tasks found for this location."}
          </p>
        ) : (
          <JobLogsGrid jobLogs={filteredLogs} />
        )}
      </CardContent>
    </Card>
  );
}
