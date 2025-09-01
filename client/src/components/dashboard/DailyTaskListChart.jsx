import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  LabelList,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { formatDeliveryDateVerbose } from "../../lib/formatters.js";

export default function DailytaskListChart({ storeTaskData = [], dateISO }) {
  // Make a friendly label. Falls back to today's local date if prop not provided.
  const dateLabel =
    dateISO
      ? formatDeliveryDateVerbose(dateISO)
      : new Date().toLocaleDateString("en-GB", {
          weekday: "long",
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

  return (
    <Card className="bg-white shadow rounded-xl p-4">
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <CardTitle>Store Task Completion Status</CardTitle>
        </div>
        <div><CardDescription>{dateLabel}</CardDescription></div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={storeTaskData}
            margin={{ top: 20, right: 30, left: 5, bottom: 35 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="store"
              angle={-25}
              textAnchor="end"
              interval={0}
              height={60}
              style={{ fontSize: 13 }}
            />
            <YAxis domain={[0, 12]} tickCount={7} />
            <Tooltip
              formatter={(value) => [`${value} completed`, "Tasks"]}
              labelFormatter={(label) => `Store: ${label} — ${dateLabel}`}
            />
            <ReferenceLine y={11} stroke="#888" strokeDasharray="4 4" />
            <Bar dataKey="tasksCompleted">
              {storeTaskData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.tasksCompleted >= 11
                      ? "#16a34a" // green
                      : entry.tasksCompleted >= 6
                      ? "#f97316" // orange
                      : "#dc2626" // red
                  }
                />
              ))}
              <LabelList
                dataKey="tasksCompleted"
                position="top"
                style={{ fontWeight: "bold", fontSize: 15 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-3 text-center text-sm text-gray-500">
          <span className="inline-block mr-2">
            <span className="inline-block w-3 h-3 bg-[#16a34a] rounded-full mr-1" />
            11-12 completed
          </span>
          <span className="inline-block mr-2">
            <span className="inline-block w-3 h-3 bg-[#f97316] rounded-full mr-1" />
            6-10 completed
          </span>
          <span className="inline-block">
            <span className="inline-block w-3 h-3 bg-[#dc2626] rounded-full mr-1" />
            0-5 completed
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
