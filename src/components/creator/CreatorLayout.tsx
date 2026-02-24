import { useState } from "react";
import { Outlet } from "react-router-dom";
import CreatorSidebar from "./CreatorSidebar";
import CreatorHeader from "./CreatorHeader";

const CreatorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <div className="flex">
        <CreatorSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
          <CreatorHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default CreatorLayout;