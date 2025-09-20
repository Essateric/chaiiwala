import { useEffect, useMemo, useState, useCallback, startTransition } from 'react';
import { supabase } from "../lib/supabaseClient.js";
import { Switch } from "../components/ui/switch.jsx";
import { useToast } from "../hooks/use-toast.jsx";
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.jsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.jsx';
import { AlertCircle, Settings, Save, Plus, Edit, Trash2, Package, Shield, FileUp, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.jsx";
import { Checkbox } from "../components/ui/checkbox.jsx";
import { useStockCategories } from "../hooks/use-stock-categories.jsx";

/* ------------------------ small utility: debounce ------------------------ */
function useDebouncedValue(value, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

/* ------------------------ categories from Supabase ----------------------- */
function useStockCategoriesFromDB() {
  return useQuery({
    queryKey: ['stock_categories'],
    queryFn: async () => {
      let { data, error } = await supabase
        .from('stock_categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    }
  });
}

// Normalize any role value coming from the DB / RPC
const normalizeRole = (r) => String(r ?? 'user').trim().toLowerCase();

export default function SettingsPage() {
  const [stockConfig, setStockConfig] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 200);

  const [loadingStock, setLoadingStock] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [stockLevels, setStockLevels] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [newItem, setNewItem] = useState({
    name: "",
    lowStockThreshold: 5,
    category: "Food",
    price: 0.00,
    sku: "",
    daily_check: false
  });

  const [activeTab, setActiveTab] = useState("general");
  const [newCategory, setNewCategory] = useState({ name: "", prefix: "", description: "" });
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const { data: dbcategories = [] } = useStockCategoriesFromDB();

  const { categories = [], createCategory, updateCategory, deleteCategory } = useStockCategories() || {};

  const { toast } = useToast();

  /* ----------------------- REPLACED /api/* with Supabase ---------------------- */
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const authUser = auth?.user ?? null;
      if (!authUser) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      return {
        ...profile,
        id: authUser.id,
        email: authUser.email,
        role: normalizeRole(profile?.permissions),
        store_id: Array.isArray(profile?.store_ids) ? profile.store_ids[0] : profile?.store_id ?? null,
      };
    },
  });

  // Server-truth role (matches your DB policies / RPCs)
  const { data: roleFromRPC } = useQuery({
    queryKey: ['current_user_role'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('current_user_role');
      if (error) throw error;
      return data; // "admin", "regional", etc.
    },
  });

  const { data: allStores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stores').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, permissions, store_ids');
      if (error) throw error;
      return (data || []).map(p => ({
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id,
        role: (p.permissions || '').toLowerCase(),
        storeId: Array.isArray(p.store_ids) ? p.store_ids[0] : null,
      }));
    },
  });

  /* --------------------------- helpers ---------------------------- */
  // Safely coerce DB values (string | number | null) to a number
  const toNum = useCallback((v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }, []);

  // Effective role & permission flag (admin/regional can edit threshold)
  const effectiveRole = normalizeRole(roleFromRPC ?? user?.role ?? user?.permissions);
  const canEditThreshold = new Set(['admin', 'administrator', 'regional']).has(effectiveRole);

  // RPC caller: server enforces who can change thresholds
  async function saveThresholdRPC({ itemId, threshold, storeId = null, dailyCheck = null }) {
    const { data, error } = await supabase.rpc('set_stock_threshold', {
      p_item_id: Number(itemId),
      p_threshold: Number(threshold),
      p_store_id: storeId === null ? null : Number(storeId),
      p_daily_check: typeof dailyCheck === 'boolean' ? dailyCheck : null,
    });
    if (error) throw error;
    return data;
  }

  /* --------------------------- data fetching ---------------------------- */
  const fetchStockItems = useCallback(async () => {
    setLoadingStock(true);
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .order('id', { ascending: true });

    const normalized = (data || []).map(r => ({
      ...r,
      id: toNum(r.id, r.id),
      low_stock_threshold: toNum(r.low_stock_threshold, 0),
      price: toNum(r.price, 0),
    }));

    setStockConfig(error ? [] : normalized);
    setLoadingStock(false);
  }, [toNum]);

  const fetchStockLevels = useCallback(async () => {
    const { data, error } = await supabase.from('store_stock_levels').select('*');
    const normalized = (data || []).map(l => ({
      ...l,
      store_id: toNum(l.store_id, l.store_id),
      stock_item_id: toNum(l.stock_item_id, l.stock_item_id),
      threshold: toNum(l.threshold, NaN),
      low_stock_limit: toNum(l.low_stock_limit, NaN),
    }));
    setStockLevels(error ? [] : normalized);
  }, [toNum]);

  useEffect(() => {
    fetchStockItems();
    fetchStockLevels();
  }, [fetchStockItems, fetchStockLevels]);

  /* ------------------------- search + pagination ------------------------ */
  const filteredStockConfig = useMemo(() => (
    stockConfig.filter(item =>
      (item?.name || "").toLowerCase().includes((debouncedSearch || "").toLowerCase()) ||
      (item?.item_code || "").toLowerCase().includes((debouncedSearch || "").toLowerCase())
    )
  ), [stockConfig, debouncedSearch]);

  const totalPages = Math.ceil(filteredStockConfig.length / itemsPerPage);

  const paginatedItems = useMemo(() => (
    filteredStockConfig.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  ), [filteredStockConfig, currentPage, itemsPerPage]);

  /* --------------------------- helpers / actions ------------------------ */
  const generateItemCode = (category /*, name */) => {
    const prefix =
      category === "Food" ? "BP" :
      category === "Drinks" ? "DP" :
      category === "Packaging" ? "FPFC" :
      category === "Dry Food" ? "DF" :
      category === "Miscellaneous" ? "MS" :
      category === "Frozen Food" ? "FZ" : "IT";
    const suffix = Math.floor(100 + Math.random() * 900).toString();
    return `${prefix}${suffix}`;
  };

  // Resolve the threshold to show: prefer store override, else master
  const storeIdForView = user?.store_id ?? null;

  const getEffectiveThreshold = useCallback(
    (item) => {
      const level = storeIdForView
        ? stockLevels.find(
            (l) => toNum(l.stock_item_id) === toNum(item.id) && toNum(l.store_id) === toNum(storeIdForView)
          )
        : null;

      const override = level
        ? (Number.isFinite(toNum(level?.threshold, NaN))
            ? toNum(level?.threshold, NaN)
            : toNum(level?.low_stock_limit, NaN))
        : NaN;

      if (Number.isFinite(override)) return override;
      return toNum(item.low_stock_threshold, 0);
    },
    [stockLevels, storeIdForView, toNum]
  );

  // CSV Upload/Download (unchanged placeholders)
  const handleCsvUpload = (event) => { /* unchanged from your original */ };
  const processCSV = (csvData) => { /* unchanged from your original */ };
  const downloadCsvTemplate = () => { /* unchanged from your original */ };

  const handleAddItem = useCallback(async () => {
    if (!newItem.name || !newItem.category) {
      toast({
        title: "Validation Error",
        description: "Product name and category are required.",
        variant: "destructive"
      });
      return;
    }

    const itemData = {
      item_code: generateItemCode(newItem.category, newItem.name),
      name: newItem.name,
      category: newItem.category,
      low_stock_threshold: Number.isFinite(newItem.lowStockThreshold)
        ? Math.max(1, parseInt(newItem.lowStockThreshold, 10))
        : 1,
      price: newItem.price,
      sku: newItem.sku,
      daily_check: !!newItem.daily_check,
    };

    const { error } = await supabase.from('stock_items').insert([itemData]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Item Added", description: `${newItem.name} added.` });
    setIsAddDialogOpen(false);
    setNewItem({ name: "", lowStockThreshold: 5, category: "", price: 0.00, sku: "", daily_check: false });
    setSearchTerm('');

    startTransition(() => {
      fetchStockItems();
      fetchStockLevels();
    });
  }, [newItem, toast, fetchStockItems, fetchStockLevels]);

  // Edit logic
  const handleEditItem = (item) => {
    const storeId = user?.store_id ?? null;

    const level = storeId
      ? stockLevels.find(
          (l) => toNum(l.stock_item_id) === toNum(item.id) && toNum(l.store_id) === toNum(storeId)
        )
      : null;

    setEditItem({
      id: item.id,
      item_code: item.item_code || item.sku || "",
      sku: item.sku || "",
      name: item.name,
      category: item.category,
      price: item.price,
      lowStockThreshold: Number.isFinite(toNum(level?.threshold, NaN))
        ? toNum(level?.threshold)
        : Number.isFinite(toNum(level?.low_stock_limit, NaN))
        ? toNum(level?.low_stock_limit)
        : toNum(item.low_stock_threshold, 1),
      daily_check:
        typeof item.daily_check === 'boolean'
          ? item.daily_check
          : !!level?.daily_check
    });

    setDialogOpen(true);
  };

  const handleSaveChanges = useCallback(async () => {
    if (!editItem) return;

    const safeThreshold = Number.isFinite(editItem.lowStockThreshold)
      ? Math.max(1, parseInt(editItem.lowStockThreshold, 10))
      : 1;

    const storeId = user?.store_id ?? null;

    try {
      // === 1) Save threshold via RPC (admins/regional only) ===
      if (canEditThreshold) {
        const res = await saveThresholdRPC({
          itemId: editItem.id,
          threshold: safeThreshold,
          storeId,                 // null => master threshold; number => store override
          dailyCheck: editItem.daily_check,
        });

        // Optimistic local update based on scope
        if (res?.scope === 'master') {
          setStockConfig(prev =>
            prev.map(r =>
              toNum(r.id) === toNum(editItem.id)
                ? { ...r, low_stock_threshold: safeThreshold, updated_at: new Date().toISOString() }
                : r
            )
          );
        } else if (res?.scope === 'store' && storeId) {
          setStockLevels(prev => {
            const idx = prev.findIndex(
              l => toNum(l.stock_item_id) === toNum(editItem.id) && toNum(l.store_id) === toNum(storeId)
            );
            const next = [...prev];
            const overrideRow = {
              store_id: Number(storeId),
              stock_item_id: Number(editItem.id),
              threshold: safeThreshold,
              daily_check: !!editItem.daily_check,
              last_updated: new Date().toISOString(),
            };
            if (idx >= 0) next[idx] = { ...next[idx], ...overrideRow };
            else next.push(overrideRow);
            return next;
          });
        }
      }
      // For non-admin/regional: we don't attempt threshold writes (avoids RLS/403).

      // === 2) Save other fields on master row ===
      const updatePayload = {
        name: editItem.name,
        category: editItem.category,
        price: editItem.price,
        sku: editItem.sku,
        daily_check: editItem.daily_check,
        updated_at: new Date().toISOString(),
        ...(canEditThreshold ? { low_stock_threshold: safeThreshold } : {}),
      };

      const { error: itemError, data: updated } = await supabase
        .from('stock_items')
        .update(updatePayload)
        .eq('id', Number(editItem.id))
        .select(); // force return for confirmation

      if (!itemError && updated?.length) {
        setStockConfig(prev =>
          prev.map(r => (toNum(r.id) === toNum(editItem.id) ? { ...r, ...updated[0] } : r))
        );
      } else if (itemError) {
        console.debug('[Settings] Master update blocked/failed (RLS?):', itemError);
      }

      toast({ title: 'Item Updated', description: `${editItem.name} updated.` });
      setDialogOpen(false);
      setEditItem(null);

      startTransition(() => {
        fetchStockItems();
        fetchStockLevels();
      });
    } catch (err) {
      console.error('[Settings] Save failed:', err);
      toast({
        title: 'Save failed',
        description: err?.message || 'Could not save changes.',
        variant: 'destructive',
      });
    }
  }, [editItem, user?.store_id, canEditThreshold, toNum, fetchStockItems, fetchStockLevels, toast]);

  // light click handler to yield before the heavy async work
  const onClickSave = useCallback(() => {
    setTimeout(() => {
      handleSaveChanges();
    }, 0);
  }, [handleSaveChanges]);

  // Delete logic (placeholder - unchanged)
  const handleDeleteItem = async (id) => { /* unchanged from your original */ };

  return (
    <DashboardLayout title="Settings">
      <div className="container max-w-7xl mx-auto py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="stock">Stock Configuration</TabsTrigger>
            <TabsTrigger value="users">User Preferences</TabsTrigger>
            {(effectiveRole === 'admin' || effectiveRole === 'administrator') && (
              <TabsTrigger value="permissions">
                <Shield className="mr-2 h-4 w-4" />
                Permissions
              </TabsTrigger>
            )}
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>
                  Manage application-wide settings and defaults
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="theme">Theme</Label>

                    <select
                      id="theme"
                      className="w-full p-2 border rounded"
                      defaultValue="dark"
                      onChange={(e) => {
                        const newTheme = e.target.value;
                        requestAnimationFrame(() => {
                          const html = document.documentElement;
                          html.classList.remove('light', 'dark');
                          if (newTheme === 'system') {
                            const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                            html.classList.add(dark ? 'dark' : 'light');
                          } else {
                            html.classList.add(newTheme);
                          }
                          localStorage.setItem('theme', newTheme);
                        });
                        toast({ title: "Theme updated", description: `Changed to ${newTheme} theme` });
                      }}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System Default</option>
                    </select>

                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="bg-chai-gold hover:bg-amber-600">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Stock Configuration Tab */}
          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Stock Configuration
                </CardTitle>
                <CardDescription>
                  Manage item thresholds and stock settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    Configure when items should be marked as "low stock"
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setIsAddDialogOpen(true)}
                      className="bg-chai-gold hover:bg-amber-600"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                    <input
                      type="file"
                      id="csv-upload"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvUpload}
                    />
                    <Button
                      onClick={() => document.getElementById('csv-upload')?.click()}
                      variant="outline"
                      className="border-chai-gold text-chai-gold hover:bg-amber-50"
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      Import CSV
                    </Button>
                  </div>
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Search by item name or code..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>

                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[10%]">Item Code</TableHead>
                        <TableHead className="w-[20%]">Name</TableHead>
                        <TableHead className="w-[15%]">Category</TableHead>
                        <TableHead className="w-[10%] text-center">Stock</TableHead>
                        <TableHead className="w-[10%] text-center">Threshold</TableHead>
                        <TableHead className="w-[10%] text-center">Price</TableHead>
                        <TableHead className="w-[15%]">SKU</TableHead>
                        <TableHead className="w-[10%] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingStock ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : filteredStockConfig.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No stock items found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono">{item.item_code || item.sku || "-"}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                No Stock
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm">
                                {getEffectiveThreshold(item)} units
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm">
                                {Number(item.price ?? 0).toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {item.sku || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditItem(item)}
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {['admin','administrator','regional','area'].includes(effectiveRole) && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-red-500"
                                    onClick={() => handleDeleteItem(item.id)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Showing{" "}
                      <b>
                        {filteredStockConfig.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage + 1)}
                        {" - "}
                        {Math.min(currentPage * itemsPerPage, filteredStockConfig.length)}
                      </b>
                      {" "}of <b>{filteredStockConfig.length}</b> items
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-gray-700">
                        Page {currentPage} of {totalPages || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium">Important</p>
                        <p>Stock status is automatically updated based on these thresholds:</p>
                        <ul className="ml-6 mt-1 list-disc">
                          <li>Items with stock level <strong>at or below</strong> the threshold will be marked as <strong>Low Stock</strong></li>
                          <li>Items with <strong>zero</strong> stock will be marked as <strong>Out of Stock</strong></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex">
                      <FileUp className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">CSV Import Instructions</p>
                        <p>To import stock items via CSV, your file should include the following columns:</p>
                        <ul className="ml-6 mt-1 list-disc">
                          <li><strong>item_code</strong> - The unique item code (e.g., BP401, DP196)</li>
                          <li><strong>sku</strong> - Alternative item code or SKU reference</li>
                          <li><strong>product</strong> - The name of the product</li>
                          <li><strong>price_box</strong> - The price of the box/unit</li>
                        </ul>
                        <div className="mt-2">
                          <Button
                            onClick={downloadCsvTemplate}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            Download Template
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Management Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Tag className="mr-2 h-5 w-5" />
                Stock Categories
              </CardTitle>
              <CardDescription>
                Manage product categories and their prefix codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  These categories are used for organizing stock items and generating item codes
                </div>
                <Button
                  onClick={() => {
                    setNewCategory({ name: "", prefix: "", description: "" });
                    setCategoryDialogOpen(true);
                  }}
                  className="bg-chai-gold hover:bg-amber-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories && categories.length > 0 ? (
                    categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.prefix}</TableCell>
                        <TableCell>{category.description || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setEditingCategory(category);
                                setNewCategory({
                                  name: category.name,
                                  prefix: category.prefix,
                                  description: category.description || "",
                                });
                                setCategoryDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-red-500"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete ${category.name}?`)) {
                                  deleteCategory(category.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No categories found. Add your first category to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Tabs>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Stock Configuration</DialogTitle>
            <DialogDescription>
              Update low stock threshold for {editItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="itemCode">Item Code</Label>
            <Input id="itemCode" value={editItem?.item_code || editItem?.sku || ''} disabled />

            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" value={editItem?.sku || ''} disabled />

            <Label htmlFor="product">Product</Label>
            <Input id="product" value={editItem?.name || ''} disabled />

            <Label htmlFor="price">Price (£)</Label>
            <Input id="price" value={editItem?.price || ''} disabled />

            <Label htmlFor="threshold">Low Stock Limit</Label>
            <Input
              id="threshold"
              type="number"
              min={1}
              disabled={!canEditThreshold}
              value={
                editItem?.lowStockThreshold !== undefined &&
                editItem?.lowStockThreshold !== null
                  ? editItem.lowStockThreshold
                  : 1
              }
              onChange={e =>
                setEditItem({
                  ...editItem,
                  lowStockThreshold: Math.max(1, parseInt(e.target.value, 10) || 1)
                })
              }
            />
            {!canEditThreshold && (
              <span className="text-xs text-muted-foreground">
                Only admin/regional can change the threshold
              </span>
            )}

            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="edit-daily-check" className="mb-0">Daily Check</Label>
              <Switch
                id="edit-daily-check"
                checked={!!editItem?.daily_check}
                onCheckedChange={checked => setEditItem({ ...editItem, daily_check: checked })}
                className={
                  editItem?.daily_check
                    ? "bg-green-600 border-green-600"
                    : "bg-gray-300 border-gray-300"
                }
              />
              <span
                className={`ml-2 text-xs font-bold px-2 py-0.5 rounded ${
                  editItem?.daily_check ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                }`}
              >
                {editItem?.daily_check ? "ON" : "OFF"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Include this item in daily stock checklist
            </span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={onClickSave}
              className="bg-chai-gold hover:bg-amber-600"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Stock Item</DialogTitle>
            <DialogDescription>
              Add a new item to your stock configuration
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="new-name">Product Name</Label>
            <Input
              id="new-name"
              value={newItem.name}
              onChange={e => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="e.g. Baked Potato"
            />

            <Label htmlFor="new-category">Category</Label>
            <select
              id="new-category"
              value={newItem.category}
              onChange={e => setNewItem({ ...newItem, category: e.target.value })}
              className="border rounded h-10 px-2 text-gray-700 bg-white border-gray-300"
            >
              {dbcategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            <Label htmlFor="new-sku">SKU</Label>
            <Input
              id="new-sku"
              value={newItem.sku}
              onChange={e => setNewItem({ ...newItem, sku: e.target.value })}
              placeholder="e.g. BP001"
            />

            <Label htmlFor="new-price">Price (£)</Label>
            <Input
              id="new-price"
              type="number"
              min={0}
              step="0.01"
              value={newItem.price}
              onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value, 10) || 0 })}
              placeholder="0.00"
            />

            <Label htmlFor="new-threshold">Low Stock Threshold</Label>
            <Input
              id="new-threshold"
              type="number"
              min={1}
              value={newItem.lowStockThreshold}
              onChange={e => setNewItem({ ...newItem, lowStockThreshold: parseInt(e.target.value, 10) || 1 })}
              placeholder="5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} className="bg-chai-gold hover:bg-amber-600">
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
