import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Home, Code, BookOpen, School, Users, Calculator, ChevronRight, ChevronLeft, KeyRound, Stamp, Layers
} from "lucide-react";
import VRIcon from "@/components/icons/VRIcon";
import { motion, useDragControls } from "framer-motion";

export default function Sidebar({ onExpandChange }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true); // true = 200px (icons + text), false = 16px (green line)
  const dragControls = useDragControls();

  React.useEffect(() => {
    if (onExpandChange) {
      onExpandChange(isOpen);
    }
  }, [isOpen, onExpandChange]);
  
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

  const handleDragEnd = (event, info) => {
    // If dragged left (negative offset.x), close. If dragged right (positive offset.x), open.
    if (info.offset.x < -30) {
      setIsOpen(false);
    } else if (info.offset.x > 30) {
      setIsOpen(true);
    }
  };

  return (
    <>
      {/* --- SIDEBAR (כל הגדלים) --- */}
      <motion.div 
        className={`flex h-screen flex-col fixed right-0 top-0 shadow-2xl z-40 overflow-hidden transition-colors ${
          isOpen ? 'bg-gradient-to-b from-slate-800 to-slate-900 cursor-auto' : 'bg-green-500 hover:bg-green-600 cursor-grab active:cursor-grabbing'
        }`}
        style={{ width: isOpen ? '200px' : '16px' }}
        drag="x"
        dragElastic={0.2}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={{ width: isOpen ? '200px' : '16px' }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        onClick={() => !isOpen && setIsOpen(true)}
        dir="rtl"
      >
        {/* Logo - only show when open */}
        {isOpen && (
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
        )}

        {/* Navigation - only show when open */}
        {isOpen && (
          <>
            <nav className="flex-1 py-6 px-3 overflow-y-auto">
              <div className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.page);
                  return (
                    <Link 
                      key={item.id} 
                      to={createPageUrl(item.page)} 
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        active ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
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
          </>
        )}
      </motion.div>
    </>
  );
}