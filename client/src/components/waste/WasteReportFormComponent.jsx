// /src/components/waste/WasteReportFormComponent.jsx
import React from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select.jsx';
import {
  Form, FormControl, FormField, FormLabel, FormItem
} from '../ui/form.jsx';
import { Button } from '../ui/button.jsx';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const CATEGORIES = ['Food', 'Beverage', 'Packaging', 'Cleaning', 'Other'];
const UNITS = ['kg', 'g', 'L', 'ml', 'units'];
const REASONS = ['Expired', 'Damaged', 'Spoilage', 'Prep Waste', 'Customer Return', 'Other'];

const formSchema = z.object({
  reporterName: z.string().min(1, "Please enter the reporting manager's name"),
  storeId: z.string().min(1, 'Please select a store'),
  reportDate: z.string().min(1, 'Please choose a date'),
  itemName: z.string().min(1, 'Please enter the item name'),
  category: z.string().min(1, 'Please select a category'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Please select a unit'),
  reason: z.string().min(1, 'Please select a reason'),
  reasonOther: z.string().optional()
}).refine(
  (d) => d.reason !== 'Other' || (d.reasonOther && d.reasonOther.trim().length > 0),
  { path: ['reasonOther'], message: 'Please type the reason' }
);

function WasteReportFormComponent({
  profile,
  stores,
  onSubmit,
  isLoading,
  setIsModalOpen
}) {
  const defaultReporter =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.email?.split('@')[0] || '';

  const defaultStoreId =
    profile?.permissions === 'store'
      ? String(profile?.store_ids?.[0] ?? '')
      : '';

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reporterName: defaultReporter,
      storeId: defaultStoreId,
      reportDate: new Date().toISOString().slice(0, 10),
      itemName: '',
      category: '',
      quantity: 1,
      unit: '',
      reason: '',
      reasonOther: ''
    }
  });

  const canChooseStore = profile?.permissions === 'admin' || profile?.permissions === 'regional';
  const visibleStores = canChooseStore
    ? stores
    : stores.filter(s => profile?.store_ids?.includes(s.id));

  const reasonValue = form.watch('reason');

  const inputClass =
    'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/20';
  const selectTriggerClass = 'bg-white text-black border border-gray-300';

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-gray-800 bg-[#171a23] shadow-lg">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Report Waste</h2>
          <p className="mt-1 text-sm text-gray-400">
            Fill in the details and press <span className="text-white">Save Report</span>.
          </p>
        </div>

        <div className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Row 1: Reporter + Date */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="reporterName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-white">Reporting Manager</FormLabel>
                      <FormControl>
                        <input type="text" className={inputClass} placeholder="Your name" {...field} />
                      </FormControl>
                      {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reportDate"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-white">Date</FormLabel>
                      <FormControl>
                        <input type="date" className={inputClass} {...field} />
                      </FormControl>
                      {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 2: Store (admin/regional only) */}
              {canChooseStore && (
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
                            {visibleStores.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Row 3: Item + Category */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="itemName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-white">Item</FormLabel>
                      <FormControl>
                        <input type="text" className={inputClass} placeholder="e.g. Milk" {...field} />
                      </FormControl>
                      {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-white">Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 4: Quantity + Unit */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-white">Quantity</FormLabel>
                      <FormControl>
                        <input type="number" step="0.001" min="0" className={inputClass} placeholder="e.g. 2.5" {...field} />
                      </FormControl>
                      {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-white">Unit</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Select a unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 5: Reason (+ Other) */}
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
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
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
                          <input type="text" className={inputClass} placeholder="Type the reason" {...field} />
                        </FormControl>
                        {fieldState.error && <p className="text-sm text-red-500">{fieldState.error.message}</p>}
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
                {typeof setIsModalOpen === 'function' && (
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isLoading}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={isLoading} className="bg-chai-gold hover:bg-yellow-600">
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>) : 'Save Report'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default WasteReportFormComponent;
