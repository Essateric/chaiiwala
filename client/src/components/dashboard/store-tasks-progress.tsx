import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface StoreWithProgress {
  id: number;
  name: string;
  taskCompletion: number;
}

interface ChecklistTask {
  id: number;
  title: string;
  completed: boolean;
  checklistId: number;
  completedAt?: string;
  completedBy?: string;
}

interface Checklist {
  id: number;
  title: string;
  category: string;
  tasks: ChecklistTask[];
  storeId: number;
  description: string;
  assignedTo: string;
  dueDate: string | null;
}

export function StoreTasksProgress() {
  const [storeProgress, setStoreProgress] = useState<StoreWithProgress[]>([]);

  // Fetch stores
  const { data: stores = [], isLoading: isLoadingStores } = useQuery<{ id: number; name: string; }[]>({
    queryKey: ['/api/stores'],
  });

  // Fetch all checklists
  const { data: checklists = [], isLoading: isLoadingChecklists } = useQuery<Checklist[]>({
    queryKey: ['/api/checklists'],
    queryFn: async () => {
      const res = await fetch('/api/checklists');
      if (!res.ok) throw new Error('Failed to fetch checklists');
      return res.json();
    }
  });

  // Calculate task completion percentages for each store
  useEffect(() => {
    if (stores.length > 0 && checklists.length > 0) {
      const storeTasksMap = new Map<number, { total: number; completed: number }>();
      
      // Initialize maps for all stores
      stores.forEach(store => {
        storeTasksMap.set(store.id, { total: 0, completed: 0 });
      });
      
      // Count tasks for each store
      checklists.forEach(checklist => {
        const storeData = storeTasksMap.get(checklist.storeId);
        if (storeData) {
          storeData.total += checklist.tasks.length;
          storeData.completed += checklist.tasks.filter(task => task.completed).length;
          storeTasksMap.set(checklist.storeId, storeData);
        }
      });
      
      // Calculate percentages
      const progressData: StoreWithProgress[] = stores.map(store => {
        const storeData = storeTasksMap.get(store.id) || { total: 0, completed: 0 };
        const taskCompletion = storeData.total > 0 
          ? Math.round((storeData.completed / storeData.total) * 100) 
          : 0;
          
        return {
          id: store.id,
          name: store.name,
          taskCompletion
        };
      });
      
      setStoreProgress(progressData);
    }
  }, [stores, checklists]);

  // Get color class based on completion percentage
  const getColorClass = (percentage: number) => {
    if (percentage < 30) return "text-red-500";
    if (percentage < 50) return "text-amber-500";
    return "text-green-500";
  };

  // Get background color class for progress bar
  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return "bg-red-500";
    if (percentage < 50) return "bg-amber-500";
    return "bg-green-500";
  };

  if (isLoadingStores || isLoadingChecklists) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Completion by Store</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Task Completion by Store</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {storeProgress.map((store) => (
            <div key={store.id} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-medium">{store.name}</span>
                <span className={`font-bold ${getColorClass(store.taskCompletion)}`}>
                  {store.taskCompletion}%
                </span>
              </div>
              <Progress 
                value={store.taskCompletion} 
                className="h-2"
                indicatorClassName={getProgressColor(store.taskCompletion)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}