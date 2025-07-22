import { useState } from "react";
import Sidebar from "./sidebar";
import TopBar from "./top-bar";
import { useAuth } from "@/hooks/UseAuth";

export default function DashboardLayout({ children, title, profile, announcements }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

if (profile && announcements) {
  console.log("DashboardLayout sending profile:", profile, "announcements:", announcements);
}



  return (
    <div className="min-h-screen flex bg-chai-light">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <TopBar 
  title={title} 
  onMenuClick={toggleSidebar} 
  username={profile?.first_name || profile?.name || user?.name || ""}
  role={profile?.permissions || user?.role || "staff"} 
  announcements={announcements}
  profile={profile}
        />
        
        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 bg-chai-light">
          {children}
        </main>
      </div>
    </div>
  );
}
