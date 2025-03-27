import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, ArrowDownIcon, AlertTriangleIcon } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  trend: "up" | "down" | "neutral" | "alert";
  bgColor?: string;
  iconColor?: string;
}

export function MetricsCard({
  title,
  value,
  icon,
  description,
  trend,
  bgColor = "bg-blue-100",
  iconColor = "text-blue-500",
}: MetricsCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <ArrowUpIcon className="h-3 w-3 text-green-500" />;
      case "down":
        return <ArrowDownIcon className="h-3 w-3 text-red-500" />;
      case "alert":
        return <AlertTriangleIcon className="h-3 w-3 text-amber-500" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-green-500";
      case "down":
        return "text-red-500";
      case "alert":
        return "text-amber-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">{title}</div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="flex items-center mt-1">
              {getTrendIcon()}
              <span
                className={cn("text-xs ml-1", getTrendColor())}
              >
                {description}
              </span>
            </div>
          </div>
          <div className={cn("p-3 rounded-full", bgColor)}>
            <div className={iconColor}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}