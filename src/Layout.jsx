import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import Sidebar from "@/components/common/Sidebar";
import LoadingScreen from "@/components/common/LoadingScreen";

export default function Layout({ children, currentPageName }) {
  const [isLoading, setIsLoading] = useState(true);

  // Show loading screen on every page change
  useEffect(() => {
    setIsLoading(true);
  }, [currentPageName]);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  // Pages that should NOT show the sidebar
  const pagesWithoutSidebar = [];
  const showSidebar = !pagesWithoutSidebar.includes(currentPageName);

  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap');
        
        :root {
          --yoya-purple-dark: #4a2c6f;
          --yoya-purple: #6b46c1;
          --yoya-purple-light: #9f7aea;
          --yoya-cyan: #00d4ff;
          --yoya-cyan-light: #7dd3fc;
          --yoya-pink: #ec4899;
        }
        
        body { 
          font-family: 'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
      `}</style>
      
      {showSidebar && <Sidebar />}
      
      <div className={showSidebar ? "mr-64" : ""}>
        {children}
      </div>
      
      <Toaster />
    </div>
  );
}