import React, { useState, useEffect } from 'react';
import { Form, FormControl, FormField, FormLabel, FormItem } from '../ui/form.jsx';
import { Button } from '../ui/button.jsx';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/UseAuth'; // ⬅️ fallback to context if prop missing

const formSchema = z.object({
  reporterName: z.string().min(1, "Reporting manager's name is required"),
  expenseDate: z.string().min(1, 'Choose a date'),
  product: z.string().min(1, 'Enter a product / description'),
  amount: z.coerce.number().positive('Amount must be > 0'),
});

export default function ExpenseForm({
  profile: propProfile,
  stores = [],            // kept for signature compatibility
  onSubmit,
  isLoading,
  setIsModalOpen
}) {
  // Fallback to context profile if prop is not provided
  const { profile: ctxProfile } = useAuth();
  const profile = propProfile ?? ctxProfile;

  // Resolve reporter from profile safely
  const resolveReporter = (p) => {
    const viaDisplay = (p?.display_name || '').trim();
    if (viaDisplay) return viaDisplay;
    const viaName = (p?.name || '').trim();
    if (viaName) return viaName;
    const viaFirstLast = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
    if (viaFirstLast) return viaFirstLast;
    const email = (p?.email || '').trim();
    if (email) return email.split('@')[0];
    return '';
  };

  const defaultStoreId =
    profile?.permissions === 'store'
      ? String(profile?.store_ids?.[0] ?? '')
      : String(profile?.store_ids?.[0] ?? ''); // auto-pick first store for admin/regional too

  const [reportingAt, setReportingAt] = useState(() => new Date());
  const [savedMsg, setSavedMsg] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reporterName: resolveReporter(profile) || '', // ⬅️ seed immediately
      expenseDate: todayStr,
      product: '',
      amount: 0,
    }
  });

  // Hydrate / refresh reporter when profile changes
  useEffect(() => {
    const computed = resolveReporter(profile);
    if (computed && form.getValues('reporterName') !== computed) {
      form.setValue('reporterName', computed, { shouldDirty: false });
    }
  }, [
    profile?.display_name,
    profile?.name,
    profile?.first_name,
    profile?.last_name,
    profile?.email,
    form
  ]);

  const inputClass =
    'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/20';

  const handleSubmit = form.handleSubmit(async (values) => {
    // Derive staff/site from profile; storeId from profile first store
    const payload = {
      storeId: defaultStoreId,
      reporterName: values.reporterName,
      staffName: values.reporterName, // from profile/useAuth as requested
      expenseDate: values.expenseDate,
      product: values.product,
      amount: values.amount,
    };

    await onSubmit?.(payload);

    // Success UI + reset
    setSavedMsg('expenses saved succesfully');
    setReportingAt(new Date()); // refresh the visible reporting timestamp
    form.reset({
      reporterName: resolveReporter(profile), // keep reporter
      expenseDate: new Date().toISOString().slice(0, 10),
      product: '',
      amount: 0,
    });
    setTimeout(() => setSavedMsg(''), 2500);
  });

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-gray-800 bg-[#171a23] shadow-lg">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Record Expense</h2>
          <p className="mt-1 text-sm text-gray-400">
            Enter the expense details and press <span className="text-white">Save Expense</span>.
          </p>
          {savedMsg && (
            <div className="mt-3 text-sm bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-3 py-2">
              {savedMsg}
            </div>
          )}
        </div>

        <div className="p-5">
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Reporter (auto) + Reporting date/time (auto) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  name="reporterName"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Reporting Manager</FormLabel>
                      <FormControl>
                        <input
                          type="text"
                          className={inputClass}
                          {...field}
                          placeholder={field.value ? undefined : 'Loading...'}
                          readOnly   // read-only so it still submits with the form
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Reporting Date &amp; Time
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    value={reportingAt.toLocaleString()}
                    readOnly
                  />
                </div>
              </div>

              {/* Date of expense */}
              <FormField
                name="expenseDate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-white">Date of Expense</FormLabel>
                    <FormControl>
                      <input type="date" className={inputClass} {...field} />
                    </FormControl>
                    {fieldState.error && (
                      <p className="text-sm text-red-500">{fieldState.error.message}</p>
                    )}
                  </FormItem>
                )}
              />

              {/* Product */}
              <FormField
                name="product"
                control={form.control}
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-white">Product</FormLabel>
                    <FormControl>
                      <input
                        type="text"
                        placeholder="What was purchased / monthly service"
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

              {/* Amount (monthly cost) */}
              <FormField
                name="amount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-white">Amount (monthly cost)</FormLabel>
                    <FormControl>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    'Save Expense'
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
