import { useState, useEffect } from 'react';
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
  X
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import inventory data from the stock file
const inventoryData = [
  { itemCode: "BP401", secondaryCode: "FPBC101", product: "Masala Beans", price: 52.91, stock: 10, category: "Food", status: "in_stock" },
  { itemCode: "BP402", secondaryCode: "FPBC102", product: "Daal", price: 32.39, stock: 8, category: "Food", status: "in_stock" },
  { itemCode: "BP440", secondaryCode: "FPBC105", product: "Mogo Sauce", price: 9.00, stock: 15, category: "Food", status: "in_stock" },
  { itemCode: "BP460", secondaryCode: "FPBC106", product: "Paneer Sauce", price: 43.26, stock: 5, category: "Food", status: "low_stock" },
  { itemCode: "BP461", secondaryCode: "FF709", product: "Chilli Chutney", price: 11.00, stock: 3, category: "Food", status: "low_stock" },
  { itemCode: "BP447", secondaryCode: "FPBC107", product: "Pau Bhaji", price: 25.50, stock: 7, category: "Food", status: "in_stock" },
  { itemCode: "BP404", secondaryCode: "FF715", product: "Kunafa Pisatchio Mix", price: 16.10, stock: 12, category: "Food", status: "in_stock" },
  { itemCode: "DP127", secondaryCode: "FPFC208", product: "Gajar Halwa (1 piece)", price: 30.00, stock: 0, category: "Food", status: "out_of_stock" },
  { itemCode: "BP405", secondaryCode: "FPFC209", product: "Gulab Jaman (1 piece)", price: 52.02, stock: 4, category: "Food", status: "low_stock" },
  { itemCode: "BP442", secondaryCode: "FPBC103", product: "Butter Chicken", price: 51.00, stock: 6, category: "Food", status: "in_stock" },
  { itemCode: "BP443", secondaryCode: "FPFC206", product: "Roti (50 per box)", price: 1.00, stock: 20, category: "Food", status: "in_stock" },
  { itemCode: "DP196", secondaryCode: "FF722", product: "Orange Juice (12x250ml)", price: 127.62, stock: 4, category: "Drinks", status: "low_stock" },
  { itemCode: "DP197", secondaryCode: "FF686", product: "Mini Sugared Doughnuts 13.5g (4x1)", price: 1.00, stock: 30, category: "Food", status: "in_stock" },
  { itemCode: "BP462", secondaryCode: "FF690", product: "Triple Belgium Choclate (36 x 80g)", price: 120.00, stock: 2, category: "Food", status: "low_stock" },
  { itemCode: "DP193", secondaryCode: "FF691", product: "Belgian Choclate Chunk Cookie (36x80g)", price: 120.00, stock: 0, category: "Food", status: "out_of_stock" },
  { itemCode: "FPBC109", secondaryCode: "FPBC109", product: "Limbu Pani (5L)", price: 5.00, stock: 15, category: "Drinks", status: "in_stock" },
  { itemCode: "FPFC210", secondaryCode: "FPFC210", product: "Pink Chaii Mix (50 per box)", price: 5.00, stock: 8, category: "Drinks", status: "in_stock" },
  { itemCode: "FPFC201", secondaryCode: "FPFC201", product: "Garam Choc (10 x 1 kg)", price: 5.00, stock: 10, category: "Drinks", status: "in_stock" },
  { itemCode: "DF409", secondaryCode: "DF409", product: "Karak Chaii (25 per box)", price: 10.00, stock: 3, category: "Drinks", status: "low_stock" },
  { itemCode: "FPFC203", secondaryCode: "FPFC203", product: "Karak Coffee (50 per box)", price: 10.00, stock: 12, category: "Drinks", status: "in_stock" },
  { itemCode: "FPFC204", secondaryCode: "FPFC204", product: "Karak Chaii Sugar free (50 per box)", price: 5.70, stock: 5, category: "Drinks", status: "in_stock" },
  { itemCode: "FPFC205", secondaryCode: "FPFC205", product: "Chaii Latte (1kg)", price: 5.70, stock: 0, category: "Drinks", status: "out_of_stock" },
  { itemCode: "DF427", secondaryCode: "DF427", product: "Vegan Chaii Powder", price: 5.70, stock: 8, category: "Drinks", status: "in_stock" },
  { itemCode: "FPG359", secondaryCode: "FPG359", product: "Chaiiwala Honey", price: 17.99, stock: 7, category: "Food", status: "in_stock" },
];

