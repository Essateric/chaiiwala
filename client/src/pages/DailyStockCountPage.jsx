import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/UseAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, StoreIcon, Calendar as CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; // Assuming you have this from shadcn/ui
import { format } from "date-fns";


const STOCK_CATEGORIES = {
  PACKAGING: "Packaging",
  FRESH: "Fresh",
  PANTRY: "Pantry",
};

const ALL_STOCK_ITEMS_CONFIG = [
  // Packaging
  { id: 'pkg_leak_proof_box', name: 'Leak-proof box for sandwiches/cheesecakes', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_hot_cups_8oz', name: 'Hot drink cups 8oz', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_sip_lids', name: 'Sip through lids', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_large_cups_12oz', name: 'Large 12oz Cups', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_large_lids_12oz', name: 'Large 12oz Lids', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_greaseproof_paper_chaiiwala', name: 'Greaseproof paper Chaiiwala times paper', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_printed_greaseproof_bag', name: 'Printed Greaseproof Paper Bag', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_printed_carrier_bag_medium', name: 'Printed paper carrier bag MEDIUM', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_wooden_stirrer', name: 'Wooden Stirrer', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_wooden_knives', name: 'Wooden Knives', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_wooden_spoons', name: 'Wooden Spoons', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_wooden_forks', name: 'Wooden Forks', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_cup_carrier_2', name: 'Cup Carrier (2cup)', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_cup_carrier_4', name: 'Cup Carrier (4cup)', category: STOCK_CATEGORIES.PACKAGING },
  { id: 'pkg_blue_roll', name: 'Blue Roll', category: STOCK_CATEGORIES.PACKAGING },

  // Fresh
  { id: 'fresh_gajar_halwa', name: 'Gajar Halwa (1 piece)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_gulab_jaman', name: 'Gulab Jaman (1 piece)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_butter_chicken', name: 'Butter Chicken', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_roti', name: 'Roti (50 per box)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_mini_sugared_doughnuts', name: 'Mini Sugared Doughnuts 13.5g (4x1)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_triple_belgium_choc_cookie', name: 'Triple Belgium Choclate (36 x 80g)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_belgian_choc_chunk_cookie', name: 'Belgian Choclate Chunk Cookie (36x80g)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_rose_ice_cream', name: 'Rose Ice Cream (5L)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_mango_ice_cream', name: 'Mango Ice Cream (5L)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_vanilla_ice_cream', name: 'Vanilla Ice Cream (5L)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_chicken_seekh_kebab', name: 'Chicken Seekh Kebab', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_hashbrowns', name: 'Hashbrowns 4x2.5kg', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_mozzarella_cheese', name: 'Mozzarella Cheese (6x 2kg per box)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_frozen_chips', name: 'Frozen Chips (4x2.5kg)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_chicken_tikka_boti', name: 'Chicken Tikka Boti', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_large_samosa', name: 'Large Samosa (10x6)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_breakfast_chicken_sausages', name: 'Breakfast Chicken Sausages (55g)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_aloo_paratha', name: 'Aloo Paratha', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_victoria_cake_roll', name: 'Victoria Cake Roll Polly (12 per box)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_fererro_cake_roll', name: 'Fererro cake Rolly Polly (12 per box)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_caramel_biscoff_cookie_pie', name: 'Caramel Biscoff Cookie Pie (16 per box)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_rocky_road_cheesecake', name: 'Rocky Road Cheesecake (16 per box)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_chocolate_lovin_spoon_cake', name: 'Chocolate Lovin Spoon Cake (16 per box)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_ny_vanilla_cheesecake', name: 'NY Vanilla Cheesecake (16 per box)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_biscoff_milk_cake', name: 'Biscoff Milk Cake 6 pack', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_pistachio_milk_cake', name: 'Pistachio Milk Cake 6 pack', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_white_chocolate_coconut_slice', name: 'White Chocolate Coconut Slice (18 per box)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_bhaklava_fudge_cake', name: 'Bhaklava Fudge Cake', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_chaii_cake', name: 'Chaii Cake', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_kheema_mix', name: 'Kheema Mix 500g', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_chicken_tikka_pasties', name: 'Chicken Tikka Pasties (150g)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_cheese_jalapeno_pasties', name: 'Cheese & Jalapeno Pasties (150g)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_chicken_sweetcorn_pasties', name: 'Chicken & Sweetcorn Pasties (150g)', category: STOCK_CATEGORIES.FRESH },
  { id: 'fresh_sausage_roll', name: 'Sausage roll', category: STOCK_CATEGORIES.FRESH },

  // Pantry
  { id: 'pantry_pink_chaii_mix', name: 'Pink Chaii Mix (50 per box)', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_karak_chaii', name: 'Karak Chaii (25 per box)', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_chaii_latte', name: 'Chaii Latte (1kg)', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_vegan_chaii_powder', name: 'Vegan Chaii Powder', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_monin_caramel_syrup', name: 'Monin Caramel Syrup (1L)', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_blue_curacao_syrup', name: 'Blue Curacao Syrup (70cl)', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_strawberry_syrup_sf', name: 'Strawberry Syrup SF (1L)', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_speculoos_sauce', name: 'Speculouse Sauce (1kg)', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_luxury_white_choc_sauce', name: 'Luxury White Chocolate Sauce', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_milk_choc_topping_sauce', name: 'Milk Choc Topping Sauce', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_frappe_powder', name: 'Frappe Powder (2kg)', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_loaf_cake', name: 'Loaf cake', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_tikka_crisp', name: 'Tikka crisp', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_chilli_lime_crisps', name: 'Chilli & Lime Crisps x 24', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_decaf_coffee_beans', name: 'Decaf Coffee Beans', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_coffee_beans', name: 'Coffee Beans', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_yogurt_mint_sauce', name: 'Yogurt and Mint Sauce', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_masala_sauce', name: 'Masala Sauce for Chips/Sandwiches', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_naan', name: 'Naan', category: STOCK_CATEGORIES.PANTRY },
  { id: 'pantry_puri', name: 'Puri', category: STOCK_CATEGORIES.PANTRY },
];

const initializeStockDataWithDefaults = (fetchedItems = []) => {
  const fetchedMap = new Map(fetchedItems.map(item => [item.id, item.quantity]));
  return ALL_STOCK_ITEMS_CONFIG.map(configItem => ({
    ...configItem,
    quantity: fetchedMap.get(configItem.id) || 0,
  }));
};

const formatDateToYYYYMMDD = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (`0${d.getMonth() + 1}`).slice(-2);
  const day = (`0${d.getDate()}`).slice(-2);
  return `${year}-${month}-${day}`;
};

