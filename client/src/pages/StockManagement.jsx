import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "../hooks/UseAuth.jsx";
import { useToast } from "../hooks/use-toast.jsx";
import { useInventoryData } from "../hooks/useInventoryData.jsx";
import {
  Search, Filter, ArrowUpDown, Store
} from "lucide-react";
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/table.jsx";
import { Input } from "../components/ui/input.jsx";
import { Button } from "../components/ui/button.jsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "../components/ui/select.jsx";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "../components/ui/dialog.jsx";
import {
  Card, CardContent, CardHeader, CardTitle
} from "../components/ui/card.jsx";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import { getStatusFromQty } from "../lib/utils.js";

export default function StockManagementView() {
  const { profile } = useAuth();
  const currentUser = profile;
  const { toast } = useToast();

  // Store management
  const [chaiiwalaStores, setChaiiwalaStores] = useState([]);
  const [storeCards, setStoreCards] = useState([]);
  const [selectedHistoricStore, setSelectedHistoricStore] = useState(null);

  // Filter/search/sort/pagination
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [sort, setSort] = useState({ field: '', direction: '' });
  const [currentPage, setCurrentPage] = useState(1);

  // Edit Dialog
  const [editItem, setEditItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Permissions
  const isStoreManager = currentUser?.permissions === 'store';
  const isArea = currentUser?.permissions === 'area';
  const isAdminOrRegional = currentUser?.permissions === 'admin' || currentUser?.permissions === 'regional';

  // --- Fetch stores for filters/cards ---
  useEffect(() => {
    async function fetchStores() {
      const { data, error } = await supabase.from('stores').select('id, name');
      if (!error && data) setChaiiwalaStores(data);
    }
    fetchStores();
  }, []);

  // --- Fetch store cards (store summary) ---
  useEffect(() => {
    async function fetchStoresWithTotalStock() {
      const { data: stores } = await supabase.from('stores').select('id, name');
      if (!stores) return;
      const { data: stockData } = await supabase.from('store_stock_levels').select('store_id, quantity');
      const totals = {};
      (stockData || []).forEach(item => {
        if (!totals[item.store_id]) totals[item.store_id] = 0;
        totals[item.store_id] += item.quantity;
      });
      setStoreCards(
        stores.map(store => ({
          ...store,
          totalQuantity: totals[store.id] || 0,
        }))
      );
    }
    fetchStoresWithTotalStock();
  }, []);

  // --- Inventory Data (uses custom hook) ---
  const { inventoryData, loading } = useInventoryData({
    currentUser,
    storeFilter,
    chaiiwalaStores,
  });

  // --- Filter & search logic ---
  let filteredData = inventoryData;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredData = filteredData.filter(item =>
      (item.product || '').toLowerCase().includes(searchLower) ||
      (item.sku || '').toLowerCase().includes(searchLower)
    );
  }
  if (categoryFilter !== 'all') filteredData = filteredData.filter(item => item.category === categoryFilter);
  if (statusFilter !== 'all') filteredData = filteredData.filter(item => item.status === statusFilter);
  if (sort.field) {
    filteredData = [...filteredData].sort((a, b) => {
      const aValue = a[sort.field];
      const bValue = b[sort.field];
      if (aValue && bValue) {
        if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedRows = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- Sorting UI handler ---
  const handleSort = (field) => {
    setSort({
      field,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  // --- Edit logic (open dialog and save) ---
  const handleEditItem = (item) => {
    setEditItem(item);
    setDialogOpen(true);
  };
  const handleSaveChanges = async (updatedItem) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('store_stock_levels')
      .upsert({
        stock_item_id: updatedItem.sku, // or use actual `stock_item_id`
        store_id: updatedItem.storeId,
        quantity: updatedItem.stock,
        last_updated: new Date().toISOString(),
        daily_check: updatedItem.daily_check || false,
        updated_by: user.id,
      });
    if (error) {
      toast({
        title: "Error",
        description: `Failed to update stock: ${error.message}`,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Stock Updated",
      description: `${updatedItem.product} stock has been updated successfully.`,
    });
    setDialogOpen(false);
    setEditItem(null);
    // Optionally: refresh data (could call refetch from hook)
  };

  // --- UI helpers ---
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'in_stock': return 'bg-green-100 text-green-800';
      case 'low_stock': return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  const getStatusText = (status) => {
    switch (status) {
      case 'in_stock': return 'In Stock';
      case 'low_stock': return 'Low Stock';
      case 'out_of_stock': return 'Out of Stock';
      default: return status;
    }
  };

  const currentStoreName =
    isStoreManager && currentUser?.store_id
      ? chaiiwalaStores.find(store => store.id === currentUser.store_id)?.name
      : (isStoreManager && currentUser?.storeId)
        ? chaiiwalaStores.find(store => store.id === currentUser.storeId)?.name
        : '';

  const showStoreFilter = isAdminOrRegional;
  const showStoreColumn = isAdminOrRegional || isArea;

  // --- Main render ---
  return (
    <DashboardLayout title="Stock Management">
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Stock Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your Chaiiwala product stock</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col items-end">
            <div className="bg-gray-100 px-3 py-1 rounded-md flex items-center">
              <span className="text-sm font-medium mr-2">Logged in as:</span>
              <span className="text-sm text-chai-gold font-semibold">{currentUser?.name}</span>
            </div>
          </div>
          {/* Historic modal */}
          {selectedHistoricStore && (
            <HistoricStockDialog
              open={!!selectedHistoricStore}
              onClose={() => setSelectedHistoricStore(null)}
              user={currentUser}
              stores={chaiiwalaStores}
              selectedStore={selectedHistoricStore}
            />
          )}
        </div>

        {isStoreManager && currentStoreName && (
          <div className="mb-4 p-4 bg-chai-gold/10 border border-chai-gold/20 rounded-lg">
            <div className="flex items-center">
              <Store className="h-5 w-5 text-chai-gold mr-2" />
              <span className="font-medium text-gray-800">
                Viewing stock for: <span className="text-chai-gold font-semibold">{currentStoreName}</span>
              </span>
            </div>
          </div>
        )}

        <div className="mb-10">
          <h2 className="text-lg font-bold mb-4">Historic Stock by Store</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 max-w-5xl">
            {storeCards.map(store => (
              <Card
                key={store.id}
                className="cursor-pointer transition hover:shadow-xl border border-gray-200 bg-white"
                onClick={() => setSelectedHistoricStore(store)}
              >
                <CardHeader className="flex items-center gap-2 pb-0">
                  <Store className="text-chai-gold" />
                  <span className="font-bold text-base">{store.name}</span>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-mono font-bold text-gray-800">
                    {store.totalQuantity}
                  </div>
                  <div className="text-sm text-gray-500">Total Stock</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Filter and search controls */}
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
            {showStoreFilter && (
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="w-[170px]">
                  <Store className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {chaiiwalaStores.map(store => (
                    <SelectItem key={store.id} value={String(store.id)}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Stock Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>
                Stock of Chaiiwala products as of {new Date().toLocaleDateString()}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    <button type="button" className="flex items-center" onClick={() => handleSort('sku')}>
                      SKU<ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="flex items-center" onClick={() => handleSort('product')}>
                      Product Name<ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  {showStoreColumn && (
                    <TableHead>
                      <button type="button" className="flex items-center" onClick={() => handleSort('storeName')}>
                        Store<ArrowUpDown className="ml-2 h-4 w-4" />
                      </button>
                    </TableHead>
                  )}
                  <TableHead className="text-right">
                    <button type="button" className="flex items-center ml-auto" onClick={() => handleSort('price')}>
                      Price<ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead className="text-center">
                    <button type="button" className="flex items-center mx-auto" onClick={() => handleSort('stock')}>
                      Quantity<ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="flex items-center" onClick={() => handleSort('category')}>
                      Category<ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="flex items-center" onClick={() => handleSort('status')}>
                      Status<ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {isStoreManager
                        ? `No products found for your store (${currentStoreName})`
                        : "No products found matching your criteria"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((item) => (
                    <TableRow key={item.sku + '-' + item.storeId}>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.product}</TableCell>
                      {showStoreColumn && (
                        <TableCell>{item.storeName || "-"}</TableCell>
                      )}
                      <TableCell className="text-right">£{item.price?.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{item.stock}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(item.status)}`}>
                          {getStatusText(item.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => handleEditItem(item)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center p-4 bg-white border-t">
              <div>Page {currentPage} of {totalPages || 1}</div>
              <div className="space-x-2">
                <Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>Start</Button>
                <Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Previous</Button>
                <Button type="button" variant="outline" size="sm" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(currentPage + 1)}>Next</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Inventory Item Dialog */}
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
                  <div className="col-span-3">£{editItem.price?.toFixed(2)}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="stock" className="text-right text-sm font-medium col-span-1">Quantity:</label>
                  <div className="col-span-3">
                    <Input
                      id="stock"
                      type="number"
                      className="col-span-3"
                      value={editItem.stock}
                      min={0}
                      onChange={e => {
                        const qty = parseInt(e.target.value) || 0;
                        setEditItem({
                          ...editItem,
                          stock: qty,
                          status: getStatusFromQty(qty)
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
                      onChange={e => setEditItem({ ...editItem, daily_check: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-xs text-gray-600">Show on daily stock check list</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right text-sm font-medium col-span-1">Status:</div>
                  <div className="col-span-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(editItem.status)}`}>
                      {getStatusText(editItem.status)}
                    </span>
                    <div className="mt-1 text-xs text-gray-500">
                      Status is automatically updated based on stock quantity and configured thresholds
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

// ---- HistoricStockDialog (reusable) ----
function HistoricStockDialog({ open, onClose, user, stores, selectedStore }) {
  const [storeProducts, setStoreProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const isRegional = user?.permissions === "admin" || user?.permissions === "regional";
  const isStoreManager = user?.permissions === "store";
  const nDays = isRegional ? 14 : 7;

  function getPastNDates(n) {
    const arr = [];
    const today = new Date();
    for (let i = 0; i < n; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      arr.push(d.toISOString().split("T")[0]);
    }
    return arr.reverse();
  }

  // Fetch products for this store
  useEffect(() => {
    if (!selectedStore) return;
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
        .eq("store_id", selectedStore.id);

      if (!error) {
        const unique = {};
        (stockData || []).forEach(row => {
          if (!unique[row.stock_item_id]) unique[row.stock_item_id] = row;
        });
        setStoreProducts(Object.values(unique));
      } else {
        setStoreProducts([]);
      }
    }
    fetchProducts();
  }, [selectedStore]);

  // Fetch product history for selected product
  useEffect(() => {
    if (!selectedStore || !selectedProduct) return;
    async function fetchHistory() {
      const daysArr = getPastNDates(nDays);
      let { data, error } = await supabase
        .from("store_stock_levels")
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

  // Reset on dialog close
  useEffect(() => {
    if (!open) {
      setSelectedProduct(null);
      setStoreProducts([]);
      setHistoryRows([]);
    }
  }, [open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        {!selectedProduct ? (
          <>
            <DialogHeader>
              <DialogTitle>Products in {selectedStore?.name}</DialogTitle>
            </DialogHeader>
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
  {storeProducts.map(row => (
    <TableRow key={row.stock_item_id}>
<TableCell className="whitespace-normal break-words max-w-[300px]">
  {row.stock_items?.name}
</TableCell>
      <TableCell className="whitespace-normal break-words max-w-[250px]">{row.stock_items?.sku}</TableCell>
      <TableCell>{row.quantity}</TableCell>
      <TableCell
         className="min-w-[120px] pr-4 text-center align-middle whitespace-nowrap flex items-center justify-center"
      >
<Button
  variant="outline"
  size="md"
  onClick={() => setSelectedProduct(row)}
  className="w-full min-w-[100px] px-3 py-1 rounded bg-yellow-500 hover:bg-yellow-600 text-black whitespace-normal break-words mr-4"
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
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{selectedProduct.stock_items?.product_name}</DialogTitle>
              <DialogDescription>
                SKU: {selectedProduct.stock_items?.sku}
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Stock Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRows.map(row => (
                    <TableRow key={row.date}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                Back to Products
              </Button>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
