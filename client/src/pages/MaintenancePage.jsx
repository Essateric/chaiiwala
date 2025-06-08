import { useAuth } from "../hooks/UseAuth.jsx"; // Or your equivalent like useAuth from @/hooks/use-auth
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { WrenchIcon, Loader2 } from "lucide-react";
import JobLogSection from "../components/Maintenance/JobLogSection.jsx";
// import MaintenanceCalendar from "@/components/Maintenance/MaintenanceCalendar"; // Uncomment if needed
// import { useJobLogs } from "@/hooks/use-joblogs"; // This is used within JobLogSection
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export default function MaintenancePage() {
  // const { jobLogs } = useJobLogs(); // jobLogs are fetched within JobLogSection based on user's scope
  const { profile, isLoading: isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <DashboardLayout title="Maintenance">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-chai-gold" />
          <p className="ml-2">Loading user data...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Check if the user has one of the allowed permissions
  const allowedPermissions = ["admin", "regional", "maintenance", "store"];
  if (!profile || !allowedPermissions.includes(profile.permissions)) {
    return (
      <DashboardLayout title="Maintenance">
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
    
    <DashboardLayout>
      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-4"> {/* Adjusted padding */}
            <CardTitle className="flex items-center">
              <WrenchIcon className="mr-2 h-5 w-5 text-chai-gold" />
              Maintenance
            </CardTitle>
            <CardDescription>
              Track and manage maintenance tasks for equipment and facilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 
              Tabs can be re-enabled if needed 
              <Tabs defaultValue="upcoming">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="p-4">
                  <Alert>
                    <WrenchIcon className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      No upcoming maintenance tasks scheduled. Click "Create Maintenance Task" to add a new task.
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                <TabsContent value="active" className="p-4">
                  <Alert>
                    <ActivityIcon className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      No active maintenance tasks. Maintenance tasks in progress will appear here.
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                <TabsContent value="completed" className="p-4">
                  <Alert>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      No completed maintenance tasks. Completed tasks will be shown here for record keeping.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs> 
            */}
          </CardContent>
        </Card>

        <JobLogSection />
      </div>
    </DashboardLayout>
        </DndProvider>
  );
}
