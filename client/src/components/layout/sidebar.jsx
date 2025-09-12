import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/UseAuth.jsx";
import { cn } from "../../lib/utils.js";


import {
  HomeIcon,
  ClipboardListIcon,
  MicVocalIcon,
   CalendarIcon,
   FilePenLineIcon,
  BellIcon,
  UsersIcon,
  SettingsIcon,
  XIcon,
  ClipboardCheckIcon,
  ShoppingCartIcon,
  WrenchIcon,
  PackageIcon,
  HammerIcon,
  CirclePoundSterlingIcon,
  PenLineIcon,
  ChartNoAxesCombinedIcon
}
   from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { Trash2 as Trash2Icon } from "lucide-react";



export default function Sidebar({ isOpen, onClose }) {
  const { user, logoutMutation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Always call hooks unconditionally
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true); // Start loading
      if (user?.id) {
        console.log('[Sidebar] Fetching profile for user ID:', user.id);
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, permissions, store_ids, store_location") // Corrected select: removed store_id, added store_location
          .eq("auth_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error.message);
          setProfile(null); // Ensure profile is null on error
        } else {
          setProfile(data);
          console.log('[Sidebar] Profile fetched:', data);
        }
      } else {
        console.log('[Sidebar] No user ID, profile not fetched.');
        setProfile(null); // Explicitly set profile to null if no user
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const currentPage = location.pathname === "/" ? "dashboard" : location.pathname.substring(1);

  const navItems = [
    { name: 'Dashboard', icon: HomeIcon, href: '/', active: currentPage === 'dashboard', roles: ['admin', 'regional', 'area','store', 'staff'] },
    { name: 'Maintenance', icon: HammerIcon, href: '/maintenance', active: currentPage === 'maintenance', roles: ['admin', 'regional', 'store', 'area'] },
    { name: 'Staff Absence', icon: CalendarIcon, href: '/staff-absence', active: currentPage === 'staff', roles: ['admin', 'regional', 'area','store', 'staff'] },
    { name: 'Holiday Requests', icon:  ClipboardCheckIcon, href: '/holiday-requests', active: currentPage === 'staff', roles: ['admin', 'regional', 'area','store', 'staff'] },
    { name: 'Event Orders', icon: MicVocalIcon, href: '/event-orders', active: currentPage === 'event-orders', roles: ['admin', 'regional', 'store'] },
    { name: 'Stock Orders', icon: PackageIcon, href: '/stock-orders', active: currentPage === 'stock-orders', roles: ['admin', 'regional', 'store'] },
    { name: 'Stock Management', icon: ShoppingCartIcon, href: '/stock-management', active: currentPage === 'stock-management', roles: ['admin', 'regional', 'area', 'store'] },
    { name: 'Deep Cleaning', icon: ClipboardListIcon, href: '/deep-cleaning', active: currentPage === 'deep-cleaning', roles: ['admin', 'regional', 'store'] },
    { name: 'Expenses', icon: CirclePoundSterlingIcon, href: '/expenses', active: currentPage === 'expenses', roles: ['admin', 'regional', 'store'] },
    { name: 'Announcements', icon: BellIcon, href: '/announcements', active: currentPage === 'announcements', roles: ['admin', 'regional', 'area', 'store'] },
    { name: 'User Management', icon: UsersIcon, href: '/user-management', active: currentPage === 'user-management', roles: ['admin', 'regional'] },
    { name: 'Waste Reporting', icon: Trash2Icon, href: '/waste-reporting', active: currentPage === 'waste-reporting', roles: ['admin','regional','area','store','staff'] },
    { name: 'Audit', icon: ChartNoAxesCombinedIcon, href: '/audit', active: currentPage === 'audit', roles: ['admin', 'regional', 'area','store'] },
    { name: 'Reports', icon: FilePenLineIcon, href: '/reports', active: currentPage === 'reports', roles: ['admin', 'regional', 'area','store'] },
    { name: 'Settings', icon: SettingsIcon, href: '/settings', active: currentPage === 'settings', roles: ['admin', 'regional'] },
    { name: 'Support', icon: WrenchIcon, href: '/support', active: currentPage === 'support', roles: ['admin', 'regional', 'area','store', 'staff'] }
  ];

  if (loading) {
    console.log('[Sidebar] Profile loading...');
    // Optionally, render a skeleton sidebar or a loading indicator
    return <div className="fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#1c1f2a] text-white p-4">Loading...</div>;
  }

  if (!user) {
    console.log('[Sidebar] No authenticated user. Sidebar not rendered.');
    return null; // Don't render sidebar if no user is logged in
  }

  // If profile is still null after loading and user exists, it means profile fetch failed or no profile exists.
  // The UI should gracefully handle this.
  const displayName = profile?.first_name || profile?.email?.split("@")[0] || "User";
  const userInitial = displayName?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className={cn(
      "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#1c1f2a] text-white transform transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      {/* Logo */}
<div className="flex items-center justify-between h-20 px-4 border-b border-gray-700">
  <div className="flex items-center">
    <img
      src="/assets/chaiiwalalogobrown.png"
      alt="Chaiiwala Logo"
      className="block h-20 lg:h-20 object-contain"  // taller but still within 64px header
    />
  </div>
        <button type="button"
          onClick={onClose} 
          className="lg:hidden text-gray-400 hover:text-white focus:outline-none"
        >
          <XIcon className="h-6 w-6" />
        </button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold">
            {userInitial}
          </div>
          <div>
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-gray-400">
              {{
                admin: 'Administrator',
                regional: 'Regional Manager',
                area: 'Area Manager',
                store: 'Store Manager',
                staff: 'Staff',
                maintenance: 'Maintenance',
              }[profile?.permissions] || 'User Role'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto">
        {navItems.map((item, index) => {

          return (
            <a
              key={index}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.href);
                if (globalThis.innerWidth < 1024) onClose();
              }}
              className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                item.active 
                  ? "bg-chai-gold text-white" 
                  : "text-gray-300 hover:bg-gray-700"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.name}</span>
            </a>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-0 w-full p-4 border-t border-gray-700">
        <button
          onClick={() => logoutMutation.mutate()}
          type="submit"
          className="w-full flex items-center px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
