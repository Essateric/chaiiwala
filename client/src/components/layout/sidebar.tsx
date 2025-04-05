import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  Home,
  MapPin,
  Package,
  Users,
  CheckSquare,
  Settings,
  MessageCircle,
  Calendar,
  ShoppingCart,
  Menu,
  X
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, href, active, onClick }: NavItemProps) {
  return (
    <li className="px-2 py-1">
      <Link href={href} onClick={onClick}>
        <a
          className={cn(
            "flex items-center px-3 py-2 rounded-md hover:bg-dark-secondary text-gray-300 hover:text-white",
            active && "bg-gold bg-opacity-20 text-gold"
          )}
        >
          <span className="h-5 w-5 mr-3">{icon}</span>
          {label}
        </a>
      </Link>
    </li>
  );
}

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  
  const isActive = (path: string) => location === path;
  
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };
  
  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-full p-1.5">
            <span className="text-dark-secondary font-semibold text-sm">chaiwala</span>
            <span className="inline-block w-4 h-4 bg-dark-secondary rounded-full ml-1"></span>
          </div>
          <h1 className="text-gold font-semibold text-xl">Chaiwala</h1>
        </div>
      </div>
      
      <nav className="mt-4">
        <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">
          Main Navigation
        </div>
        
        <ul>
          <NavItem
            icon={<Home />}
            label="Dashboard"
            href="/"
            active={isActive("/")}
            onClick={closeSidebar}
          />
          
          <NavItem
            icon={<MapPin />}
            label="Stores"
            href="/stores"
            active={isActive("/stores")}
            onClick={closeSidebar}
          />
          
          <NavItem
            icon={<Package />}
            label="Inventory"
            href="/inventory"
            active={isActive("/inventory")}
            onClick={closeSidebar}
          />
          
          <NavItem
            icon={<Users />}
            label="Staff"
            href="/staff"
            active={isActive("/staff")}
            onClick={closeSidebar}
          />
          
          <NavItem
            icon={<CheckSquare />}
            label="Tasks"
            href="/tasks"
            active={isActive("/tasks")}
            onClick={closeSidebar}
          />
          
          <NavItem
            icon={<Settings />}
            label="Maintenance"
            href="/maintenance"
            active={isActive("/maintenance")}
            onClick={closeSidebar}
          />
          
          <NavItem
            icon={<Calendar />}
            label="Events"
            href="/events"
            active={isActive("/events")}
            onClick={closeSidebar}
          />
          
          <NavItem
            icon={<ShoppingCart />}
            label="Orders"
            href="/orders"
            active={isActive("/orders")}
            onClick={closeSidebar}
          />
        </ul>
        
        {(user?.role === 'admin' || user?.role === 'regional_manager') && (
          <>
            <div className="px-4 py-2 mt-4 text-xs text-gray-500 uppercase tracking-wider">
              Admin
            </div>
            
            <ul>
              <NavItem
                icon={<MessageCircle />}
                label="Announcements"
                href="/announcements"
                active={isActive("/announcements")}
                onClick={closeSidebar}
              />
              
              <NavItem
                icon={<Settings />}
                label="Settings"
                href="/settings"
                active={isActive("/settings")}
                onClick={closeSidebar}
              />
            </ul>
          </>
        )}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      {isMobile && (
        <button
          className="fixed top-4 left-4 z-50 bg-dark-secondary p-2 rounded-md text-white"
          onClick={toggleSidebar}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      )}
      
      {/* Sidebar for desktop */}
      <aside 
        className={cn(
          "w-64 bg-dark-secondary min-h-screen flex-shrink-0 border-r border-gray-700",
          isMobile && "fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out",
          isMobile && !isOpen && "-translate-x-full",
          isMobile && isOpen && "translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
      
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={closeSidebar}
        />
      )}
    </>
  );
}
