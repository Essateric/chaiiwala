import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useJobLogs } from "@/hooks/use-joblogs";
import { useAuth } from "@/hooks/UseAuth";
import { useStores } from "@/hooks/use-stores";
import { useQuery } from "@tanstack/react-query";

export default function JobLogsWidget() {
  console.log("Rendering JobLogsWidget component");
  const { user } = useAuth();
  const [selectedStoreId, setSelectedStoreId] = useState(user?.role === "store" ? user?.storeId ?? undefined : undefined);
  const [flagFilter, setFlagFilter] = useState(undefined);
  
  // Direct fetch to ensure it loads properly in the dashboard
  const { data: allJobLogs = [], isLoading, error } = useQuery({
    queryKey: ["/api/joblogs"],
  });
  
  console.log("JobLogsWidget - data fetched", { 
    count: allJobLogs.length, 
    isLoading, 
    error: error?.message,
    hasError: !!error
  });
  
  // Filter job logs based on selected store and flag
  const filteredJobLogs = useMemo(() => {
    let logs = allJobLogs;
    
    // Filter by store if selected
    if (selectedStoreId) {
      logs = logs.filter(log => log.storeId === selectedStoreId);
    }
    
    // Filter by flag if selected
    if (flagFilter) {
      logs = logs.filter(log => log.flag === flagFilter);
    }
    
    // Sort by most recent and take only top 5
    return logs
      .sort((a, b) => {
        const dateA = new Date(`${a.logDate}T${a.logTime}`);
        const dateB = new Date(`${b.logDate}T${b.logTime}`);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [allJobLogs, selectedStoreId, flagFilter]);

  // Get stores using useStores hook
  const { stores = [] } = useStores();

  function getFlagColor(flag) {
    switch (flag) {
      case "urgent":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "long_standing":
        return "bg-amber-100 text-amber-800 hover:bg-amber-200";
      default:
        return "bg-green-100 text-green-800 hover:bg-green-200";
    }
  }

  function getFlagIcon(flag) {
    switch (flag) {
      case "urgent":
        return <AlertCircle className="h-3 w-3 mr-1" />;
      case "long_standing":
        return <Clock className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Maintenance Job Logs</CardTitle>
        <div className="flex space-x-2">
          {/* Store Selection Dropdown */}
          <Select 
            value={selectedStoreId?.toString() || "all"} 
            onValueChange={(value) => {
              if (value === "all") {
                setSelectedStoreId(undefined);
              } else {
                setSelectedStoreId(parseInt(value));
              }
            }}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Select Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map(store => (
                <SelectItem key={store.id} value={store.id.toString()}>{store.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Flag Filter Dropdown */}
          <Select 
            value={flagFilter || "all"} 
            onValueChange={(value) => {
              if (value === "all") {
                setFlagFilter(undefined);
              } else {
                setFlagFilter(value);
              }
            }}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="long_standing">Long Standing</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="w-full flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredJobLogs.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">
            No job logs found with the selected filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobLogs.map((job) => (
              <JobLogItem key={job.id} job={job} stores={stores} />
            ))}
            <div className="pt-2 text-center">
              <Button variant="link" className="text-chai-gold hover:text-chai-gold/80" onClick={() => window.location.href = "/maintenance"}>
                View All Job Logs
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JobLogItem({ job, stores }) {
  // Find store name for this job
  const store = stores.find(s => s.id === job.storeId);
  const storeName = store ? store.name : "Unknown Store";
  
  // Format date
  const formattedDate = format(new Date(`${job.logDate}T${job.logTime}`), "EEE do MMM", { locale: enUS });
  
  // Get flag styling
  const flagClass = job.flag === "urgent" 
    ? "bg-red-100 text-red-800 hover:bg-red-200" 
    : job.flag === "long_standing" 
      ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
      : "bg-green-100 text-green-800 hover:bg-green-200";
  
  // Get flag icon
  const flagIcon = job.flag === "urgent" 
    ? <AlertCircle className="h-3 w-3 mr-1" />
    : job.flag === "long_standing" 
      ? <Clock className="h-3 w-3 mr-1" />
      : null;

  return (
    <div className="p-3 border rounded-md hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-1">
        <div className="font-medium truncate max-w-[75%]">{job.description}</div>
        <Badge variant="outline" className={`flex items-center ${flagClass}`}>
          {flagIcon}
          {job.flag === "long_standing" ? "Long Standing" : job.flag.charAt(0).toUpperCase() + job.flag.slice(1)}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{storeName}</span>
        <div className="flex items-center space-x-2">
          <span>{formattedDate}</span>
          <span>•</span>
          <span>{job.loggedBy}</span>
        </div>
      </div>
    </div>
  );
}
