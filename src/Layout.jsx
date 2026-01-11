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
            @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;600;700;800&family=Rubik:wght@300;400;500;700;900&display=swap');
            :root { 
              /* YoyaVR Brand Colors based on website analysis */
              --background: 260 20% 98%; /* Light grayish purple tint */
              --foreground: 260 40% 10%; /* Dark purple/black */

              --card: 0 0% 100%;
              --card-foreground: 260 40% 10%;

              --popover: 0 0% 100%;
              --popover-foreground: 260 40% 10%;

              /* Yoya Primary Purple #4720B7 -> HSL approx 256 70% 42% */
              --primary: 256 70% 42%;
              --primary-foreground: 0 0% 100%;

              --secondary: 260 20% 96%;
              --secondary-foreground: 256 70% 42%;

              --muted: 260 10% 96%;
              --muted-foreground: 260 10% 45%;

              --accent: 256 70% 96%; /* Very light purple for hovers */
              --accent-foreground: 256 70% 42%;

              --destructive: 0 84.2% 60.2%;
              --destructive-foreground: 210 40% 98%;

              --border: 260 20% 90%;
              --input: 260 20% 90%;
              --ring: 256 70% 42%;

              --radius: 1rem; /* More rounded corners like the site buttons */

              --yoya-purple: #4720B7; 
              --yoya-cyan: #00d4ff;
              --yoya-dark: #1a1033;
              --yoya-light: #f3f0ff;
            }

            body { 
              font-family: 'Assistant', sans-serif;
              background-color: #f8f7fc;
            }

            h1, h2, h3, h4, h5, h6, .font-heading {
              font-family: 'Rubik', sans-serif;
            }

            /* Button Styling to match YoyaVR */
            .button-primary {
              background: linear-gradient(135deg, #4720B7 0%, #6b46c1 100%);
              box-shadow: 0 4px 14px 0 rgba(71, 32, 183, 0.39);
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

            /* FORCE FIX FOR TRANSPARENT POPUPS */
            [role="dialog"], 
            [role="alertdialog"], 
            [role="menu"],
            [role="listbox"],
            .bg-popover,
            .bg-background,
            .bg-card {
                background-color: #ffffff !important;
                opacity: 1 !important;
            }

            /* Toast specific fix */
            li[role="status"], 
            [data-radix-toast-announcer] + li {
                background-color: #ffffff !important;
                color: #020617 !important; /* slate-950 */
                border: 1px solid #e2e8f0 !important; /* slate-200 */
                opacity: 1 !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
            }

            /* Ensure text contrast */
            [role="dialog"] *, [role="alertdialog"] * {
                color: inherit;
            }
          `}</style>
        
        {showSidebar && <Sidebar />}
        
        {/* FIX: Margin only on Desktop (lg), Padding Bottom on Mobile for nav */}
        <div className={`transition-all duration-300 ${showSidebar ? "lg:mr-64 pb-24 lg:pb-0" : ""}`}>
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