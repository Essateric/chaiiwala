import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import JobLogCard  from "./JobLogCard"; 
import { useState, useEffect } from "react";

export default function JobLogsGrid({ jobLogs }) {
    console.log("📦 JobLogsGrid rendered with", jobLogs.length, "logs");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const totalPages = Math.ceil(jobLogs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = jobLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {currentItems.map((log) => (
          <JobLogCard key={log.id} log={log} />
        ))}
      </div>

      <div className="flex justify-center items-center gap-4 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        >
          ← Prev
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}

// function JobLogCard({ log }) {
//   const [open, setOpen] = useState(false);
//   const hasImage = log.ImageUpload?.length > 0;

//   let displayDate = "Unknown date";
//   try {
//     if (log.logDate && log.logTime) {
//       const parsed = new Date(`${log.logDate} ${log.logTime}`);
//       if (!isNaN(parsed)) {
//         displayDate = format(parsed, "d MMM yyyy, h:mmaaa");
//       }
//     }
//   } catch (err) {
//     console.warn("Failed to parse date for log:", log.id, err);
//   }

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Card className="cursor-pointer hover:border-chai-gold transition-all">
//           {hasImage && (
//             <img
//               src={log.ImageUpload[0]}
//               alt="Job Log"
//               className="h-32 w-full object-cover rounded-t-md"
//             />
//           )}
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm line-clamp-2">{log.title}</CardTitle>
//           </CardHeader>
//           <CardContent className="text-xs text-muted-foreground space-y-1">
//             <div className="flex items-center gap-1">
//               <CalendarDays className="h-3 w-3" />
//               {displayDate}
//             </div>
//             <div className="flex items-center gap-1">
//               <User className="h-3 w-3" />
//               {log.loggedBy || "Unknown"}
//             </div>
//             <Badge variant="outline" className="capitalize">
//               {log.flag.replace("_", " ")}
//             </Badge>
//           </CardContent>
//         </Card>
//       </DialogTrigger>

//       <DialogContent className="max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
//         <DialogTitle>{log.title}</DialogTitle>
//         <DialogDescription className="mb-4">
//           Logged on {displayDate} by {log.loggedBy || "Unknown"}
//         </DialogDescription>

//         {hasImage && (
//           <img
//             src={log.ImageUpload[0]}
//             alt="Full"
//             className="w-full max-h-60 object-cover rounded mb-4"
//           />
//         )}

//         <p className="text-sm mb-4 whitespace-pre-wrap">{log.description}</p>

//         <div className="space-y-1 text-xs text-muted-foreground mb-4">
//           <p><strong>Category:</strong> {log.category}</p>
//           <p><strong>Priority:</strong> {log.flag}</p>
//         </div>

//         <div className="mb-4">
//           <h3 className="font-semibold text-sm mb-1">Comments</h3>
//           <p className="text-sm whitespace-pre-wrap bg-muted rounded p-2">
//             {log.comments || "No comments yet."}
//           </p>
//         </div>

//         <form className="space-y-2">
//           <textarea
//             rows={3}
//             className="w-full border rounded p-2 text-sm"
//             placeholder="Add a comment..."
//           ></textarea>
//           <Button size="sm" type="submit">
//             Add Comment
//           </Button>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }
