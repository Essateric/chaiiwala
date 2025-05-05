import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WrenchIcon, ActivityIcon, CheckCircleIcon } from "lucide-react";
import JobLogSection from "@/components/Maintenance/JobLogSection";
import MaintenanceCalendar from "@/components/Maintenance/MaintenanceCalendar";
import { useJobLogs } from "@/hooks/use-joblogs";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export default function MaintenancePage() {
  const { jobLogs } = useJobLogs();

  return (
    <DndProvider backend={HTML5Backend}>
    
    <DashboardLayout>
      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Maintenance Tasks</CardTitle>
            <CardDescription>
              Track and manage maintenance tasks for all equipment and facilities
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

        {/* <MaintenanceCalendar jobLogs={jobLogs} /> */}
        <JobLogSection />
      </div>
    </DashboardLayout>
        </DndProvider>
  );
}
