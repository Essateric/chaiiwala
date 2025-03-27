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
  XIcon 
} from "lucide-react";

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
  const navItems = [
    { 
      name: 'Dashboard', 
      icon: HomeIcon, 
      href: '/', 
      active: currentPage === 'dashboard',
      roles: ['admin', 'regional', 'store', 'staff'] 
    },
    { 
      name: 'Inventory', 
      icon: ArchiveIcon, 
      href: '/inventory', 
      active: currentPage === 'inventory',
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
        "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-chai-black text-white transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo & Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="h-10 w-10 bg-chai-gold rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <span className="font-montserrat font-bold text-chai-gold text-xl">Chaiiwala</span>
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

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item, index) => (
          item.roles.includes(user.role) && (
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
                  ? "bg-gray-800 text-chai-gold" 
                  : "text-gray-300 hover:bg-gray-700"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.name}</span>
            </a>
          )
        ))}
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
