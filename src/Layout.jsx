import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Toaster } from "@/components/ui/toaster";
import { LoadingProvider, useLoading } from "@/components/common/LoadingContext";
import YoyaLoader from "@/components/common/YoyaLoader";
import {
  Home, Code, BookOpen, School, Users, Calculator, ChevronRight, KeyRound, Stamp, Layers, GraduationCap, Briefcase, Menu, X, Brain
} from "lucide-react";
import VRIcon from "@/components/icons/VRIcon";
import { cn } from "@/lib/utils";

function LayoutContent({ children, currentPageName }) {
  const { isLoading } = useLoading();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Pages that should NOT show the sidebar
  const pagesWithoutSidebar = [];
  const showSidebar = !pagesWithoutSidebar.includes(currentPageName);

  // Mapping from child page names to parent menu item IDs for active state logic
  const childToParentMap = {
    'AppDetailsPage': 'apps',
    'GeneralApps': 'apps',
    'DeviceInfo': 'devices',
    'GeneralInfo': 'devices',
    'DeviceAssignments': 'silshuch',
    'SyllabusHub': 'syllabus',
    'SyllabusWizard': 'syllabus',

    'RelationalCenter': 'relational',
    'TeacherAgenda': 'relational',
    'HoursReport': 'relational',

    'CRMHub': 'communication',

    'Schools': 'schools',
    'SchoolDetails': 'schools',

    'Management': 'management',
    'CashFlow': 'management',
    'TeachersList': 'management',
    'TeacherProfile': 'management',
    'ManagerScheduler': 'management',

    'BinocularCalculator': 'calculator', 
    'AccountsAndUsers': 'accounts',
    'Programs': 'programs',
    'ProgramView': 'programs',
    'Version2': 'version2'
  };

  const isActive = (page, itemId) => {
    const currentPath = location.pathname;
    const pagePath = createPageUrl(page);
    
    if (currentPath === pagePath) return true;

    const currentPageName = currentPath.substring(1).split('?')[0];
    if (childToParentMap[currentPageName] === itemId) return true;

    return false;
  };

  // Grouped menu items
  const menuSections = [
    {
      section: "ראשי",
      items: [
        { id: "dashboard", label: "שושי 2.1", icon: Home, page: "Dashboard" },
      ]
    },
    {
      section: "תוכן ולימוד",
      items: [
        { id: "syllabus", label: "סילבוסים", icon: BookOpen, page: "SyllabusHub" },
        { id: "programs", label: "תוכניות", icon: GraduationCap, page: "Programs" },
      ]
    },
    {
      section: "חומרה ואפליקציות",
      items: [
        { id: "silshuch", label: "שיבוץ משקפות", icon: Stamp, page: "DeviceAssignments" },
        { id: "devices", label: "מכשירי VR", icon: VRIcon, page: "GeneralInfo" },
        { id: "apps", label: "אפליקציות", icon: Code, page: "GeneralApps" },
      ]
    },
    {
      section: "ניהול מערכות ואנשים",
      items: [
        { id: "relational", label: "יחסי אנוש", icon: Brain, page: "RelationalCenter" },
        { id: "communication", label: "מרכז תקשורת", icon: Users, page: "CRMHub" },
        { id: "management", label: "ניהול", icon: Briefcase, page: "Management" },
        { id: "schools", label: "בתי ספר", icon: School, page: "Schools" },
      ]
    },
    {
      section: "אחר",
      items: [
        { id: "version2", label: "שושי 2.0 - היסטוריה", icon: Layers, page: "Version2" },
      ]
    }
  ];

  // Close sidebar on route change for mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
      
      <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
        {/* Style block from original file */}
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap');
            :root { 
              --background: 0 0% 100%;
              --foreground: 222.2 84% 4.9%;
              --card: 0 0% 100%;
              --card-foreground: 222.2 84% 4.9%;
              --popover: 0 0% 100%;
              --popover-foreground: 222.2 84% 4.9%;
              --primary: 222.2 47.4% 11.2%;
              --primary-foreground: 210 40% 98%;
              --secondary: 210 40% 96.1%;
              --secondary-foreground: 222.2 47.4% 11.2%;
              --muted: 210 40% 96.1%;
              --muted-foreground: 215.4 16.3% 46.9%;
              --accent: 210 40% 96.1%;
              --accent-foreground: 222.2 47.4% 11.2%;
              --destructive: 0 84.2% 60.2%;
              --destructive-foreground: 210 40% 98%;
              --border: 214.3 31.8% 91.4%;
              --input: 214.3 31.8% 91.4%;
              --ring: 222.2 84% 4.9%;
              --radius: 0.5rem;

              --yoya-purple: #6b46c1; 
              --yoya-cyan: #00d4ff;
              --yoya-dark: #2d1b69;
              --yoya-light: #e8def8;
            }
            body { 
              font-family: 'Assistant', sans-serif;
            }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

            button, a, .card, [role="button"] {
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            button:hover, a:hover {
              transform: translateY(-1px);
            }

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

            li[role="status"], 
            [data-radix-toast-announcer] + li {
                background-color: #ffffff !important;
                color: #020617 !important; 
                border: 1px solid #e2e8f0 !important; 
                opacity: 1 !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
            }

            [role="dialog"] *, [role="alertdialog"] * {
                color: inherit;
            }
          `}</style>

        {/* Floating Menu Button - Only visible on mobile when sidebar is closed */}
        {showSidebar && !sidebarOpen && (
          <div className="lg:hidden fixed top-4 right-4 z-50">
             <button
                onClick={() => setSidebarOpen(true)}
                className="p-3 rounded-full bg-white shadow-md text-slate-700 hover:bg-slate-50 border border-slate-100 flex items-center justify-center"
              >
                <Menu className="w-6 h-6" />
              </button>
          </div>
        )}

        {/* Sidebar Overlay */}
        {showSidebar && sidebarOpen && (
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
            />
        )}
        
        {/* Sidebar */}
        {showSidebar && (
            <aside
                className={cn(
                    "fixed top-0 right-0 h-full bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl z-50 transition-transform duration-300 ease-in-out",
                    "w-48", // Fixed width 192px for both mobile and desktop
                    "lg:translate-x-0", // Always visible on desktop
                    sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0" // Mobile slide
                )}
            >
                <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-xl">Y</span>
                        </div>
                        <div>
                        <h2 className="text-white font-bold text-lg">Yoya</h2>
                        </div>
                    </div>
                    {/* Close Button Inside Sidebar */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 overflow-y-auto h-[calc(100vh-140px)]">
                <div className="space-y-6">
                    {menuSections.map((section) => (
                    <div key={section.section}>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-4">
                        {section.section}
                        </h3>
                        <div className="space-y-1">
                        {section.items.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.page, item.id);
                            return (
                            <Link
                                key={item.id}
                                to={createPageUrl(item.page)}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                active
                                    ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg"
                                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                                )}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium text-sm">{item.label}</span>
                                {active && <ChevronRight className="w-4 h-4 mr-auto" />}
                            </Link>
                            );
                        })}
                        </div>
                    </div>
                    ))}
                </div>
                </nav>
                
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 text-center bg-slate-900/50">
                    <p className="text-slate-500 text-xs">© 2026 Yoya</p>
                </div>
            </aside>
        )}
        
        {/* Main Content */}
        <div className={cn(
          "flex-1 transition-all duration-300 min-h-screen",
          showSidebar ? "lg:mr-48" : "" // Push content on desktop
        )}>
          <div className="p-4 lg:p-8 max-w-full mx-auto">
            {children}
          </div>
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