import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs.jsx";
import { Loader2 } from "lucide-react";
import TasksLast7DaysChart from "./TasksLast7DaysChart.jsx";

export default function TaskProgressPanel({
  stores = [],
  selectedTaskStoreId = "all",
  onChangeSelectedTaskStoreId = () => {},
  isLoadingTasks = false,
  percentComplete = 0,
  completedTasks = 0,
  totalTasks = 0,
}) {
  const isAll = String(selectedTaskStoreId) === "all";

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-bold">
            Checklist Progress
          </CardTitle>

          {/* Store selector (applies to both tabs) */}
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-chai-gold"
            value={selectedTaskStoreId}
            onChange={(e) => onChangeSelectedTaskStoreId(e.target.value)}
          >
            <option value="all">All Stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="today">
          <TabsList className="grid grid-cols-2 w-full max-w-xs mb-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="last7">Last 7 Days</TabsTrigger>
          </TabsList>

          {/* TODAY TAB (your yellow summary, compact) */}
          <TabsContent value="today">
            <div className="relative bg-yellow-50 border border-yellow-100 rounded-lg p-4">
              <div className="absolute right-4 top-3">
                {isLoadingTasks ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : isAll ? (
                  <span className="block text-4xl font-extrabold">
                    {percentComplete}%
                  </span>
                ) : (
                  <span className="block text-4xl font-extrabold">
                    {completedTasks}/{totalTasks}
                  </span>
                )}
              </div>

              <div className="pr-28">
                <p className="text-sm font-semibold text-gray-800">
                  Daily Checklist Tasks Complete
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {isAll
                    ? "Percentage across all stores."
                    : "Completed vs total tasks for the selected store."}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* LAST 7 DAYS TAB (your existing chart) */}
          <TabsContent value="last7">
            <div className="rounded-lg border border-gray-100 p-2">
              <TasksLast7DaysChart
                stores={stores}
                selectedStoreId={selectedTaskStoreId}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
