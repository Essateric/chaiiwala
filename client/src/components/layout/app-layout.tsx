import { ReactNode } from "react";
import Sidebar from "./sidebar";
import Topbar from "./topbar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-dark text-white flex flex-col md:flex-row">
      <Sidebar />
      
      <main className="flex-grow">
        <Topbar />
        {children}
      </main>
    </div>
  );
}
