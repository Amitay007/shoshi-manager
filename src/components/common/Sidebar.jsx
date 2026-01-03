import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Home, 
  Glasses, 
  AppWindow, 
  BookOpen,
  ChevronRight
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  
  const menuItems = [
    { id: "dashboard", label: "דאשבורד", icon: Home, page: "Dashboard" },
    { id: "devices", label: "מכשירי VR", icon: Glasses, page: "GeneralInfo" },
    { id: "apps", label: "אפליקציות", icon: AppWindow, page: "GeneralApps" },
    { id: "data", label: "מאגרי מידע", icon: BookOpen, page: "DataRepositoryList" },
  ];

  const isActive = (page) => {
    const currentPath = location.pathname;
    const pagePath = createPageUrl(page);
    return currentPath === pagePath || currentPath.includes(`/${page}`);
  };

  return (
    <div className="w-64 h-screen bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col fixed right-0 top-0 shadow-2xl z-50" dir="rtl">
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

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.page);
            
            return (
              <Link
                key={item.id}
                to={createPageUrl(item.page)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${active 
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
                {active && (
                  <ChevronRight className="w-4 h-4 mr-auto" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="text-slate-400 text-xs text-center">
          <p>Powered by Yoya</p>
          <p className="text-slate-500 mt-1">© 2026</p>
        </div>
      </div>
    </div>
  );
}