// components/expenses/ExpenseForm.jsx
import React, { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "../ui/button.jsx";
import { Input } from "../ui/input.jsx";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/select.jsx";

const FALLBACK_CATEGORIES = ["Food", "Maintenance", "Miscellaneous"];

function resolveReporter(p) {
  return (
    [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
    p?.name ||
    (p?.email ? p.email.split("@")[0] : "") ||
    "Unknown"
  );
}

export default function ExpenseForm({
  profile,
  stores = [],
  // Accept both prop names for compatibility
  categories = FALLBACK_CATEGORIES,
  categoryOptions,
  defaultCategory,
  // any truthy flag from older code paths will still render the field
  showCategory,
  includeCategory,
  withCategory,
  enableCategorySelect,
  onSubmit,
  isLoading,
}) {
  // unify category options
  const allCategories = useMemo(() => {
    const arr =
      (Array.isArray(categoryOptions) && categoryOptions.length && categoryOptions) ||
      (Array.isArray(categories) && categories.length && categories) ||
      FALLBACK_CATEGORIES;
    // ensure unique, stable list
    return Array.from(new Set(arr));
  }, [categories, categoryOptions]);

  const initialCategory =
    defaultCategory && allCategories.includes(defaultCategory)
      ? defaultCategory
      : allCategories[0] ?? "Miscellaneous";

  const myFirstStoreId =
    Array.isArray(profile?.store_ids) && profile.store_ids.length
      ? profile.store_ids[0]
      : stores[0]?.id ?? "";

  const canChooseStore =
    (profile?.permissions === "admin" || profile?.permissions === "regional") &&
    stores?.length > 0;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      storeId: myFirstStoreId,
      expenseDate: new Date().toISOString().slice(0, 10),
      product: "",
      amount: "",
      category: initialCategory,
    },
  });

  // Always render category (but we also honor legacy flags if they’re present)
  const shouldRenderCategory =
    true || showCategory || includeCategory || withCategory || enableCategorySelect;

  return (
    <form
      onSubmit={handleSubmit((vals) => {
        // Defensive: ensure category is set
        if (!vals.category) vals.category = initialCategory;
        onSubmit?.(vals);
      })}
      className="rounded-xl border border-gray-800 bg-[#0f131a] p-5 text-white shadow"
    >
      <div className="text-lg font-semibold mb-1">Record Expense</div>
      <p className="text-sm text-gray-400 mb-4">
        Enter the expense details and press <span className="font-semibold">Save Expense</span>.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Reporting Manager (read-only) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">
            Reporting Manager
          </label>
          <Input value={resolveReporter(profile)} readOnly />
        </div>

        {/* Reporting Date & Time (read-only) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">
            Reporting Date &amp; Time
          </label>
          <Input value={new Date().toLocaleString()} readOnly />
        </div>

        {/* Optional store selector (for admin/regional) */}
        {canChooseStore && (
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-200">
              Store
            </label>
            <select
              className="w-full rounded-md border border-gray-700 bg-[#0b0f16] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
              {...register("storeId", { required: true })}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.storeId && (
              <div className="mt-1 text-xs text-red-400">Store is required.</div>
            )}
          </div>
        )}

        {/* Date of Expense */}
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-200">
            Date of Expense
          </label>
          <Input type="date" {...register("expenseDate", { required: true })} />
          {errors.expenseDate && (
            <div className="mt-1 text-xs text-red-400">Date is required.</div>
          )}
        </div>

        {/* Product */}
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-200">
            Product
          </label>
          <Input
            placeholder="e.g. Karak Chai"
            {...register("product", { required: true })}
          />
          {errors.product && (
            <div className="mt-1 text-xs text-red-400">Product is required.</div>
          )}
        </div>

        {/* Amount */}
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-200">
            Amount (monthly cost)
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register("amount", { required: true })}
          />
          {errors.amount && (
            <div className="mt-1 text-xs text-red-400">Amount is required.</div>
          )}
        </div>

        {/* Category */}
        {shouldRenderCategory && (
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-200">
              Category
            </label>

            {/* shadcn/radix Select bound via RHF Controller */}
            <Controller
              name="category"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  {/* High z-index + popper to avoid clipping in modals/overflow */}
                  <SelectContent
                    className="z-[9999]"
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={8}
                    avoidCollisions={false}
                  >
                    {allCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />

            {errors.category && (
              <div className="mt-1 text-xs text-red-400">Category is required.</div>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Expense"}
        </Button>
      </div>
    </form>
  );
}
