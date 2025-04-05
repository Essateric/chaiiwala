import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string;
  subValue: string;
  trend?: "up" | "down" | "neutral";
  icon: ReactNode;
  iconBgColor: string;
  isLoading?: boolean;
}

export default function SummaryCard({
  title,
  value,
  subValue,
  trend = "neutral",
  icon,
  iconBgColor,
  isLoading = false,
}: SummaryCardProps) {
  return (
    <div className="bg-dark-secondary rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-300">{title}</h3>
        <div className={cn("h-10 w-10 rounded-full bg-opacity-20 flex items-center justify-center", iconBgColor)}>
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          ) : (
            <p className="text-3xl font-bold">{value}</p>
          )}
          <p className="text-sm text-gray-400">{subValue}</p>
        </div>
        {trend !== "neutral" && (
          <div 
            className={cn(
              "text-sm flex items-center",
              trend === "up" ? "text-red-500" : "text-green-500"
            )}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              {trend === "up" ? (
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" 
                />
              ) : (
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" 
                />
              )}
            </svg>
            <span>{trend === "up" ? "+" : "-"}{subValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}
