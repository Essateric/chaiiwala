import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { EventOrderSchema } from "@/schemas/EventOrderSchema";
import FormFieldSet from "./FormFieldSet";

export default function EventOrderFormDialog({
  isFormOpen,
  setIsFormOpen,
  profile,
  stores,
  onSubmit,
  isCreating
}) {
  const form = useForm({
    resolver: zodResolver(EventOrderSchema),
  });

  // Choose allowed store(s) for the user
  const storeOptions =
    profile?.permissions === "admin" || profile?.permissions === "regional"
      ? stores // All stores for admin/regional
      : stores.filter(store =>
          Array.isArray(profile?.store_ids)
            ? profile.store_ids.includes(store.id)
            : false
        );

  React.useEffect(() => {
    if (isFormOpen) {
      const defaultStoreId =
        Array.isArray(profile?.store_ids) && profile.store_ids.length > 0
          ? profile.store_ids[0]
          : "";

      form.reset({
        storeId: defaultStoreId,
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
        bookedBy: profile?.name || "",
        emergencyContact: "",
        paymentStatus: "unpaid",
        status: "pending",
        notes: "",
      });
    }
  }, [isFormOpen, profile, form.reset]);

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event Order</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new event order. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <FormFieldSet form={form} profile={profile} stores={stores} />
    <div className="flex justify-end">
      <Button type="submit" disabled={isCreating}>
        {isCreating ? "Creating..." : "Create Event Order"}
      </Button>
    </div>
  </form>
</Form>
      </DialogContent>
    </Dialog>
  );
}
