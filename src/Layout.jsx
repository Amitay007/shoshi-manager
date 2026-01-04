import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Sidebar from "@/components/common/Sidebar";
import YoyaLoader from "@/components/common/YoyaLoader";
import { LoadingProvider, useLoading } from "@/components/common/LoadingContext";

function LayoutContent({ children, currentPageName }) {
  const { isLoading } = useLoading();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // Pages that should NOT show the sidebar
  const pagesWithoutSidebar = [];
  const showSidebar = !pagesWithoutSidebar.includes(currentPageName);

  return (
    <>
      {isLoading && (
        <div style={{
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh',
          backgroundColor: '#1e1e2f', 
          zIndex: 9999,
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center'
        }}>
          <YoyaLoader />
        </div>
      )}
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

        {showSidebar && <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />}

        <div className={showSidebar && sidebarOpen ? "mr-64 transition-all duration-300" : "mr-0 transition-all duration-300"}>
          {children}
        </div>
        
        <Toaster />
      </div>
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <LoadingProvider>
      <LayoutContent children={children} currentPageName={currentPageName} />
    </LoadingProvider>
  );
}