import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select.jsx';
import { Button } from '../ui/button.jsx';

export default function StaffAbsenceList({ profile, stores }) {
  const [storeFilter, setStoreFilter] = useState('all');

  const queryKey = useMemo(() => ['staff_absences', storeFilter], [storeFilter]);

  const fetchAbsences = async () => {
    let q = supabase
      .from('staff_absences')
      .select('id, staff_name, reporter_name, reason, reason_other, start_date, days_absent, store_id, store_name, created_at')
      .order('created_at', { ascending: false });

    // Optional client-side filter for convenience (RLS still applies)
    if (storeFilter !== 'all') {
      q = q.eq('store_id', Number(storeFilter));
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  };

  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey, queryFn: fetchAbsences });

  const canFilterStores = profile?.permissions === 'admin' || profile?.permissions === 'regional';
  const visibleStores = canFilterStores ? stores : stores.filter(s => profile?.store_ids?.includes(s.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {canFilterStores && (
          <div className="w-full sm:w-64">
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="bg-white text-black border border-gray-300">
                <SelectValue placeholder="Filter by store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stores</SelectItem>
                {visibleStores.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="ml-auto">
          <Button onClick={() => refetch()} variant="outline">Refresh</Button>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="min-w-full bg-white text-black text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Days</th>
              <th className="px-3 py-2">Store</th>
              <th className="px-3 py-2">Reported By</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="px-3 py-3" colSpan={6}>Loading…</td></tr>
            )}
            {isError && (
              <tr><td className="px-3 py-3 text-red-600" colSpan={6}>Failed to load absences.</td></tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr><td className="px-3 py-3 text-gray-600" colSpan={6}>No absences found.</td></tr>
            )}
            {data.map((row) => (
              <tr key={row.id} className="border-t border-gray-100">
                <td className="px-3 py-2">{row.start_date}</td>
                <td className="px-3 py-2">{row.staff_name}</td>
                <td className="px-3 py-2">
                  {row.reason}{row.reason === 'Other' && row.reason_other ? ` – ${row.reason_other}` : ''}
                </td>
                <td className="px-3 py-2">{row.days_absent}</td>
                <td className="px-3 py-2">{row.store_name ?? row.store_id}</td>
                <td className="px-3 py-2">{row.reporter_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
