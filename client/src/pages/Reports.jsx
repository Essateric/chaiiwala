import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient.js";
import { useAuth } from "@/hooks/UseAuth.jsx";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";

import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.jsx";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs.jsx";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import {
  Loader2, Filter, Building, Calendar as CalendarIcon,
  FileDown, AlertTriangle, ListChecks, PoundSterling, Trash2, Users,
} from "lucide-react";

/** ==== TABLES & COLS — matches your schema ==== */
const TABLES = {
  stores: "stores",
  expenses: "expenses",                 // cost, expense_date, store_id (bigint)
  audits: "audits",                     // id, store_id, submitted_at
  auditAnswers: "audit_answers",        // audit_id, value_bool, points_awarded
  absences: "staff_absences",           // staff_name, start_date, store_id
  wasteQty: "waste_reports",            // quantity, report_date, store_id
  wasteCostView: "waste_reports_costed" // OPTIONAL view: store_id, report_date, cost
};

const COLS = {
  expenses: { amount: "cost", date: "expense_date" },
  audits:   { date: "submitted_at" },
  answers:  { failBool: "value_bool", points: "points_awarded" },
  absences: { staff: "staff_name", date: "start_date" },
  wasteQty: { qty: "quantity", date: "report_date" },
  wasteCost:{ cost: "cost", date: "report_date" },
};

