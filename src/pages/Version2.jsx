import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { GraduationCap, Users, AppWindow, Settings, TrendingUp, BookOpen, Calendar, School } from "lucide-react";

export default function Version2() {
  const navigate = useNavigate();

  const menuCards = [
    { title: "תוכניות", icon: GraduationCap, page: "SyllabusHub", color: "from-purple-500 to-purple-600" },
    { title: "חשבונות ומשתמשים", icon: Users, page: "AccountsAndUsers", color: "from-purple-500 to-purple-600" },
    { title: "אפליקציות", icon: AppWindow, page: "GeneralApps", color: "from-purple-500 to-purple-600" },
    { title: "משקפות", icon: Settings, page: "GeneralInfo", color: "from-purple-500 to-purple-600" },
    { title: "CRM", icon: TrendingUp, page: "CRMHub", color: "from-purple-500 to-purple-600" },
    { title: "מרכז סילבוסים", icon: BookOpen, page: "SyllabusHub", color: "from-purple-500 to-purple-600" },
    { title: "לוח זמנים", icon: Calendar, page: "BinocularCalculator", color: "from-purple-500 to-purple-600" },
    { title: "בתי ספר", icon: School, page: "Schools", color: "from-purple-500 to-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.05em' }}>
            shoshi
          </h1>
          <p className="text-purple-200 text-lg">
            VR Device Management System – Accounts & Application Inventory Control
          </p>
          <p className="text-purple-300 text-sm mt-2">Made By Yoya</p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {menuCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(createPageUrl(card.page))}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-800">{card.title}</h3>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Button */}
        <div className="flex justify-center">
          <button
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-2xl px-12 py-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-red-600">אל תלחץ כאן</h3>
          </button>
        </div>
      </div>
    </div>
  );
}