const getOperationalDateForEntry = (currentDateTime) => {
  const date = new Date(currentDateTime);
  if (date.getHours() < 1) { // Before 1 AM, counts for the previous calendar day
    date.setDate(date.getDate() - 1);
  }
  return formatDateToYYYYMMDD(date);
};

const checkIsEditable = (operationalDateStr, currentDateTime, userPermissions) => {
  if (userPermissions === "regional") {
    return true; // Regional managers can always edit any selected date
  }
  // Existing logic for store managers
  const opDate = new Date(operationalDateStr);
  const cutoff = new Date(opDate);
  cutoff.setDate(opDate.getDate() + 1);
  cutoff.setHours(1, 0, 0, 0); // 1:00:00 AM on the day AFTER operationalDateStr
  return currentDateTime < cutoff;
};

export default function DailyStockCountPage() {
  const { profile, isLoading: isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const reactQueryClient = useQueryClient();

  const [currentOperationalDate, setCurrentOperationalDate] = useState(null);
  const [isEditable, setIsEditable] = useState(false);
  const [stockItems, setStockItems] = useState(() => initializeStockDataWithDefaults([]));
  const [pageMessage, setPageMessage] = useState("Initializing...");
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [selectedStoreName, setSelectedStoreName] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);


  useEffect(() => {
    const now = new Date();
    const opDateStr = getOperationalDateForEntry(now);
    setCurrentOperationalDate(opDateStr);
    // isEditable will be set in another useEffect that depends on profile and currentOperationalDate
  }, []); // Runs once on mount to set initial operational date

  const {
    data: fetchedStockEntry,
    isLoading: isLoadingStockData,
    error: stockDataError,
  } = useQuery({
    queryKey: ["dailyStockCount", currentOperationalDate, selectedStoreId],
    queryFn: async () => {
      if (!currentOperationalDate || !selectedStoreId) return null;
      const { data, error } = await supabase
        .from("daily_stock_entries")
        .select("stock_items, operational_date")
        .eq("store_id", selectedStoreId)
        .eq("operational_date", currentOperationalDate)
        .maybeSingle(); // Use maybeSingle to handle no row found gracefully

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!currentOperationalDate && !!selectedStoreId && (profile?.permissions === "store" || profile?.permissions === "regional"),
    onSuccess: (data) => {
      setStockItems(initializeStockDataWithDefaults(data?.stock_items || []));
    },
    onError: () => {
      setStockItems(initializeStockDataWithDefaults([])); // Reset to defaults on error
      toast({ title: "Error", description: "Could not load existing stock data.", variant: "destructive" });
    }
  });

  useEffect(() => {
    if (profile?.permissions && currentOperationalDate) {
      const now = new Date();
      setIsEditable(checkIsEditable(currentOperationalDate, now, profile.permissions));
    }
  }, [profile, currentOperationalDate]);

  useEffect(() => {
    if (profile && profile.permissions === "store" && profile.stores && profile.stores.length > 0) {
      setSelectedStoreId(profile.stores[0].id);
      setSelectedStoreName(profile.stores[0].name);
    } else if (profile && profile.permissions === "regional" && (!profile.stores || profile.stores.length === 0)) {
      // Regional manager with no stores assigned in profile.stores
      setPageMessage("No stores available for management. Please contact an administrator.");
    } else if (profile && profile.permissions === "regional" && !selectedStoreId) {
      setPageMessage("Please select a store to manage its stock count.");
    }
  }, [profile]);


  useEffect(() => {
    if (isLoadingAuth || !currentOperationalDate) {
      setPageMessage("Loading authentication details...");
      return;
    }
    if (!profile || !["store", "regional"].includes(profile.permissions)) {
      setPageMessage("Access Denied. This page is for Store and Regional Managers only.");
      return;
    }

    if (profile.permissions === "store" && (!profile.stores || profile.stores.length === 0)) {
      setPageMessage("No store assigned to your profile. Please contact an administrator.");
      return;
    }

    if (profile.permissions === "regional" && (!profile.stores || profile.stores.length === 0)) {
        setPageMessage("No stores are currently assigned for your region. Please contact an administrator.");
        return;
    }

    if (profile.permissions === "regional" && !selectedStoreId) {
      setPageMessage("Please select a store to view or edit its stock count.");
      return;
    }

    if (isLoadingStockData) {
      setPageMessage(`Loading stock count for ${selectedStoreName || 'selected store'} on ${currentOperationalDate}...`);
      return;
    }
    if (stockDataError) {
      setPageMessage(`Error loading data for ${selectedStoreName || 'selected store'} on ${currentOperationalDate}.`);
      return;
    }

    if (isEditable) {
      const baseMessage = fetchedStockEntry ? `Editing stock count` : `Enter new stock count`;
      const forStoreAndDate = `for ${selectedStoreName || 'selected store'} on ${currentOperationalDate}.`;
      const regionalMessage = profile?.permissions === 'regional' ? " You can change the date above." : "";
      setPageMessage(`${baseMessage} ${forStoreAndDate}${regionalMessage}`);
    } else {
      // This branch should now primarily be for store managers after the cutoff
      setPageMessage(fetchedStockEntry ? `Viewing stock count for ${selectedStoreName || 'selected store'} on ${currentOperationalDate}. Editing is closed for this date.` : `No stock count found for ${selectedStoreName || 'selected store'} on ${currentOperationalDate}. Editing window is closed for this date.`);
    }
  }, [isLoadingAuth, profile, selectedStoreId, selectedStoreName, isLoadingStockData, stockDataError, currentOperationalDate, isEditable, fetchedStockEntry]);


  const handleQuantityChange = (itemId, quantityStr) => {
    if (!isEditable) return;
    const quantity = Math.max(0, parseInt(quantityStr, 10) || 0);
    setStockItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const saveStockMutation = useMutation({
    mutationFn: async (currentStockItemsToSave) => {
      if (!isEditable) {
        // This message is more relevant for store managers
        throw new Error(profile?.permissions === 'store' ? "Editing window is closed for this date." : "Editing is not currently allowed.");
      }
      if (!selectedStoreId || !currentOperationalDate || !profile?.id) {
        throw new Error("User profile, store, or date information is missing.");
      }

      const payload = {
        store_id: selectedStoreId,
        profile_id: profile.id,
        operational_date: currentOperationalDate,
        stock_items: currentStockItemsToSave.map(({ id, name, category, quantity }) => ({ id, name, category, quantity })),
      };

      const { data, error } = await supabase
        .from("daily_stock_entries")
        .upsert(payload, { onConflict: "store_id,operational_date" })
        .select(); // select().single() might error if upsert results in multiple rows (should not happen with onConflict)
                  // or if it results in 0 rows (e.g. RLS prevents insert/update)

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: `Stock count for ${selectedStoreName || 'selected store'} on ${currentOperationalDate} saved successfully.`, variant: "success" });
      reactQueryClient.invalidateQueries({ queryKey: ["dailyStockCount", currentOperationalDate, selectedStoreId] });
    },
    onError: (error) => {
      toast({ title: "Save Error", description: error.message || "Failed to save stock count.", variant: "destructive" });
    },
  });

  if (isLoadingAuth) {
    return (
      <DashboardLayout title="Daily Stock Count">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
          <p className="ml-2">Loading user data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || !["store", "regional"].includes(profile.permissions)) {
    return (
      <DashboardLayout title="Daily Stock Count">
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">This page is only accessible to Store and Regional Managers.</p>
        </div>
      </DashboardLayout>
    );
  }

   if (profile.permissions === "store" && (!profile.stores || profile.stores.length === 0)) {
    return (
      <DashboardLayout title="Daily Stock Count">
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold">Store Not Assigned</h2>
          <p className="text-muted-foreground">Your profile is not associated with a store. Please contact an administrator.</p>
        </div>
      </DashboardLayout>
    );
  }
  if (profile.permissions === "regional" && (!profile.stores || profile.stores.length === 0)) {
    return (
      <DashboardLayout title="Daily Stock Count">
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold">No Stores Available</h2>
          <p className="text-muted-foreground">No stores are assigned for your management. Please contact an administrator.</p>
        </div>
      </DashboardLayout>
    );
  }

  const groupedItems = stockItems.reduce((acc, item) => {
    const category = item.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <DashboardLayout title="Daily Stock Count">
      <div className="container mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
                Daily Stock for {selectedStoreName ? `${selectedStoreName} on ` : ''}{currentOperationalDate || "Today"}
            </CardTitle>
            <CardDescription>{pageMessage}</CardDescription>
          </CardHeader>

          {/* Store and Date Selectors */}
          {(profile.permissions === "regional" || profile.permissions === "store") && (
            <CardContent className="pb-0">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                {profile.permissions === "regional" && profile.stores && profile.stores.length > 0 && (
                  <div className="flex-1 min-w-[200px]">
                      <Label htmlFor="store-select">Select Store</Label>
                      <Select
                          value={selectedStoreId || ""}
                          onValueChange={(value) => {
                              const store = profile.stores.find(s => s.id === value);
                              setSelectedStoreId(value);
                              setSelectedStoreName(store ? store.name : null);
                          }}
                      >
                          <SelectTrigger id="store-select">
                              <SelectValue placeholder="Choose a store..." />
                          </SelectTrigger>
                          <SelectContent>
                              {profile.stores.map(store => (
                                  <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                )}

                {profile.permissions === "regional" && (
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="date-select">Operational Date</Label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="date-select"
                          variant={"outline"}
                          className={`w-full justify-start text-left font-normal ${!currentOperationalDate && "text-muted-foreground"}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {currentOperationalDate ? format(new Date(currentOperationalDate + 'T00:00:00'), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={currentOperationalDate ? new Date(currentOperationalDate + 'T00:00:00') : undefined}
                          onSelect={(date) => {
                            setCurrentOperationalDate(date ? formatDateToYYYYMMDD(date) : null);
                            setDatePickerOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </CardContent>
          )}

          <CardContent className="space-y-8">
            {isLoadingStockData && selectedStoreId && !stockDataError && (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
                <p className="ml-2">Loading stock items...</p>
              </div>
            )}
            {stockDataError && (
                 <p className="text-red-500 text-center">Error loading stock data: {stockDataError.message}</p>
            )}

            {(!selectedStoreId && profile.permissions === "regional") && (
                <p className="text-center text-muted-foreground py-10">Please select a store to proceed.</p>
            )}

            {selectedStoreId && !isLoadingStockData && !stockDataError && Object.entries(STOCK_CATEGORIES).map(([key, categoryName]) => (
              <div key={categoryName} className="space-y-4">
                <h3 className="text-xl font-semibold border-b pb-2">{categoryName}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  {(groupedItems[categoryName] || []).map((item) => (
                    <div key={item.id} className="space-y-1">
                      <Label htmlFor={item.id} className="text-sm font-medium">
                        {item.name}
                      </Label>
                      <Input
                        id={item.id}
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        disabled={!isEditable || saveStockMutation.isPending || !selectedStoreId}
                        className="w-full"
                        placeholder="Qty"
                      />
                    </div>
                  ))}
                </div>
                 {(!groupedItems[categoryName] || groupedItems[categoryName].length === 0) && (
                    <p className="text-sm text-muted-foreground">No items configured for this category.</p>
                )}
              </div>
            ))}
          </CardContent>
          {selectedStoreId && isEditable && !isLoadingStockData && !stockDataError && (
            <CardFooter>
              <Button
                onClick={() => saveStockMutation.mutate(stockItems)}
                disabled={!isEditable || saveStockMutation.isPending || isLoadingStockData || !selectedStoreId}
                className="w-full sm:w-auto bg-chai-gold hover:bg-yellow-600"
              >
                {saveStockMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Stock Count
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
// import