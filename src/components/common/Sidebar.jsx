import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Home, Code, BookOpen, School, Users, Calculator, ChevronRight, KeyRound, Stamp, Layers, GraduationCap
} from "lucide-react";
import VRIcon from "@/components/icons/VRIcon";

export default function Sidebar() {
  const location = useLocation();
  
  const menuItems = [
    { id: "dashboard", label: "שושי 2.1", icon: Home, page: "Dashboard" },
    { id: "devices", label: "מכשירי VR", icon: VRIcon, page: "GeneralInfo" },
    { id: "silshuch", label: "שיוך משקפות", icon: Stamp, page: "DeviceAssignments" },
    { id: "apps", label: "אפליקציות", icon: Code, page: "GeneralApps" },
    { id: "syllabus", label: "סילבוסים", icon: BookOpen, page: "SyllabusHub" },
    { id: "programs", label: "תוכניות", icon: GraduationCap, page: "Programs" },
    { id: "schools", label: "יחסי אנוש", icon: School, page: "Humanmanagement" },
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
      {/* --- DESKTOP SIDEBAR (Visible only on lg screens and up) --- */}
      <div className="hidden lg:flex w-64 h-screen bg-gradient-to-b from-slate-800 to-slate-900 flex-col fixed right-0 top-0 shadow-2xl z-50" dir="rtl">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">Y</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Yoya</h2>
              <p className="text-purple-300 text-xs">VR Management</p>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="flex-1 py-6 px-3 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.page);
              return (
                <Link key={item.id} to={createPageUrl(item.page)} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${active ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4 mr-auto" />}
                </Link>
              );
            })}
          </div>
        </nav>
        
        <div className="p-4 border-t border-slate-700 text-center">
             <p className="text-slate-500 text-xs">© 2026 Yoya</p>
        </div>
      </div>

      {/* --- MOBILE BOTTOM NAV (Visible only on small screens) --- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 px-2 py-2 safe-area-pb">
        <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full" dir="rtl">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.page);
            return (
              <Link key={item.id} to={createPageUrl(item.page)} className={`flex flex-col items-center justify-center min-w-[70px] p-2 rounded-lg transition-all ${active ? 'text-cyan-400' : 'text-slate-400'}`}>
                <div className={`p-2 rounded-full ${active ? 'bg-slate-800' : ''}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] mt-1 font-medium whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}