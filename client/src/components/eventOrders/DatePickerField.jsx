import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

export default function DatePickerField({ form, name, label }) {
  // Set "today" (midnight, so only today and future are allowed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
                  variant="outline"
                  className={`w-full bg-white pl-3 text-left font-normal ${
                    !field.value ? "text-muted-foreground" : ""
                  }`}
                >
                  {field.value
                    ? format(new Date(field.value), "PPP")
                    : <span>Pick a date</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
       <Calendar
  mode="single"
  selected={field.value ? new Date(field.value) : undefined}
  onSelect={(date) => {
    const formatted = date ? format(date, "yyyy-MM-dd") : "";
    field.onChange(formatted);
  }}
  initialFocus
  fromDate={today}    // <---- THIS IS IMPORTANT!
/>

            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
