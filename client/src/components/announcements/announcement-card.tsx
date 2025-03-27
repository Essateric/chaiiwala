import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface AnnouncementCardProps {
  id: string;
  title: string;
  content: string;
  author: string;
  date: Date;
  category: string;
  important?: boolean;
  likes: number;
  onLike: (id: string) => void;
}

export default function AnnouncementCard({
  id,
  title,
  content,
  author,
  date,
  category,
  important = false,
  likes,
  onLike
}: AnnouncementCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const formattedDate = formatDistanceToNow(date, { addSuffix: true });

  const handleLike = () => {
    if (!isLiked) {
      setIsLiked(true);
      onLike(id);
    }
  };

  return (
    <Card className={important ? "border-l-4 border-l-chai-gold" : ""}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <div className="text-sm text-gray-500 mt-1">
              Posted by {author} • {formattedDate}
            </div>
          </div>
          <Badge variant="outline" className={important 
            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" 
            : "bg-gray-100 text-gray-800 hover:bg-gray-100"
          }>
            {important ? "Important" : category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm whitespace-pre-line">
          {content}
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          className={isLiked ? "text-chai-gold" : "text-gray-500"}
          onClick={handleLike}
        >
          <ThumbsUp className="mr-1 h-4 w-4" />
          {likes + (isLiked ? 1 : 0)}
        </Button>
        <div className="text-xs text-gray-500">
          {important ? "Requires acknowledgment" : ""}
        </div>
      </CardFooter>
    </Card>
  );
}
