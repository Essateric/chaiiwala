import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, Search, ChevronDown, Menu } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "../../components/ui/dropdown-menu.jsx";
import { Input } from "../../components/ui/input.jsx";
import { Button } from "../../components/ui/button.jsx";
import { useAuth } from "../../hooks/UseAuth.jsx";
import { useNavigate } from "react-router-dom";
import NotificationPanel from "../../components/announcements/NotificationPanel.jsx";
import { supabase } from "../../lib/supabaseClient.js";

export default function TopBar({ title, onMenuClick, username, role, announcements = [], profile }) {
  const notificationRef = useRef();
  const [showNotifications, setShowNotifications] = useState(false);
  const { logoutMutation } = useAuth();
  const navigate = useNavigate();

  // --- Supabase notifications badge count ---
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    async function fetchNotificationCount() {
      if (!profile?.id) {
        setNotificationCount(0);
        return;
      }
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);
      setNotificationCount(count || 0);
    }
    fetchNotificationCount();
  }, [profile?.id, showNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center">
          <button 
            onClick={onMenuClick} 
            className="text-gray-500 lg:hidden focus:outline-none"
            type="button"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <h1 className="hidden sm:block text-xl font-semibold text-chai-gold text-left pl-0 mt-2">
          {title}
        </h1>

        <div className="flex items-center space-x-4">
          {/* Search Bar */}
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
          <div className="relative">
            <Button
              variant="ghost"
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-6 w-6 text-gray-500 hover:text-chai-gold" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1 min-w-[18px] text-center">
                  {notificationCount}
                </span>
              )}
            </Button>

            {showNotifications && (
              <div 
                ref={notificationRef} 
                className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50"
              >
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <NotificationPanel />
                </div>
          <Link
  to="/announcements"
  className="block text-center px-4 py-2 text-sm text-chai-gold font-medium border-t border-gray-200 cursor-pointer"
>
  View all notifications
</Link>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border-2 border-chai-gold overflow-hidden">
                  <img src="/assets/chaiiwala.png" alt="Chaiiwala Logo" className="h-7 w-auto" />
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
