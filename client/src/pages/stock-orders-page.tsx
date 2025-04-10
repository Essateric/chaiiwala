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
import { 
  ShoppingCartIcon, 
  TruckIcon, 
  PackageIcon, 
  CoffeeIcon, 
  StoreIcon,
  BuildingIcon,
  ShoppingBagIcon
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
                      
                      // Collect all checked items
                      const selectedItems = [];
                      if (formData.get('milk')) selectedItems.push('Milk (Pack of 6)');
                      if (formData.get('bread')) selectedItems.push('Bread (Item)');
                      if (formData.get('buns')) selectedItems.push('Buns (Pack of 6)');
                      if (formData.get('yoghurt')) selectedItems.push('Yoghurt (Tub)');
                      if (formData.get('eggs')) selectedItems.push('Eggs');
                      if (formData.get('oatMilk')) selectedItems.push('Oat Milk (Carton)');
                      
                      // Format account number and delivery date
                      const accountNumber = formData.get('account-number');
                      const deliveryDate = formData.get('delivery-date');
                      
                      // Send order to webhook with hardcoded store information
                      fetch('https://hook.eu2.make.com/onukum5y8tnoo3lebhxe2u6op8dfj3oy', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          accountNumber,
                          deliveryDate,
                          items: selectedItems,
                          orderType: 'Freshways',
                          store: 'Chaiiwala Stockport Road',
                          storeAddress: '165 Stockport Road, Manchester M12 4WH, United Kingdom',
                          storePhone: '+44-161-273-7890',
                          notes: formData.get('notes')
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
                            <p className="text-sm text-muted-foreground">United Kingdom</p>
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
                <Alert>
                  <ShoppingCartIcon className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    No pending stock orders. Orders that have been placed but not yet shipped will appear here.
                  </AlertDescription>
                </Alert>
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