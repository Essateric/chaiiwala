import { useAuth, User } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  BarChart2, Store, Package, Users, CheckSquare, 
  AlertTriangle, Fan, Wrench, Calendar, ShoppingCart, 
  TrendingUp, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NavItem = {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: Array<User['role']>;
};

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user } = useAuth();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-20 bg-[#1c1f2a] md:hidden">
      <div className="h-full overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex items-center">
            <span className="ml-2 text-xl font-semibold text-[#d4af37]">Chaiiwala</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-200">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Mobile Navigation Items */}
        <nav className="p-2">
          {filteredNavItems.map((item) => (
            <Link 
              key={item.path}
              href={item.path}
              onClick={onClose}
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
      </div>
    </div>
  );
}
