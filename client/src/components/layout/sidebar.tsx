import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  HomeIcon, 
  ClipboardListIcon, 
  CalendarIcon, 
  ArchiveIcon, 
  CheckSquareIcon, 
  BellIcon, 
  ShoppingBagIcon, 
  UsersIcon, 
  SettingsIcon, 
  XIcon,
  ClipboardCheckIcon,
  ShoppingCartIcon,
  CalendarDaysIcon,
  WrenchIcon,
  PackageIcon
} from "lucide-react";
import chaiiwalaLogo from "@assets/chaiiwala.png";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  const currentPage = location === "/" ? "dashboard" : location.substring(1);

  // Navigation items with role-based access
  // Force console log to debug items and roles
  console.log("Current user role:", user.role);
  console.log("Current page:", currentPage);
  
  const navItems = [
    { 
      name: 'Dashboard', 
      icon: HomeIcon, 
      href: '/', 
      active: currentPage === 'dashboard',
      roles: ['admin', 'regional', 'store', 'staff'] 
    },
    // New items placed immediately after dashboard
    {
      name: 'Maintenance',
      icon: WrenchIcon,
      href: '/maintenance',
      active: currentPage === 'maintenance',
      roles: ['admin', 'regional', 'store']
    },
    {
      name: 'Event Orders',
      icon: CalendarDaysIcon,
      href: '/event-orders',
      active: currentPage === 'event-orders',
      roles: ['admin', 'regional', 'store']
    },
    {
      name: 'Stock Orders',
      icon: PackageIcon,
      href: '/stock-orders',
      active: currentPage === 'stock-orders',
      roles: ['admin', 'regional', 'store']
    },
    { 
      name: 'Stock Management', 
      icon: ArchiveIcon, 
      href: '/stock-management', 
      active: currentPage === 'inventory',
      roles: ['admin', 'regional'] 
    },
    { 
      name: 'Deep Cleaning', 
      icon: ClipboardCheckIcon, 
      href: '/deep-cleaning', 
      active: currentPage === 'deep-cleaning',
      roles: ['admin', 'regional', 'store'] 
    },
    { 
      name: 'Staff Schedule', 
      icon: CalendarIcon, 
      href: '/schedule', 
      active: currentPage === 'schedule',
      roles: ['admin', 'regional', 'store', 'staff'] 
    },
    { 
      name: 'Checklists', 
      icon: CheckSquareIcon, 
      href: '/checklists', 
      active: currentPage === 'checklists',
      roles: ['admin', 'regional', 'store', 'staff'] 
    },
    { 
      name: 'Tasks', 
      icon: ClipboardListIcon, 
      href: '/tasks', 
      active: currentPage === 'tasks',
      roles: ['admin', 'regional', 'store', 'staff'] 
    },
    { 
      name: 'Announcements', 
      icon: BellIcon, 
      href: '/announcements', 
      active: currentPage === 'announcements',
      roles: ['admin', 'regional', 'store', 'staff'] 
    },
    { 
      name: 'Stores', 
      icon: ShoppingBagIcon, 
      href: '/stores', 
      active: currentPage === 'stores',
      roles: ['admin', 'regional'] 
    },
    { 
      name: 'User Management', 
      icon: UsersIcon, 
      href: '/users', 
      active: currentPage === 'users',
      roles: ['admin'] 
    },
    { 
      name: 'Settings', 
      icon: SettingsIcon, 
      href: '/settings', 
      active: currentPage === 'settings',
      roles: ['admin', 'regional', 'store'] 
    }
  ];

  return (
    <div 
      className={cn(
        "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#1c1f2a] text-white transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo & Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
        <div className="flex items-center">
          <div className="h-10 bg-white rounded-md flex items-center justify-center px-2">
            <img 
              src={chaiiwalaLogo} 
              alt="Chaiiwala Logo" 
              className="h-7 sm:h-7 w-auto"
            />
          </div>
        </div>
        <button 
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
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-gray-400">
              {user.role === 'admin' 
                ? 'Administrator' 
                : user.role === 'regional' 
                  ? 'Regional Manager' 
                  : user.role === 'store' 
                    ? 'Store Manager' 
                    : 'Staff'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Navigation - with scrollable area */}
      <nav className="p-4 space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto">
        {navItems.map((item, index) => {
          // Special handling for Stock Orders - restrict to admin, regional, and only 7 store managers with specific IDs
          if (item.name === 'Stock Orders') {
            const allowedStoreIds = [1, 2, 3, 4, 5, 6, 7]; // IDs of the 7 allowed store locations
            const canAccessStockOrders = 
              user.role === 'admin' || 
              user.role === 'regional' || 
              (user.role === 'store' && user.storeId && allowedStoreIds.includes(user.storeId));
            
            if (!canAccessStockOrders) return null;
          } 
          // For all other items, use the standard role check
          else if (!item.roles.includes(user.role)) {
            return null;
          }
          
          return (
            <a
              key={index}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.href);
                if (window.innerWidth < 1024) onClose();
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

      {/* Logout Button */}
      <div className="absolute bottom-0 w-full p-4 border-t border-gray-700">
        <button
          onClick={() => logoutMutation.mutate()}
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
