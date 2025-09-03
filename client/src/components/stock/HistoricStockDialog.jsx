// client/src/components/stock/HistoricStockDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { Button } from "../ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.jsx";
import { Input } from "../ui/input.jsx";

/* ---------- utils ---------- */
const format2 = (v, fallback = "0.00") => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : fallback;
};

const Arrow = ({ dir }) => {
  if (dir === "up") return <span className="ml-1 align-middle text-emerald-600">▲</span>;
  if (dir === "down") return <span className="ml-1 align-middle text-rose-600">▼</span>;
  return null;
};

const pad2 = (x) => String(x).padStart(2, "0");
const localDayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const lastNDatesLocal = (n) => {
  const dates = [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    dates.push(d);
  }
  return dates;
};

/* ---------- products table ---------- */
function ProductTable({
  products,
  usageByItem,
  updatedInWindow,
  rangeShortLabel,
  rangeLongLabel,
  isRegional,
  storeUsageTotal,
  onViewHistory,
  rowsPerPage,
  currentPage,
  totalPages,
  handleNextPage,
  handlePrevPage,
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">Products</h4>
        {isRegional && (
          <div className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1">
            Store total usage ({rangeLongLabel}):{" "}
            <span className="font-semibold">{format2(storeUsageTotal)}</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto max-h-[50vh]">
        <table className="min-w-full text-sm border-separate border-spacing-y-2">
          <thead>
            <tr className="bg-chai-gold text-chai-black">
              <th className="p-2 text-left">Product Name</th>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-left">Last Stock Qty</th>
              <th className="p-2 text-left">Usage ({rangeShortLabel})</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((row) => {
                const usage = usageByItem?.[row.stock_item_id] ?? 0;
                const wasUpdated = !!updatedInWindow?.[row.stock_item_id];
                return (
                  <tr key={row.stock_item_id} className="bg-white border-b last:border-b-0">
                    <td className="p-2">{row.stock_items?.name}</td>
                    <td className="p-2">{row.stock_items?.sku}</td>
                    <td className="p-2">
                      {wasUpdated ? (
                        format2(row.quantity)
                      ) : (
                        <span className="italic text-gray-500">quantity was not updated</span>
                      )}
                    </td>
                    <td className="p-2">{format2(usage)}</td>
                    <td className="p-2">
                      <Button variant="outline" size="sm" onClick={() => onViewHistory(row)}>
                        View {rangeShortLabel} History
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-2">
          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={handlePrevPage}>
            Prev
          </Button>
          <span>Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={handleNextPage}>
            Next
          </Button>
        </div>
      )}
    </>
  );
}

/* ---------- per-product history table ---------- */
function ProductHistoryTable({ historyRows, product, onBack, rangeShortLabel, rangeLongLabel }) {
  const is5d = rangeShortLabel === "5d";

  const rowsWithCalcs = useMemo(() => {
    if (!is5d) {
      return (historyRows || []).map((row) => {
        const oldQ = Number(row.old_quantity) || 0;
        const newQ = Number(row.new_quantity) || 0;
        const delivery = Math.max(0, newQ - oldQ);
        const usage = Math.max(0, oldQ - newQ);
        const closeDir = newQ > oldQ ? "up" : newQ < oldQ ? "down" : null;
        const deliveryDir = delivery > 0 ? "up" : null;
        const usageDir = usage > 0 ? "down" : null;
        return { ...row, oldQ, newQ, delivery, usage, closeDir, deliveryDir, usageDir };
      });
    }

    // 5d: aggregate by day
    const days = lastNDatesLocal(5);
    const byDay = new Map(days.map((d) => [localDayKey(d), []]));
    for (const r of historyRows || []) {
      if (!r.changed_at) continue;
      const dt = new Date(r.changed_at);
      const key = localDayKey(dt);
      if (byDay.has(key)) byDay.get(key).push(r);
    }

    const result = [];
    for (const d of days) {
      const key = localDayKey(d);
      const rows = byDay.get(key) || [];

      if (!rows.length) {
        result.push({
          __placeholder: true,
          changed_at: d.toISOString(),
          updated_by_name: "—",
          dayDate: d,
          oldQ: null,
          newQ: null,
          delivery: 0,
          usage: 0,
          closeDir: null,
          deliveryDir: null,
          usageDir: null,
        });
        continue;
      }

      const asc = [...rows].sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));
      const first = asc[0];
      const last = asc[asc.length - 1];

      let deliverySum = 0;
      let usageSum = 0;
      const open = Number(first.old_quantity) || 0;
      const close = Number(last.new_quantity) || 0;

      for (const r of asc) {
        const oldQ = Number(r.old_quantity) || 0;
        const newQ = Number(r.new_quantity) || 0;
        deliverySum += Math.max(0, newQ - oldQ);
        usageSum += Math.max(0, oldQ - newQ);
      }

      const names = new Set(asc.map((r) => r.updated_by_name || "-"));
      const changedBy = names.size === 1 ? Array.from(names)[0] : "Multiple";

      result.push({
        changed_at: d.toISOString(),
        updated_by_name: changedBy,
        dayDate: d,
        oldQ: open,
        newQ: close,
        delivery: deliverySum,
        usage: usageSum,
        closeDir: close > open ? "up" : close < open ? "down" : null,
        deliveryDir: deliverySum > 0 ? "up" : null,
        usageDir: usageSum > 0 ? "down" : null,
      });
    }
    return result;
  }, [historyRows, is5d]);

  const sumOpen = useMemo(() => rowsWithCalcs.reduce((s, r) => s + (r.oldQ ?? 0), 0), [rowsWithCalcs]);
  const totalDeliveries = useMemo(() => rowsWithCalcs.reduce((s, r) => s + (r.delivery || 0), 0), [rowsWithCalcs]);
  const sumClose = useMemo(() => rowsWithCalcs.reduce((s, r) => s + (r.newQ ?? 0), 0), [rowsWithCalcs]);
  const totalUsage = useMemo(() => rowsWithCalcs.reduce((s, r) => s + (r.usage || 0), 0), [rowsWithCalcs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold">{product.stock_items?.name}</div>
          <div className="text-xs text-gray-500">{product.stock_items?.sku}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-1">
            {rangeShortLabel} usage: <span className="font-semibold">{format2(totalUsage)}</span>
          </div>
          <div className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1">
            {rangeShortLabel} deliveries: <span className="font-semibold">{format2(totalDeliveries)}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back to Products
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[40vh]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-chai-gold text-chai-black">
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Changed By</th>
              <th className="p-2 text-left">Open (Old)</th>
              <th className="p-2 text-left">Delivery</th>
              <th className="p-2 text-left">Close (New)</th>
              <th className="p-2 text-left">Usage</th>
            </tr>
          </thead>
          <tbody>
            {rowsWithCalcs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  No changes recorded for this product
                </td>
              </tr>
            ) : (
              rowsWithCalcs.map((row, i) => {
                const dt = row.dayDate ? row.dayDate : row.changed_at ? new Date(row.changed_at) : null;
                const isSunday = dt ? dt.getDay() === 0 : false;
                return (
                  <tr key={(row.changed_at || "") + (row.updated_by_name || "") + i} className={isSunday ? "bg-blue-50" : ""}>
                    <td className={`p-2 ${isSunday ? "text-blue-700 font-medium" : ""}`}>
                      {dt ? dt.toLocaleDateString() + (is5d ? "" : ` ${dt.toLocaleTimeString()}`) : "—"}
                    </td>
                    <td className="p-2">{row.updated_by_name || "—"}</td>
                    <td className="p-2">{row.oldQ == null ? "—" : format2(row.oldQ)}</td>
                    <td className="p-2">
                      {format2(row.delivery)}
                      <Arrow dir={row.deliveryDir} />
                    </td>
                    <td className="p-2">
                      {row.newQ == null ? (
                        <span className="italic text-gray-500">quantity was not updated</span>
                      ) : (
                        <>
                          {format2(row.newQ)}
                          <Arrow dir={row.closeDir} />
                        </>
                      )}
                    </td>
                    <td className="p-2">
                      {format2(row.usage)}
                      <Arrow dir={row.usageDir} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t">
              <td className="p-2 font-medium" colSpan={2}>
                Totals ({rangeLongLabel})
              </td>
              <td className="p-2 font-semibold">{format2(sumOpen)}</td>
              <td className="p-2 font-semibold">{format2(totalDeliveries)}</td>
              <td className="p-2 font-semibold">{format2(sumClose)}</td>
              <td className="p-2 font-semibold">{format2(totalUsage)}</td>
            </tr>
            <tr>
              <td className="p-2 text-xs text-gray-600" colSpan={6}>
                <span className="inline-block h-3 w-3 rounded-sm bg-blue-50 border border-blue-200 align-middle mr-2" />
                Sunday entries highlighted
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ---------- shared body (works for dialog or page) ---------- */
function HistoricStockBody({ isOpen, onClose, user, selectedStore, asPage = false }) {
  const [selectedStoreState, setSelectedStoreState] = useState(selectedStore || null);
  const [storeProducts, setStoreProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [range, setRange] = useState("14d");
  const windowDays = useMemo(() => (range === "5d" ? 5 : range === "4w" ? 28 : 14), [range]);
  const rangeShortLabel = range === "4w" ? "4w" : `${windowDays}d`;
  const rangeLongLabel = range === "4w" ? "last 4 weeks" : `last ${windowDays} days`;

  const isRegional = user?.permissions === "admin" || user?.permissions === "regional";

  const [usageByItem, setUsageByItem] = useState({});
  const [storeUsageTotal, setStoreUsageTotal] = useState(0);
  const [updatedInWindow, setUpdatedInWindow] = useState({});

  // products for store
  useEffect(() => {
    if (!selectedStoreState?.id) return;
    async function fetchProducts() {
      const { data, error } = await supabase
        .from("store_stock_levels")
        .select(`
          stock_item_id,
          quantity,
          stock_items ( name, sku )
        `)
        .eq("store_id", selectedStoreState.id);

      if (error) { setStoreProducts([]); return; }
      const unique = {};
      (data || []).forEach((r) => { if (!unique[r.stock_item_id]) unique[r.stock_item_id] = r; });
      setStoreProducts(Object.values(unique));
    }
    fetchProducts();
    setCurrentPage(1);
    setSearch("");
  }, [selectedStoreState]);

  // per-product history
  useEffect(() => {
    if (!selectedStoreState || !selectedProduct) return;

    const load = async () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - (windowDays - 1));

      const { data: changes, error } = await supabase
        .from("stock_history_changes")
        .select("changed_at, updated_by, old_quantity, new_quantity")
        .eq("store_id", selectedStoreState.id)
        .eq("stock_item_id", selectedProduct.stock_item_id)
        .gte("changed_at", start.toISOString())
        .lte("changed_at", end.toISOString())
        .order("changed_at", { ascending: false });

      if (error) { setHistoryRows([]); return; }

      const ids = Array.from(new Set((changes ?? []).map((r) => r.updated_by).filter(Boolean)));
      let nameMap = {};
      if (ids.length) {
        const { data: profs, error: profErr } = await supabase
          .from("profiles")
          .select("auth_id, first_name, name")
          .in("auth_id", ids);
        if (!profErr && profs) {
          nameMap = Object.fromEntries(
            profs.map((p) => [p.auth_id, p.first_name || p.name || p.auth_id])
          );
        }
      }

      setHistoryRows(
        (changes ?? []).map((r) => ({
          ...r,
          updated_by_name: nameMap[r.updated_by] || r.updated_by || "-",
        }))
      );
    };

    load();
  }, [selectedStoreState, selectedProduct, windowDays]);

  // store-wide usage + "updated in window"
  useEffect(() => {
    if (!selectedStoreState?.id) return;

    const run = async () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - (windowDays - 1));

      const { data, error } = await supabase
        .from("stock_history_changes")
        .select("stock_item_id, old_quantity, new_quantity, changed_at")
        .eq("store_id", selectedStoreState.id)
        .gte("changed_at", start.toISOString())
        .lte("changed_at", end.toISOString());

      if (error) { setUsageByItem({}); setStoreUsageTotal(0); setUpdatedInWindow({}); return; }

      const map = {};
      const updatedMap = {};
      let total = 0;
      for (const r of data || []) {
        const oldQ = Number(r.old_quantity) || 0;
        const newQ = Number(r.new_quantity) || 0;
        const used = Math.max(0, oldQ - newQ);
        map[r.stock_item_id] = (map[r.stock_item_id] ?? 0) + used;
        updatedMap[r.stock_item_id] = true;
        total += used;
      }
      setUsageByItem(map);
      setStoreUsageTotal(total);
      setUpdatedInWindow(updatedMap);
    };

    run();
  }, [selectedStoreState, windowDays]);

  // reset when dialog closes (keep state if rendering as page)
  useEffect(() => {
    if (asPage) return;
    if (!isOpen) {
      setSelectedStoreState(selectedStore || null);
      setSelectedProduct(null);
      setStoreProducts([]);
      setHistoryRows([]);
      setCurrentPage(1);
      setSearch("");
      setUsageByItem({});
      setStoreUsageTotal(0);
      setUpdatedInWindow({});
      setRange("14d");
    }
  }, [isOpen, selectedStore, asPage]);

  // filtering & paging
  let filteredProducts = storeProducts;
  if (search) {
    const s = search.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (row) =>
        (row.stock_items?.name || "").toLowerCase().includes(s) ||
        (row.stock_items?.sku || "").toLowerCase().includes(s)
    );
  }
  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  // 👇 FIX: footer close should behave like "Back" if a product is selected
  const handleFooterClose = () => {
    if (selectedProduct) {
      setSelectedProduct(null); // go back to the all-products list
      return;
    }
    onClose?.(); // close the dialog only when already on the list view
  };

  if (!asPage && !isOpen) return null;

  return (
    <div className="p-4" style={{ minWidth: 400 }}>
      {/* header + range toggle */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">Products in {selectedStoreState?.name ?? "—"}</h4>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={range === "5d" ? "default" : "outline"} onClick={() => setRange("5d")}>5d</Button>
          <Button size="sm" variant={range === "14d" ? "default" : "outline"} onClick={() => setRange("14d")}>14d</Button>
          <Button size="sm" variant={range === "4w" ? "default" : "outline"} onClick={() => setRange("4w")}>4w</Button>
        </div>
      </div>

      {!selectedProduct ? (
        <>
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "rgba(212, 175, 55, 0.95)",
              padding: "8px 0",
              marginBottom: 8,
            }}
          >
            <Input
              placeholder="Search product name or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full"
              autoFocus={!asPage}
            />
          </div>

          <ProductTable
            products={paginatedProducts}
            usageByItem={usageByItem}
            updatedInWindow={updatedInWindow}
            rangeShortLabel={rangeShortLabel}
            rangeLongLabel={rangeLongLabel}
            isRegional={isRegional}
            storeUsageTotal={storeUsageTotal}
            onViewHistory={setSelectedProduct}
            rowsPerPage={rowsPerPage}
            currentPage={currentPage}
            totalPages={totalPages}
            handleNextPage={handleNextPage}
            handlePrevPage={handlePrevPage}
          />
        </>
      ) : (
        <ProductHistoryTable
          historyRows={historyRows}
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
          rangeShortLabel={rangeShortLabel}
          rangeLongLabel={rangeLongLabel}
        />
      )}

      {!asPage && (
        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={handleFooterClose}>
            {selectedProduct ? "Back to Products" : "Close"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------- wrapper: dialog or page ---------- */
export default function HistoricStockDialog({
  open = false,
  onClose,
  user,
  selectedStore,
  asPage = false,
}) {
  if (asPage) {
    // Page mode: DO NOT use Dialog primitives here
    return (
      <div className="bg-white rounded-lg border shadow overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b bg-chai-gold/10">
          <h2 className="text-lg font-semibold">Historic Stock</h2>
          <p className="text-sm text-gray-600">Search or pick a product to view its quantity history.</p>
        </div>
        <HistoricStockBody
          isOpen={true}
          onClose={() => {}}
          user={user}
          selectedStore={selectedStore}
          asPage
        />
      </div>
    );
  }

  // Modal mode (uses Dialog primitives)
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose?.();
      }}
    >
      <DialogContent className="w-[900px] max-w-full rounded-lg p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Historic Stock</DialogTitle>
          <DialogDescription>Search or pick a product to view its quantity history.</DialogDescription>
        </DialogHeader>

        <HistoricStockBody
          isOpen={open}
          onClose={onClose}
          user={user}
          selectedStore={selectedStore}
        />
      </DialogContent>
    </Dialog>
  );
}
