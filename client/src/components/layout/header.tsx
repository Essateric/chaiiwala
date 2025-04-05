import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Menu, LogOut, UserCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  toggleMobileMenu: () => void;
}

export function Header({ toggleMobileMenu }: HeaderProps) {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-[#262a38] border-b border-gray-700 z-10">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-200 mr-2"
            onClick={toggleMobileMenu}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <span className="ml-2 text-xl font-semibold text-[#d4af37]">Chaiiwala</span>
          </div>
        </div>
        {user && (
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <UserCircle className="h-6 w-6 text-gray-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2 border-b border-gray-700">
                  <p className="text-sm font-medium">{user.fullName}</p>
                  <p className="text-xs text-gray-400">
                    {user.role === 'admin' ? 'Admin' : 
                     user.role === 'regional_manager' ? 'Regional Manager' : 
                     'Store Manager'}
                  </p>
                </div>
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
