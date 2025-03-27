import { cn } from "@/lib/utils";

interface AnnouncementItemProps {
  title: string;
  description: string;
  date: string;
  isHighlighted?: boolean;
}

export default function AnnouncementItem({
  title,
  description,
  date,
  isHighlighted = false
}: AnnouncementItemProps) {
  return (
    <div className={cn(
      "border-l-4 pl-3 py-1",
      isHighlighted ? "border-chai-gold" : "border-gray-300"
    )}>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-600 mt-1">{description}</p>
      <p className="text-xs text-gray-500 mt-2">{date}</p>
    </div>
  );
}
