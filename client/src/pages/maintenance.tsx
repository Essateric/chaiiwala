import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { StoreSelector } from "@/components/layout/store-selector";
import { JobLogsTable } from "@/components/maintenance/job-logs-table";
import { NewJobModal } from "@/components/maintenance/new-job-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Filter } from "lucide-react";

export default function Maintenance() {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [viewingJobId, setViewingJobId] = useState<number | null>(null);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);

  // Handler for store selection
  const handleStoreChange = (storeId: number | null) => {
    setSelectedStoreId(storeId);
  };

  // Handler for job editing
  const handleEditJob = (jobId: number) => {
    setEditingJobId(jobId);
    // In a real app, this would open a modal with job data for editing
  };

  // Handler for job viewing
  const handleViewJob = (jobId: number) => {
    setViewingJobId(jobId);
    // In a real app, this would open a modal with job details
  };

  return (
    <MainLayout title="Maintenance" description="Manage maintenance jobs and issues">
      {/* Additional Header Content - Store Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <StoreSelector
          onStoreChange={handleStoreChange}
          selectedStoreId={selectedStoreId}
        />
      </div>
      
      {/* Maintenance Tab Navigation */}
      <div className="mb-6 border-b border-gray-700">
        <Tabs defaultValue="job-logs">
          <TabsList className="bg-transparent border-b border-gray-700 p-0">
            <TabsTrigger 
              value="job-logs" 
              className="data-[state=active]:text-[#d4af37] data-[state=active]:border-b-2 data-[state=active]:border-[#d4af37] text-gray-400 data-[state=active]:bg-transparent bg-transparent rounded-none py-2 px-3"
            >
              Job Logs
            </TabsTrigger>
            <TabsTrigger 
              value="scheduled" 
              className="data-[state=active]:text-[#d4af37] data-[state=active]:border-b-2 data-[state=active]:border-[#d4af37] text-gray-400 data-[state=active]:bg-transparent bg-transparent rounded-none py-2 px-3"
            >
              Scheduled Maintenance
            </TabsTrigger>
            <TabsTrigger 
              value="equipment" 
              className="data-[state=active]:text-[#d4af37] data-[state=active]:border-b-2 data-[state=active]:border-[#d4af37] text-gray-400 data-[state=active]:bg-transparent bg-transparent rounded-none py-2 px-3"
            >
              Equipment
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="job-logs" className="pt-4">
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-3 sm:space-y-0">
              <div className="w-full sm:w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search job logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#2d3142] border-gray-700"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Button 
                  onClick={() => setIsNewJobModalOpen(true)}
                  className="bg-[#d4af37] hover:bg-[#c4a535] text-black font-medium w-full sm:w-auto justify-center"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>New Job</span>
                </Button>
                
                <Button 
                  variant="outline"
                  className="border-gray-700 bg-[#2d3142] text-gray-200 hover:bg-[#1c1f2a] hover:text-gray-100"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  <span>Filter</span>
                </Button>
              </div>
            </div>
            
            {/* Job Logs Table */}
            <JobLogsTable 
              storeId={selectedStoreId} 
              onEdit={handleEditJob}
              onView={handleViewJob}
            />
          </TabsContent>
          
          <TabsContent value="scheduled">
            <div className="bg-[#262a38] rounded-lg shadow-md p-6">
              <div className="text-center text-gray-400 py-8">
                Scheduled maintenance functionality coming soon.
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="equipment">
            <div className="bg-[#262a38] rounded-lg shadow-md p-6">
              <div className="text-center text-gray-400 py-8">
                Equipment management functionality coming soon.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* New Job Modal */}
      <NewJobModal
        isOpen={isNewJobModalOpen}
        onClose={() => setIsNewJobModalOpen(false)}
        defaultStoreId={selectedStoreId}
      />
    </MainLayout>
  );
}
