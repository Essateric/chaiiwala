import React from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, ClockIcon, CheckCircleIcon } from "lucide-react";

export default function EventOrdersPage() {
  return (
    <DashboardLayout title="Event Orders">
      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Event Orders Management</CardTitle>
            <CardDescription>
              Manage and track catering orders for events and special occasions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upcoming">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="inProgress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="p-4">
                <Alert>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    No upcoming event orders. You will see future event orders here.
                  </AlertDescription>
                </Alert>
              </TabsContent>
              <TabsContent value="inProgress" className="p-4">
                <Alert>
                  <ClockIcon className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    No event orders in progress. Orders currently being prepared will appear here.
                  </AlertDescription>
                </Alert>
              </TabsContent>
              <TabsContent value="completed" className="p-4">
                <Alert>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    No completed event orders. Your history of fulfilled orders will be displayed here.
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