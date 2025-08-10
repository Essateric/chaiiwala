import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { Button } from "../../components/ui/button.jsx";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "../../components/ui/dialog.jsx";
import { Input } from "../../components/ui/input.jsx";
import { getPastNDates } from "../../lib/utils.js";

/* ---------------- Product Table ---------------- */
function ProductTable({
  products,
  onViewHistory,
  rowsPerPage,
  currentPage,
  totalPages,
  handleNextPage,
  handlePrevPage,
}) {
  return (
    <>
      <div className="overflow-x-auto max-h-[50vh]">
        <table className="min-w-full text-sm border-separate border-spacing-y-2">
          <thead>
            <tr className="bg-chai-gold text-chai-black">
              <th className="p-2 text-left">Product Name</th>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-left">Last Stock Qty</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((row) => (
                <tr key={row.stock_item_id} className="bg-white border-b last:border-b-0">
                  <td className="p-2">{row.stock_items?.name}</td>
                  <td className="p-2">{row.stock_items?.sku}</td>
                  <td className="p-2">{row.quantity}</td>
                  <td className="p-2">
                    <Button variant="gold" size="sm" onClick={() => onViewHistory(row)}>
                      View 14d History
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-2">
          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={handlePrevPage}>
            Prev
          </Button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={handleNextPage}>
            Next
          </Button>
        </div>
      )}
    </>
  );
}

/* --------------- Product History Table --------------- */
function ProductHistoryTable({ historyRows, product, onBack }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold">{product.stock_items?.name}</div>
          <div className="text-xs text-gray-500">{product.stock_items?.sku}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back to Products
        </Button>
      </div>

      <div className="overflow-x-auto max-h-[40vh]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-chai-gold text-chai-black">
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Changed By</th>
              <th className="p-2 text-left">Old Qty</th>
              <th className="p-2 text-left">New Qty</th>
            </tr>
          </thead>
         <tbody>
  {historyRows.length === 0 ? (
    <tr>
      <td colSpan={4} className="text-center py-4">
        No changes recorded for this product
      </td>
    </tr>
  ) : (
    historyRows.map((row, i) => (
      <tr key={(row.changed_at || "") + (row.updated_by || "") + i}>
        <td className="p-2">{new Date(row.changed_at).toLocaleString()}</td>
<td className="p-2">{row.updated_by_name}</td>
        <td className="p-2">{row.old_quantity}</td>
        <td className="p-2">{row.new_quantity}</td>
      </tr>
    ))
  )}
</tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Content (keeps your editing logic) ---------------- */
function HistoricStockDialogContent({
  open,
  onClose,
  user,
  selectedStore,
}) {
  const [selectedStoreState, setSelectedStoreState] = useState(selectedStore || null);
  const [storeProducts, setStoreProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const isRegional = user?.permissions === "admin" || user?.permissions === "regional";
  const nDays = isRegional ? 14 : 7;

  // Fetch products for selected store
  useEffect(() => {
    if (!selectedStoreState) return;
    async function fetchProducts() {
      let { data: stockData, error } = await supabase
        .from("store_stock_levels")
        .select(`
          stock_item_id,
          quantity,
          stock_items (
            name,
            sku
          )
        `)
        .eq("store_id", selectedStoreState.id);

      if (!error) {
        const unique = {};
        (stockData || []).forEach((row) => {
          if (!unique[row.stock_item_id]) unique[row.stock_item_id] = row;
        });
        setStoreProducts(Object.values(unique));
      } else {
        setStoreProducts([]);
      }
    }
    fetchProducts();
    setCurrentPage(1);
    setSearch("");
  }, [selectedStoreState]);

// Fetch product history for selected product
useEffect(() => {
  if (!selectedStore || !selectedProduct) return;

  const load = async () => {
    const end = new Date();
    const start = new Date();
    // inclusive nDays window (e.g., 14 -> today and previous 13 days)
    start.setDate(end.getDate() - (nDays - 1));

    // 1) Fetch history rows (no join)
    const { data: changes, error: changesError } = await supabase
      .from("stock_history_changes") // audit table
      .select("changed_at, updated_by, old_quantity, new_quantity")
      .eq("store_id", selectedStore.id)
      .eq("stock_item_id", selectedProduct.stock_item_id)
      .gte("changed_at", start.toISOString())
      .lte("changed_at", end.toISOString())
      .order("changed_at", { ascending: false });

    if (changesError) {
      setHistoryRows([]);
      return;
    }

    // 2) Get distinct updater ids and map to names from profiles
    const ids = Array.from(
      new Set((changes ?? []).map(r => r.updated_by).filter(Boolean))
    );

    let nameMap = {};
    if (ids.length) {
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("auth_id, first_name, name")
        .in("auth_id", ids);

      if (!profErr && profs) {
        nameMap = Object.fromEntries(
          profs.map(p => [p.auth_id, p.first_name || p.name || p.auth_id])
        );
      }
    }

    // 3) Attach display name (fallback to id or "-")
    setHistoryRows(
      (changes ?? []).map(r => ({
        ...r,
        updated_by_name: nameMap[r.updated_by] || r.updated_by || "-"
      }))
    );
  };

  load();
}, [selectedStore, selectedProduct, nDays]);




  // Reset when closed
  useEffect(() => {
    if (!open) {
      setSelectedStoreState(selectedStore || null);
      setSelectedProduct(null);
      setStoreProducts([]);
      setHistoryRows([]);
      setCurrentPage(1);
      setSearch("");
    }
  }, [open, selectedStore]);

  // Filtering + pagination
  let filteredProducts = storeProducts;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (row) =>
        (row.stock_items?.name || "").toLowerCase().includes(searchLower) ||
        (row.stock_items?.sku || "").toLowerCase().includes(searchLower)
    );
  }

  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleNextPage = () => setCurrentPage((page) => Math.min(page + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((page) => Math.max(page - 1, 1));

  if (!open) return null;

  return (
    <div className="p-4" style={{ minWidth: 400 }}>
      {/* Header */}
      <div>
        <h4 className="font-semibold">Products in {selectedStoreState?.name}</h4>
      </div>

      {/* Product list (with sticky search) or history table */}
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
              autoFocus
            />
          </div>

          <ProductTable
            products={paginatedProducts}
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
        />
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ---------------- Wrapper (the actual external modal) ---------------- */
export default function HistoricStockDialog({ open, onClose, user, selectedStore }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[800px] max-w-full rounded-lg p-0">
        {/* Accessible, static header to satisfy Radix requirements */}
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Historic Stock</DialogTitle>
          <DialogDescription>
            Search or pick a product to view its quantity history.
          </DialogDescription>
        </DialogHeader>

        {/* All dynamic UI (including its own headers) lives inside here */}
        <HistoricStockDialogContent
          open={open}
          onClose={onClose}
          user={user}
          selectedStore={selectedStore}
        />
      </DialogContent>
    </Dialog>
  );
}