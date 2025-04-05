import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/app-layout";
import StoreSelector from "@/components/common/store-selector";
import SummaryCard from "@/components/dashboard/summary-card";
import MaintenanceLogTable from "@/components/maintenance/maintenance-log-table";
import MaintenanceJobForm from "@/components/maintenance/maintenance-job-form";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { Loader2, Plus, FileDown, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MaintenancePage() {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: stores, isLoading: isLoadingStores } = useQuery({
    queryKey: ["/api/stores"],
  });
  
  const { data: maintenanceStats, isLoading: isLoadingMaintenanceStats } = useQuery({
    queryKey: ["/api/maintenance/stats", selectedStoreId],
    enabled: selectedStoreId !== null,
  });
  
  const { data: maintenanceJobs, isLoading: isLoadingMaintenanceJobs } = useQuery({
    queryKey: ["/api/maintenance", selectedStoreId],
    enabled: selectedStoreId !== null,
  });
  
  const refreshMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("GET", `/api/maintenance${selectedStoreId ? `?storeId=${selectedStoreId}` : ''}`);
      await apiRequest("GET", `/api/maintenance/stats${selectedStoreId ? `?storeId=${selectedStoreId}` : ''}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/stats"] });
      toast({
        title: "Data refreshed",
        description: "Maintenance data has been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to refresh data",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold">Maintenance Dashboard</h2>
            <p className="text-gray-400">Manage and track maintenance issues across all Chaiwala stores</p>
          </div>
          
          <div>
            <StoreSelector 
              stores={stores || []} 
              selectedStoreId={selectedStoreId} 
              onSelectStore={setSelectedStoreId}
              isLoading={isLoadingStores}
            />
          </div>
        </div>
        
        {/* Maintenance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Open Issues"
            value={maintenanceStats?.openJobs.toString() || "—"}
            subValue={maintenanceStats ? `${maintenanceStats.highPriorityJobs} high priority` : "Loading..."}
            trend={maintenanceStats?.jobsLastWeek > 0 ? "up" : "neutral"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            iconBgColor="bg-red-500"
            isLoading={isLoadingMaintenanceStats}
          />
          
          <SummaryCard
            title="Resolved Issues"
            value={maintenanceStats?.resolvedJobs.toString() || "—"}
            subValue="This month"
            trend={maintenanceStats?.resolvedJobs > 0 ? "up" : "neutral"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
            iconBgColor="bg-green-500"
            isLoading={isLoadingMaintenanceStats}
          />
          
          <SummaryCard
            title="Avg Resolution Time"
            value={maintenanceStats?.avgResolutionTime ? maintenanceStats.avgResolutionTime.toFixed(1) : "—"}
            subValue="Days"
            trend="down"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            iconBgColor="bg-blue-500"
            isLoading={isLoadingMaintenanceStats}
          />
          
          <SummaryCard
            title="Pending Approvals"
            value={maintenanceStats?.pendingApprovals.toString() || "—"}
            subValue="Requiring attention"
            trend="neutral"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }
            iconBgColor="bg-yellow-500"
            isLoading={isLoadingMaintenanceStats}
          />
        </div>
        
        {/* Maintenance Actions and Log Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Actions and Priority Distribution */}
          <div className="lg:col-span-1">
            <div className="bg-dark-secondary rounded-lg p-6 border border-gray-700 mb-6">
              <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
              
              <Button 
                className="w-full bg-gold hover:bg-gold-dark text-dark font-medium py-2 px-4 rounded mb-3 flex items-center justify-center"
                onClick={() => setIsModalOpen(true)}
                disabled={!selectedStoreId}
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Job Log
              </Button>
              
              <Button 
                className="w-full bg-dark-secondary hover:bg-dark border border-gray-700 text-white font-medium py-2 px-4 rounded mb-3 flex items-center justify-center"
                variant="outline"
              >
                <FileDown className="h-5 w-5 mr-2" />
                Export Reports
              </Button>
              
              <Button 
                className="w-full bg-dark-secondary hover:bg-dark border border-gray-700 text-white font-medium py-2 px-4 rounded flex items-center justify-center"
                variant="outline"
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
              >
                {refreshMutation.isPending ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-5 w-5 mr-2" />
                )}
                Refresh Data
              </Button>
            </div>
            
            {maintenanceStats && (
              <div className="bg-dark-secondary rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-medium mb-4">Priority Distribution</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-red-400">High Priority</span>
                      <span className="text-sm text-gray-400">{maintenanceStats.priorityDistribution.high} Issues</span>
                    </div>
                    <div className="w-full bg-dark rounded-full h-2.5">
                      <div 
                        className="bg-red-500 h-2.5 rounded-full" 
                        style={{ 
                          width: `${
                            maintenanceStats.openJobs > 0 
                              ? (maintenanceStats.priorityDistribution.high / maintenanceStats.openJobs) * 100 
                              : 0
                          }%`
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-yellow-400">Medium Priority</span>
                      <span className="text-sm text-gray-400">{maintenanceStats.priorityDistribution.medium} Issues</span>
                    </div>
                    <div className="w-full bg-dark rounded-full h-2.5">
                      <div 
                        className="bg-yellow-500 h-2.5 rounded-full" 
                        style={{ 
                          width: `${
                            maintenanceStats.openJobs > 0 
                              ? (maintenanceStats.priorityDistribution.medium / maintenanceStats.openJobs) * 100 
                              : 0
                          }%`
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-green-400">Normal Priority</span>
                      <span className="text-sm text-gray-400">{maintenanceStats.priorityDistribution.normal} Issues</span>
                    </div>
                    <div className="w-full bg-dark rounded-full h-2.5">
                      <div 
                        className="bg-green-500 h-2.5 rounded-full" 
                        style={{ 
                          width: `${
                            maintenanceStats.openJobs > 0 
                              ? (maintenanceStats.priorityDistribution.normal / maintenanceStats.openJobs) * 100 
                              : 0
                          }%`
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-blue-400">Low Priority</span>
                      <span className="text-sm text-gray-400">{maintenanceStats.priorityDistribution.low} Issues</span>
                    </div>
                    <div className="w-full bg-dark rounded-full h-2.5">
                      <div 
                        className="bg-blue-500 h-2.5 rounded-full" 
                        style={{ 
                          width: `${
                            maintenanceStats.openJobs > 0 
                              ? (maintenanceStats.priorityDistribution.low / maintenanceStats.openJobs) * 100 
                              : 0
                          }%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column - Job Logs Table */}
          <div className="lg:col-span-2">
            <MaintenanceLogTable 
              maintenanceJobs={maintenanceJobs || []} 
              isLoading={isLoadingMaintenanceJobs} 
            />
          </div>
        </div>
        
        {/* Create New Job Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-dark-secondary border-gray-700 text-white max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Create New Job Log</DialogTitle>
              <DialogDescription className="text-gray-400">
                Log a new maintenance job or issue that needs attention.
              </DialogDescription>
            </DialogHeader>
            {selectedStoreId && (
              <MaintenanceJobForm 
                storeId={selectedStoreId} 
                onSuccess={() => {
                  setIsModalOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/maintenance/stats"] });
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
