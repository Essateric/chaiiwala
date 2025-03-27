import { useState } from "react";
import { Bell, Search, ChevronDown, Menu } from "lucide-react";
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
          <h1 className="ml-2 lg:ml-0 font-montserrat font-bold text-xl capitalize">
            {title}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
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
          
          {/* Chaiiwala Logo */}
          <div className="hidden md:flex items-center justify-center bg-white rounded-md px-2 py-1 shadow-sm">
            <img 
              src="/attached_assets/chaiiwala.png" 
              alt="Chaiiwala Logo" 
              className="h-8 w-auto"
            />
          </div>
          
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-6 w-6 text-gray-500 hover:text-chai-gold" />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </Button>
            
            {showNotifications && (
              <div 
                className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50"
                onBlur={() => setShowNotifications(false)}
              >
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <a href="#" className="block px-4 py-2 hover:bg-gray-100 border-l-4 border-red-500">
                    <p className="text-sm font-medium text-gray-900">Low stock alert: Chai Masala</p>
                    <p className="text-xs text-gray-600">Oxford Road location • 10 minutes ago</p>
                  </a>
                  <a href="#" className="block px-4 py-2 hover:bg-gray-100 border-l-4 border-orange-500">
                    <p className="text-sm font-medium text-gray-900">Task due today: Weekly inventory check</p>
                    <p className="text-xs text-gray-600">Cheetham Hill location • 1 hour ago</p>
                  </a>
                  <a href="#" className="block px-4 py-2 hover:bg-gray-100 border-l-4 border-chai-gold">
                    <p className="text-sm font-medium text-gray-900">New announcement from Head Office</p>
                    <p className="text-xs text-gray-600">Company-wide • 3 hours ago</p>
                  </a>
                </div>
                <a href="#" className="block text-center px-4 py-2 text-sm text-chai-gold font-medium border-t border-gray-200">
                  View all notifications
                </a>
              </div>
            )}
          </div>
          
          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border-2 border-chai-gold overflow-hidden">
                  <img 
                    src="/attached_assets/chaiiwala.png" 
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
