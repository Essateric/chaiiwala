import { useState } from 'react';
import { JobLog } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';

interface JobStatusOverviewProps {
  jobLogs: JobLog[];
  stores: Array<{ id: number; name: string }>;
}

export default function JobStatusOverview({ jobLogs, stores }: JobStatusOverviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Memoize the filtered lists
  const scheduledJobs = jobLogs.filter(job => job.logDate && job.logTime);
  const unscheduledJobs = jobLogs.filter(job => !job.logDate || !job.logTime);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setIsOpen(true);
          }}
        >
          <ClipboardList className="h-4 w-4 mr-2" />
          Job Status Overview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Job Status Overview</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border rounded-lg shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Scheduled Jobs ({scheduledJobs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {scheduledJobs.length > 0 ? (
                    scheduledJobs.map(job => {
                      const store = stores.find(s => s.id === job.storeId);
                      return (
                        <div key={job.id} className="flex items-center p-3 rounded-md bg-secondary/10 hover:bg-secondary/20 border">
                          <div className="flex-1">
                            <div className="font-medium">{job.title || 'Maintenance Job'}</div>
                            <div className="text-sm text-muted-foreground">
                              {store?.name || 'Unknown Store'} - {job.logDate} at {job.logTime}
                            </div>
                            <div className="text-xs mt-1 text-muted-foreground">
                              {job.description || 'No description'}
                            </div>
                          </div>
                          <Badge
                            variant={
                              job.flag === 'urgent' 
                                ? 'destructive' 
                                : job.flag === 'long_standing' 
                                  ? 'secondary' 
                                  : 'default'
                            }
                          >
                            {job.flag}
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      No scheduled jobs found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          <Card className="border rounded-lg shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Unscheduled Jobs ({unscheduledJobs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {unscheduledJobs.length > 0 ? (
                    unscheduledJobs.map(job => {
                      const store = stores.find(s => s.id === job.storeId);
                      return (
                        <div key={job.id} className="flex items-center p-3 rounded-md bg-secondary/10 hover:bg-secondary/20 border">
                          <div className="flex-1">
                            <div className="font-medium">{job.title || 'Maintenance Job'}</div>
                            <div className="text-sm text-muted-foreground">
                              {store?.name || 'Unknown Store'} - Not scheduled
                            </div>
                            <div className="text-xs mt-1 text-muted-foreground">
                              {job.description || 'No description'}
                            </div>
                          </div>
                          <Badge
                            variant={
                              job.flag === 'urgent' 
                                ? 'destructive' 
                                : job.flag === 'long_standing' 
                                  ? 'secondary' 
                                  : 'default'
                            }
                          >
                            {job.flag}
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      No unscheduled jobs found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}