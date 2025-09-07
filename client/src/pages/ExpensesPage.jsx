import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient.js';
import ExpenseForm from '../components/expenses/ExpenseForm.jsx';
import { Button } from '../components/ui/button.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { useAuth } from '@/hooks/UseAuth'; // ⬅️ get profile from context

export default function ExpensesPage({ stores = [] }) {
  const qc = useQueryClient();
  const { profile } = useAuth(); // ⬅️ reliable profile

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) {
        console.error('[expenses] select failed:', error);
        throw error;
      }

      // Finish multi-key sort on the client (stable + tolerant)
      const sorted = (data ?? []).slice().sort((a, b) => {
        // primary: expense_date desc
        if (a.expense_date !== b.expense_date) {
          return (a.expense_date ?? '') < (b.expense_date ?? '') ? 1 : -1;
        }
        // secondary: created_at desc
        const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bCreated - aCreated;
      });

      return sorted;
    }
  });

  // helper to prefetch audit for a given expense id
  const prefetchAudit = async (expenseId) => {
    try {
      const { data, error } = await supabase
        .from('expenses_audit')
        .select('*')
        .eq('expense_id', expenseId)
        .order('at', { ascending: false });
      if (error) throw error;
      // no cache key for audit list — we just warm the network path
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
      // --- derive safe values ---
      const storeId = Number(vals.storeId || profile?.store_ids?.[0]);
      if (!Number.isFinite(storeId)) {
        throw new Error('No valid store_id found to save this expense.');
      }

      const payload = {
        store_id: storeId,
        expense_date: vals.expenseDate,       // DATE
        product: vals.product,                // TEXT NOT NULL
        cost: Number(vals.amount),            // NUMERIC(12,2) NOT NULL
        staff_name: resolveReporter(profile), // TEXT NOT NULL
        // created_by handled by DB default auth.uid()
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

      return data; // inserted row (has id)
    },
    // Immediately show the new row with working buttons
    onSuccess: async (inserted) => {
      qc.setQueryData(['expenses'], (old = []) => [inserted, ...old]);
      // Warm the audit path so History works instantly
      if (inserted?.id) prefetchAudit(inserted.id);
      // Also refetch to stay consistent with server ordering
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
  const myStoreIds = useMemo(() => new Set((profile?.store_ids ?? []).map(Number)), [profile]);
  const canEditRow = (row) => canEditAny || myStoreIds.has(Number(row.store_id));

  const handleCreate = (vals) => createMut.mutate(vals);

  // Inline edit: bump cost by £0.01 (same logic, but against 'cost')
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
      console.table(data); // replace with your modal/drawer
    } catch (e) {
      console.error('[expenses_audit.select] failed:', e);
    }
  };

  return (
    <DashboardLayout title="Expenses" profile={profile} announcements={[]}>
      <div className="space-y-6 p-4">
        <ExpenseForm
          profile={profile}           // ⬅️ pass the reliable profile
          stores={stores}
          onSubmit={handleCreate}
          isLoading={createMut.isPending}
        />

        <div className="mt-6 rounded-xl border border-gray-800 overflow-hidden text-white">
          <table className="w-full text-sm">
            <thead className="bg-[#0f131a] text-gray-300">
              <tr>
                <th className="text-left px-3 py-2">Expense Date</th>
                <th className="text-left px-3 py-2">Store</th>
                <th className="text-left px-3 py-2">Product</th>
                <th className="text-left px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Reporter</th>
                <th className="text-left px-3 py-2">Recorded At</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={7} className="px-3 py-4 text-gray-400">Loading…</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-4 text-gray-400">No expenses yet.</td></tr>
              ) : expenses.map((e) => (
                <tr key={e.id} className="bg-[#151924]">
                  <td className="px-3 py-2">{e.expense_date}</td>
                  <td className="px-3 py-2">
                    {stores.find(s => String(s.id) === String(e.store_id))?.name ?? e.store_id}
                  </td>
                  <td className="px-3 py-2">{e.product ?? e.description ?? ''}</td>
                  <td className="px-3 py-2">£{Number(e.cost ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-2">{e.staff_name}</td>
                  <td className="px-3 py-2">{e.created_at ? new Date(e.created_at).toLocaleString() : ''}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
