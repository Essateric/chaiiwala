import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient.js";

export default function StockWidget() {
  const [selectedStoreId, setSelectedStoreId] = useState("all");

  // Pagination (store details table)
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["stock_items_master"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_items")
        .select("id, name, sku, low_stock_threshold, price");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: levels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ["store_stock_levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_stock_levels")
        .select(
          "store_id, stock_item_id, threshold, low_stock_limit, daily_check, quantity, current_qty, onhand"
        );
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = storesLoading || itemsLoading || levelsLoading;

  // Helpers
  const storesById = useMemo(() => {
    const map = new Map();
    stores.forEach((s) => map.set(String(s.id), s));
    return map;
  }, [stores]);

  const itemsById = useMemo(() => {
    const map = new Map();
    items.forEach((it) => map.set(Number(it.id), it));
    return map;
  }, [items]);

  const resolveThreshold = (masterRow, levelRow) => {
    const override = Number(levelRow?.threshold);
    if (Number.isFinite(override) && override > 0) return override;
    const legacy = Number(levelRow?.low_stock_limit);
    if (Number.isFinite(legacy) && legacy > 0) return legacy;
    const master = Number(masterRow?.low_stock_threshold);
    return Number.isFinite(master) && master > 0 ? master : 0;
  };

  const resolveQty = (levelRow, masterRow) => {
    const tryCols = [
      levelRow?.current_qty,
      levelRow?.quantity,
      levelRow?.onhand,
      masterRow?.quantity, // only if you actually store qty here
    ];
    for (const v of tryCols) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  };

  // Build store -> low items map
  const lowByStore = useMemo(() => {
    if (!items.length) return new Map();

    const levelsByStore = new Map(); // storeId -> Map(itemId -> levelRow)
    for (const lv of levels) {
      const sid = String(lv.store_id);
      const itemId = Number(lv.stock_item_id);
      if (!levelsByStore.has(sid)) levelsByStore.set(sid, new Map());
      levelsByStore.get(sid).set(itemId, lv);
    }

    const result = new Map();
    const storeIds = stores.length ? stores.map((s) => String(s.id)) : [];

    for (const sid of storeIds) {
      const storeLow = [];
      const perItemLevels = levelsByStore.get(sid) || new Map();

      for (const item of items) {
        const levelRow = perItemLevels.get(Number(item.id)) || null;
        const threshold = resolveThreshold(item, levelRow);
        const qty = resolveQty(levelRow, item);

        if (Number.isFinite(threshold) && qty <= threshold) {
          storeLow.push({
            store_id: sid,
            stock_item_id: item.id,
            name: item.name,
            sku: item.sku,
            qty,
            threshold,
            // keep delta for sorting severity, but we won't display it
            delta: threshold - qty,
            price: item.price,
          });
        }
      }

      // sort by severity desc
      storeLow.sort((a, b) => b.delta - a.delta);
      result.set(sid, storeLow);
    }

    return result;
  }, [items, levels, stores]);

  const totalLowStores = useMemo(() => {
    const arr = [];
    for (const [sid, rows] of lowByStore.entries()) {
      if (rows.length) {
        arr.push({
          store_id: sid,
          store_name: storesById.get(sid)?.name || `Store ${sid}`,
          count: rows.length,
        });
      }
    }
    arr.sort((a, b) => (b.count - a.count) || a.store_name.localeCompare(b.store_name));
    return arr;
  }, [lowByStore, storesById]);

  const selectedLowRows = useMemo(() => {
    if (selectedStoreId === "all") return [];
    return lowByStore.get(String(selectedStoreId)) || [];
  }, [selectedStoreId, lowByStore]);

  // Pagination slices (only for the detailed per-store table)
  const totalRows = selectedLowRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const clampedPage = Math.min(Math.max(page, 1), totalPages);
  const pagedRows =
    selectedStoreId === "all"
      ? []
      : selectedLowRows.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const getStoreName = (sid) => storesById.get(String(sid))?.name || "Unknown";

  // Reset pagination when switching store
  const onChangeStore = (val) => {
    setSelectedStoreId(val);
    setPage(1);
  };

  return (
    <div className="bg-[#faebc8] border border-[#f6d67a] rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="font-semibold">Stock Status (by Threshold)</div>
        <div className="flex items-center gap-2">
          <label className="mr-1 text-sm">Store:</label>
          <select
            className="border rounded p-1 bg-white text-sm"
            value={selectedStoreId}
            onChange={(e) => onChangeStore(e.target.value)}
            disabled={isLoading}
          >
            <option value="all">All Stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <div className="text-sm text-gray-600">Loading…</div>}

      {!isLoading && selectedStoreId === "all" && (
        <>
          <div className="text-sm mb-2">
            <b>{totalLowStores.length}</b> store{totalLowStores.length !== 1 ? "s" : ""} with low items
          </div>

          {totalLowStores.length === 0 ? (
            <div className="text-sm text-green-700">All stores are above their limits 🎉</div>
          ) : (
            <table className="w-full text-sm bg-white border rounded">
              <thead>
                <tr className="bg-amber-100 text-gray-700">
                  <th className="px-2 py-2 text-left">Store</th>
                  <th className="px-2 py-2 text-right"># Low Items</th>
                </tr>
              </thead>
              <tbody>
                {totalLowStores.map((row) => (
                  <tr
                    key={row.store_id}
                    className="border-t cursor-pointer hover:bg-amber-50"
                    onClick={() => onChangeStore(String(row.store_id))}
                    title="View details"
                  >
                    <td className="px-2 py-2 font-medium">{row.store_name}</td>
                    <td className="px-2 py-2 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                        {row.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {!isLoading && selectedStoreId !== "all" && (
        <>
          <div className="mb-2 text-sm">
            {totalRows === 0 ? (
              <>No low items for <b>{getStoreName(selectedStoreId)}</b>.</>
            ) : (
              <>
                <b>{totalRows}</b> low item{totalRows !== 1 ? "s" : ""} for <b>{getStoreName(selectedStoreId)}</b>
              </>
            )}
          </div>

          {totalRows > 0 && (
            <>
              <table className="w-full text-sm bg-white border rounded">
                <thead>
                  <tr className="bg-amber-100 text-gray-700">
                    <th className="px-2 py-2 text-left">Item</th>
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2 text-right">Qty</th>
                    <th className="px-2 py-2 text-right">Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((it) => (
                    <tr key={`${it.store_id}-${it.stock_item_id}`} className="border-t">
                      <td className="px-2 py-2">{it.name}</td>
                      <td className="px-2 py-2 text-center">{it.sku || "-"}</td>
                      <td className="px-2 py-2 text-right">
                        <span className="font-semibold text-red-700">{it.qty}</span>
                      </td>
                      <td className="px-2 py-2 text-right">{it.threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination controls */}
              <div className="flex items-center justify-between mt-2 text-xs text-gray-700">
                <div>
                  Showing{" "}
                  <b>
                    {(clampedPage - 1) * PAGE_SIZE + 1} – {Math.min(clampedPage * PAGE_SIZE, totalRows)}
                  </b>{" "}
                  of <b>{totalRows}</b>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 border rounded disabled:opacity-50 bg-white"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={clampedPage === 1}
                  >
                    Previous
                  </button>
                  <span>
                    Page {clampedPage} of {totalPages}
                  </span>
                  <button
                    className="px-2 py-1 border rounded disabled:opacity-50 bg-white"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={clampedPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <button className="text-xs text-blue-700 underline" onClick={() => onChangeStore("all")}>
                  ← Back to all stores
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
