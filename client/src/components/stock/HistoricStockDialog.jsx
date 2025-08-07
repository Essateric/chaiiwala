import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { Button } from "../../components/ui/button.jsx";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table.jsx";
import { DialogFooter } from "../../components/ui/dialog.jsx";
import { Input } from "../../components/ui/input.jsx";
import { getPastNDates } from "../../lib/utils.js";

export default function HistoricStockDialog({
  open,
  onClose,
  user,
  stores,
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
  const isStoreManager = user?.permissions === "store";
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
            product_name,
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
    setCurrentPage(1); // Reset to first page on store change
    setSearch("");     // Reset search on store change
  }, [selectedStoreState]);

  // Fetch product history for selected product
  useEffect(() => {
    if (!selectedStore || !selectedProduct) return;
    const daysArr = getPastNDates(nDays);
    async function fetchHistory() {
      let { data, error } = await supabase
        .from("stock_history")
        .select("*")
        .eq("store_id", selectedStore.id)
        .eq("stock_item_id", selectedProduct.stock_item_id)
        .in("date", daysArr);

      if (!error) {
        const map = {};
        data.forEach(row => { map[row.date] = row.quantity; });
        setHistoryRows(daysArr.map(date => ({ date, quantity: map[date] ?? "-" })));
      } else {
        setHistoryRows([]);
      }
    }
    fetchHistory();
  }, [selectedStore, selectedProduct, nDays]);

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

  // --- Filtering & Pagination for products table ---
  let filteredProducts = storeProducts;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (row) =>
        (row.stock_items?.product_name || "").toLowerCase().includes(searchLower) ||
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
    <>
      {selectedStoreState && !selectedProduct && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-semibold">
              Products in {selectedStoreState.name}
            </h4>
          </div>
          {/* Search bar */}
          <div className="mb-4 flex">
            <Input
              placeholder="Search product name or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full"
            />
          </div>
          {storeProducts.length === 0 ? (
            <div>No products found for this store.</div>
          ) : (
            <div className="overflow-x-auto max-h-[40vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Last Stock Qty</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((row) => (
                    <TableRow key={row.stock_item_id}>
                      <TableCell>{row.stock_items?.product_name}</TableCell>
                      <TableCell>{row.stock_items?.sku}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProduct(row)}
                        >
                          View {isRegional ? "14d" : "7d"} History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        No products found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {/* Pagination controls */}
              <div className="flex justify-between items-center py-2">
                <div>
                  Page {currentPage} of {totalPages}
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={handlePrevPage}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={handleNextPage}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedProduct && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-semibold">{selectedProduct.stock_items?.product_name}</div>
              <div className="text-xs text-gray-500">{selectedProduct.stock_items?.sku}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>
              Back to Products
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Stock Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </>
  );
}
