import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select.jsx';
import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormItem
} from '../ui/form.jsx';
import { Button } from '../ui/button.jsx';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const REASONS = ['Sick', 'Holiday', 'Emergency', 'Personal', 'No Show', 'Other'];

const formSchema = z
  .object({
    staffName: z.string().min(1, "Please enter the staff member's name"),
    reporterName: z.string().min(1, "Please enter the reporting manager's name"),
    storeId: z.string().min(1, 'Please select a store'),
    startDate: z.string().min(1, 'Please choose a start date'),
    daysAbsent: z.coerce.number().int().min(1, 'Days absent must be at least 1'),
    reason: z.string().min(1, 'Please select a reason'),
    reasonOther: z.string().optional()
  })
  .refine(
    (data) =>
      data.reason !== 'Other' ||
      (data.reasonOther && data.reasonOther.trim().length > 0),
    { path: ['reasonOther'], message: 'Please type the reason' }
  );

export default function StaffAbsenceFormComponent({
  profile,
  stores,
  onSubmit,
  isLoading,
  setIsModalOpen
}) {
  const defaultReporter =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.email?.split('@')[0] ||
    '';

  const defaultStoreId =
    profile?.permissions === 'store'
      ? String(profile?.store_ids?.[0] ?? '')
      : '';

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      staffName: '',
      reporterName: defaultReporter,
      storeId: defaultStoreId,
      startDate: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
      daysAbsent: 1,
      reason: '',
      reasonOther: ''
    }
  });

  const visibleStores =
    profile?.permissions === 'admin' || profile?.permissions === 'regional'
      ? stores
      : stores.filter((store) => profile?.store_ids?.includes(store.id));

  const reasonValue = form.watch('reason');

  // shared input styles: white field + black text
  const inputClass =
    'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/20';

  const selectTriggerClass =
    'bg-white text-black border border-gray-300';

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-gray-800 bg-[#171a23] shadow-lg">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Record Staff Absence</h2>
          <p className="mt-1 text-sm text-gray-400">
            Fill in the details below and press <span className="text-white">Record Absence</span>.
          </p>
        </div>

        <div className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Row 1: Staff + Reporter */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="staffName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-white">Staff Member</FormLabel>
                      <FormControl>
                        <input
                          type="text"
                          placeholder="Enter staff member's name"
                          className={inputClass}
                          {...field}
                        />
                      </FormControl>
                      {fieldState.error && (
                        <p className="text-sm text-red-500">{fieldState.error.message}</p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reporterName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-white">Reporting Manager</FormLabel>
                      <FormControl>
                        <input
                          type="text"
                          placeholder="Enter your name"
                          className={inputClass}
                          {...field}
                        />
                      </FormControl>
                      {fieldState.error && (
                        <p className="text-sm text-red-500">{fieldState.error.message}</p>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 2: Store (only admin/regional) */}
              {(profile?.permissions === 'admin' || profile?.permissions === 'regional') && (
                <div className="grid grid-cols-1">
                  <FormField
                    control={form.control}
                    name="storeId"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-white">Store Location</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className={selectTriggerClass}>
                              <SelectValue placeholder="Select a store" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {visibleStores.map((store) => (
                              <SelectItem key={store.id} value={String(store.id)}>
                                {store.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldState.error && (
                          <p className="text-sm text-red-500">{fieldState.error.message}</p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Row 3: Start date + Days absent */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-white">Start Date</FormLabel>
                      <FormControl>
                        <input type="date" className={inputClass} {...field} />
                      </FormControl>
                      {fieldState.error && (
                        <p className="text-sm text-red-500">{fieldState.error.message}</p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="daysAbsent"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-white">Days Absent</FormLabel>
                      <FormControl>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          placeholder="1"
                          className={inputClass}
                          {...field}
                        />
                      </FormControl>
                      {fieldState.error && (
                        <p className="text-sm text-red-500">{fieldState.error.message}</p>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 4: Reason + (Other) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-white">Reason</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REASONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && (
                        <p className="text-sm text-red-500">{fieldState.error.message}</p>
                      )}
                    </FormItem>
                  )}
                />

                {reasonValue === 'Other' && (
                  <FormField
                    control={form.control}
                    name="reasonOther"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-white">Please specify</FormLabel>
                        <FormControl>
                          <input
                            type="text"
                            placeholder="Type the reason"
                            className={inputClass}
                            {...field}
                          />
                        </FormControl>
                        {fieldState.error && (
                          <p className="text-sm text-red-500">{fieldState.error.message}</p>
                        )}
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
                {typeof setIsModalOpen === 'function' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-chai-gold hover:bg-yellow-600"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Record Absence'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