export default function InventoryView() {
  const [search, setSearch] = useState('');
  const [filteredData, setFilteredData] = useState(inventoryData);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState({ field: '', direction: '' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { toast } = useToast();

  // Count stats
  const lowStockCount = inventoryData.filter(item => item.status === 'low_stock').length;
  const outOfStockCount = inventoryData.filter(item => item.status === 'out_of_stock').length;
  const drinksCount = inventoryData.filter(item => item.category === 'Drinks').length;
  const foodCount = inventoryData.filter(item => item.category === 'Food').length;

  // Apply filters and search
  useEffect(() => {
    let result = [...inventoryData];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(item => 
        item.product.toLowerCase().includes(searchLower) ||
        item.itemCode.toLowerCase().includes(searchLower) ||
        item.secondaryCode.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(item => item.category === categoryFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter);
    }
    
    // Apply sorting
    if (sort.field) {
      result.sort((a, b) => {
        const aValue = a[sort.field as keyof typeof a];
        const bValue = b[sort.field as keyof typeof b];
        
        if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    setFilteredData(result);
  }, [search, categoryFilter, statusFilter, sort]);

  const handleSort = (field: string) => {
    setSort({
      field,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'In Stock';
      case 'low_stock':
        return 'Low Stock';
      case 'out_of_stock':
        return 'Out of Stock';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - desktop only */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow pt-5 bg-chai-black overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="h-12 w-12 bg-chai-gold rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <h1 className="text-white font-bold text-xl">Chaiiwala</h1>
          </div>
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              <a href="/" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <Store className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Dashboard
              </a>
              <a href="/inventory" className="bg-gray-900 text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <ShoppingBasket className="mr-3 flex-shrink-0 h-6 w-6 text-chai-gold" />
                Inventory
              </a>
              <a href="#" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                <Coffee className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300" />
                Products
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 z-20 w-full bg-chai-black">
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
        <div className="md:hidden fixed inset-0 z-10 bg-chai-black pt-14">
          <nav className="px-4 pt-4 pb-5 space-y-1">
            <a href="/" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <Store className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Dashboard
            </a>
            <a href="/inventory" className="bg-gray-900 text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <ShoppingBasket className="mr-3 flex-shrink-0 h-6 w-6 text-chai-gold" />
              Inventory
            </a>
            <a href="#" className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <Coffee className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" />
              Products
            </a>
          </nav>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6 px-4 sm:px-6 lg:px-8 mt-12 md:mt-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Inventory Management</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your Chaiiwala product inventory
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <Button 
                  className="bg-chai-gold text-white hover:bg-yellow-600"
                  onClick={() => toast({ title: "Coming soon", description: "Order functionality will be available in the next version" })}
                >
                  Order Inventory
                </Button>
              </div>
            </div>

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
                    items in inventory
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
                  placeholder="Search products, item codes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex space-x-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
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
                  <SelectTrigger className="w-[180px]">
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
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption>Inventory of Chaiiwala products as of {new Date().toLocaleDateString()}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">
                        <button 
                          className="flex items-center"
                          onClick={() => handleSort('itemCode')}
                        >
                          Item Code
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[100px]">Secondary Code</TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center"
                          onClick={() => handleSort('product')}
                        >
                          Product Name
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button 
                          className="flex items-center ml-auto"
                          onClick={() => handleSort('price')}
                        >
                          Price
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <button 
                          className="flex items-center justify-center"
                          onClick={() => handleSort('stock')}
                        >
                          Stock
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center"
                          onClick={() => handleSort('category')}
                        >
                          Category
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No products found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item) => (
                        <TableRow key={item.itemCode}>
                          <TableCell className="font-medium">{item.itemCode}</TableCell>
                          <TableCell>{item.secondaryCode}</TableCell>
                          <TableCell>{item.product}</TableCell>
                          <TableCell className="text-right">£{item.price.toFixed(2)}</TableCell>
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
                              onClick={() => toast({ title: "Coming soon", description: "Edit functionality will be available in the next version" })}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}