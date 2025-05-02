import { useEffect, useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { addDays, format, subDays, subMonths } from "date-fns";

export function StorePerformanceChart({ timeRange }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const generateData = () => {
      const today = new Date();
      let result = [];

      if (timeRange === "week") {
        result = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(today, 6 - i);
          return {
            name: format(date, "EEE"),
            sales: Math.floor(Math.random() * 2000) + 1000,
            target: 2000,
          };
        });
      } else if (timeRange === "month") {
        result = Array.from({ length: 4 }, (_, i) => {
          return {
            name: `Week ${i + 1}`,
            sales: Math.floor(Math.random() * 10000) + 5000,
            target: 10000,
          };
        });
      } else if (timeRange === "quarter") {
        result = Array.from({ length: 3 }, (_, i) => {
          const date = subMonths(today, 2 - i);
          return {
            name: format(date, "MMM"),
            sales: Math.floor(Math.random() * 30000) + 15000,
            target: 25000,
          };
        });
      }

      setData(result);
    };

    generateData();
  }, [timeRange]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="text-gray-600 text-xs mb-1">{label}</p>
          <p className="text-sm font-medium text-[#D4AF37]">
            Sales: £{payload[0].value?.toLocaleString()}
          </p>
          <p className="text-sm font-medium text-gray-500">
            Target: £{payload[1].value?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickFormatter={(value) => `£${value / 1000}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="sales" fill="#D4AF37" barSize={40} radius={[4, 4, 0, 0]} />
          <Bar dataKey="target" fill="#E5E7EB" barSize={40} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
