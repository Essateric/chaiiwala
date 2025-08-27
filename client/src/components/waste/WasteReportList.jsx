import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient.js';
import { Button } from '../ui/button.jsx';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select.jsx';

export default function WasteReportList({ profile, stores }) {
  const [storeFilter, setStoreFilter] = useState('all');

  const visibleStores = (profile?.permissions === 'admin' || profile?.permissions === 'regional')
    ? stores
    : stores.filter(s => profile?.store_ids?.includes(s.id));

  const queryKey = useMemo(() => ['waste_reports', storeFilter], [storeFilter]);

  const fetchWaste = async () => {
    let q = supabase
      .from('waste_reports')
      .select('id, item_name, category, quantity, unit, reason, reason_other, report_date, store_id, store_name, reporter_name, created_at')
      .order('created_at', { ascending: false });

    if (storeFilter !== 'all') q = q.eq('store_id', Number(storeFilter));

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  };

  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey, queryFn: fetchWaste });

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="rounded-2xl border border-gray-800 bg-[#171a23] shadow-lg">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
          <h3 className="text-white font-semibold">Previous Waste Reports</h3>
          <div className="ml-auto flex items-center gap-2">
            {(profile?.permissions === 'admin' || profile?.permissions === 'regional') && (
              <div className="w-48">
                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger className="bg-white text-black border border-gray-300">
                    <SelectValue placeholder="Filter by store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stores</SelectItem>
                    {visibleStores.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
          </div>
        </div>

        <div className="p-5">
          <div className="overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full bg-white text-black text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Store</th>
                  <th className="px-3 py-2">Reported By</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td className="px-3 py-3" colSpan={7}>Loading…</td></tr>
                )}
                {isError && (
                  <tr><td className="px-3 py-3 text-red-600" colSpan={7}>Failed to load reports.</td></tr>
                )}
                {!isLoading && data.length === 0 && (
                  <tr><td className="px-3 py-3 text-gray-600" colSpan={7}>No reports found.</td></tr>
                )}
                {data.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{row.report_date}</td>
                    <td className="px-3 py-2">{row.item_name}</td>
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2">{row.quantity} {row.unit}</td>
                    <td className="px-3 py-2">
                      {row.reason}{row.reason === 'Other' && row.reason_other ? ` – ${row.reason_other}` : ''}
                    </td>
                    <td className="px-3 py-2">{row.store_name ?? row.store_id}</td>
                    <td className="px-3 py-2">{row.reporter_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
