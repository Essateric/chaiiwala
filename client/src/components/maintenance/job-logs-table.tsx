import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Pagination } from "@/components/layout/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

interface JobLog {
  id: number;
  description: string;
  storeId: number;
  loggedAt: string;
  priority: 'normal' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  loggedBy: number;
  assignedTo: number | null;
}

interface JobLogsTableProps {
  storeId: number | null;
  onEdit: (jobId: number) => void;
  onView: (jobId: number) => void;
}

const ITEMS_PER_PAGE = 10;

export function JobLogsTable({ storeId, onEdit, onView }: JobLogsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  
  const queryUrl = storeId ? `/api/maintenance-jobs?storeId=${storeId}` : '/api/maintenance-jobs';
  
  const { 
    data: jobs,
    isLoading,
    error
  } = useQuery<JobLog[]>({
    queryKey: [queryUrl],
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !jobs) {
    return (
      <div className="bg-[#262a38] rounded-lg shadow-md p-6">
        <div className="text-red-500 text-center">
          Failed to load maintenance jobs. Please try again.
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-[#262a38] rounded-lg shadow-md p-6">
        <div className="text-center text-gray-400 py-8">
          No maintenance jobs found. Create a new job to get started.
        </div>
      </div>
    );
  }

  // Pagination
  const totalPages = Math.ceil(jobs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedJobs = jobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const getPriorityBadgeVariant = (priority: JobLog['priority']) => {
    switch (priority) {
      case 'normal': return "info";
      case 'medium': return "warning";
      case 'high': return "destructive";
      case 'urgent': return "destructive bg-red-900 text-white";
      default: return "secondary";
    }
  };

  const getStatusBadgeVariant = (status: JobLog['status']) => {
    switch (status) {
      case 'pending': return "secondary";
      case 'in_progress': return "warning";
      case 'completed': return "success";
      case 'cancelled': return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="bg-[#262a38] rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#2d3142]">
            <TableRow>
              <TableHead className="text-gray-400">ID</TableHead>
              <TableHead className="text-gray-400">Description</TableHead>
              <TableHead className="text-gray-400">Date</TableHead>
              <TableHead className="text-gray-400">Priority</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedJobs.map((job) => (
              <TableRow key={job.id} className="hover:bg-[#2d3142] transition-colors">
                <TableCell className="font-medium">#{job.id}</TableCell>
                <TableCell className="max-w-xs truncate">{job.description}</TableCell>
                <TableCell>{formatDate(job.loggedAt)}</TableCell>
                <TableCell>
                  <Badge variant={getPriorityBadgeVariant(job.priority) as any}>
                    {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(job.status) as any}>
                    {job.status === 'in_progress' ? 'In Progress' : 
                      job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(job.id)}
                    className="text-[#d4af37] hover:text-[#c4a535] mr-1"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView(job.id)}
                    className="text-blue-500 hover:text-blue-400"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={jobs.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="bg-[#262a38] rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#2d3142]">
            <TableRow>
              <TableHead className="text-gray-400">ID</TableHead>
              <TableHead className="text-gray-400">Description</TableHead>
              <TableHead className="text-gray-400">Date</TableHead>
              <TableHead className="text-gray-400">Priority</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
