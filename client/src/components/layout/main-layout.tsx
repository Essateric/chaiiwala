import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileMenu } from "./mobile-menu";

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function MainLayout({ children, title, description }: MainLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#1c1f2a] text-gray-200">
      {/* Sidebar (desktop) */}
      <Sidebar />
      
      {/* Mobile Header */}
      <Header toggleMobileMenu={toggleMobileMenu} />
      
      {/* Mobile Navigation */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={toggleMobileMenu} />
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-0 md:pt-6 pb-6">
        <div className="px-4 md:px-6 mt-16 md:mt-0">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold">{title}</h1>
              {description && <p className="text-gray-400">{description}</p>}
            </div>
            
            {/* Slot for additional header content */}
          </div>
          
          {/* Main Content */}
          {children}
        </div>
      </main>
    </div>
  );
}
