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
  }, [selectedStoreState]);

  // Fetch product history
  useEffect(() => {
    if (!selectedStoreState || !selectedProduct) return;
    async function fetchHistory() {
      const daysArr = getPastNDates(nDays);

      let { data, error } = await supabase
        .from("store_stock_levels")
        .select("*")
        .eq("store_id", selectedStoreState.id)
        .eq("stock_item_id", selectedProduct.stock_item_id)
        .in("date", daysArr);

      if (!error) {
        const map = {};
        data.forEach((row) => {
          map[row.date] = row.quantity;
        });
        setHistoryRows(daysArr.map((date) => ({ date, quantity: map[date] ?? "-" })));
      } else {
        setHistoryRows([]);
      }
    }
    fetchHistory();
  }, [selectedStoreState, selectedProduct, nDays]);

  useEffect(() => {
    if (!open) {
      setSelectedStoreState(selectedStore || null);
      setSelectedProduct(null);
      setStoreProducts([]);
      setHistoryRows([]);
    }
  }, [open, selectedStore]);

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
                  {storeProducts.map((row) => (
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
                </TableBody>
              </Table>
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
