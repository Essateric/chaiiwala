import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "../hooks/UseAuth.jsx";
import { useToast } from "../hooks/use-toast.jsx";
import { useInventoryData } from "../hooks/useInventoryData.jsx";
import { Search, Filter, Store } from "lucide-react";
import { Input } from "../components/ui/input.jsx";
import { Button } from "../components/ui/button.jsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "../components/ui/select.jsx";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "../components/ui/dialog.jsx";
import {
  Card, CardContent, CardHeader
} from "../components/ui/card.jsx";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import { getStatusFromQty } from "../lib/utils.js";
import StockTable from "../components/stock/StockTable.jsx";
import HistoricStockDialog from "../components/stock/HistoricStockDialog.jsx";

export default function StockManagementView() {
  const { profile } = useAuth();
  const currentUser = profile;
  const { toast } = useToast();

  // Stores + modal state
  const [chaiiwalaStores, setChaiiwalaStores] = useState([]);
  const [selectedHistoricStore, setSelectedHistoricStore] = useState(null);

  // Filters / sorting / pagination (hidden for store managers)
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [sort, setSort] = useState({ field: "", direction: "" });
  const [currentPage, setCurrentPage] = useState(1);

  // Edit dialog (regional/admin)
  const [editItem, setEditItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Permissions
  const isStoreManager = currentUser?.permissions === "store";
  const isArea = currentUser?.permissions === "area";
  const isAdminOrRegional =
    currentUser?.permissions === "admin" || currentUser?.permissions === "regional";

  // Manager's primary store id
  const myStoreId = useMemo(() => {
    if (Array.isArray(currentUser?.store_ids) && currentUser.store_ids.length)
      return currentUser.store_ids[0];
    return currentUser?.store_id ?? null;
  }, [currentUser]);

  // Data used for cards/table
  const { inventoryData, loading, storeCards } = useInventoryData({
    currentUser,
    storeFilter,
    chaiiwalaStores,
  });

  // Fetch stores for labels
  useEffect(() => {
    async function fetchStores() {
      const { data, error } = await supabase.from("stores").select("id, name");
      if (!error && data) setChaiiwalaStores(data);
    }
    fetchStores();
  }, []);

  // Resolve the manager's store name
  const myStoreName = useMemo(() => {
    if (!myStoreId) return "";
    const found = chaiiwalaStores.find((s) => String(s.id) === String(myStoreId));
    return found?.name || "My Store";
  }, [chaiiwalaStores, myStoreId]);

  // ---- Store Manager: render page-style historic view (no table/filters) ----
  if (isStoreManager) {
    return (
      <DashboardLayout title="Stock Management">
        <div className="container mx-auto p-4 space-y-4">
          <div className="p-4 bg-chai-gold/10 border border-chai-gold/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-chai-gold" />
           <span className="font-medium text-gray-800">
  Viewing historic stock for:{" "}
  <span className="text-black font-semibold">{myStoreName}</span>
</span>

            </div>
          </div>

          {/* Page mode – no modal, no click needed */}
          <HistoricStockDialog
            asPage
            user={currentUser}
            selectedStore={{ id: myStoreId, name: myStoreName }}
          />
        </div>
      </DashboardLayout>
    );
  }

  // ---------- Regional/Admin flow (unchanged) ----------
  // Filtering/sorting
  let filteredData = inventoryData;
  if (search) {
    const s = search.toLowerCase();
    filteredData = filteredData.filter(
      (item) =>
        (item.product || "").toLowerCase().includes(s) ||
        (item.sku || "").toLowerCase().includes(s)
    );
  }
  if (categoryFilter !== "all")
    filteredData = filteredData.filter((i) => i.category === categoryFilter);
  if (statusFilter !== "all")
    filteredData = filteredData.filter((i) => i.status === statusFilter);

  if (sort.field) {
    filteredData = [...filteredData].sort((a, b) => {
      const aValue = a[sort.field];
      const bValue = b[sort.field];
      if (aValue && bValue) {
        if (aValue < bValue) return sort.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sort.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedRows = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field) => {
    setSort({
      field,
      direction: sort.field === field && sort.direction === "asc" ? "desc" : "asc",
    });
  };

  // Editing (regional/admin only)
  const handleEditItem = (item) => {
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleSaveChanges = async (updatedItem) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: existing, error: getErr } = await supabase
      .from("store_stock_levels")
      .select("quantity")
      .eq("store_id", updatedItem.storeId)
      .eq("stock_item_id", updatedItem.sku)
      .maybeSingle();

    if (getErr) {
      toast({ title: "Error", description: getErr.message, variant: "destructive" });
      return;
    }

    const oldQty = existing?.quantity ?? 0;
    const newQty = updatedItem.stock;

    const { error: upsertErr } = await supabase
      .from("store_stock_levels")
      .upsert({
        stock_item_id: updatedItem.sku,
        store_id: updatedItem.storeId,
        quantity: newQty,
        last_updated: new Date().toISOString(),
        updated_by: user?.id,
      });

    if (upsertErr) {
      toast({
        title: "Error",
        description: `Failed to update stock: ${upsertErr.message}`,
        variant: "destructive",
      });
      return;
    }

    await supabase.from("stock_history").insert({
      store_id: updatedItem.storeId,
      stock_item_id: updatedItem.sku,
      old_quantity: oldQty,
      new_quantity: newQty,
      updated_by: user?.id,
      changed_at: new Date().toISOString(),
    });

    toast({
      title: "Stock Updated",
      description: `${updatedItem.product} stock has been updated successfully.`,
    });

    setDialogOpen(false);
    setEditItem(null);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "in_stock":
        return "bg-green-100 text-green-800";
      case "low_stock":
        return "bg-yellow-100 text-yellow-800";
      case "out_of_stock":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "in_stock":
        return "In Stock";
      case "low_stock":
        return "Low Stock";
      case "out_of_stock":
        return "Out of Stock";
      default:
        return status;
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <DashboardLayout title="Stock Management">
      <div className="container mx-auto p-4">
        {/* Header + modal host */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Stock Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your Chaiiwala product stock
            </p>
          </div>

          {selectedHistoricStore && (
            <HistoricStockDialog
              open={!!selectedHistoricStore}
              onClose={() => setSelectedHistoricStore(null)}
              user={currentUser}
              selectedStore={selectedHistoricStore}
            />
          )}
        </div>

        {/* Regional/Admin: cards -> modal */}
        <div className="mb-10">
          <h2 className="text-lg font-bold mb-4">Historic Stock by Store</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 max-w-5xl">
            {storeCards.map((store) => (
              <Card
                key={store.id}
                className="cursor-pointer transition hover:shadow-xl border border-gray-200 bg-white"
                onClick={() =>
                  setSelectedHistoricStore({ id: store.id, name: store.name })
                }
              >
                <CardHeader className="flex items-center gap-2 pb-0">
                  <Store className="text-chai-gold" />
                  <span className="font-bold text-base">{store.name}</span>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-mono font-bold text-gray-800">
                    {
                      new Intl.NumberFormat("en-GB", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(store.totalQuantity ?? 0)
                    }
                  </div>
                  <div className="text-sm text-gray-500">Total Stock</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative md:w-1/3">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search products, sku..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Food">Food</SelectItem>
                <SelectItem value="Drinks">Drinks</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-[170px]">
                <Store className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {chaiiwalaStores.map((store) => (
                  <SelectItem key={store.id} value={String(store.id)}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <StockTable
          rows={paginatedRows}
          currentPage={currentPage}
          totalPages={totalPages}
          showStoreColumn={isAdminOrRegional || isArea}
          handleSort={handleSort}
          getStatusBadgeClass={getStatusBadgeClass}
          getStatusText={getStatusText}
          handleEditItem={handleEditItem}
          currentStoreName={""}
          isStoreManager={false}
        />

        {/* Table pagination footer */}
        <div className="flex justify-between items-center p-4 bg-white border-t">
          <div>Page {currentPage} of {totalPages || 1}</div>
          <div className="space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              Start
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>

        {/* Edit dialog (regional/admin) */}
        {dialogOpen && editItem && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Inventory Item</DialogTitle>
                <DialogDescription>
                  Update quantity and status for {editItem.product}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right text-sm font-medium col-span-1">SKU:</div>
                  <div className="col-span-3 font-mono">{editItem.sku}</div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right text-sm font-medium col-span-1">Product:</div>
                  <div className="col-span-3 font-semibold">{editItem.product}</div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right text-sm font-medium col-span-1">Price:</div>
                  <div className="col-span-3">£{Number(editItem.price ?? 0).toFixed(2)}</div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="stock" className="text-right text-sm font-medium col-span-1">
                    Quantity:
                  </label>
                  <div className="col-span-3">
                    <Input
                      id="stock"
                      type="number"
                      className="col-span-3"
                      value={editItem.stock}
                      min={0}
                      onChange={(e) => {
                        const qty = parseInt(e.target.value) || 0;
                        setEditItem({
                          ...editItem,
                          stock: qty,
                          status: getStatusFromQty(qty),
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right text-sm font-medium col-span-1">Daily Check:</div>
                  <div className="col-span-3 flex items-center">
                    <input
                      type="checkbox"
                      checked={!!editItem.daily_check}
                      onChange={(e) =>
                        setEditItem({ ...editItem, daily_check: e.target.checked })
                      }
                      className="mr-2"
                    />
                    <span className="text-xs text-gray-600">
                      Show on daily stock check list
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right text-sm font-medium col-span-1">Status:</div>
                  <div className="col-span-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(
                        editItem.status
                      )}`}
                    >
                      {getStatusText(editItem.status)}
                    </span>
                    <div className="mt-1 text-xs text-gray-500">
                      Status is automatically updated based on stock quantity and configured
                      thresholds
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right text-sm font-medium col-span-1">Store:</div>
                  <div className="col-span-3">{editItem.storeName}</div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => handleSaveChanges(editItem)}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
