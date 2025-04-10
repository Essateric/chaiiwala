import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
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
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  
  // Access control check
  useEffect(() => {
    if (!user) return;
    
    const allowedStoreIds = [1, 2, 3, 4, 5, 6, 7]; // IDs of the 7 allowed store locations
    const canAccessStockOrders = 
      user.role === 'admin' || 
      user.role === 'regional' || 
      (user.role === 'store' && user.storeId && allowedStoreIds.includes(user.storeId));
    
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
  const [receivedBy, setReceivedBy] = useState('');
  const [receiptLocation, setReceiptLocation] = useState('');
  
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
                      
                      // Define the item structure type
                      type OrderItem = {
                        name: string;
                        price: number;
                        priceFormatted: string;
                      };
                      
                      // Collect all checked items with prices
                      const selectedItems: OrderItem[] = [];
                      const itemPrices = {
                        'milk': { name: 'Milk (Pack of 6)', price: 5.49 },
                        'bread': { name: 'Bread (Item)', price: 1.99 },
                        'buns': { name: 'Buns (Pack of 6)', price: 2.49 },
                        'yoghurt': { name: 'Yoghurt (Tub)', price: 3.29 },
                        'eggs': { name: 'Eggs', price: 2.79 },
                        'oatMilk': { name: 'Oat Milk (Carton)', price: 1.89 }
                      };
                      
                      let totalPrice = 0;
                      
                      Object.entries(itemPrices).forEach(([key, item]) => {
                        if (formData.get(key)) {
                          selectedItems.push({
                            name: item.name,
                            price: item.price,
                            priceFormatted: `£${item.price.toFixed(2)}`
                          });
                          totalPrice += item.price;
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
                          items: selectedItems,
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
                              <tr>
                                <td className="py-2">Milk (Pack of 6)</td>
                                <td className="text-right">£5.49</td>
                                <td className="text-center">
                                  <input type="checkbox" name="milk" id="milk" className="h-4 w-4" />
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2">Bread (Item)</td>
                                <td className="text-right">£1.99</td>
                                <td className="text-center">
                                  <input type="checkbox" name="bread" id="bread" className="h-4 w-4" />
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2">Buns (Pack of 6)</td>
                                <td className="text-right">£2.49</td>
                                <td className="text-center">
                                  <input type="checkbox" name="buns" id="buns" className="h-4 w-4" />
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2">Yoghurt (Tub)</td>
                                <td className="text-right">£3.29</td>
                                <td className="text-center">
                                  <input type="checkbox" name="yoghurt" id="yoghurt" className="h-4 w-4" />
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2">Eggs</td>
                                <td className="text-right">£2.79</td>
                                <td className="text-center">
                                  <input type="checkbox" name="eggs" id="eggs" className="h-4 w-4" />
                                </td>
                              </tr>
                              <tr>
                                <td className="py-2">Oat Milk (Carton)</td>
                                <td className="text-right">£1.89</td>
                                <td className="text-center">
                                  <input type="checkbox" name="oatMilk" id="oatMilk" className="h-4 w-4" />
                                </td>
                              </tr>
                            </tbody>
                          </table>
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="inTransit">In Transit</TabsTrigger>
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
                      <TableRow>
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
              <TabsContent value="inTransit" className="p-4">
                <Alert>
                  <TruckIcon className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    No orders in transit. Orders that have been shipped but not yet received will be shown here.
                  </AlertDescription>
                </Alert>
              </TabsContent>
              <TabsContent value="received" className="p-4">
                <Alert>
                  <PackageIcon className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    No received orders. Your history of completed stock orders will be displayed here.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}