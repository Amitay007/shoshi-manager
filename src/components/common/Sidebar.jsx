import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Home, Code, BookOpen, School, Users, Calculator, ChevronRight, ChevronLeft, KeyRound, Stamp, Layers
} from "lucide-react";
import VRIcon from "@/components/icons/VRIcon";

export default function Sidebar({ onExpandChange }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  React.useEffect(() => {
    if (onExpandChange) {
      onExpandChange(isSidebarOpen);
    }
  }, [isSidebarOpen, onExpandChange]);
  
  const menuItems = [
    { id: "dashboard", label: "שושי 2.1", icon: Home, page: "Dashboard" },
    { id: "devices", label: "מכשירי VR", icon: VRIcon, page: "GeneralInfo" },
    { id: "silshuch", label: "סלישוך", icon: Stamp, page: "SilshuchCreator" },
    { id: "apps", label: "אפליקציות", icon: Code, page: "GeneralApps" },
    { id: "syllabus", label: "סילבוסים", icon: BookOpen, page: "SyllabusHub" },
    { id: "schools", label: "יחסי אנוש", icon: School, page: "Schools" },
    { id: "teachers", label: "ניהול", icon: Users, page: "CRMHub" },
    { id: "calculator", label: "מחשבון", icon: Calculator, page: "BinocularCalculator" },
    { id: "accounts", label: "חשבונות", icon: KeyRound, page: "AccountsAndUsers" },
    { id: "version2", label: "שושי 2.0 - היסטוריה", icon: Layers, page: "Version2" },
  ];

  const isActive = (page) => {
    const currentPath = location.pathname;
    const pagePath = createPageUrl(page);
    return currentPath === pagePath || currentPath.includes(`/${page}`);
  };

  return (
    <>
      {/* --- BOTTOM NAVIGATION BAR --- */}
      <div 
        className={`flex flex-row fixed bottom-0 left-0 right-0 shadow-2xl z-40 overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? 'bg-gradient-to-r from-slate-800 to-slate-900' : 'bg-green-500 hover:bg-green-600'
        }`}
        style={{ height: isSidebarOpen ? '80px' : '15px' }}
        dir="rtl"
      >
        {/* Toggle bar - always visible */}
        <div 
          className="absolute left-0 top-0 h-full w-full cursor-pointer z-50"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        {/* Logo - only show when open */}
        {isSidebarOpen && (
          <div className="px-6 py-4 border-l border-slate-700 relative z-10 pointer-events-none flex items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">Y</span>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Yoya</h2>
                <p className="text-purple-300 text-xs">VR Management</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation - only show when open */}
        {isSidebarOpen && (
          <>
            <nav className="flex-1 px-4 overflow-x-auto relative z-10 pointer-events-auto flex items-center">
              <div className="flex flex-nowrap gap-2 w-max">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.page);
                  return (
                    <Link 
                      key={item.id} 
                      to={createPageUrl(item.page)} 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                        active ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
            
            <div className="px-4 border-r border-slate-700 text-center relative z-10 pointer-events-none flex items-center">
              <p className="text-slate-500 text-xs whitespace-nowrap">© 2026 Yoya</p>
            </div>
          </>
        )}
        </div>
        </>
        );
        }