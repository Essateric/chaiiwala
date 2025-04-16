import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";

interface StoreTasksProgressProps {
  stores: Array<{ id: number; name: string }>;
}

interface Checklist {
  id: number;
  title: string;
  storeId: number;
  tasks: Array<{ id: number; title: string; completed: boolean }>;
}

export default function StoreTasksProgress({ stores }: StoreTasksProgressProps) {
  const [selectedTab, setSelectedTab] = useState<string>(stores[0]?.id.toString() || "1");

  // Fetch checklists for all stores
  const { data: checklists = [], isLoading } = useQuery<Checklist[]>({
    queryKey: ['/api/checklists'],
    queryFn: async () => {
      const res = await fetch('/api/checklists');
      if (!res.ok) throw new Error('Failed to fetch checklists');
      return res.json();
    }
  });

  // Calculate completion percentage for a store's tasks
  const calculateStoreCompletion = (storeId: number) => {
    const storeChecklists = checklists.filter(cl => cl.storeId === storeId);
    
    // If no checklists, return 0
    if (storeChecklists.length === 0) return 0;
    
    let totalTasks = 0;
    let completedTasks = 0;
    
    storeChecklists.forEach(checklist => {
      totalTasks += checklist.tasks.length;
      completedTasks += checklist.tasks.filter(task => task.completed).length;
    });
    
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };

  // Get color based on completion percentage
  const getCompletionColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-600";
    if (percentage >= 50) return "bg-green-500";
    if (percentage >= 30) return "bg-amber-500";
    return "bg-red-500";
  };

  // Get text based on completion percentage
  const getCompletionText = (percentage: number) => {
    if (percentage >= 100) return "text-green-600";
    if (percentage >= 50) return "text-green-500";
    if (percentage >= 30) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Store Task Completion</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="w-full mb-4 overflow-x-auto flex">
                {stores.map(store => (
                  <TabsTrigger 
                    key={store.id} 
                    value={store.id.toString()}
                    className="flex-1"
                  >
                    {store.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {stores.map(store => {
                const completion = calculateStoreCompletion(store.id);
                
                return (
                  <TabsContent key={store.id} value={store.id.toString()} className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <span>Task Completion</span>
                        <span className={`font-medium ${getCompletionText(completion)}`}>
                          {completion}%
                        </span>
                      </div>
                      <Progress 
                        value={completion} 
                        className="h-2"
                        indicatorClassName={getCompletionColor(completion)}
                      />
                      
                      <div className="pt-2 text-sm text-gray-500">
                        {completion === 0 ? (
                          <p>No tasks have been completed yet.</p>
                        ) : completion < 30 ? (
                          <p className="text-red-500 font-medium">Attention needed: Task completion is below 30%</p>
                        ) : completion < 50 ? (
                          <p className="text-amber-500 font-medium">In progress: Task completion is below 50%</p>
                        ) : completion < 100 ? (
                          <p className="text-green-500 font-medium">Good progress: Task completion is above 50%</p>
                        ) : (
                          <p className="text-green-600 font-medium">All tasks complete!</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}