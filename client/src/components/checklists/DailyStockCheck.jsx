import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Input } from "../../components/ui/input.jsx";

function DailyStockCheck() {
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState({});
  const itemsPerPage = 10;

  // Fetch all stock items with daily_check = true
  useEffect(() => {
    async function fetchStock() {
      setLoading(true);
      const { data, error } = await supabase
        .from("stock_items")
        .select("*")
        .eq("daily_check", true)
        .order("name", { ascending: true });
      if (error) {
        setStockItems([]);
      } else {
        setStockItems(data || []);
      }
      setLoading(false);
    }
    fetchStock();
  }, []);

  // Pagination logic
  const totalPages = Math.ceil(stockItems.length / itemsPerPage);
  const pageItems = stockItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Editing logic for quantity
  const handleEditChange = (id, value) => {
    setEditing((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  // Save quantity to DB
  const handleSave = async (item) => {
    const newQty = editing[item.id];
    if (typeof newQty === "undefined" || newQty === "" || isNaN(Number(newQty))) return;

    // Optionally, show loading/disable UI here
    await supabase
      .from("stock_items")
      .update({ quantity_per_unit: Number(newQty), updated_at: new Date().toISOString() })
      .eq("id", item.id);

    // Re-fetch updated data
    const { data } = await supabase
      .from("stock_items")
      .select("*")
      .eq("daily_check", true)
      .order("name", { ascending: true });
    setStockItems(data || []);
    setEditing((prev) => ({ ...prev, [item.id]: undefined }));
  };
  console.log('stockItems:', stockItems);
console.log('pageItems:', pageItems);
console.log('currentPage:', currentPage, 'totalPages:', totalPages);


  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Daily Stock Check</CardTitle>
        <p className="text-sm text-gray-500">Update today’s stock levels for all daily-check items.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading stock items...</div>
        ) : (
          <>
            {pageItems.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No daily stock items found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Current Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">New Qty</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-2">{item.sku}</td>
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2">{item.category}</td>
                        <td className="px-4 py-2 text-right">{item.quantity_per_unit}</td>
                        <td className="px-4 py-2 text-right">
                          <Input
                            type="number"
                            min={0}
                            value={editing[item.id] ?? ""}
                            onChange={(e) => handleEditChange(item.id, e.target.value)}
                            placeholder="Qty"
                            className="w-20"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSave(item)}
                            disabled={
                              typeof editing[item.id] === "undefined" ||
                              editing[item.id] === "" ||
                              isNaN(Number(editing[item.id]))
                            }
                          >
                            Save
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination controls */}
                <div className="flex justify-between items-center mt-4">
                  <span>
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default DailyStockCheck;
