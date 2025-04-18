import { useState } from "react";
import { Search, ChevronDown, Menu } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import chaiiwalaLogo from "@assets/chaiiwala.png";
import { NotificationsPopover } from "./notifications";

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
  username: string;
  role: string;
}

export default function TopBar({ title, onMenuClick, username, role }: TopBarProps) {
  const [notificationCount, setNotificationCount] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const { logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center">
          <button 
            onClick={onMenuClick} 
            className="text-gray-500 lg:hidden focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          {/* Mobile Logout Button */}
          <button 
            onClick={() => logoutMutation.mutate()}
            className="md:hidden ml-4 flex items-center text-chai-gold hover:text-yellow-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
        
        {/* Title displayed separately to ensure proper alignment */}
        <h1 className="hidden sm:block text-xl font-semibold text-chai-gold text-left pl-0 mt-2">
          {title}
        </h1>
          
        <div className="flex items-center space-x-4">
          <div className="relative hidden md:block">
            <Input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 w-64"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          
          {/* Notifications */}
          <NotificationsPopover />
          {/* Logout Button */}
          <Button 
            variant="outline" 
            onClick={() => logoutMutation.mutate()}
            className="hidden md:flex items-center border-chai-gold text-chai-gold hover:bg-chai-gold hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </Button>
          
          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border-2 border-chai-gold overflow-hidden">
                  <img 
                    src={chaiiwalaLogo} 
                    alt="Chaiiwala Logo" 
                    className="h-6 w-auto"
                  />
                </div>
                <span className="hidden md:inline-block text-sm font-medium">{username}</span>
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                Your Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
