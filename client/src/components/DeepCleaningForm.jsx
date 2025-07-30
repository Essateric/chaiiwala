import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select.jsx';
import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormItem
} from './ui/form.jsx';
import { Button } from './ui/button.jsx';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const formSchema = z.object({
  task: z.string().min(1, "Please select a task"),
  storeId: z.string().min(1, "Please select a store"),
  startTime: z.string(),
  endTime: z.string(),
  anytime: z.boolean()
});

export default function DeepCleaningFormComponent({
  profile,
  stores,
  cleaningTasks,
  selectedDate,
  onSubmit,
  isLoading,
  setIsModalOpen,
}) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task: '',
      storeId: profile?.permissions === 'store'
        ? String(profile?.store_ids?.[0] ?? '')
        : '',
      startTime: '09:00',
      endTime: '10:00',
      anytime: false
    }
  });

  const visibleStores =
    profile?.permissions === 'admin' || profile?.permissions === 'regional'
      ? stores
      : stores.filter(store => profile?.store_ids?.includes(store.id));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        {/* Task Select */}
        <FormField
          control={form.control}
          name="task"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Task</FormLabel>
              <FormControl>
                <Select {...field} onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task" />
                  </SelectTrigger>
                  <SelectContent>
                    {cleaningTasks.length === 0 ? (
                      <SelectItem value="none" disabled>No tasks available</SelectItem>
                    ) : (
                      cleaningTasks.map((task) => (
                        <SelectItem key={task.id} value={task.dc_task}>
                          {task.dc_task}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              {fieldState.error && (
                <p className="text-sm text-red-500">{fieldState.error.message}</p>
              )}
            </FormItem>
          )}
        />

        {/* Store Select - Admin & Regional Only */}
        {(profile?.permissions === 'admin' || profile?.permissions === 'regional') && (
          <FormField
            control={form.control}
            name="storeId"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Store Location</FormLabel>
                <FormControl>
                  <Select {...field} onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a store" />
                    </SelectTrigger>
                    <SelectContent>
                      {visibleStores.map((store) => (
                        <SelectItem key={store.id} value={String(store.id)}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                {fieldState.error && (
                  <p className="text-sm text-red-500">{fieldState.error.message}</p>
                )}
              </FormItem>
            )}
          />
        )}

        {/* Anytime checkbox */}
        <FormField
          control={form.control}
          name="anytime"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  id="anytime-checkbox"
                />
              </FormControl>
              <FormLabel htmlFor="anytime-checkbox" className="!mb-0">
                Task can be done anytime (no specific time)
              </FormLabel>
            </FormItem>
          )}
        />

        {/* Time pickers */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <input
                    type="time"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...field}
                    disabled={form.watch('anytime')}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <input
                    type="time"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...field}
                    disabled={form.watch('anytime')}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsModalOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-chai-gold hover:bg-yellow-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...
              </>
            ) : (
              'Schedule Task'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
