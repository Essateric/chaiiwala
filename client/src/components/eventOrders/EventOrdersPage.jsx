import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/UseAuth.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card.jsx";
import EventOrderTable from "./EventOrderTable.jsx";
import EventOrderFormDialog from "./EventOrderFormDialog.jsx";
import StatusModal from "./StatusModal.jsx";
import { useEventOrders } from "../../hooks/use-event-orders.jsx";
import { useStores } from "../../hooks/use-stores.jsx";
import { Button } from "../../components/ui/button.jsx";
import { CalendarDays } from "lucide-react";
import DashboardLayout from "../layout/DashboardLayout.jsx";
import { toast } from "sonner";

const ALLOWED_ROLES = ["admin", "regional", "area", "store"];

export default function EventOrdersPage() {
  const { profile, isLoading: isLoadingAuth } = useAuth();
  const { stores = [] } = useStores();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const { eventOrders, isLoading, error, updateEventOrder, refetch } = useEventOrders();

  const canCreateOrder = ALLOWED_ROLES.includes(profile?.permissions);

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
        <p className="ml-2">Loading user data...</p>
      </div>
    );
  }

  if (!profile || !canCreateOrder) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  // -- CREATE event order, then refetch and show toast --
  async function handleCreateEventOrder(formData) {
    if (!canCreateOrder) {
      toast.error("You do not have permission to add event orders.");
      return;
    }
    const data = {
      store_id: Number(formData.storeId),
      event_date: formData.eventDate,
      event_time: formData.eventTime,
      venue: formData.venue,
      product: formData.product,
      quantity: Number(formData.quantity),
      booking_date: formData.bookingDate,
      booking_time: formData.bookingTime,
      customer_name: formData.customerName,
      customer_phone: formData.customerPhone,
      customer_email: formData.customerEmail || null,
      emergency_contact: formData.emergencyContact || null,
      payment_status: formData.paymentStatus,
      booked_by: formData.bookedBy,
      status: formData.status,
      notes: formData.notes || null,
    };
    const { error } = await supabase.from("event_orders").insert([data]);
    if (error) {
      toast.error("Error creating event order: " + error.message);
      return;
    }
    setIsFormOpen(false);
    toast.success("Event order has been added successfully!");
    refetch(); // This triggers a reload of the event orders.
  }

  // -- Update event order (status, payment, comment) --
  async function handleStatusChangeWithComment(orderId, newStatus, comment, paymentStatus) {
    try {
      // Prepare the update fields
      const updateData = {
        status: newStatus,
        payment_status: paymentStatus,
        event_comment: comment,
      };

      // If status is completed, set completed_by and completed_at
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = profile?.name || profile?.first_name || profile?.email || "Unknown";
      } else {
        updateData.completed_at = null;
        updateData.completed_by = null;
      }

      await updateEventOrder({
        id: orderId,
        data: updateData
      });

      setStatusModalOpen(false); // Close modal
      // Auto-refresh is handled by TanStack Query
      toast.success("Order status updated.");
    } catch (error) {
      toast.error("Failed to update status: " + error.message);
    }
  }


  return (
    <DashboardLayout title="Event Orders">
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CalendarDays className="w-6 h-6 text-chai-gold" />
                Event Orders
              </CardTitle>
              <CardDescription>View, create, and manage all event orders here.</CardDescription>
            </div>
            {canCreateOrder && (
              <Button
                onClick={() => setIsFormOpen(true)}
                className="mt-4 md:mt-0 bg-chai-gold hover:bg-yellow-700"
              >
                + New Event Order
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-red-500 p-4 text-center">
                Failed to load event orders. Try refreshing the page.
              </div>
            )}
            {isLoading && (
              <div className="flex justify-center items-center p-8">
                <span className="loader mr-2"></span>
                Loading event orders...
              </div>
            )}
            {!isLoading && !error && (
              <EventOrderTable
                profile={profile}
                eventOrders={eventOrders}
                onOpenStatusModal={order => {
                  setSelectedOrder(order);
                  setStatusModalOpen(true);
                }}
              />
            )}
          </CardContent>
        </Card>
        {canCreateOrder && (
          <EventOrderFormDialog
            isFormOpen={isFormOpen}
            setIsFormOpen={setIsFormOpen}
            profile={profile}
            stores={stores}
            onSubmit={handleCreateEventOrder}
          />
        )}
        <StatusModal
          open={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          order={selectedOrder}
          onSubmit={handleStatusChangeWithComment}
        />
      </div>
    </DashboardLayout>
  );
}
