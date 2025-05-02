import { cn } from "@/lib/utils";

export default function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBgColor,
  change,
}) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
        <div className={cn("h-12 w-12 rounded-full flex items-center justify-center", iconBgColor)}>
          <Icon className={cn("h-6 w-6", iconColor)} />
        </div>
      </div>
      {change && (
        <div className="mt-4 flex items-center text-sm">
          <span className={cn("flex items-center", change.isPositive ? "text-green-500" : "text-red-500")}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={change.isPositive 
                  ? "M5 10l7-7m0 0l7 7m-7-7v18" 
                  : "M19 14l-7 7m0 0l-7-7m7 7V3"
                } 
              />
            </svg>
            {change.value}
          </span>
          <span className="text-gray-400 ml-2">{change.text}</span>
        </div>
      )}
    </div>
  );
}