/** ==== helpers ==== */
function getLondonNow() {
  return new Date(new Date().toLocaleString("en-GB", { timeZone: "Europe/London" }));
}
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0=Mon
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function weekKey(d) {
  const s = startOfWeekMonday(d);
  return toISODate(s);
}
function downloadCSV(filename, rows) {
  if (!rows?.length) return;
  const header = Object.keys(rows[0]);
  const csv = [header.join(",")]
    .concat(
      rows.map((r) =>
        header
          .map((k) => {
            const val = r[k] ?? "";
            const needsQuote = /[",\n]/.test(String(val));
            const escaped = String(val).replace(/"/g, '""');
            return needsQuote ? `"${escaped}"` : escaped;
          })
          .join(",")
      )
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
// half-open range upper bound helper (exclusive)
function nextDayISO(dateStr /* 'YYYY-MM-DD' */) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Generic, defensive fetch with optional store scoping and date filtering */
async function scopedFetch({ table, select, dateCol, fromISO, toISO, orderCol, allowedIds }) {
  const base = supabase.from(table).select(select);
  let q = base;
  if (fromISO && dateCol) q = q.gte(dateCol, fromISO); // inclusive lower
  if (toISO && dateCol)   q = q.lt(dateCol, toISO);    // exclusive upper (half-open)
  if (orderCol) q = q.order(orderCol, { ascending: false });

  const hasIds = Array.isArray(allowedIds) && allowedIds.length > 0;

  try {
    if (hasIds) {
      const { data, error, status } = await q.in("store_id", allowedIds);
      if (error) {
        if (status === 400 || status === 404) throw { retry: true };
        throw error;
      }
      return data || [];
    } else {
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
  } catch (e) {
    // Retry without .in() and filter client-side (handles type mismatches)
    try {
      const { data, error, status } = await q;
      if (error) {
        if (status === 404) return [];
        throw error;
      }
      if (!hasIds) return data || [];
      const set = new Set(allowedIds.map(Number));
      return (data || []).filter((r) => set.has(Number(r.store_id)));
    } catch {
      return [];
    }
  }
}

/** Chunk helper for IN (...) lists (to avoid URL/param limits) */
function chunk(arr, size = 200) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function Reports() {
  const { user, profile, loading: authLoading } = useAuth();

  // filters
  const now = getLondonNow();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(now); d.setDate(d.getDate() - 30); return toISODate(d);
  });
  const [dateTo, setDateTo] = useState(toISODate(now));
  const [storeFilter, setStoreFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("expenses");

  // half-open range works for DATE and TIMESTAMP columns
  const dateFromISO = dateFrom;            // inclusive
  const dateToISO   = nextDayISO(dateTo);  // exclusive

  // stores
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.stores)
        .select("id,name,region")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const adminOrRegional = useMemo(
    () => profile?.permissions === "admin" || profile?.permissions === "regional",
    [profile]
  );

  // ensure numeric IDs to match bigint/int store_id columns
  const allowedStoreIdsAll = useMemo(() => {
    const raw = adminOrRegional
      ? (stores ?? []).map((s) => s.id)
      : (profile?.store_ids ?? []);
    return Array.from(
      new Set(raw.map((v) => Number(v)).filter((n) => Number.isFinite(n)))
    );
  }, [adminOrRegional, stores, profile]);

  const selectedStoreId = storeFilter === "all" ? null : Number(storeFilter);

  const allowedIdsForQuery = useMemo(() => {
    if (selectedStoreId == null) return allowedStoreIdsAll;
    return allowedStoreIdsAll.includes(selectedStoreId) ? [selectedStoreId] : [];
  }, [allowedStoreIdsAll, selectedStoreId]);

  const visibleStoreList = useMemo(
    () => (adminOrRegional ? stores : stores.filter((s) => allowedIdsForQuery.includes(Number(s.id)))),
    [adminOrRegional, stores, allowedIdsForQuery]
  );
  const storeName = (id) => stores.find((s) => Number(s.id) === Number(id))?.name || "-";

  /** ===== QUERIES ===== */

  // 1) Expenses (sum cost by store)
  const { data: expensesRows = [], isLoading: expensesLoading } = useQuery({
    enabled: !!user && !storesLoading,
    queryKey: ["expenses", dateFromISO, dateToISO, allowedIdsForQuery.join(",")],
    queryFn: () =>
      scopedFetch({
        table: TABLES.expenses,
        select: `id,store_id,${COLS.expenses.amount},${COLS.expenses.date}`,
        dateCol: COLS.expenses.date,
        fromISO: dateFromISO,
        toISO: dateToISO,
        orderCol: COLS.expenses.date,
        allowedIds: allowedIdsForQuery,
      }),
  });

  // 2) Audits → get audits in scope first…
  const { data: auditsInScope = [], isLoading: auditsLoading } = useQuery({
    enabled: !!user && !storesLoading,
    queryKey: ["audits_base", dateFromISO, dateToISO, allowedIdsForQuery.join(",")],
    queryFn: () =>
      scopedFetch({
        table: TABLES.audits,
        select: `id,store_id,${COLS.audits.date}`,
        dateCol: COLS.audits.date,
        fromISO: dateFromISO,
        toISO: dateToISO,
        orderCol: COLS.audits.date,
        allowedIds: allowedIdsForQuery,
      }),
  });

  // …then answers for those audits (chunked IN (…) on audit_id)
  const { data: auditAnswersRaw = [], isLoading: answersLoading } = useQuery({
    enabled: !!user && !storesLoading,
    queryKey: ["audit_answers", dateFromISO, dateToISO, auditsInScope.map(a => a.id).join(",")],
    queryFn: async () => {
      const ids = auditsInScope.map((a) => a.id);
      if (!ids.length) return [];
      const chunksArr = chunk(ids, 200);
      const all = [];
      for (const idsChunk of chunksArr) {
        const { data, error } = await supabase
          .from(TABLES.auditAnswers)
          .select(`id,audit_id,question_id,${COLS.answers.failBool},${COLS.answers.points},created_at`);
        if (error) throw error;
        all.push(...(data || []).filter((r) => idsChunk.includes(r.audit_id)));
      }
      return all;
    },
  });

  // 3) Absences
  const { data: absenceRows = [], isLoading: absencesLoading } = useQuery({
    enabled: !!user && !storesLoading,
    queryKey: ["absences", dateFromISO, dateToISO, allowedIdsForQuery.join(",")],
    queryFn: () =>
      scopedFetch({
        table: TABLES.absences,
        select: `id,store_id,${COLS.absences.staff},${COLS.absences.date}`,
        dateCol: COLS.absences.date,
        fromISO: dateFromISO,
        toISO: dateToISO,
        orderCol: COLS.absences.date,
        allowedIds: allowedIdsForQuery,
      }),
  });

  // 4) Waste cost (optional view)
  const { data: wasteCostRows = [], isLoading: wasteCostLoading } = useQuery({
    enabled: !!user && !storesLoading,
    queryKey: ["waste_cost", dateFromISO, dateToISO, allowedIdsForQuery.join(",")],
    queryFn: () =>
      scopedFetch({
        table: TABLES.wasteCostView,
        select: `store_id,${COLS.wasteCost.cost},${COLS.wasteCost.date}`,
        dateCol: COLS.wasteCost.date,
        fromISO: dateFromISO,
        toISO: dateToISO,
        orderCol: COLS.wasteCost.date,
        allowedIds: allowedIdsForQuery,
      }),
  });

  // 5) Waste quantity (fallback)
  const { data: wasteQtyRows = [], isLoading: wasteQtyLoading } = useQuery({
    enabled: !!user && !storesLoading,
    queryKey: ["waste_qty", dateFromISO, dateToISO, allowedIdsForQuery.join(",")],
    queryFn: () =>
      scopedFetch({
        table: TABLES.wasteQty,
        select: `id,store_id,${COLS.wasteQty.qty},${COLS.wasteQty.date}`,
        dateCol: COLS.wasteQty.date,
        fromISO: dateFromISO,
        toISO: dateToISO,
        orderCol: COLS.wasteQty.date,
        allowedIds: allowedIdsForQuery,
      }),
  });

  /** ===== DERIVED AGGREGATES ===== */

  // Expenses totals per store
  const expensesByStore = useMemo(() => {
    const map = {};
    for (const r of expensesRows) {
      const sid = String(r.store_id);
      const amt = Number(r[COLS.expenses.amount]) || 0;
      map[sid] = (map[sid] || 0) + amt;
    }
    return map;
  }, [expensesRows]);

  // Weekly helper
  function rollupWeekly(rows, dateCol, valueSelector = () => 1) {
    const byWeek = {};
    for (const r of rows) {
      const d = r[dateCol] ? new Date(r[dateCol]) : null;
      if (!d) continue;
      const key = weekKey(d);
      byWeek[key] = (byWeek[key] || 0) + valueSelector(r);
    }
    return Object.entries(byWeek)
      .map(([week_start, count]) => ({ week_start, count }))
      .sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
  }

  // Weekly counts
  const weeklyExpensesCount = useMemo(
    () => rollupWeekly(expensesRows, COLS.expenses.date, () => 1),
    [expensesRows]
  );
  const weeklyWasteEntries = useMemo(
    () => rollupWeekly(wasteQtyRows, COLS.wasteQty.date, () => 1),
    [wasteQtyRows]
  );
  const weeklyWasteCost = useMemo(
    () => rollupWeekly(wasteCostRows, COLS.wasteCost.date, (r) => Number(r[COLS.wasteCost.cost]) || 0),
    [wasteCostRows]
  );
  const weeklyAbsenceEntries = useMemo(
    () => rollupWeekly(absenceRows, COLS.absences.date, () => 1),
    [absenceRows]
  );

  // Audit failed points (answers joined to audits for date)
  const auditsIndex = useMemo(() => {
    const m = new Map();
    for (const a of auditsInScope) m.set(a.id, a); // {id, store_id, submitted_at}
    return m;
  }, [auditsInScope]);

  const failedAuditAnswers = useMemo(() => {
    // Failed if value_bool === false OR points_awarded === 0
    return auditAnswersRaw.filter((ans) => {
      const vb = ans[COLS.answers.failBool];
      const pts = Number(ans[COLS.answers.points]) || 0;
      return vb === false || pts === 0;
    });
  }, [auditAnswersRaw]);

  const failedAuditRows = useMemo(() => {
    // shape: { id, store_id, date, point }
    return failedAuditAnswers.map((ans) => {
      const a = auditsIndex.get(ans.audit_id);
      return {
        id: ans.id,
        store_id: a?.store_id,
        date: a?.[COLS.audits.date] || ans.created_at,
        point: `Question ${ans.question_id}`,
      };
    }).filter(r => r.store_id);
  }, [failedAuditAnswers, auditsIndex]);

  const weeklyAuditFails = useMemo(
    () => rollupWeekly(failedAuditRows, "date", () => 1),
    [failedAuditRows]
  );

  // Waste totals per store (prefer cost)
  const hasWasteCost = wasteCostRows.length > 0;
  const wasteTotalsByStore = useMemo(() => {
    const map = {};
    if (hasWasteCost) {
      for (const r of wasteCostRows) {
        const sid = String(r.store_id);
        const cost = Number(r[COLS.wasteCost.cost]) || 0;
        map[sid] = (map[sid] || 0) + cost;
      }
    } else {
      for (const r of wasteQtyRows) {
        const sid = String(r.store_id);
        const qty = Number(r[COLS.wasteQty.qty]) || 0;
        map[sid] = (map[sid] || 0) + qty;
      }
    }
    return map;
  }, [hasWasteCost, wasteCostRows, wasteQtyRows]);

  // Absence flags (≥3 records per staff)
  const absencesByStaff = useMemo(() => {
    const m = {};
    for (const r of absenceRows) {
      const key = `${r.store_id}::${r[COLS.absences.staff] || "Unknown"}`;
      if (!m[key]) m[key] = { store_id: String(r.store_id), staff_name: r[COLS.absences.staff] || "Unknown", count: 0 };
      m[key].count += 1;
    }
    return Object.values(m).sort((a, b) => b.count - a.count);
  }, [absenceRows]);
  const flaggedAbsences = useMemo(() => absencesByStaff.filter((x) => x.count >= 3), [absencesByStaff]);

  /** ===== CSV EXPORTS ===== */
  const exportExpensesByStoreCSV = () => {
    const rows = (visibleStoreList).map((s) => ({
      store: s.name,
      total_expenses: Number(expensesByStore[String(s.id)] || 0).toFixed(2),
    }));
    downloadCSV(`expenses_totals_${dateFrom}_${dateTo}${selectedStoreId ? `_store_${selectedStoreId}` : ""}.csv`, rows);
  };
  const exportWeeklyCountsCSV = () => {
    const keys = new Set([
      ...weeklyExpensesCount.map((x) => x.week_start),
      ...weeklyAuditFails.map((x) => x.week_start),
      ...weeklyWasteEntries.map((x) => x.week_start),
      ...weeklyWasteCost.map((x) => x.week_start),
      ...weeklyAbsenceEntries.map((x) => x.week_start),
    ]);
    const weeks = Array.from(keys).sort((a, b) => (a < b ? -1 : 1));
    const idx = (arr) => Object.fromEntries(arr.map((r) => [r.week_start, r.count]));
    const e = idx(weeklyExpensesCount);
    const a = idx(weeklyAuditFails);
    const w = idx(weeklyWasteEntries);
    const wc = idx(weeklyWasteCost);
    const ab = idx(weeklyAbsenceEntries);
    const rows = weeks.map((wk) => ({
      week_start: wk,
      expenses_entries: e[wk] || 0,
      audit_failed_points: a[wk] || 0,
      waste_entries: w[wk] || 0,
      waste_cost: Number(wc[wk] || 0).toFixed(2),
      absences_entries: ab[wk] || 0,
    }));
    downloadCSV(`weekly_counts_${dateFrom}_${dateTo}.csv`, rows);
  };
  const exportAuditFailsCSV = () => {
    const rows = failedAuditRows.map((r) => ({
      date: r.date?.slice(0, 10) || "",
      store: storeName(r.store_id),
      point: r.point || "",
      status: "Fail",
    }));
    downloadCSV(`audit_failed_points_${dateFrom}_${dateTo}${selectedStoreId ? `_store_${selectedStoreId}` : ""}.csv`, rows);
  };
  const exportWasteTotalsCSV = () => {
    const rows = visibleStoreList.map((s) => ({
      store: s.name,
      ...(hasWasteCost
        ? { total_waste_cost: Number(wasteTotalsByStore[String(s.id)] || 0).toFixed(2) }
        : { total_waste_qty: Number(wasteTotalsByStore[String(s.id)] || 0).toFixed(3) }),
    }));
    downloadCSV(
      `${hasWasteCost ? "waste_cost_totals" : "waste_qty_totals"}_${dateFrom}_${dateTo}${selectedStoreId ? `_store_${selectedStoreId}` : ""}.csv`,
      rows
    );
  };
  const exportAbsenceFlagsCSV = () => {
    const rows = flaggedAbsences.map((x) => ({
      store: storeName(x.store_id),
      staff_name: x.staff_name,
      absence_count: x.count,
    }));
    downloadCSV(`absence_flags_${dateFrom}_${dateTo}${selectedStoreId ? `_store_${selectedStoreId}` : ""}.csv`, rows);
  };

  const loadingAny =
    authLoading || storesLoading || expensesLoading || auditsLoading || answersLoading ||
    absencesLoading || wasteCostLoading || wasteQtyLoading;

  /** ===== UI ===== */
  return (
    <DashboardLayout>
      <div className="px-4 md:px-6 lg:px-8 pb-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">
              Expenses, Weekly Counts, Audit Fails, Waste {hasWasteCost ? "Cost" : "Quantity"}, Absence Flags.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" /> Filters
            </CardTitle>
            <CardDescription>Pick a date range and (optionally) a store.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="col-span-2">
                <label className="text-sm text-muted-foreground mb-1 block">
                  <CalendarIcon className="inline-block mr-2 h-4 w-4" /> From
                </label>
                <Input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-muted-foreground mb-1 block">
                  <CalendarIcon className="inline-block mr-2 h-4 w-4" /> To
                </label>
                <Input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="col-span-1">
                <label className="text-sm text-muted-foreground mb-1 block">
                  <Building className="inline-block mr-2 h-4 w-4" /> Store
                </label>
                <Select value={storeFilter} onValueChange={setStoreFilter} disabled={visibleStoreList.length === 0}>
                  <SelectTrigger><SelectValue placeholder="Select a store" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All visible stores</SelectItem>
                    {visibleStoreList.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="expenses" className="flex gap-2"><PoundSterling className="h-4 w-4" /> Expenses</TabsTrigger>
            <TabsTrigger value="weeks" className="flex gap-2"><ListChecks className="h-4 w-4" /> Weekly Counts</TabsTrigger>
            <TabsTrigger value="audits" className="flex gap-2"><AlertTriangle className="h-4 w-4" /> Audit Fails</TabsTrigger>
            <TabsTrigger value="waste" className="flex gap-2"><Trash2 className="h-4 w-4" /> Waste {hasWasteCost ? "Cost" : "Qty"}</TabsTrigger>
            <TabsTrigger value="absence" className="flex gap-2"><Users className="h-4 w-4" /> Absence Flags</TabsTrigger>
          </TabsList>

          {/* Expenses Totals */}
          <TabsContent value="expenses" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Total Expenses by Store</CardTitle>
                <CardDescription>
                  Sum of <code>cost</code> within the selected range.
                  {loadingAny && <span className="inline-flex items-center gap-2 ml-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="flex justify-end pb-3">
                  <Button onClick={exportExpensesByStoreCSV} variant="outline" className="gap-2">
                    <FileDown className="h-4 w-4" /> Export CSV
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead className="text-right">Total (£)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleStoreList && visibleStoreList.length > 0 ? (
                      visibleStoreList.map((s) => (
                        <TableRow key={String(s.id)}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell className="text-right">
                            {(Number(expensesByStore[String(s.id)]) || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No stores visible.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly Counts */}
          <TabsContent value="weeks" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Weekly Counts Overview</CardTitle>
                <CardDescription>
                  Monday-start weekly rollups.
                  {loadingAny && <span className="inline-flex items-center gap-2 ml-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="flex justify-end pb-3">
                  <Button onClick={exportWeeklyCountsCSV} variant="outline" className="gap-2">
                    <FileDown className="h-4 w-4" /> Export CSV
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week (Mon)</TableHead>
                      <TableHead className="text-right">Expenses (entries)</TableHead>
                      <TableHead className="text-right">Audit Failed Points</TableHead>
                      <TableHead className="text-right">Waste (entries)</TableHead>
                      <TableHead className="text-right">Waste Cost (£)</TableHead>
                      <TableHead className="text-right">Absences (entries)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const keys = new Set([
                        ...weeklyExpensesCount.map((x) => x.week_start),
                        ...weeklyAuditFails.map((x) => x.week_start),
                        ...weeklyWasteEntries.map((x) => x.week_start),
                        ...weeklyWasteCost.map((x) => x.week_start),
                        ...weeklyAbsenceEntries.map((x) => x.week_start),
                      ]);
                      const weeks = Array.from(keys).sort((a, b) => (a < b ? -1 : 1));
                      const idx = (arr) => Object.fromEntries(arr.map((r) => [r.week_start, r.count]));
                      const e = idx(weeklyExpensesCount);
                      const a = idx(weeklyAuditFails);
                      const w = idx(weeklyWasteEntries);
                      const wc = idx(weeklyWasteCost);
                      const ab = idx(weeklyAbsenceEntries);
                      return weeks.map((wk) => (
                        <TableRow key={wk}>
                          <TableCell>{wk}</TableCell>
                          <TableCell className="text-right">{e[wk] || 0}</TableCell>
                          <TableCell className="text-right">{a[wk] || 0}</TableCell>
                          <TableCell className="text-right">{w[wk] || 0}</TableCell>
                          <TableCell className="text-right">{Number(wc[wk] || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{ab[wk] || 0}</TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Fails */}
          <TabsContent value="audits" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Audit Reports — Failed Points</CardTitle>
                <CardDescription>
                  All failed points in range (value_bool = false or points_awarded = 0).
                  {loadingAny && <span className="inline-flex items-center gap-2 ml-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="flex justify-end pb-3">
                  <Button onClick={exportAuditFailsCSV} variant="outline" className="gap-2">
                    <FileDown className="h-4 w-4" /> Export CSV
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Point</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedAuditRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{String(r.date).slice(0, 10)}</TableCell>
                        <TableCell>{storeName(r.store_id)}</TableCell>
                        <TableCell className="max-w-[520px] whitespace-nowrap overflow-hidden text-ellipsis">{r.point}</TableCell>
                        <TableCell><Badge className="bg-red-600 hover:bg-red-600">Fail</Badge></TableCell>
                      </TableRow>
                    ))}
                    {!failedAuditRows.length && !auditsLoading && !answersLoading && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No failed points found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Waste (Cost preferred, Qty fallback) */}
          <TabsContent value="waste" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{hasWasteCost ? "Total Waste Cost by Store" : "Total Waste Quantity by Store"}</CardTitle>
                <CardDescription>
                  {hasWasteCost ? <>Sum of <code>cost</code> from <code>{TABLES.wasteCostView}</code>.</> : <>No cost view found—showing total <code>quantity</code> from <code>{TABLES.wasteQty}</code>.</>}
                  {loadingAny && <span className="inline-flex items-center gap-2 ml-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="flex justify-end pb-3">
                  <Button onClick={exportWasteTotalsCSV} variant="outline" className="gap-2">
                    <FileDown className="h-4 w-4" /> Export CSV
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead className="text-right">{hasWasteCost ? "Total Waste Cost (£)" : "Total Waste Qty"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleStoreList.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell className="text-right">
                          {hasWasteCost
                            ? (Number(wasteTotalsByStore[String(s.id)]) || 0).toFixed(2)
                            : (Number(wasteTotalsByStore[String(s.id)]) || 0).toFixed(3)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!visibleStoreList.length && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No stores visible.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {!hasWasteCost && (
                  <>
                    <Separator className="my-4" />
                    <p className="text-xs text-muted-foreground">
                      To switch to £ cost, create a view <code>{TABLES.wasteCostView}</code> with <code>(store_id, report_date, cost)</code> joining <code>{TABLES.wasteQty}</code> to a price list.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Absence flags 3+ */}
          <TabsContent value="absence" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Absence — Flag 3 or More</CardTitle>
                <CardDescription>
                  Staff with 3+ absence records in the selected range.
                  {loadingAny && <span className="inline-flex items-center gap-2 ml-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="flex justify-end pb-3">
                  <Button onClick={exportAbsenceFlagsCSV} variant="outline" className="gap-2">
                    <FileDown className="h-4 w-4" /> Export CSV
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead className="text-right">Absence Count</TableHead>
                      <TableHead>Flag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flaggedAbsences.map((x, i) => (
                      <TableRow key={`${x.store_id}-${x.staff_name}-${i}`}>
                        <TableCell>{storeName(x.store_id)}</TableCell>
                        <TableCell className="max-w-[480px] whitespace-nowrap overflow-hidden text-ellipsis">{x.staff_name}</TableCell>
                        <TableCell className="text-right">{x.count}</TableCell>
                        <TableCell><Badge className="bg-amber-600 hover:bg-amber-600">3+</Badge></TableCell>
                      </TableRow>
                    ))}
                    {!flaggedAbsences.length && !absencesLoading && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No staff meet the threshold.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
