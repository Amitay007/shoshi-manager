import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Sidebar from "@/components/common/Sidebar";
import YoyaLoader from "@/components/common/YoyaLoader";
import { LoadingProvider, useLoading } from "@/components/common/LoadingContext";

function LayoutContent({ children, currentPageName }) {
  const { isLoading } = useLoading();

  // Pages that should NOT show the sidebar
  const pagesWithoutSidebar = [];
  const showSidebar = !pagesWithoutSidebar.includes(currentPageName);

  return (
    <>
      {isLoading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: '#1e1e2f', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <YoyaLoader />
        </div>
      )}
      
      <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 text-slate-900">
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap');
            :root { 
              --yoya-purple: #6b46c1; 
              --yoya-cyan: #00d4ff;
              --yoya-dark: #2d1b69;
              --yoya-light: #e8def8;
            }
            body { 
              font-family: 'Assistant', sans-serif;
            }
            /* Hide scrollbar for mobile nav */
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

            /* Smooth transitions for all interactive elements */
            button, a, .card, [role="button"] {
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* Subtle hover effects */
            button:hover, a:hover {
              transform: translateY(-1px);
            }
          `}</style>
        
        {showSidebar && <Sidebar />}
        
        {/* תוכן ראשי עם מרווח דינמי */}
        <div className="transition-all duration-300" style={{ marginRight: showSidebar ? '256px' : '0' }}>
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