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
  UserIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "../components/ui/dialog.jsx";
import { Label } from "../components/ui/label.jsx";
import { Input } from "../components/ui/input.jsx";

import ChaiiwalaOrderDialog from "../components/orders/ChaiiwalaOrderDialog.jsx";
import LocalOrderDialog from "../components/orders/LocalOrderDialog.jsx";
import AmazonOrderDialog from "../components/orders/AmazonOrderDialog.jsx";
import FreshwaysOrderDialog from "../components/orders/FreshwayOrderDialog.jsx";

export default function StockOrdersPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { stores: storeLocations } = useStores();

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

  // Receipt dialog
  const [openReceiptDialog, setOpenReceiptDialog] = useState(false);
  const [receiptDate, setReceiptDate] = useState("");
  const [receivedBy, setReceivedBy] = useState(user?.name || "");
  const [receiptLocation, setReceiptLocation] = useState("Chaiiwala Stockport Road");

  // Freshways order state (for dialog)
  const [selectedItems, setSelectedItems] = useState({
    milk: false,
    bread: false,
    buns: false,
    yoghurt: false,
    eggs: false,
    oatMilk: false,
  });

  const itemPrices = {
    milk: { name: "Milk (Pack of 6)", price: 5.49 },
    bread: { name: "Bread (Item)", price: 1.99 },
    buns: { name: "Buns (Pack of 6)", price: 2.49 },
    yoghurt: { name: "Yoghurt (Tub)", price: 3.29 },
    eggs: { name: "Eggs", price: 2.79 },
    oatMilk: { name: "Oat Milk (Carton)", price: 1.89 },
  };

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
              <FreshwaysOrderDialog
                open={openFreshwaysDialog}
                setOpen={setOpenFreshwaysDialog}
                allowedStores={allowedStores}
                selectedStoreId={selectedStoreId}
                setSelectedStoreId={setSelectedStoreId}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                itemPrices={itemPrices}
                user={user}
                profile={profile}
              />
              {/* Amazon Order */}
              <AmazonOrderDialog open={openAmazonDialog} setOpen={setOpenAmazonDialog} />
            </div>

            {/* Tabs for pending/received orders */}
            <Tabs defaultValue="pending">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="received">Received</TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="p-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Expected Delivery</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Your dynamic mapped order rows go here! */}
                      <TableRow data-order-id="FW-UA250410-01">
                        <TableCell>Apr 10, 2025</TableCell>
                        <TableCell className="font-medium">FW-UA250410-01</TableCell>
                        <TableCell>Freshways</TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">
                                View Items
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="grid gap-2">
                                <div className="rounded-md bg-muted p-2">
                                  <table className="w-full text-sm">
                                    <tbody>
                                      <tr>
                                        <td>Milk (Pack of 6)</td>
                                        <td className="text-right">£5.49</td>
                                      </tr>
                                      <tr>
                                        <td>Bread (Item)</td>
                                        <td className="text-right">£1.99</td>
                                      </tr>
                                      <tr>
                                        <td>Eggs</td>
                                        <td className="text-right">£2.79</td>
                                      </tr>
                                      <tr>
                                        <td>Buns (Pack of 6)</td>
                                        <td className="text-right">£2.49</td>
                                      </tr>
                                      <tr>
                                        <td>Yoghurt (Tub)</td>
                                        <td className="text-right">£3.29</td>
                                      </tr>
                                      <tr>
                                        <td>Oat Milk (Carton)</td>
                                        <td className="text-right">£1.89</td>
                                      </tr>
                                      <tr className="border-t mt-2">
                                        <td className="pt-2 font-medium">Total</td>
                                        <td className="pt-2 text-right font-medium">£17.94</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>Apr 12, 2025</TableCell>
                        <TableCell className="text-center">
                          <Badge>Awaiting Confirmation</Badge>
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
                                <Button
                                  variant="ghost"
                                  className="flex items-center justify-start px-2 h-9 gap-2 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to cancel this order?")) {
                                      alert("Order cancelled successfully");
                                    }
                                  }}
                                >
                                  <XIcon className="h-4 w-4" />
                                  <span>Cancel Order</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="flex items-center justify-start px-2 h-9 gap-2 text-green-600 hover:text-green-600"
                                  onClick={() => setOpenReceiptDialog(true)}
                                >
                                  <CheckIcon className="h-4 w-4" />
                                  <span>Order Received</span>
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="received" className="p-4">
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
                      <TableRow data-order-id="CH-UA230409-01">
                        <TableCell>Apr 9, 2025</TableCell>
                        <TableCell className="font-medium">CH-UA230409-01</TableCell>
                        <TableCell>Chaiiwala</TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">
                                View Items
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="grid gap-2">
                                <div className="rounded-md bg-muted p-2">
                                  <table className="w-full text-sm">
                                    <tbody>
                                      <tr>
                                        <td>Chai Masala (500g)</td>
                                        <td className="text-right">£12.49</td>
                                      </tr>
                                      <tr>
                                        <td>Elachi Tea (250g)</td>
                                        <td className="text-right">£8.99</td>
                                      </tr>
                                      <tr>
                                        <td>Kashmiri Tea (250g)</td>
                                        <td className="text-right">£9.99</td>
                                      </tr>
                                      <tr className="border-t mt-2">
                                        <td className="pt-2 font-medium">Total</td>
                                        <td className="pt-2 text-right font-medium">£31.47</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>Apr 10, 2025</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                            Received
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
                                  <UserIcon className="h-4 w-4" />
                                  <span>View Details</span>
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      {/* Order Received Dialog */}
      <Dialog open={openReceiptDialog} onOpenChange={setOpenReceiptDialog}>
        <DialogContent className="sm:max-w-md">
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
