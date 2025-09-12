// ExpensesPage.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '../lib/supabaseClient.js';
import ExpenseForm from '../components/expenses/ExpenseForm.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue
} from '../components/ui/select.jsx';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../components/ui/dialog.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { useAuth } from '@/hooks/UseAuth';

const CATEGORIES = ['Food', 'Maintenance', 'Miscellaneous'];

export default function ExpensesPage({ stores = [] }) {
  const qc = useQueryClient();
  const { profile } = useAuth();

  // NEW: signal form reset only on successful create
  const [resetSignal, setResetSignal] = useState(0);

  // ---------- STORES ----------
  const { data: storesFromDb = [] } = useQuery({
    queryKey: ['stores-basic'],
    enabled: stores.length === 0,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id,name')
        .order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    }
  });

  const allStores = stores.length ? stores : storesFromDb;

  const storeNameMap = useMemo(() => {
    const m = new Map();
    for (const s of allStores) m.set(String(s.id), s.name);
    return m;
  }, [allStores]);

  const storeNameOf = (row) =>
    row?.stores?.name ??
    storeNameMap.get(String(row.store_id)) ??
    row.store_id;

  // ---------- EXPENSES LIST ----------
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          id, store_id, expense_date, product, cost, staff_name, category, created_at,
          stores(name)
        `)
        .order('expense_date', { ascending: false });

      if (error) {
        console.error('[expenses] select failed:', error);
        throw error;
      }

      const sorted = (data ?? []).slice().sort((a, b) => {
        if (a.expense_date !== b.expense_date) {
          return (a.expense_date ?? '') < (b.expense_date ?? '') ? 1 : -1;
        }
        const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bCreated - aCreated;
      });

      return sorted;
    }
  });

  // ---------- HELPERS ----------
  const prefetchAudit = async (expenseId) => {
    try {
      const { data, error } = await supabase
        .from('expenses_audit')
        .select('*')
        .eq('expense_id', expenseId)
        .order('at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('[expenses_audit.prefetch] warn:', e?.message || e);
      return null;
    }
  };

  const resolveReporter = (p) =>
    [p?.first_name, p?.last_name].filter(Boolean).join(' ') ||
    p?.name ||
    (p?.email ? p.email.split('@')[0] : '') ||
    'Unknown';

  // ---------- MUTATIONS ----------
  const createMut = useMutation({
    mutationFn: async (vals) => {
      const storeId = Number(vals.storeId || profile?.store_ids?.[0]);
      if (!Number.isFinite(storeId)) {
        throw new Error('No valid store_id found to save this expense.');
      }
      const submittedCategory = vals.category ?? vals?.formCategory;
      const chosenCategory = CATEGORIES.includes(submittedCategory)
        ? submittedCategory
        : 'Miscellaneous';

      const payload = {
        store_id: storeId,
        expense_date: vals.expenseDate,
        product: vals.product,
        cost: Number(vals.amount),
        staff_name: resolveReporter(profile),
        category: chosenCategory,
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[expenses.insert] failed', error, 'payload:', payload);
        throw error;
      }
      return data;
    },
    onSuccess: async (inserted) => {
      qc.setQueryData(['expenses'], (old = []) => [inserted, ...old]);
      if (inserted?.id) prefetchAudit(inserted.id);
      qc.invalidateQueries({ queryKey: ['expenses'] });
      // Signal the form to reset now that we know it saved
      setResetSignal((t) => t + 1);
    },
    onError: (err) => {
      console.error('[expenses.insert] onError', err);
      alert('Failed to create expense: ' + (err?.message || 'Unknown error'));
    }
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, patch }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update({ ...patch, updated_by: (profile?.auth_id ?? profile?.id ?? null) })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
    onError: (err) => {
      console.error('[expenses.update] onError', err);
      alert('Update failed: ' + (err?.message || 'Unknown error'));
    }
  });

  const deleteMut = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
    onError: (err) => {
      console.error('[expenses.delete] onError', err);
      alert('Delete failed: ' + (err?.message || 'Unknown error'));
    }
  });

  // ---------- PERMISSIONS ----------
  const role = String(profile?.permissions || '').toLowerCase().trim();
  const canEditAny = useMemo(() => {
    const allow = new Set([
      'admin', 'administrator', 'regional', 'regional manager', 'area', 'area manager'
    ]);
    return allow.has(role);
  }, [role]);

  const myStoreIds = useMemo(
    () => new Set((profile?.store_ids ?? []).map(Number)),
    [profile]
  );

  const canEditRow = (row) => canEditAny || myStoreIds.has(Number(row.store_id));

  // ---------- EDIT DIALOG ----------
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const { register, handleSubmit, control, reset: editReset } = useForm({
    defaultValues: {
      expense_date: '',
      product: '',
      amount: '',
      category: CATEGORIES[0],
      store_id: '',
    },
  });

  useEffect(() => {
    if (!editRow) return;
    editReset({
      expense_date: (editRow.expense_date ?? '').slice(0, 10) || new Date().toISOString().slice(0, 10),
      product: editRow.product ?? '',
      amount: editRow.cost != null ? String(editRow.cost) : '',
      category: CATEGORIES.includes(editRow.category) ? editRow.category : CATEGORIES[0],
      store_id: editRow.store_id ?? '',
    });
  }, [editRow, editReset]);

  const openEdit = (row) => {
    setEditRow(row);
    setEditOpen(true);
  };

  const onEditSubmit = (vals) => {
    if (!editRow) return;
    const patch = {
      expense_date: vals.expense_date,
      product: vals.product,
      cost: Number(vals.amount),
      category: CATEGORIES.includes(vals.category) ? vals.category : 'Miscellaneous',
    };
    if (canEditAny && vals.store_id) {
      patch.store_id = Number(vals.store_id);
    }
    updateMut.mutate(
      { id: editRow.id, patch },
      {
        onSuccess: () => {
          setEditOpen(false);
          setEditRow(null);
        },
      }
    );
  };

  const handleDelete = (row) => deleteMut.mutate(row.id);

  const handleHistory = async (row) => {
    try {
      const { data, error } = await supabase
        .from('expenses_audit')
        .select('*')
        .eq('expense_id', row.id)
        .order('at', { ascending: false });
      if (error) throw error;
      console.table(data);
    } catch (e) {
      console.error('[expenses_audit.select] failed:', e);
    }
  };

  // ---------- RENDER ----------
  return (
    <DashboardLayout title="Expenses" profile={profile} announcements={[]}>
      <div className="p-4">
        <div className="mx-auto w-full lg:w-[55%] space-y-6">
          <ExpenseForm
            profile={profile}
            stores={allStores}
            categories={CATEGORIES}
            categoryOptions={CATEGORIES}
            defaultCategory={CATEGORIES[0]}
            showCategory
            includeCategory
            withCategory
            enableCategorySelect
            onSubmit={(vals) => createMut.mutate(vals)}
            isLoading={createMut.isPending}
            resetSignal={resetSignal}           // << NEW: triggers form clear
          />

          <div className="rounded-xl border border-gray-800 overflow-hidden text-white lg:w-[60vw] justify-center">
            <table className="w-full text-sm">
              <thead className="bg-[#0f131a] text-gray-300">
                <tr>
                  <th className="text-left px-3 py-2">Expense Date</th>
                  <th className="text-left px-3 py-2">Store</th>
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-left px-3 py-2">Product</th>
                  <th className="text-left px-3 py-2">Amount</th>
                  <th className="text-left px-3 py-2">Reporter</th>
                  <th className="text-left px-3 py-2">Recorded At</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-gray-400">Loading…</td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-gray-400">No expenses yet.</td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id} className="bg-[#151924]">
                      <td className="px-3 py-2">{e.expense_date}</td>
                      <td className="px-3 py-2">{storeNameOf(e)}</td>
                      <td className="px-3 py-2">{e.category ?? 'Miscellaneous'}</td>
                      <td className="px-3 py-2">{e.product ?? e.description ?? ''}</td>
                      <td className="px-3 py-2">£{Number(e.cost ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-2">{e.staff_name}</td>
                      <td className="px-3 py-2">
                        {e.created_at ? new Date(e.created_at).toLocaleString() : ''}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!canEditRow(e) || updateMut.isPending}
                            onClick={() => openEdit(e)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={!canEditRow(e) || deleteMut.isPending}
                            onClick={() => handleDelete(e)}
                          >
                            Delete
                          </Button>
                          </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --------- EDIT DIALOG --------- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the fields and press Save.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
            {canEditAny && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-200">Store</label>
                <select
                  className="w-full rounded-md border border-gray-700 bg-[#0b0f16] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  {...register('store_id')}
                >
                  {allStores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">Date of Expense</label>
              <Input type="date" {...register('expense_date', { required: true })} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">Product</label>
              <Input {...register('product', { required: true })} placeholder="e.g. Karak Chai" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">Amount</label>
              <Input type="number" step="0.01" min="0" {...register('amount', { required: true })} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">Category</label>
              <Controller
                name="category"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]" position="popper" sideOffset={8} avoidCollisions={false}>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                {updateMut.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
