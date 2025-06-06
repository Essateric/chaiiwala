import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/UseAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Filter,
  ArrowUpDown,
  Coffee,
  Store,
  ShoppingBasket,
  AlertTriangle,
  Menu,
  X,
  HomeIcon,
  ClipboardListIcon,
  CalendarIcon,
  ArchiveIcon,
  BellIcon,
  UsersIcon,
  SettingsIcon,
  ClipboardCheckIcon,
  CalendarDaysIcon,
  WrenchIcon,
  PackageIcon
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Store data for reference
const chaiiwalaStores = [
  { id: 1, name: 'Cheetham Hill', address: '74 Bury Old Rd, Manchester M8 5BW', area: 1, manager: 'MGR_CH' },
  { id: 2, name: 'Oxford Road', address: '149 Oxford Rd, Manchester M1 7EE', area: 1, manager: 'MGR_OX' },
  { id: 3, name: 'Old Trafford', address: 'Ayres Rd, Old Trafford, Stretford, 89 M16 7GS', area: 1, manager: 'MGR_OT' },
  { id: 4, name: 'Trafford Centre', address: 'Kiosk K14, The Trafford Centre, Trafford Blvd, Trafford', area: 2, manager: 'MGR_TC' },
  { id: 5, name: 'Stockport Road', address: '884-886 Stockport Rd, Levenshulme, Manchester', area: 1, manager: 'Jubayed Chowdhury', managerEmail: 'jubayed.chaiiwala@gmail.com' },
  { id: 6, name: 'Rochdale', address: '35 Milkstone Rd, Rochdale OL11 1EB', area: 2, manager: 'MGR_RD' },
  { id: 7, name: 'Oldham', address: '66 George St, Oldham OL1 1LS', area: 2, manager: 'MGR_OL' },
];

// Get store name by id
const getStoreName = (storeId) => {
  const store = chaiiwalaStores.find(store => store.id === storeId);
  return store ? store.name : 'Unknown Store';
};

const getStatusFromQty = (qty, threshold = 5) => {
  if (qty === 0) return "out_of_stock";
  if (qty <= threshold) return "low_stock";
  return "in_stock";
};

