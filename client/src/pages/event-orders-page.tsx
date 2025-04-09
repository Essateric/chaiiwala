import React, { useState, useEffect } from "react";
import { useEventOrders } from "@/hooks/use-event-orders";
import { useStores } from "@/hooks/use-stores";
import { useAuth } from "@/hooks/use-auth";
import { EventOrder, InsertEventOrder, eventStatusEnum } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Loader2, CalendarIcon, PlusCircle, Calendar, AlertCircle, Filter } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { insertEventOrderSchema } from "@shared/schema";

// Extended schema for the form with client-side validation
const eventOrderFormSchema = insertEventOrderSchema
  .extend({
    // Additional zod validations for the form
    eventDate: z.string().min(1, "Event date is required"),
    eventTime: z.string().min(1, "Event time is required"),
    venue: z.string().min(3, "Venue must be at least 3 characters"),
    product: z.string().min(3, "Product description required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    customerName: z.string().min(3, "Customer name is required"),
    customerPhone: z.string().min(8, "Valid phone number is required"),
    customerEmail: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional(),
  });

// Date formatter helper
const formatDateTime = (dateStr: string, timeStr: string) => {
  if (!dateStr) return "";
  
  try {
    // Combine date and time strings (e.g., "2025-04-20" and "17:30")
    const combinedDateTimeStr = `${dateStr}T${timeStr || "00:00"}`;
    const date = new Date(combinedDateTimeStr);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return `${dateStr} ${timeStr || ""}`;
    }
    
    // Format: ddd Do MMM YYYY HH:mm (e.g., "Sun 20th Apr 2025 17:30")
    return format(date, "EEE do MMM yyyy HH:mm", { locale: enUS });
  } catch (error) {
    console.error("Error formatting date:", error);
    return `${dateStr} ${timeStr || ""}`;
  }
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles = {
    pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    confirmed: "bg-green-100 text-green-800 hover:bg-green-200",
    completed: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    cancelled: "bg-red-100 text-red-800 hover:bg-red-200",
  };

  const style = statusStyles[status as keyof typeof statusStyles] || statusStyles.pending;

  return (
    <Badge className={style} variant="outline">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

// Date picker component
const DatePickerField = ({ form, name, label }: { form: any; name: string; label: string }) => {
  const [date, setDate] = useState<Date | undefined>(undefined);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={`w-full pl-3 text-left font-normal ${
                    !field.value ? "text-muted-foreground" : ""
                  }`}
                >
                  {field.value ? (
                    format(new Date(field.value), "PPP", { locale: enUS })
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={field.value ? new Date(field.value) : undefined}
                onSelect={(date) => {
                  const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
                  field.onChange(formattedDate);
                  setDate(date);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

// Main component
export default function EventOrdersPage() {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterStoreId, setFilterStoreId] = useState<number | undefined>(
    user?.role === "store" ? user?.storeId || undefined : undefined
  );
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  // Get event orders using our hook, passing the filterStoreId so it can properly update the cache
  const { eventOrders: fetchedEventOrders, isLoading, error, createEventOrder, updateEventOrder, isCreating, isUpdating } = useEventOrders(filterStoreId);
  
  // Create a state variable to track orders with locally updated status for immediate UI feedback
  const [eventOrders, setEventOrders] = useState<EventOrder[]>([]);
  
  // Sync eventOrders state with fetched data whenever it changes
  useEffect(() => {
    if (fetchedEventOrders) {
      setEventOrders(fetchedEventOrders);
    }
  }, [fetchedEventOrders]);
  
  // Get stores for the store selection dropdown
  const { stores = [], isLoading: isLoadingStores } = useStores();
  
  // Create the form
  const form = useForm<z.infer<typeof eventOrderFormSchema>>({
    resolver: zodResolver(eventOrderFormSchema),
    defaultValues: {
      storeId: user?.role === "store" ? user?.storeId || 0 : 0,
      eventDate: "",
      eventTime: "",
      venue: "",
      product: "",
      quantity: 0,
      bookingDate: format(new Date(), "yyyy-MM-dd"),
      bookingTime: format(new Date(), "HH:mm"),
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      bookedBy: user?.name || "",
      status: "pending",
      notes: "",
    },
  });
  
  // Update form when user changes or when filterStoreId changes
  useEffect(() => {
    // If user is a store manager, set their store ID in the form
    if (user?.role === "store" && user?.storeId) {
      form.setValue("storeId", user.storeId);
    }
    
    // Reset form when creating a new event order
    if (!isFormOpen) {
      // Set the bookedBy and current time/date when opening the form
      form.setValue("bookingDate", format(new Date(), "yyyy-MM-dd"));
      form.setValue("bookingTime", format(new Date(), "HH:mm"));
      form.setValue("bookedBy", user?.name || "");
    }
  }, [user, isFormOpen, form]);

  // Filter event orders based on selected filters
  const filteredEventOrders = eventOrders.filter((order) => {
    let include = true;
    
    if (filterStoreId !== undefined) {
      include = include && order.storeId === filterStoreId;
    }
    
    if (filterStatus) {
      include = include && order.status === filterStatus;
    }
    
    return include;
  });

  // Handle form submission
  async function onSubmit(values: z.infer<typeof eventOrderFormSchema>) {
    try {
      console.log("Submitting event order form:", values);
      
      // Create the event order
      const newOrder = await createEventOrder(values);
      console.log("New order returned:", newOrder);
      
      // Update our local state immediately
      setEventOrders(currentOrders => [...currentOrders, newOrder]);
      
      // Also update the query cache for consistency
      queryClient.setQueryData<EventOrder[]>(["/api/event-orders"], (oldData = []) => {
        console.log("Directly updating event orders list in page component:", [...oldData, newOrder]);
        return [...oldData, newOrder];
      });
      
      // If we're filtering by store, also update that query data
      if (filterStoreId) {
        queryClient.setQueryData<EventOrder[]>(
          ["/api/event-orders", "store", filterStoreId], 
          (oldData = []) => [...oldData, newOrder]
        );
      }
      
      // Close the form and reset
      setIsFormOpen(false);
      form.reset();
    } catch (error) {
      console.error("Failed to create event order:", error);
    }
  }

  // Handle status change
  async function handleStatusChange(orderId: number, newStatus: string) {
    try {
      // Optimistically update the UI immediately
      const statusType = newStatus as "pending" | "confirmed" | "completed" | "cancelled";
      
      // Update our local state immediately for a responsive UI
      setEventOrders(currentOrders => 
        currentOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: statusType } 
            : order
        )
      );
      
      // Also update the query cache for consistency
      queryClient.setQueryData(["/api/event-orders"], (oldData: EventOrder[] = []) => {
        return oldData.map(order => 
          order.id === orderId 
            ? { ...order, status: statusType } 
            : order
        );
      });
      
      // If we're filtering by store, also update that query data
      if (filterStoreId) {
        queryClient.setQueryData(
          ["/api/event-orders", "store", filterStoreId], 
          (oldData: EventOrder[] = []) => {
            return oldData.map(order => 
              order.id === orderId 
                ? { ...order, status: statusType } 
                : order
            );
          }
        );
      }
      
      // Make the actual API call to persist the change
      await updateEventOrder({ 
        id: orderId, 
        data: { status: statusType } 
      });
    } catch (error) {
      console.error("Failed to update event order status:", error);
      // Revert to original data on error
      queryClient.invalidateQueries({ queryKey: ["/api/event-orders"] });
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Event Orders">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Event Orders">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center p-6">
              <AlertCircle className="h-10 w-10 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Failed to load event orders</h3>
              <p className="text-muted-foreground mt-2">
                Please try refreshing the page or contact support if the problem persists.
              </p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Event Orders">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {/* Store Filter */}
            {(user?.role === "admin" || user?.role === "regional") && (
              <Select
                value={filterStoreId?.toString() || "all"}
                onValueChange={(value) => {
                  setFilterStoreId(value === "all" ? undefined : parseInt(value));
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id.toString()}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Status Filter */}
            <Select
              value={filterStatus || "all"}
              onValueChange={(value) => {
                setFilterStatus(value === "all" ? undefined : value);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  <span>Status</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Create New Event Order Button */}
          {(user?.role === "admin" || user?.role === "regional" || user?.role === "store") && (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Event Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Event Order</DialogTitle>
                  <DialogDescription>
                    Fill in the details to create a new event order. Fields marked with * are required.
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Store Selection - for admin and regional managers only */}
                      {(user?.role === "admin" || user?.role === "regional") && (
                        <FormField
                          control={form.control}
                          name="storeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Store*</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value.toString()}
                                defaultValue={field.value.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Store" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {stores.map((store) => (
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

                      {/* Event Date */}
                      <DatePickerField form={form} name="eventDate" label="Event Date*" />

                      {/* Event Time */}
                      <FormField
                        control={form.control}
                        name="eventTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Time*</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Venue */}
                      <FormField
                        control={form.control}
                        name="venue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Venue*</FormLabel>
                            <FormControl>
                              <Input placeholder="Venue address/location" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Product */}
                      <FormField
                        control={form.control}
                        name="product"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product/Service*</FormLabel>
                            <FormControl>
                              <Input placeholder="Food/beverage service description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Quantity */}
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity*</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Customer Name */}
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name*</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Customer Phone */}
                      <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Phone*</FormLabel>
                            <FormControl>
                              <Input type="tel" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Customer Email */}
                      <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormDescription>Optional</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Status */}
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status*</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any special requirements or additional information"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>Optional - Include any special requirements</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Order Creator Information */}
                    <div className="bg-secondary/30 p-4 rounded-md mb-4">
                      <h3 className="text-sm font-semibold mb-2">Order Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium mb-1 block">Created By</span>
                          <div className="text-sm mt-1">
                            {user?.name || "Unknown User"}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm font-medium mb-1 block">Date & Time</span>
                          <div className="text-sm mt-1">
                            {format(new Date(), "PPP", { locale: enUS })} at {format(new Date(), "h:mm a")}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Hidden fields for form submission */}
                    <input type="hidden" {...form.register("bookingDate")} />
                    <input type="hidden" {...form.register("bookingTime")} />
                    <input type="hidden" {...form.register("bookedBy")} />

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Event Order
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Event Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Event Orders</CardTitle>
            <CardDescription>
              Manage upcoming and past events for Chaiiwala catering services
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEventOrders.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No event orders found</h3>
                <p className="text-muted-foreground mt-2">
                  {filterStoreId || filterStatus
                    ? "Try adjusting your filters to see more results."
                    : "Create a new event order to get started."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Date</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Booked By</TableHead>
                      <TableHead className="text-right">Update Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEventOrders.map((order) => {
                      const store = stores.find((s) => s.id === order.storeId);
                      
                      return (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {formatDateTime(order.eventDate, order.eventTime)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{order.venue}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.customerName}</div>
                              <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                            </div>
                          </TableCell>
                          <TableCell>{order.product}</TableCell>
                          <TableCell>{order.quantity}</TableCell>
                          <TableCell>
                            <StatusBadge status={order.status} />
                          </TableCell>
                          <TableCell>{store?.name || `Store ${order.storeId}`}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.bookedBy}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDateTime(order.bookingDate, order.bookingTime)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {/* Status Update Dropdown */}
                            {(user?.role === "admin" || user?.role === "regional" || 
                             (user?.role === "store" && user.storeId === order.storeId)) && (
                              <Select
                                value={order.status}
                                onValueChange={(value) => handleStatusChange(order.id, value)}
                                disabled={isUpdating}
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue placeholder="Change Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}