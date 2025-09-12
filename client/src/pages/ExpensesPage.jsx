// ExpensesPage.jsx
import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient.js';
import ExpenseForm from '../components/expenses/ExpenseForm.jsx';
import { Button } from '../components/ui/button.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { useAuth } from '@/hooks/UseAuth';

const CATEGORIES = ['Food', 'Maintenance', 'Miscellaneous'];

export default function ExpensesPage({ stores = [] }) {
  const qc = useQueryClient();
  const { profile } = useAuth();

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

  const createMut = useMutation({
    mutationFn: async (vals) => {
      const storeId = Number(vals.storeId || profile?.store_ids?.[0]);
      if (!Number.isFinite(storeId)) {
        throw new Error('No valid store_id found to save this expense.');
      }

      const chosenCategory = CATEGORIES.includes(vals.category)
        ? vals.category
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
    },
    onError: (err) => {
      console.error('[expenses.insert] onError', err);
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] })
  });

  const deleteMut = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] })
  });

  const canEditAny = ['admin', 'regional'].includes(profile?.permissions);
  const myStoreIds = useMemo(
    () => new Set((profile?.store_ids ?? []).map(Number)),
    [profile]
  );
  const canEditRow = (row) => canEditAny || myStoreIds.has(Number(row.store_id));

  const handleCreate = (vals) => createMut.mutate(vals);

  const handleInlineEdit = (row) =>
    updateMut.mutate({
      id: row.id,
      patch: { cost: Number(((Number(row.cost) || 0) + 0.01).toFixed(2)) }
    });

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

  return (
    <DashboardLayout title="Expenses" profile={profile} announcements={[]}>
      <div className="space-y-6 p-4">
        <div className="mx-auto w-full lg:w-[60vw] space-y-6">
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
          onSubmit={handleCreate}
          isLoading={createMut.isPending}
        />

        <div className="mt-6 rounded-xl border border-gray-800 overflow-hidden text-white">
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
                          size="sm"
                          variant="outline"
                          disabled={!canEditRow(e) || updateMut.isPending}
                          onClick={() => handleInlineEdit(e)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!canEditRow(e) || deleteMut.isPending}
                          onClick={() => handleDelete(e)}
                        >
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleHistory(e)}
                        >
                          History
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
    </DashboardLayout>
  );
}
