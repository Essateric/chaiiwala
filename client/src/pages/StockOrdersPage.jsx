import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import { useAuth } from "../hooks/UseAuth.jsx";
import { useStores } from "../hooks/use-stores.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover.jsx";
import { Button } from "../components/ui/button.jsx";
import {
  MoreVerticalIcon,
  X as XIcon,
  Check as CheckIcon,
   Building as BuildingIcon,
  UserIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog.jsx";
import { Label } from "../components/ui/label.jsx";
import { Input } from "../components/ui/input.jsx";

import ChaiiwalaOrderDialog from "../components/orders/ChaiiwalaOrderDialog.jsx";
import LocalOrderDialog from "../components/orders/LocalOrderDialog.jsx";
import AmazonOrderDialog from "../components/orders/AmazonOrderDialog.jsx";
import FreshwaysOrderDialog from "../components/orders/FreshwayOrderDialog.jsx";
import { useSupplierOrders } from "../hooks/useSupplierOrders.js"; // Import the new hook
import { useEffect } from "react"; // Import useEffect

export default function StockOrdersPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { stores: storeLocations } = useStores();
  const {
    orders: supplierOrders,
    loading: ordersLoading,
    error: ordersError,
    fetchOrders,
    updateOrderStatus
  } = useSupplierOrders();

  // Correct allowedStores: filter based on store_ids for both area/store
  const allowedStores = useMemo(() => {
    if (profile?.permissions === "admin" || profile?.permissions === "regional") {
      return storeLocations || [];
    }
    if (profile?.permissions === "area" && Array.isArray(profile?.store_ids)) {
      return (storeLocations || []).filter((store) =>
        profile.store_ids.map(String).includes(String(store.id))
      );
    }
    if (profile?.permissions === "store" && Array.isArray(profile?.store_ids)) {
      return (storeLocations || []).filter((store) =>
        profile.store_ids.map(String).includes(String(store.id))
      );
    }
    return [];
  }, [profile, storeLocations]);

  // Default selected store: first in store_ids or first in all stores
  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    if ((profile?.permissions === "store" || profile?.permissions === "area")
      && Array.isArray(profile?.store_ids) && profile.store_ids.length > 0
    ) {
      return profile.store_ids[0];
    }
    return storeLocations?.[0]?.id ?? "";
  });

  // Dialog state
  const [openChaiiwalaDialog, setOpenChaiiwalaDialog] = useState(false);
  const [openLocalDialog, setOpenLocalDialog] = useState(false);
  const [openFreshwaysDialog, setOpenFreshwaysDialog] = useState(false);
  const [openAmazonDialog, setOpenAmazonDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("pending"); // To track active tab

  // Receipt dialog
  const [openReceiptDialog, setOpenReceiptDialog] = useState(false);
  const [receiptDate, setReceiptDate] = useState("");
  const [receivedBy, setReceivedBy] = useState(user?.name || "");
  const [receiptLocation, setReceiptLocation] = useState("Chaiiwala Stockport Road");
  const [currentOrderForReceipt, setCurrentOrderForReceipt] = useState(null); // For receipt dialog context


  useEffect(() => {
    // Fetch orders based on the active tab or other filters
    // For now, "pending" tab shows "Awaiting Confirmation" and "Order Confirmed"
    // "received" tab shows "Order Delivered", "Completed", "Cancelled"
    let statusFilters = [];
    if (activeTab === "pending") {
      statusFilters = ['Awaiting Confirmation', 'Order Confirmed'];
    } else if (activeTab === "received") {
      statusFilters = ['Order Delivered', 'Completed', 'Cancelled', 'Discrepancy Found'];
    }

    // Example: Fetch all Freshways orders with specific statuses.
    // You might want to add store_id filter if applicable for the user.
    // For simplicity, fetching all for now, RLS should handle store visibility.
    if (statusFilters.length > 0) {
      // The hook's fetchOrders doesn't directly support OR on statuses,
      // so we might need to call it multiple times or adjust the hook.
      // For now, let's fetch all Freshways orders when a tab is active,
      // and let getFilteredOrders handle the display logic for specific statuses per tab.
      // This is simpler than multiple specific fetches until the hook supports 'IN' array for statuses.
      if (activeTab === "pending") {
        fetchOrders({ supplier_name: 'Freshways' }); // Fetch all Freshways, getFilteredOrders will pick relevant ones
      } else if (activeTab === "received") {
        fetchOrders({ supplier_name: 'Freshways' }); // Fetch all Freshways then filter locally
      }
    } else {
       fetchOrders({ supplier_name: 'Freshways' }); // Fetch all Freshways if no specific tab status
    }

  }, [fetchOrders, activeTab, profile]); // Add profile if store_id filtering depends on it


  const getFilteredOrders = () => {
    if (!supplierOrders) return [];
    if (activeTab === "pending") {
      return supplierOrders.filter(order => ['Awaiting Confirmation', 'Order Confirmed'].includes(order.status));
    } else if (activeTab === "received") {
      return supplierOrders.filter(order => ['Order Delivered', 'Completed', 'Cancelled', 'Discrepancy Found'].includes(order.status));
    }
    return supplierOrders;
  };

  const displayedOrders = getFilteredOrders();


  // Freshways order state (for dialog)
  const [selectedItems, setSelectedItems] = useState({
    milk: false,
    bread: false,
    buns: false,
    yoghurt: false,
    eggs: false,
    oatMilk: false,
  });

const [itemPrices, setItemPrices] = useState({});


  const calculateTotalPrice = () => {
    return Object.entries(selectedItems).reduce((total, [key, isSelected]) => {
      if (isSelected && itemPrices[key]) {
        return total + itemPrices[key].price;
      }
      return total;
    }, 0);
  };

  return (
    <DashboardLayout title="Stock Orders">
      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Stock Orders Management</CardTitle>
            <CardDescription>
              Manage inventory replenishment and track incoming stock orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Order Type Buttons (Dialogs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Chaiiwala Order */}
              <ChaiiwalaOrderDialog open={openChaiiwalaDialog} setOpen={setOpenChaiiwalaDialog} />
              {/* Local Order */}
              <LocalOrderDialog open={openLocalDialog} setOpen={setOpenLocalDialog} />
              {/* Freshways Order */}
            <div>
  <Button
    className="h-24 w-full flex flex-col items-center justify-center gap-2"
    variant="outline"
    onClick={() => setOpenFreshwaysDialog(true)}
  >
    <BuildingIcon className="h-8 w-8 text-blue-600" />
    <span>Freshways Order</span>
  </Button>

  <FreshwaysOrderDialog
    open={openFreshwaysDialog}
    setOpen={setOpenFreshwaysDialog}
    allowedStores={allowedStores}
    selectedStoreId={selectedStoreId}
    setSelectedStoreId={setSelectedStoreId}
    selectedItems={selectedItems}
    setSelectedItems={setSelectedItems}
    itemPrices={itemPrices}
    setItemPrices={setItemPrices}
    user={user}
    profile={profile}
  />
</div>


              {/* Amazon Order */}
              <AmazonOrderDialog open={openAmazonDialog} setOpen={setOpenAmazonDialog} />
            </div>

            {/* Tabs for pending/received orders */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="received">History</TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="p-4">
                {ordersLoading && <p>Loading pending orders...</p>}
                {ordersError && <p className="text-destructive">Error loading orders: {ordersError.message}</p>}
                {!ordersLoading && !ordersError && displayedOrders.length === 0 && <p>No pending orders found.</p>}
                {!ordersLoading && !ordersError && displayedOrders.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order Date</TableHead>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Store</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Expected Delivery</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedOrders.map((order) => (
                          <TableRow key={order.id} data-order-id={order.order_display_id}>
                            <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium">{order.order_display_id}</TableCell>
                            <TableCell>{order.supplier_name}</TableCell>
                            <TableCell>{order.stores?.name || order.store_id}</TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    View ({order.items?.length || 0})
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="grid gap-2">
                                    <div className="rounded-md bg-muted p-2">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr>
                                            <th className="text-left">Item</th>
                                            <th className="text-center">Qty</th>
                                            <th className="text-right">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {order.items?.map((item, index) => (
                                            <tr key={index}>
                                              <td>{item.name}</td>
                                              <td className="text-center">{item.quantity}</td>
                                              <td className="text-right">{item.subtotal}</td>
                                            </tr>
                                          ))}
                                          <tr className="border-t mt-2">
                                            <td colSpan="2" className="pt-2 font-medium">Total</td>
                                            <td className="pt-2 text-right font-medium">
                                              £{Number(order.total_price).toFixed(2)}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>{order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell>£{Number(order.total_price).toFixed(2)}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={order.status === 'Awaiting Confirmation' ? 'default' : 'secondary'}>
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVerticalIcon className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56" align="end">
                                  <div className="grid gap-1">
                                    {order.status === 'Awaiting Confirmation' && (
                                      <Button
                                        variant="ghost"
                                        className="flex items-center justify-start px-2 h-9 gap-2 text-destructive hover:text-destructive"
                                        onClick={async () => {
                                          if (confirm(`Are you sure you want to cancel order ${order.order_display_id}?`)) {
                                            const success = await updateOrderStatus(order.id, 'Cancelled');
                                            if (success) {
                                              alert(`Order ${order.order_display_id} cancelled successfully.`);
                                              // The fetchOrders might need to be called again if not automatically re-fetching
                                              // or if the local state update in useSupplierOrders isn't sufficient
                                              // For now, the local state update in the hook should handle it.
                                              // To ensure fresh data for all tabs after a status change:
                                              fetchOrders({ supplier_name: 'Freshways' });
                                            } else {
                                              alert(`Failed to cancel order ${order.order_display_id}.`);
                                            }
                                          }
                                        }}
                                      >
                                        <XIcon className="h-4 w-4" />
                                        <span>Cancel Order</span>
                                      </Button>
                                    )}
                                    {/* Add other actions based on status, e.g., Mark as Confirmed, Mark as Delivered */}
                                    <Button
                                      variant="ghost"
                                      className="flex items-center justify-start px-2 h-9 gap-2 text-green-600 hover:text-green-600"
                                      onClick={() => {
                                        setCurrentOrderForReceipt(order);
                                        setOpenReceiptDialog(true);
                                      }}
                                      // Potentially disable based on status
                                      disabled={!['Awaiting Confirmation', 'Order Confirmed'].includes(order.status)}
                                    >
                                      <CheckIcon className="h-4 w-4" />
                                      <span>Order Received</span>
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="received" className="p-4">
                 {ordersLoading && <p>Loading order history...</p>}
                {ordersError && <p className="text-destructive">Error loading order history: {ordersError.message}</p>}
                {!ordersLoading && !ordersError && displayedOrders.length === 0 && <p>No order history found.</p>}
                {!ordersLoading && !ordersError && displayedOrders.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Received Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody id="received-orders-table">
                       {displayedOrders.map((order) => (
                          <TableRow key={order.id} data-order-id={order.order_display_id}>
                            <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium">{order.order_display_id}</TableCell>
                            <TableCell>{order.supplier_name}</TableCell>
                             <TableCell>{order.stores?.name || order.store_id}</TableCell>
                            <TableCell>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    View ({order.items?.length || 0})
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="grid gap-2">
                                    <div className="rounded-md bg-muted p-2">
                                      <table className="w-full text-sm">
                                         <thead>
                                          <tr>
                                            <th className="text-left">Item</th>
                                            <th className="text-center">Qty</th>
                                            <th className="text-right">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {order.items?.map((item, index) => (
                                            <tr key={index}>
                                              <td>{item.name}</td>
                                              <td className="text-center">{item.quantity}</td>
                                              <td className="text-right">{item.subtotal}</td>
                                            </tr>
                                          ))}
                                          <tr className="border-t mt-2">
                                            <td colSpan="2" className="pt-2 font-medium">Total</td>
                                            <td className="pt-2 text-right font-medium">
                                              £{Number(order.total_price).toFixed(2)}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>{order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : 'N/A'}</TableCell>
                             <TableCell>£{Number(order.total_price).toFixed(2)}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={
                                order.status === 'Completed' ? 'success' :
                                order.status === 'Cancelled' ? 'destructive' :
                                'outline'
                                }
                                className={order.status === 'Order Delivered' ? 'bg-blue-100 text-blue-800' : ''}
                                >
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVerticalIcon className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56" align="end">
                                  <div className="grid gap-1">
                                    <Button variant="ghost" className="flex items-center justify-start px-2 h-9 gap-2">
                                      <UserIcon className="h-4 w-4" /> {/* Replace with appropriate icon e.g., EyeIcon */}
                                      <span>View Details</span>
                                    </Button>
                                    {/* Potentially add re-order or other actions for historical items */}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      {/* Order Received Dialog */}
      <Dialog open={openReceiptDialog} onOpenChange={setOpenReceiptDialog}>
        <DialogContent className="sm:max-w-md">s
          <DialogHeader>
            <DialogTitle>Mark Order as Received</DialogTitle>
            <DialogDescription>
              Enter details about who received the order and when it was received.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const notification = document.createElement('div');
              notification.style.position = 'fixed';
              notification.style.bottom = '20px';
              notification.style.right = '20px';
              notification.style.backgroundColor = '#1c1f2a';
              notification.style.color = 'white';
              notification.style.padding = '16px 24px';
              notification.style.borderRadius = '8px';
              notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              notification.style.zIndex = '9999';
              notification.style.display = 'flex';
              notification.style.flexDirection = 'column';
              notification.style.alignItems = 'center';
              notification.style.justifyContent = 'space-between';
              notification.innerHTML = `
                <p style="margin: 0 0 12px 0; font-weight: 500;">Order marked as received successfully!</p>
                <button style="background-color: #5BCEFA; color: #1c1f2a; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 500;">OK</button>
              `;
              document.body.appendChild(notification);
              const okButton = notification.querySelector('button');
              if (okButton) {
                okButton.addEventListener('click', () => {
                  document.body.removeChild(notification);
                });
              }
              setTimeout(() => {
                if (document.body.contains(notification)) {
                  document.body.removeChild(notification);
                }
              }, 5000);
              setOpenReceiptDialog(false);
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="received-by" className="text-right">
                  Received By
                </Label>
                <Input
                  id="received-by"
                  placeholder="Staff member's name"
                  className="col-span-3"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  disabled
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="received-date" className="text-right">
                  Date
                </Label>
                <div className="col-span-3 flex">
                  <Input
                    id="received-date"
                    type="date"
                    className="flex-1"
                    value={receiptDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="receipt-location" className="text-right">
                  Location
                </Label>
                {user?.role === 'admin' ? (
                  <select
                    id="receipt-location"
                    className="col-span-3 w-full p-2 border rounded"
                    value={receiptLocation}
                    onChange={(e) => setReceiptLocation(e.target.value)}
                    required
                  >
                    {storeLocations && storeLocations.length > 0 ? (
                      storeLocations.map((store) => (
                        <option key={store.id} value={store.name}>
                          {store.name}
                        </option>
                      ))
                    ) : (
                      <option value={receiptLocation}>{receiptLocation}</option>
                    )}
                  </select>
                ) : (
                  <Input
                    id="receipt-location"
                    placeholder="Store location"
                    className="col-span-3"
                    value={receiptLocation}
                    onChange={(e) => setReceiptLocation(e.target.value)}
                    disabled
                    required
                  />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenReceiptDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Confirm Receipt</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
