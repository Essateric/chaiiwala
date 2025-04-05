import { useState } from "react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function Topbar() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [hasNotifications] = useState(true);
  
  const getPageTitle = () => {
    const [location] = useLocation();
    
    switch (location) {
      case "/":
        return "Dashboard";
      case "/maintenance":
        return "Maintenance";
      case "/inventory":
        return "Inventory";
      case "/staff":
        return "Staff";
      case "/stores":
        return "Stores";
      case "/tasks":
        return "Tasks";
      case "/events":
        return "Events";
      case "/orders":
        return "Orders";
      case "/announcements":
        return "Announcements";
      case "/settings":
        return "Settings";
      default:
        return "Chaiwala Management";
    }
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
    setLocation("/auth");
  };
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.fullName) return "U";
    
    return user.fullName
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="bg-dark-secondary border-b border-gray-700 p-4 flex items-center justify-between">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Button variant="ghost" size="icon" className="p-2 rounded-full hover:bg-dark text-gray-400 hover:text-white">
            <Bell className="h-6 w-6" />
            {hasNotifications && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            )}
          </Button>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <Avatar className="h-8 w-8 bg-gold text-dark">
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <span className="hidden md:block">{user?.fullName}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
