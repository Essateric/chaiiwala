// src/components/staffAbsence/StaffAbsenceList.jsx
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient.js';
import { Loader2, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import StaffAbsenceFormComponent from './StaffAbsenceFormComponent.jsx';

function canManage(profile, row) {
  const perms = profile?.permissions || [];
  const isAdmin = perms.includes('admin') || perms.includes('regional');
  const createdBySelf = row?.created_by && profile?.id && row.created_by === profile.id;
  return isAdmin || createdBySelf;
}

export default function StaffAbsenceList({ profile, stores = [] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // row being edited

  const { data, isLoading, isError } = useQuery({
    queryKey: ['staff_absences', profile?.id],
    queryFn: async () => {
      // Admin/regional see all; others see only their stores (if store_ids exist)
      const perms = profile?.permissions || [];
      const isAdmin = perms.includes('admin') || perms.includes('regional');

      let query = supabase
        .from('staff_absences')
        .select('id, staff_name, reporter_name, reason, reason_other, start_date, days_absent, store_id, store_name, notes, created_at, created_by')
        .order('created_at', { ascending: false });

      if (!isAdmin && Array.isArray(profile?.store_ids) && profile.store_ids.length > 0) {
        query = query.in('store_id', profile.store_ids);
      }

      const { data: rows, error } = await query;
      if (error) throw error;
      return rows || [];
    },
  });

  const rows = useMemo(() => data || [], [data]);

  const handleDelete = async (row) => {
    if (!canManage(profile, row)) {
      toast.error('You do not have permission to delete this record.');
      return;
    }
    const yes = window.confirm(`Delete absence for "${row.staff_name}"?`);
    if (!yes) return;

    const { error } = await supabase.from('staff_absences').delete().eq('id', row.id);
    if (error) {
      console.error(error);
      toast.error('Failed to delete record.');
      return;
    }
    toast.success('Record deleted.');
    qc.invalidateQueries({ queryKey: ['staff_absences'] });
  };

  const handleEditSubmit = async (values) => {
    if (!editing) return;

    const storeIdNum = Number(values.storeId);
    const storeName = stores.find((s) => s.id === storeIdNum)?.name || editing.store_name || null;
    const payload = {
      staff_name: values.staffName?.trim() || null,
      reporter_name: values.reporterName?.trim() || null,
      reason: values.reason || null,
      reason_other: values.reason === 'Other' ? (values.reasonOther?.trim() || null) : null,
      start_date: values.startDate || null,
      days_absent: values.daysAbsent ? Number(values.daysAbsent) : null,
      notes: values.notes?.trim() || null,
      store_id: storeIdNum || null,
      store_name: storeName,
    };

    const { error } = await supabase.from('staff_absences').update(payload).eq('id', editing.id);
    if (error) {
      console.error(error);
      toast.error('Failed to update record.');
      return;
    }
    toast.success('Record updated.');
    setEditing(null);
    qc.invalidateQueries({ queryKey: ['staff_absences'] });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 flex items-center">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Loading absences…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 text-red-600">
        Failed to load staff absences.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Staff Absences</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Reported By</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Days</th>
              <th className="px-3 py-2">Store</th>
              <th className="px-3 py-2">Notes</th> {/* NEW */}
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={8}>
                  No absences recorded yet.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const dateStr = r.start_date
                ? new Date(r.start_date).toLocaleDateString()
                : '-';
              const reason = r.reason === 'Other' && r.reason_other
                ? `${r.reason} – ${r.reason_other}`
                : r.reason || '-';

              const canEdit = canManage(profile, r);

              return (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{dateStr}</td>
                  <td className="px-3 py-2">{r.staff_name || '-'}</td>
                  <td className="px-3 py-2">{r.reporter_name || '-'}</td>
                  <td className="px-3 py-2">{reason}</td>
                  <td className="px-3 py-2">{r.days_absent ?? '-'}</td>
                  <td className="px-3 py-2">{r.store_name || '-'}</td>
                  <td className="px-3 py-2 max-w-[320px] whitespace-pre-wrap">
                    {r.notes || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2 justify-end">
                      {canEdit && (
                        <>
                          <button
                            className="inline-flex items-center px-2 py-1 rounded-lg border hover:bg-gray-50"
                            onClick={() => {
                              setEditing({
                                ...r,
                                // map to form initial values
                                staffName: r.staff_name || '',
                                reporterName: r.reporter_name || '',
                                reason: r.reason || '',
                                reasonOther: r.reason_other || '',
                                startDate: r.start_date || '',
                                daysAbsent: r.days_absent ?? '',
                                storeId: r.store_id,
                                notes: r.notes || '',
                              });
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                          </button>
                          <button
                            className="inline-flex items-center px-2 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(r)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Simple Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl m-4 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Edit Absence</h4>
              <button
                className="p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setEditing(null)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <StaffAbsenceFormComponent
              profile={profile}
              stores={stores}
              mode="edit"
              initialValues={editing}
              onSubmit={handleEditSubmit}
              isLoading={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