export default function StockManagementView() {
  const { profile } = useAuth();
  const currentUser = profile;
  const { toast } = useToast();

  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [sort, setSort] = useState({ field: '', direction: '' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Area permissions (assume currentUser.store_ids is array of ids for area managers)
  const isStoreManager = currentUser?.role === 'store';
  const isArea = currentUser?.role === 'area';
  const isAdminOrRegional = currentUser?.role === 'admin' || currentUser?.role === 'regional';

  // Fetch inventory data (per-store, not global)
  useEffect(() => {
    async function fetchStock() {
      setLoading(true);
      let query = supabase
        .from('store_stock_levels')
        .select(`
          *,
          stock_items:stock_item_id (
            sku,
            name,
            price,
            category
          )
        `);

      // Apply filters for store, area, admin/regional
      if (isStoreManager) {
        query = query.eq('store_id', currentUser.store_id || currentUser.storeId);
      } else if (isArea && Array.isArray(currentUser.store_ids) && currentUser.store_ids.length > 0) {
        query = query.in('store_id', currentUser.store_ids);
      } else if (isAdminOrRegional && storeFilter !== 'all') {
        query = query.eq('store_id', Number(storeFilter));
      }
      const { data, error } = await query;
      if (error) {
        setInventoryData([]);
      } else {
        setInventoryData((data || []).map(row => ({
          id: row.id,
          storeId: row.store_id,
          storeName: getStoreName(row.store_id),
          sku: row.stock_items?.sku,
          product: row.stock_items?.name,
          price: Number(row.stock_items?.price),
          category: row.stock_items?.category,
          stock: row.quantity,
          status: getStatusFromQty(row.quantity),
          daily_check: !!row.daily_check,
        })));
      }
      setLoading(false);
    }
    fetchStock();
    // eslint-disable-next-line
  }, [currentUser, storeFilter]); // fetches again if user or filter changes

  // Filter and search
  let filteredData = inventoryData;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredData = filteredData.filter(item =>
      (item.product || '').toLowerCase().includes(searchLower) ||
      (item.sku || '').toLowerCase().includes(searchLower)
    );
  }
  if (categoryFilter !== 'all') {
    filteredData = filteredData.filter(item => item.category === categoryFilter);
  }
  if (statusFilter !== 'all') {
    filteredData = filteredData.filter(item => item.status === statusFilter);
  }
  // Sorting
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

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedRows = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const lowStockCount = inventoryData.filter(item => item.status === 'low_stock').length;
  const outOfStockCount = inventoryData.filter(item => item.status === 'out_of_stock').length;
  const drinksCount = inventoryData.filter(item => item.category === 'Drinks').length;

  // Sorting UI
  const handleSort = (field) => {
    setSort({
      field,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  // Edit logic
  const handleEditItem = (item) => {
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleSaveChanges = (updatedItem) => {
    // Optionally: push changes to supabase here!
    const index = inventoryData.findIndex(item =>
      item.sku === editItem?.sku &&
      item.storeId === editItem?.storeId
    );
    if (index !== -1) {
      const updatedInventoryData = [...inventoryData];
      updatedInventoryData[index] = {
        ...updatedInventoryData[index],
        ...updatedItem
      };
      setInventoryData(updatedInventoryData);

      toast({
        title: "Stock Updated",
        description: `${updatedItem.product} stock has been updated successfully.`,
      });

      setDialogOpen(false);
      setEditItem(null);
    }
  };

  // UI helpers
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

  // Store name for current user (used in UI)
  const currentStoreName =
    isStoreManager && currentUser?.store_id
      ? getStoreName(currentUser.store_id)
      : (isStoreManager && currentUser?.storeId)
      ? getStoreName(currentUser.storeId)
      : '';

  // Only show store filter for admin/regional
  const showStoreFilter = isAdminOrRegional;

  // Only show store column for admin/regional/area
  const showStoreColumn = isAdminOrRegional || isArea;

  const toggleMobileMenu = () => setIsMobileMenuOpen((v) => !v);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sidebar - desktop only */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow pt-5 bg-[#1c1f2a] overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="h-12 w-12 bg-chai-gold rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <h1 className="text-white font-bold text-xl">Chaiiwala</h1>
          </div>
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              <a href="/" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <HomeIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Dashboard
              </a>
              <a href="/maintenance" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <WrenchIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Maintenance
              </a>
              <a href="/event-orders" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <CalendarDaysIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Event Orders
              </a>
              <a href="/stock-orders" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <PackageIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Stock Orders
              </a>
              <a href="/stock-management" className="bg-chai-gold text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <ArchiveIcon className="mr-3 flex-shrink-0 h-6 w-6 text-white" />
                Stock Management
              </a>
              <a href="/deep-cleaning" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <ClipboardCheckIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Deep Cleaning
              </a>
              <a href="/schedule" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <CalendarIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Staff Schedule
              </a>
              <a href="/tasks" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <ClipboardListIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Tasks
              </a>
              <a href="/announcements" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <BellIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Announcements
              </a>
              <a href="/users" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <UsersIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                User Management
              </a>
              <a href="/settings" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <SettingsIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Settings
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 z-20 w-full bg-[#1c1f2a]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-chai-gold rounded-full flex items-center justify-center mr-2">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <h1 className="text-white font-bold text-lg">Chaiiwala</h1>
          </div>
          <button
            onClick={toggleMobileMenu}
            className="text-white focus:outline-none"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-10 bg-[#1c1f2a] pt-14">
          <nav className="px-4 pt-4 pb-5 space-y-1">
            <a href="/" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <HomeIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Dashboard
            </a>
            <a href="/maintenance" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <WrenchIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Maintenance
            </a>
            <a href="/event-orders" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <CalendarDaysIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Event Orders
            </a>
            <a href="/stock-orders" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <PackageIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Stock Orders
            </a>
            <a href="/stock-management" className="bg-chai-gold text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <ArchiveIcon className="mr-3 flex-shrink-0 h-6 w-6 text-white" />
              Stock Management
            </a>
            <a href="/deep-cleaning" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <ClipboardCheckIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Deep Cleaning
            </a>
            <a href="/schedule" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <CalendarIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Staff Schedule
            </a>
            <a href="/tasks" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <ClipboardListIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Tasks
            </a>
            <a href="/announcements" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <BellIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Announcements
            </a>
            <a href="/users" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <UsersIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              User Management
            </a>
            <a href="/settings" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <SettingsIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Settings
            </a>
          </nav>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6 px-4 sm:px-6 lg:px-8 mt-12 md:mt-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Stock Management</h1>
                <p className="mt-1 text-sm text-gray-500">Manage your Chaiiwala product stock</p>
              </div>
              <div className="mt-4 md:mt-0 flex flex-col items-end">
                <div className="bg-gray-100 px-3 py-1 rounded-md flex items-center">
                  <span className="text-sm font-medium mr-2">Logged in as:</span>
                  <span className="text-sm text-chai-gold font-semibold">{currentUser.name}</span>
                </div>
              </div>
            </div>

            {/* Store-specific indicator for store managers */}
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <ShoppingBasket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inventoryData.length}</div>
                  <p className="text-xs text-muted-foreground">
                    items in stock
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Drink Items</CardTitle>
                  <Coffee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{drinksCount}</div>
                  <p className="text-xs text-muted-foreground">
                    beverage products
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{lowStockCount}</div>
                  <p className="text-xs text-muted-foreground">
                    items need reordering
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{outOfStockCount}</div>
                  <p className="text-xs text-muted-foreground">
                    items completely out
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Search & Filters */}
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
                {/* Store filter - only visible to admin/regional */}
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
                  <TableCaption>Stock of Chaiiwala products as of {new Date().toLocaleDateString()}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">
                        <button className="flex items-center" onClick={() => handleSort('sku')}>
                          SKU<ArrowUpDown className="ml-2 h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button className="flex items-center" onClick={() => handleSort('product')}>
                          Product Name<ArrowUpDown className="ml-2 h-4 w-4" />
                        </button>
                      </TableHead>
                      {showStoreColumn && (
                        <TableHead>
                          <button className="flex items-center" onClick={() => handleSort('storeName')}>
                            Store<ArrowUpDown className="ml-2 h-4 w-4" />
                          </button>
                        </TableHead>
                      )}
                      <TableHead className="text-right">
                        <button className="flex items-center ml-auto" onClick={() => handleSort('price')}>
                          Price<ArrowUpDown className="ml-2 h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <button className="flex items-center mx-auto" onClick={() => handleSort('stock')}>
                          Quantity<ArrowUpDown className="ml-2 h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button className="flex items-center" onClick={() => handleSort('category')}>
                          Category<ArrowUpDown className="ml-2 h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button className="flex items-center" onClick={() => handleSort('status')}>
                          Status<ArrowUpDown className="ml-2 h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {isStoreManager
                            ? `No products found for your store (${currentStoreName})`
                            : 'No products found matching your criteria'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((item) => (
                        <TableRow key={item.sku + '-' + item.storeId}>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.product}</TableCell>
                          {showStoreColumn && (
                            <TableCell>{item.storeName || '-'}</TableCell>
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
                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>Start</Button>
                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(currentPage + 1)}>Next</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
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
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSaveChanges(editItem)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
