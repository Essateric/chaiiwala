import { useState, useRef, useEffect } from "react";
import { Bell, Search, ChevronDown, Menu } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/UseAuth";
import chaiiwalaLogo from "@assets/chaiiwala.png";
import { useNavigate } from "react-router-dom";

console.log("Current user profile.id:", profile?.id);
console.log("All announcements:", announcements);

announcements.forEach(a => {
  console.log("Announcement:", a.title, a.target_user_ids);
});

export default function TopBar({ title, onMenuClick, username, role, announcements = [], profile }) {
  const notificationRef = useRef();
  const [showNotifications, setShowNotifications] = useState(false);
  const { logoutMutation } = useAuth();
  const navigate = useNavigate();

  const userNotifications = announcements.filter(a => {
  // Ensure target_user_ids is always an array
  let ids = [];
  if (Array.isArray(a.target_user_ids)) {
    ids = a.target_user_ids;
  } else if (typeof a.target_user_ids === "string" && a.target_user_ids.startsWith("[")) {
    try {
      ids = JSON.parse(a.target_user_ids);
    } catch (e) {}
  }
  // Now check if profile.id is in ids
  return (ids.includes(profile?.id))
    || ((a.target_role === "all" || a.target_role === profile?.permissions)
      && ((a.target_store_ids?.length === 0) || (profile?.store_ids?.some(id => a.target_store_ids.includes(id)))));
});


  // Sort notifications by time (assuming 'created_at')
  const sortedNotifications = userNotifications
    .slice() // shallow copy to avoid mutating original
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const notificationCount = sortedNotifications.length;

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
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
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
                  {sortedNotifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500">No notifications</div>
                  ) : (
                    sortedNotifications.map(a => (
                      <a 
                        key={a.id}
                        onClick={() => navigate("/announcements")}
                        className="block px-4 py-2 hover:bg-gray-100 border-l-4 border-chai-gold cursor-pointer"
                      >
                        <p className="text-sm font-medium text-gray-900">{a.title}</p>
                        {/* Example: show who it's from, show if tagged */}
                        <p className="text-xs text-gray-600">
                          {a.author_name || "Announcement"} 
                          {Array.isArray(a.target_user_ids) && a.target_user_ids.includes(profile?.id) && (
                            <span className="ml-2 inline-block text-green-700 bg-green-100 rounded px-1">You were tagged</span>
                          )}
                          {" • "}
                          {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                        </p>
                      </a>
                    ))
                  )}
                </div>
                <a 
                  onClick={() => navigate("/announcements")} 
                  className="block text-center px-4 py-2 text-sm text-chai-gold font-medium border-t border-gray-200 cursor-pointer"
                >
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
