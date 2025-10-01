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
const PAGE_SIZE = 10;

export default function ExpensesPage({ stores = [] }) {
  const qc = useQueryClient();
  const { profile } = useAuth();

  // --- form reset trigger after successful create (keep) ---
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

  // ---------- PERMISSIONS (keep) ----------
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

  // ---------- FILTERS + SEARCH + PAGINATION ----------
  // For regional/admin/area users: filter by store & category
  const [storeFilter, setStoreFilter] = useState('all');      // 'all' or store_id
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' or category

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Pagination (1-based)
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [storeFilter, categoryFilter]); // reset page on filter change

  // ---------- EXPENSES LIST (server-side filters, search, pagination) ----------
  const { data, isLoading } = useQuery({
    queryKey: ['expenses', { storeFilter, categoryFilter, search, page }],
    keepPreviousData: true,
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select(`
          id, store_id, expense_date, product, cost, staff_name, category, created_at,
          stores(name)
        `, { count: 'exact' });

      // privileged filters
      if (canEditAny) {
        if (storeFilter !== 'all') query = query.eq('store_id', Number(storeFilter));
        if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      } else {
        // rely on RLS for store scoping
      }

      if (search) {
        const like = `%${search}%`;
        query = query.or(
          `product.ilike.${like},staff_name.ilike.${like},category.ilike.${like}`
        );
      }

      // base order (keep existing tie-break behavior)
      query = query.order('expense_date', { ascending: false })
                   .order('created_at', { ascending: false });

      // pagination window
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data: rows, error, count } = await query;
      if (error) {
        console.error('[expenses] select failed:', error);
        throw error;
      }

      // secondary stable sort to match your previous comparator
      const sorted = (rows ?? []).slice().sort((a, b) => {
        if (a.expense_date !== b.expense_date) {
          return (a.expense_date ?? '') < (b.expense_date ?? '') ? 1 : -1;
        }
        const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bCreated - aCreated;
      });

      return { rows: sorted, total: count ?? 0 };
    }
  });

  const expenses = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  // ---------- HELPERS (keep) ----------
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

  // ---------- MUTATIONS (keep; slight tweak for pagination) ----------
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
      // keep behavior: refetch list; also prefetch audit; clear form
      if (inserted?.id) prefetchAudit(inserted.id);
      qc.invalidateQueries({ queryKey: ['expenses'] });
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

  // ---------- EDIT DIALOG (keep) ----------
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
            resetSignal={resetSignal}
          />
{/* ---- Filters & Search Toolbar (high-contrast) ---- */}
<div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-sm text-slate-100 shadow-md">
  {canEditAny && (
    <>
      <div className="flex items-center gap-2">
        <span className="text-slate-300">Store</span>
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-[220px] bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900">
            <SelectValue placeholder="Select store" />
          </SelectTrigger>
          <SelectContent className="z-[9999] bg-slate-900 text-slate-100 border border-slate-700" position="popper" sideOffset={8} avoidCollisions={false}>
            <SelectItem value="all">All stores</SelectItem>
            {allStores.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-300">Category</span>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px] bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="z-[9999] bg-slate-900 text-slate-100 border border-slate-700" position="popper" sideOffset={8} avoidCollisions={false}>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )}

  <div className="flex items-center gap-2">
    <span className="text-slate-300">Search</span>
    <Input
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      placeholder="Search product, category, or reporter…"
      className="w-[260px] bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400 focus-visible:ring-amber-400"
    />
  </div>

  <div className="ml-auto flex gap-2">
    <Button
      type="button"
      variant="outline"
      className="bg-amber-500/10 border-amber-400 text-amber-200 hover:bg-amber-500/20 hover:text-amber-100"
      onClick={() => {
        setStoreFilter('all');
        setCategoryFilter('all');
        setSearchInput('');
        setSearch('');
        setPage(1);
      }}
    >
      Clear
    </Button>
  </div>
</div>

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

          {/* Pagination footer */}
          <div className="flex items-center justify-between text-gray-300 text-sm">
            <div>
              Showing <span className="font-medium">{showingFrom}</span>–<span className="font-medium">{showingTo}</span> of <span className="font-medium">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="px-2">Page {page} of {totalPages}</span>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
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
