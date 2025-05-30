import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/UseAuth";
import { useStores } from "@/hooks/use-stores";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ShoppingCartIcon, 
  TruckIcon, 
  PackageIcon, 
  CoffeeIcon, 
  StoreIcon,
  BuildingIcon,
  ShoppingBagIcon,
  MoreVerticalIcon,
  X as XIcon,
  Check as CheckIcon,
  CalendarIcon,
  UserIcon
} from "lucide-react";

export default function StockOrdersPage() {
  // Fetch user data for access control
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  // Access control check
  useEffect(() => {
    if (!user) return;
    const allowedStoreIds = [1, 2, 3, 4, 5, 6, 7];
    const canAccessStockOrders = 
      profile.permissions === 'admin' || 
      profile.permissions === 'regional' || 
      (profile.permissions === 'store' && profile.storeId && allowedStoreIds.includes(profile.storeId));
    if (!canAccessStockOrders) {
      // Redirect unauthorized users to dashboard
      console.log("Unauthorized access to Stock Orders page, redirecting to dashboard");
      navigate("/");
    }
  }, [user, navigate]);
  
  // State variables for dialog visibility
  const [openChaiiwalaDialog, setOpenChaiiwalaDialog] = useState(false);
  const [openLocalDialog, setOpenLocalDialog] = useState(false);
  const [openFreshwaysDialog, setOpenFreshwaysDialog] = useState(false);
  const [openAmazonDialog, setOpenAmazonDialog] = useState(false);
  
  // State for order receipt dialog
  const [openReceiptDialog, setOpenReceiptDialog] = useState(false);
  const [receiptDate, setReceiptDate] = useState('');
  
  // Initialize received by with current user's name
  const [receivedBy, setReceivedBy] = useState(() => {
    return user?.name || '';
  });
  
  // Initialize location with the user's assigned store
  const [receiptLocation, setReceiptLocation] = useState(() => {
    return 'Chaiiwala Stockport Road';
  });
  
  // Get real store locations from the database
  const { stores: storeLocations } = useStores();
  
  // State for Freshways order form with dynamic total calculation
  const [selectedItems, setSelectedItems] = useState({
    milk: false,
    bread: false,
    buns: false,
    yoghurt: false,
    eggs: false,
    oatMilk: false
  });
  
  // Item prices for Freshways order
  const itemPrices = {
    'milk': { name: 'Milk (Pack of 6)', price: 5.49 },
    'bread': { name: 'Bread (Item)', price: 1.99 },
    'buns': { name: 'Buns (Pack of 6)', price: 2.49 },
    'yoghurt': { name: 'Yoghurt (Tub)', price: 3.29 },
    'eggs': { name: 'Eggs', price: 2.79 },
    'oatMilk': { name: 'Oat Milk (Carton)', price: 1.89 }
  };
  
  // Calculate total price whenever selected items change
  const calculateTotalPrice = () => {
    return Object.entries(selectedItems).reduce((total, [key, isSelected]) => {
      if (isSelected && itemPrices[key]) {
        return total + itemPrices[key].price;
      }
      return total;
    }, 0);
  };
  
  const totalPrice = calculateTotalPrice();
  
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
            {/* Order Type Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Chaiiwala Order */}
              <Dialog open={openChaiiwalaDialog} onOpenChange={setOpenChaiiwalaDialog}>
                <DialogTrigger asChild>
                  <Button className="h-24 flex flex-col items-center justify-center gap-2" variant="outline">
                    <CoffeeIcon className="h-8 w-8 text-chai-gold" />
                    <span>Chaiiwala Order</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>New Chaiiwala Order</DialogTitle>
                    <DialogDescription>
                      Place an order for supplies from Chaiiwala headquarters
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="order-number" className="text-right">
                        Order #
                      </Label>
                      <Input
                        id="order-number"
                        placeholder="Auto-generated"
                        disabled
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="items" className="text-right">
                        Items
                      </Label>
                      <Textarea
                        id="items"
                        placeholder="Enter items and quantities (one per line)"
                        className="col-span-3"
                        rows={5}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="notes" className="text-right">
                        Notes
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special instructions"
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setOpenChaiiwalaDialog(false)} variant="outline">
                      Cancel
                    </Button>
                    <Button type="submit">Place Order</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Local Order */}
              <Dialog open={openLocalDialog} onOpenChange={setOpenLocalDialog}>
                <DialogTrigger asChild>
                  <Button className="h-24 flex flex-col items-center justify-center gap-2" variant="outline">
                    <StoreIcon className="h-8 w-8 text-green-600" />
                    <span>Local Order</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>New Local Order</DialogTitle>
                    <DialogDescription>
                      Place an order for supplies from local vendors
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="vendor" className="text-right">
                        Vendor
                      </Label>
                      <Input
                        id="vendor"
                        placeholder="Vendor name"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="items-local" className="text-right">
                        Items
                      </Label>
                      <Textarea
                        id="items-local"
                        placeholder="Enter items and quantities (one per line)"
                        className="col-span-3"
                        rows={5}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="notes-local" className="text-right">
                        Notes
                      </Label>
                      <Textarea
                        id="notes-local"
                        placeholder="Any special instructions"
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setOpenLocalDialog(false)} variant="outline">
                      Cancel
                    </Button>
                    <Button type="submit">Place Order</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Freshways Order */}
              <Dialog open={openFreshwaysDialog} onOpenChange={setOpenFreshwaysDialog}>
                <DialogTrigger asChild>
                  <Button className="h-24 flex flex-col items-center justify-center gap-2" variant="outline">
                    <BuildingIcon className="h-8 w-8 text-blue-600" />
                    <span>Freshways Order</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>New Freshways Order</DialogTitle>
                    <DialogDescription>
                      Place an order for supplies from Freshways
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      // Collect all checked items with prices
                      const orderItems = [];
                      let totalPrice = 0;
                      Object.entries(selectedItems).forEach(([key, isSelected]) => {
                        if (isSelected && itemPrices[key]) {
                          orderItems.push({
                            name: itemPrices[key].name,
                            price: itemPrices[key].price,
                            priceFormatted: `£${itemPrices[key].price.toFixed(2)}`
                          });
                          totalPrice += itemPrices[key].price;
                        }
                      });
                      // Format account number and delivery date
                      const accountNumber = formData.get('account-number');
                      const deliveryDate = formData.get('delivery-date');
                      // Generate order ID with user's initials
                      const currentDate = new Date();
                      const year = currentDate.getFullYear().toString().slice(-2);
                      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                      const day = String(currentDate.getDate()).padStart(2, '0');
                      const dateStr = `${year}${month}${day}`;
                      // Get user initials from logged in user (or default to UA)
                      const userInitials = user?.username 
                        ? user.username.substring(0, 2).toUpperCase() 
                        : 'UA';
                      const orderId = `FW-${userInitials}${dateStr}-01`;
                      // Send order to webhook with hardcoded store information
                      fetch('https://hook.eu2.make.com/onukum5y8tnoo3lebhxe2u6op8dfj3oy', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          orderId,
                          accountNumber,
                          deliveryDate,
                          items: orderItems,
                          orderType: 'Freshways',
                          store: 'Chaiiwala Stockport Road',
                          storeAddress: '165 Stockport Road, Manchester M12 4WH',
                          storePhone: '+44-161-273-7890',
                          notes: formData.get('notes'),
                          totalPrice: totalPrice,
                          totalPriceFormatted: `£${totalPrice.toFixed(2)}`
                        }),
                      })
                        .then((response) => {
                          if (response.ok) {
                            alert('Freshways order submitted successfully!');
                            setOpenFreshwaysDialog(false);
                          } else {
                            alert('Failed to submit order. Please try again.');
                          }
                        })
                        .catch((error) => {
                          console.error('Error submitting order:', error);
                          alert('Error submitting order. Please try again.');
                        });
                    }}
                  >
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="store-info" className="text-right pt-2">
                          Store
                        </Label>
                        <div className="col-span-3 border rounded-md p-3 bg-muted/50">
                          <input type="hidden" name="store-name" value="Chaiiwala Stockport Road" />
                          <div className="space-y-1">
                            <p className="font-medium">Chaiiwala Stockport Road</p>
                            <p className="text-sm text-muted-foreground">165 Stockport Road</p>
                            <p className="text-sm text-muted-foreground">Manchester M12 4WH</p>
                            <p className="text-sm text-muted-foreground">Tel: +44-161-273-7890</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="account-number" className="text-right">
                          Account #
                        </Label>
                        <Input
                          id="account-number"
                          name="account-number"
                          placeholder="Your Freshways account number"
                          className="col-span-3"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">
                          Items
                        </Label>
                        <div className="col-span-3 border rounded-md p-3 space-y-2">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left pb-2">Item</th>
                                <th className="text-right pb-2">Price</th>
                                <th className="text-center pb-2 w-24">Order</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(itemPrices).map(([key, item]) => (
                                <tr key={key}>
                                  <td className="py-2">{item.name}</td>
                                  <td className="text-right">£{item.price.toFixed(2)}</td>
                                  <td className="text-center">
                                    <input 
                                      type="checkbox" 
                                      name={key} 
                                      id={key} 
                                      className="h-4 w-4"
                                      checked={selectedItems[key]}
                                      onChange={(e) => {
                                        setSelectedItems({
                                          ...selectedItems,
                                          [key]: e.target.checked
                                        });
                                      }}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Total price display */}
                      <div className="mt-4 border-t pt-4">
                        <div className="flex justify-between items-center font-medium">
                          <span>Total Order Value:</span>
                          <span className="text-lg text-right">
                            £{calculateTotalPrice().toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="delivery-date" className="text-right">
                          Delivery Date
                        </Label>
                        <Input
                          id="delivery-date"
                          name="delivery-date"
                          type="date"
                          className="col-span-3"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">
                          Notes
                        </Label>
                        <Textarea
                          id="notes"
                          name="notes"
                          placeholder="Any special instructions or notes"
                          className="col-span-3"
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" onClick={() => setOpenFreshwaysDialog(false)} variant="outline">
                        Cancel
                      </Button>
                      <Button type="submit">Place Order</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Amazon Order */}
              <Dialog open={openAmazonDialog} onOpenChange={setOpenAmazonDialog}>
                <DialogTrigger asChild>
                  <Button className="h-24 flex flex-col items-center justify-center gap-2" variant="outline">
                    <ShoppingBagIcon className="h-8 w-8 text-amber-600" />
                    <span>Amazon Order</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>New Amazon Order</DialogTitle>
                    <DialogDescription>
                      Place an order for supplies from Amazon
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="amazon-account" className="text-right">
                        Account
                      </Label>
                      <Input
                        id="amazon-account"
                        placeholder="Amazon Business account email"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="items-amazon" className="text-right">
                        Items
                      </Label>
                      <Textarea
                        id="items-amazon"
                        placeholder="Enter items and quantities, with URLs if possible (one per line)"
                        className="col-span-3"
                        rows={5}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="priority" className="text-right">
                        Priority
                      </Label>
                      <select
                        id="priority"
                        className="col-span-3 border rounded p-2"
                        defaultValue="standard"
                      >
                        <option value="standard">Standard Delivery</option>
                        <option value="expedited">Expedited Delivery</option>
                        <option value="next-day">Next Day Delivery</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setOpenAmazonDialog(false)} variant="outline">
                      Cancel
                    </Button>
                    <Button type="submit">Place Order</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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
                      <TableRow data-order-id="FW-UA250410-01">
                        <TableCell>Apr 10, 2025</TableCell>
                        <TableCell className="font-medium">FW-UA250410-01</TableCell>
                        <TableCell>Freshways</TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">View Items</Button>
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
                      {/* This is where new received orders will be added */}
                      <TableRow data-order-id="CH-UA230409-01">
                        <TableCell>Apr 9, 2025</TableCell>
                        <TableCell className="font-medium">CH-UA230409-01</TableCell>
                        <TableCell>Chaiiwala</TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">View Items</Button>
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
                          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Received</Badge>
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
                                  className="flex items-center justify-start px-2 h-9 gap-2"
                                >
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
              
              // Create a custom notification instead of using the browser's alert
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
              
              // Handle the OK button click
              const okButton = notification.querySelector('button');
              if (okButton) {
                okButton.addEventListener('click', () => {
                  document.body.removeChild(notification);
                });
              }
              
              // Auto remove after 5 seconds
              setTimeout(() => {
                if (document.body.contains(notification)) {
                  document.body.removeChild(notification);
                }
              }, 5000);
              
              // Update the order status in the UI
              // In a real implementation, we would update the database as well
              const orderRow = document.querySelector('tr[data-order-id="FW-UA250410-01"]');
              if (orderRow) {
                // Get the order details
                const orderDate = orderRow.querySelector('td:nth-child(1)')?.textContent || 'Apr 10, 2025';
                const orderId = orderRow.querySelector('td:nth-child(2)')?.textContent || 'FW-UA250410-01';
                const supplier = orderRow.querySelector('td:nth-child(3)')?.textContent || 'Freshways';
                // Remove the row from the "pending" tab
                orderRow.remove();
                // Add the order to the "received" tab with the updated status
                const receivedOrdersTable = document.getElementById('received-orders-table');
                if (receivedOrdersTable) {
                  const newRow = document.createElement('tr');
                  newRow.setAttribute('data-order-id', orderId);
                  // Format today's date
                  const today = new Date();
                  const formattedDate = today.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  newRow.innerHTML = `
                    <td>${orderDate}</td>
                    <td class="font-medium">${orderId}</td>
                    <td>${supplier}</td>
                    <td>
                      <button class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">View Items</button>
                    </td>
                    <td>${formattedDate}</td>
                    <td class="text-center">
                      <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-green-100 text-green-800 hover:bg-green-100">Received</span>
                    </td>
                    <td class="text-right">
                      <button class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-none bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9 p-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                      </button>
                    </td>
                  `;
                  receivedOrdersTable.appendChild(newRow);
                  // Switch to the "received" tab
                  const receivedTab = document.querySelector('[value="received"]');
                  if (receivedTab) {
                    receivedTab.click();
                  }
                }
              }
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
                  // Disabled to use the current user's name automatically
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
                    // Set default value to current date
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
                    // Disabled for non-admin users to use their assigned store
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
