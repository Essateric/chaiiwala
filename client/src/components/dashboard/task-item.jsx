import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function TaskItem({ 
  id, 
  title, 
  location, 
  dueDate, 
  completed = false,
  onComplete
}) {
  const [isChecked, setIsChecked] = useState(completed);

  const handleChange = (checked) => {
    setIsChecked(checked);
    if (onComplete) {
      onComplete(id, checked);
    }
  };

  return (
    <div className="flex items-start">
      <Checkbox 
        id={`task-${id}`} 
        checked={isChecked}
        onCheckedChange={handleChange}
        className="mt-1 h-4 w-4 text-chai-gold rounded border-gray-300 focus:ring-chai-gold"
      />
      <div className="ml-3">
        <p className={cn(
          "text-sm font-medium",
          isChecked ? "text-gray-500 line-through" : "text-gray-900"
        )}>
          {title}
        </p>
        <p className="text-xs text-gray-500">{location} • {dueDate}</p>
      </div>
    </div>
  );
}
