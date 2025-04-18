import { useState } from "react";
import { Bell, X, AlertTriangle, MessageCircle, Check, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { UserNotification } from "@shared/schema";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    deleteNotification, 
    isMarkingAsRead, 
    isDeleting 
  } = useNotifications();

  // Function to handle notification click
  const handleNotificationClick = (notification: UserNotification) => {
    // Mark notification as read
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Close the popover
    setOpen(false);
    
    // Determine where to navigate based on the notification type
    if (notification.sourceType === 'mention') {
      navigate(`/maintenance?joblog=${notification.sourceId}`);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'mention':
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Open notifications"
        >
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[0.7rem]"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {unreadCount} new
            </Badge>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No notifications</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="flex flex-col gap-1 py-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-2 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors",
                    !notification.read && "bg-muted/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 pt-1">
                    {getNotificationIcon(notification.sourceType)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={cn("text-sm", !notification.read && "font-medium")}>
                      {notification.title || notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    disabled={isDeleting}
                    aria-label="Delete notification"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                notifications
                  .filter((n) => !n.read)
                  .forEach((n) => markAsRead(n.id));
              }}
              disabled={isMarkingAsRead}
            >
              {isMarkingAsRead ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Mark all as read
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}