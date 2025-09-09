import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useAuth } from "@/hooks/UseAuth";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Card } from "@/components/ui/card.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";

/** ---------------------------
 * Small helpers
 * -------------------------- */
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const fmtMoney = (n) => `£${Number(n ?? 0).toFixed(2)}`;

// CSV export for any array of objects
function exportCsv(rows, filename) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","), // header row
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h] ?? "";
          // basic escaping for commas/quotes/newlines
          const s = String(v).replace(/"/g, '""');
          return s.includes(",") || s.includes("\n") ? `"${s}"` : s;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** ---------------------------
 * Reports Page
 * -------------------------- */
export default function ReportsPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  // --- Filters (defaults = this month) ---
  const todayIso = new Date().toISOString().slice(0, 10);
  const firstOfMonthIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [tab, setTab] = React.useState("audits");
  const [storeId, setStoreId] = React.useState(""); // '' = all
  const [dateFrom, setDateFrom] = React.useState(firstOfMonthIso);
  const [dateTo, setDateTo] = React.useState(todayIso);

  // --- Stores list (restrict to user’s stores unless admin/regional) ---
  const { data: stores = [] } = useQuery({
    queryKey: ["reports-stores", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile,
  });

  const permittedStoreIds = React.useMemo(() => {
    const mine = new Set((profile?.store_ids ?? []).map((n) => Number(n)));
    const canSeeAll = ["admin", "regional"].includes(profile?.permissions);
    const pool = canSeeAll ? stores.map((s) => Number(s.id)) : Array.from(mine);
    return new Set(pool);
  }, [profile, stores]);

  const visibleStores = stores.filter((s) => permittedStoreIds.has(Number(s.id)));

  /** ---------------------------
   * Audits tab
   * -------------------------- */
  const { data: audits = [], isLoading: loadingAudits } = useQuery({
    queryKey: ["rpt-audits", storeId, dateFrom, dateTo],
    enabled: !!profile,
    queryFn: async () => {
      // We filter by created_at (fallback to started_at if created_at is null)
      // Since v_report_audits is a view, we can filter server-side on created_at and store_id
      let q = supabase.from("v_report_audits").select("*");

      if (storeId) q = q.eq("store_id", Number(storeId));
      // date filters (inclusive)
      if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59.999`);

      q = q.order("created_at", { ascending: false });

      const { data, error } = await q;
      if (error) throw error;
      // lock down to permitted stores client-side as well (defense in depth)
      return (data ?? []).filter((r) => permittedStoreIds.has(Number(r.store_id)));
    },
  });

  // Simple audit KPIs (client-side)
  const auditCount = audits.length;
  const avgPct =
    auditCount > 0
      ? (audits.reduce((sum, a) => sum + Number(a.total_pct ?? 0), 0) / auditCount).toFixed(1)
      : "0.0";

  /** ---------------------------
   * Expenses tab (monthly rollup)
   * -------------------------- */
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["rpt-expenses", storeId, dateFrom, dateTo],
    enabled: !!profile,
    queryFn: async () => {
      // We’ll query the monthly view and filter client-side by month range.
      // Optionally, you can add a WHERE between months server-side too.
      let q = supabase.from("v_report_expenses_monthly").select("*").order("month", { ascending: false });
      if (storeId) q = q.eq("store_id", Number(storeId));
      const { data, error } = await q;
      if (error) throw error;

      // keep rows within dateFrom..dateTo
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;

      return (data ?? []).filter((r) => {
        const m = new Date(r.month);
        if (from && m < new Date(from.getFullYear(), from.getMonth(), 1)) return false;
        if (to && m > new Date(to.getFullYear(), to.getMonth(), 31)) return false;
        return permittedStoreIds.has(Number(r.store_id));
      });
    },
  });

  const expensesTotal = expenses.reduce((sum, r) => sum + Number(r.total_cost ?? 0), 0);

  /** ---------------------------
   * UI
   * -------------------------- */
  return (
    <DashboardLayout title="Reports" profile={profile} announcements={[]}>
      <div className="p-4 space-y-6">
        {/* Filters */}
        <Card className="p-4 bg-[#151924] border border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-gray-200">Store</Label>
              <select
                className="mt-1 w-full rounded-md border border-gray-700 bg-transparent text-white px-3 py-2"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
              >
                <option value="">All permitted</option>
                {visibleStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ?? s.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-gray-200">Date from</Label>
              <Input
                type="date"
                className="mt-1"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-gray-200">Date to</Label>
              <Input
                type="date"
                className="mt-1"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                Print / PDF
              </Button>

              {tab === "audits" ? (
                <Button
                  onClick={() => {
                    const rows = audits.map((a) => ({
                      audit_id: a.audit_id,
                      store_id: a.store_id,
                      store_name: a.store_name,
                      created_at: a.created_at,
                      submitted_at: a.submitted_at,
                      template: a.template_name,
                      version: a.template_version,
                      total_points: a.total_points,
                      max_points: a.max_points,
                      total_pct: a.total_pct,
                    }));
                    exportCsv(rows, "audits_report.csv");
                  }}
                >
                  Export CSV
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const rows = expenses.map((r) => ({
                      month: r.month,
                      store_id: r.store_id,
                      total_cost: r.total_cost,
                      entries: r.entries,
                    }));
                    exportCsv(rows, "expenses_monthly.csv");
                  }}
                >
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* KPIs quick row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-[#151924] border border-gray-800">
            <div className="text-gray-400 text-sm">Audits (in range)</div>
            <div className="text-white text-2xl font-semibold">{auditCount}</div>
          </Card>
          <Card className="p-4 bg-[#151924] border border-gray-800">
            <div className="text-gray-400 text-sm">Avg Audit %</div>
            <div className="text-white text-2xl font-semibold">{avgPct}%</div>
          </Card>
          <Card className="p-4 bg-[#151924] border border-gray-800">
            <div className="text-gray-400 text-sm">Expenses (sum)</div>
            <div className="text-white text-2xl font-semibold">{fmtMoney(expensesTotal)}</div>
          </Card>
        </div>

        {/* Tabs: Audits / Expenses */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full md:w-[320px]">
            <TabsTrigger value="audits">Audits</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>

          {/* Audits table */}
          <TabsContent value="audits" className="mt-4">
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#0f131a] text-gray-300">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Store</th>
                    <th className="text-left px-3 py-2">Template</th>
                    <th className="text-left px-3 py-2">Points</th>
                    <th className="text-left px-3 py-2">% Score</th>
                    <th className="text-left px-3 py-2">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {loadingAudits ? (
                    <tr><td colSpan={6} className="px-3 py-4 text-gray-400">Loading…</td></tr>
                  ) : audits.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-4 text-gray-400">No audits in range.</td></tr>
                  ) : (
                    audits.map((a) => (
                      <tr key={a.audit_id} className="bg-[#151924]">
                        <td className="px-3 py-2">{fmtDate(a.created_at ?? a.started_at)}</td>
                        <td className="px-3 py-2">{a.store_name ?? a.store_id}</td>
                        <td className="px-3 py-2">{a.template_name} v{a.template_version}</td>
                        <td className="px-3 py-2">
                          {Number(a.total_points ?? 0).toFixed(0)} / {a.max_points}
                        </td>
                        <td className="px-3 py-2">{Number(a.total_pct ?? 0).toFixed(1)}%</td>
                        <td className="px-3 py-2">{a.submitted_at ? fmtDate(a.submitted_at) : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Expenses table */}
          <TabsContent value="expenses" className="mt-4">
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#0f131a] text-gray-300">
                  <tr>
                    <th className="text-left px-3 py-2">Month</th>
                    <th className="text-left px-3 py-2">Store</th>
                    <th className="text-left px-3 py-2">Entries</th>
                    <th className="text-left px-3 py-2">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {loadingExpenses ? (
                    <tr><td colSpan={4} className="px-3 py-4 text-gray-400">Loading…</td></tr>
                  ) : expenses.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-4 text-gray-400">No expenses in range.</td></tr>
                  ) : (
                    expenses.map((r) => {
                      const storeLabel =
                        visibleStores.find((s) => String(s.id) === String(r.store_id))?.name ??
                        r.store_id;
                      return (
                        <tr key={`${r.month}-${r.store_id}`} className="bg-[#151924]">
                          <td className="px-3 py-2">
                            {new Date(r.month).toLocaleDateString("en-GB", {
                              year: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td className="px-3 py-2">{storeLabel}</td>
                          <td className="px-3 py-2">{r.entries}</td>
                          <td className="px-3 py-2">{fmtMoney(r.total_cost)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
