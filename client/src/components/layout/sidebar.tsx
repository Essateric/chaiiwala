import { useAuth, type User } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  BarChart2, Store, Package, Users, CheckSquare, 
  AlertTriangle, Fan, Wrench, Calendar, ShoppingCart, 
  TrendingUp, LogOut 
} from "lucide-react";

type NavItem = {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: Array<User['role']>;
};

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const navigationItems: NavItem[] = [
    { path: "/", label: "Dashboard", icon: <BarChart2 className="w-5 h-5" /> },
    { path: "/stores", label: "Stores", icon: <Store className="w-5 h-5" />, roles: ['admin', 'regional_manager'] },
    { path: "/inventory", label: "Inventory", icon: <Package className="w-5 h-5" /> },
    { path: "/staff", label: "Staff", icon: <Users className="w-5 h-5" /> },
    { path: "/tasks", label: "Tasks", icon: <CheckSquare className="w-5 h-5" /> },
    { path: "/announcements", label: "Announcements", icon: <AlertTriangle className="w-5 h-5" /> },
    { path: "/cleaning", label: "Deep Cleaning", icon: <Fan className="w-5 h-5" /> },
    { path: "/maintenance", label: "Maintenance", icon: <Wrench className="w-5 h-5" /> },
    { path: "/events", label: "Events", icon: <Calendar className="w-5 h-5" /> },
    { path: "/orders", label: "Stock Orders", icon: <ShoppingCart className="w-5 h-5" /> },
    { path: "/reports", label: "Reports", icon: <TrendingUp className="w-5 h-5" />, roles: ['admin', 'regional_manager'] },
  ];

  const filteredNavItems = navigationItems.filter(item => 
    !item.roles || (user && item.roles.includes(user.role))
  );

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside className="w-64 h-screen bg-[#262a38] flex-shrink-0 border-r border-gray-700 hidden md:flex md:flex-col">
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center">
          <span className="ml-2 text-xl font-semibold text-[#d4af37]">Chaiiwala</span>
        </div>
      </div>
      
      {/* Navigation Items */}
      <nav className="p-2 flex-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <Link 
            key={item.path}
            href={item.path}
            className={`flex items-center p-3 mb-1 rounded-md transition-colors ${
              location === item.path 
                ? "bg-[#2d3142] text-[#d4af37]" 
                : "hover:bg-[#2d3142] hover:text-[#d4af37] text-gray-200"
            }`}
          >
            <span className="w-5 text-center">{item.icon}</span>
            <span className="ml-3">{item.label}</span>
          </Link>
        ))}
      </nav>
      
      {/* User Section */}
      {user && (
        <div className="p-4 border-t border-gray-700 bg-[#262a38]">
          <div className="flex items-center">
            <div className="ml-2">
              <p className="text-sm font-medium text-gray-200">{user.fullName}</p>
              <p className="text-xs text-gray-400">
                {user.role === 'admin' ? 'Admin' : 
                 user.role === 'regional_manager' ? 'Regional Manager' : 
                 'Store Manager'}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="ml-auto text-gray-400 hover:text-[#d4af37]"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
