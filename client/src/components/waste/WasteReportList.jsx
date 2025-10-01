import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient.js';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select.jsx';

const PAGE_SIZE = 10;

export default function WasteReportList({ profile, stores }) {
  // ---- Visibility logic (kept) ----
  const visibleStores = (profile?.permissions === 'admin' || profile?.permissions === 'regional')
    ? stores
    : stores.filter((s) => (profile?.store_ids ?? []).includes(s.id));

  // ---- Filters / search / pagination ----
  const [storeFilter, setStoreFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);

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

  useEffect(() => setPage(1), [storeFilter, categoryFilter]);

  // Distinct categories for the dropdown (normalize + dedupe)
  const { data: categoryOptions = [] } = useQuery({
    queryKey: ['waste_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('category', { distinct: true })
        .order('category', { ascending: true });

      if (error) throw error;

      // Collapse "Beverage", "beverage", "Beverage " → "Beverage"
      const map = new Map(); // key: normalized (lowercased+trimmed), value: display label
      for (const row of data ?? []) {
        const raw = String(row?.category ?? '').trim();
        if (!raw) continue;
        const norm = raw.toLowerCase();
        if (!map.has(norm)) map.set(norm, raw);
      }
      return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
    },
    staleTime: 10 * 60_000,
  });

  // ---- Fetch list with server-side filters/search/pagination ----
  const queryKey = useMemo(
    () => ['waste_reports', { storeFilter, categoryFilter, search, page }],
    [storeFilter, categoryFilter, search, page]
  );

  const fetchWaste = async () => {
    let q = supabase
      .from('waste_reports')
      .select(
        `
        id, item_name, category, quantity, unit, reason, reason_other,
        report_date, store_id, store_name, reporter_name, created_at
      `,
        { count: 'exact' }
      );

    if (storeFilter !== 'all') q = q.eq('store_id', Number(storeFilter));

    if (categoryFilter !== 'all') {
      // tolerant match to handle trailing spaces/case variants
      q = q.ilike('category', `${categoryFilter}%`);
    }

    if (search) {
      const like = `%${search}%`;
      q = q.or(
        [
          `item_name.ilike.${like}`,
          `category.ilike.${like}`,
          `reason.ilike.${like}`,
          `reason_other.ilike.${like}`,
          `reporter_name.ilike.${like}`,
          `store_name.ilike.${like}`,
        ].join(',')
      );
    }

    q = q.order('report_date', { ascending: false })
         .order('created_at', { ascending: false });

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    q = q.range(from, to);

    const { data, error, count } = await q;
    if (error) throw error;

    // Stable tie-break to match your pattern
    const rows = (data ?? []).slice().sort((a, b) => {
      if (a.report_date !== b.report_date) {
        return (a.report_date ?? '') < (b.report_date ?? '') ? 1 : -1;
      }
      const ac = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bc = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bc - ac;
    });

    return { rows, total: count ?? 0 };
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: fetchWaste,
    keepPreviousData: true
  });

  const reports = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="rounded-2xl border border-slate-700 bg-slate-900/95 shadow-lg">
        {/* Header / Toolbar */}
        <div className="px-5 py-4 border-b border-slate-700 flex flex-wrap items-center gap-3 text-slate-100">
          <h3 className="font-semibold">Previous Waste Reports</h3>

          {/* Store filter (kept rule: only for admin/regional) */}
          {(profile?.permissions === 'admin' || profile?.permissions === 'regional') && (
            <div className="w-48">
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100 focus:ring-2 focus:ring-amber-400">
                  <SelectValue placeholder="Filter by store" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 text-slate-100 border border-slate-700">
                  <SelectItem key="store-all" value="all">All stores</SelectItem>
                  {visibleStores.map((s) => (
                    <SelectItem key={`store-${s.id}`} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category filter */}
          <div className="w-48">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100 focus:ring-2 focus:ring-amber-400">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 text-slate-100 border border-slate-700">
                <SelectItem key="cat-all" value="all">All categories</SelectItem>
                {categoryOptions.map((c) => {
                  const norm = c.toLowerCase().trim();
                  return (
                    <SelectItem key={`cat-${norm}`} value={c}>
                      {c}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-[320px]">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search item, category, reason, reporter…"
              className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400 focus-visible:ring-amber-400"
            />
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              className="border-slate-500 text-slate-100 hover:bg-slate-800"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
            <Button
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

        {/* Table */}
        <div className="p-5">
          <div className="overflow-auto rounded-lg border border-slate-700">
            <table className="min-w-full text-sm text-slate-100">
              <thead className="bg-slate-900">
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
              <tbody className="divide-y divide-slate-700">
                {isLoading && (
                  <tr><td className="px-3 py-3 text-slate-300" colSpan={7}>Loading…</td></tr>
                )}
                {isError && (
                  <tr><td className="px-3 py-3 text-red-400" colSpan={7}>Failed to load reports.</td></tr>
                )}
                {!isLoading && !isError && reports.length === 0 && (
                  <tr><td className="px-3 py-3 text-slate-300" colSpan={7}>No reports found.</td></tr>
                )}
                {reports.map((row) => (
                  <tr key={row.id} className="bg-slate-800 hover:bg-slate-800/80">
                    <td className="px-3 py-2">{row.report_date}</td>
                    <td className="px-3 py-2">{row.item_name}</td>
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2 font-semibold">
                      {row.quantity} {row.unit}
                    </td>
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

        {/* Pagination footer */}
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between text-slate-200 text-sm rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-md">
            <div>
              Showing <span className="font-semibold">{showingFrom}</span>–<span className="font-semibold">{showingTo}</span> of <span className="font-semibold">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-500 text-slate-100 hover:bg-slate-800 disabled:opacity-60 disabled:border-slate-700 disabled:text-slate-500"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="px-2 text-slate-300">Page {page} of {totalPages}</span>
              <Button
                type="button"
                variant="outline"
                className="border-slate-500 text-slate-100 hover:bg-slate-800 disabled:opacity-60 disabled:border-slate-700 disabled:text-slate-500"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
