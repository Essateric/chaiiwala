import { useState } from "react";
import { useLocation } from "wouter";
import { MaintenanceJob } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Filter, Eye, Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface MaintenanceLogTableProps {
  maintenanceJobs: MaintenanceJob[];
  isLoading: boolean;
}

export default function MaintenanceLogTable({ maintenanceJobs, isLoading }: MaintenanceLogTableProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Filter jobs based on search query
  const filteredJobs = maintenanceJobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);
  
  // Get status badge based on the job status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Open</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">In Progress</Badge>;
      case "pending_review":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Pending Review</Badge>;
      case "assigned":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Assigned</Badge>;
      case "scheduled":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Scheduled</Badge>;
      case "resolved":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Resolved</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Get priority badge based on the job priority
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>;
      case "normal":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Normal</Badge>;
      case "low":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="bg-dark-secondary rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-lg font-medium">Recent Maintenance Logs</h3>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              type="text" 
              placeholder="Search logs..." 
              className="bg-dark border border-gray-700 rounded-md py-2 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-gold text-sm w-full md:w-auto"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button variant="outline" className="border-gray-700" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : paginatedJobs.length > 0 ? (
          <Table>
            <TableHeader className="bg-dark">
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-700">
              {paginatedJobs.map((job) => (
                <TableRow key={job.id} className="hover:bg-dark">
                  <TableCell>
                    <div className="text-sm font-medium">{job.title}</div>
                    <div className="text-sm text-gray-400">{job.description.substring(0, 50)}...</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(job.createdAt || new Date()).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {getPriorityBadge(job.priority)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {getStatusBadge(job.status)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gold hover:text-gold-dark"
                        onClick={() => setLocation(`/maintenance/${job.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-500 hover:text-blue-600"
                        onClick={() => setLocation(`/maintenance/${job.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No maintenance logs found matching your search criteria.
          </div>
        )}
      </div>
      
      {filteredJobs.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing <span className="font-medium">{Math.min(itemsPerPage, filteredJobs.length)}</span> of <span className="font-medium">{filteredJobs.length}</span> results
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {[...Array(totalPages)].map((_, i) => (
                <PaginationItem key={i + 1}>
                  <PaginationLink
                    isActive={currentPage === i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
