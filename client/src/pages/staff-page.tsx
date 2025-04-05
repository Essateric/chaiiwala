import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/app-layout";
import StoreSelector from "@/components/common/store-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Users, Calendar, Plus } from "lucide-react";

export default function StaffPage() {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  
  const { data: stores, isLoading: isLoadingStores } = useQuery({
    queryKey: ["/api/stores"],
  });
  
  const { data: storeStaff, isLoading: isLoadingStaff } = useQuery({
    queryKey: ["/api/stores", selectedStoreId, "staff"],
    enabled: !!selectedStoreId,
  });

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold">Staff Management</h2>
            <p className="text-gray-400">Manage staff and schedules across all Chaiwala stores</p>
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
        
        {/* Staff Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-dark-secondary border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{storeStaff?.length || 0}</div>
              <p className="text-xs text-gray-400">
                {selectedStoreId ? storeStaff?.filter(s => s.isManager).length || 0 : 0} managers
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-secondary border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled Today</CardTitle>
              <Calendar className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-gray-400">4 morning, 5 evening, 3 full-day</p>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-secondary border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Staff</CardTitle>
              <User className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-gray-400">Available for scheduling</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Staff List */}
        <Card className="bg-dark-secondary border-gray-700 mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Store Staff</CardTitle>
            <Button className="bg-gold hover:bg-gold-dark text-dark">
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </CardHeader>
          <CardContent>
            {!selectedStoreId ? (
              <div className="text-center py-8 text-gray-400">
                Select a store to view staff members
              </div>
            ) : isLoadingStaff ? (
              <div className="text-center py-8 text-gray-400">
                Loading staff data...
              </div>
            ) : storeStaff && storeStaff.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {storeStaff.map((staff) => (
                  <div key={staff.id} className="bg-dark p-4 rounded-lg border border-gray-700 flex items-center space-x-4">
                    <Avatar className="h-12 w-12 bg-gold text-dark">
                      <AvatarFallback>{getInitials(staff.user.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{staff.user.fullName}</p>
                      <p className="text-xs text-gray-400 truncate">{staff.position}</p>
                      <div className="flex items-center mt-1 space-x-2">
                        {staff.isManager && (
                          <Badge variant="secondary" className="text-xs bg-gold text-dark">
                            Manager
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs border-gray-700">
                          {staff.user.email}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No staff members found for this store.
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Schedule */}
        <Card className="bg-dark-secondary border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weekly Schedule</CardTitle>
            <Button variant="outline" className="border-gray-700">
              <Calendar className="h-4 w-4 mr-2" />
              View Full Schedule
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-400">
              Schedule functionality will be implemented in the next phase.
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
