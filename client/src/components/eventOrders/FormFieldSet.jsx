import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import DatePickerField from "./DatePickerField";

export default function FormFieldSet({ form, profile, stores }) {
  const isAreaManager = profile?.role === "area";
  const showStoreField = ["admin", "regional", "area"].includes(profile?.role);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {showStoreField && (
        <FormField
          control={form.control}
          name="storeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Store*</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString() || ""}
                disabled={isAreaManager && (!profile.store_ids || profile.store_ids.length === 0)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Store" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {stores.map((store) => {
                    if (isAreaManager && !profile.store_ids?.includes(store.id)) return null;
                    return (
                      <SelectItem key={store.id} value={store.id.toString()}>
                        {store.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
                {isAreaManager && (!profile.store_ids || profile.store_ids.length === 0) && (
                  <FormDescription>No stores allocated to select.</FormDescription>
                )}
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <DatePickerField form={form} name="eventDate" label="Event Date*" />

      <FormField
        control={form.control}
        name="eventTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Event Time*</FormLabel>
            <FormControl>
              <Input className="bg-white" type="time" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="venue"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Venue*</FormLabel>
            <FormControl>
              <Input className="bg-white" placeholder="Venue address/location" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="product"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product/Service*</FormLabel>
            <FormControl>
              <Input className="bg-white" placeholder="Food/beverage service description" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="quantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Quantity*</FormLabel>
            <FormControl>
              <Input
                type="number"
                className="bg-white"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="customerName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Customer Name*</FormLabel>
            <FormControl>
              <Input className="bg-white" placeholder="Customer name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="customerPhone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Customer Phone*</FormLabel>
            <FormControl>
              <Input className="bg-white" type="tel" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="customerEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Customer Email</FormLabel>
            <FormControl>
              <Input className="bg-white" type="email" {...field} />
            </FormControl>
            <FormDescription>Optional</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="emergencyContact"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Emergency Contact</FormLabel>
            <FormControl>
              <Input className="bg-white" type="tel" {...field} />
            </FormControl>
            <FormDescription>Optional</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="paymentStatus"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Payment Status*</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="bg-white" >
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
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
            <FormLabel>Status*</FormLabel>
            <Select onValueChange={field.onChange} defaultValue="pending" disabled>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>New orders always start as Pending</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Notes <FormDescription>(Optional)</FormDescription></FormLabel>
            <FormControl>
              <Textarea placeholder="Any special requirements or additional info" className="resize-none bg-white" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
