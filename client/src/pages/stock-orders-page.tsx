import React from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingCartIcon, TruckIcon, PackageIcon } from "lucide-react";

export default function StockOrdersPage() {
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