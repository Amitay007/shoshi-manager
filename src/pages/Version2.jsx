import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { GraduationCap, Users, AppWindow, Settings, TrendingUp, BookOpen, Calendar, School, Layers, ListPlus, UploadCloud, RefreshCw, Download, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Version2() {
  const navigate = useNavigate();
  const [secretOpen, setSecretOpen] = React.useState(false);
  const [showHidden, setShowHidden] = React.useState(false);

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
          
          {/* Hidden Buttons - Revealed after dialog */}
          {showHidden && (
            <>
              <button
                onClick={() => navigate(createPageUrl("DataRepositories"))}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-800">מאגרי מידע</h3>
                </div>
              </button>

              <button
                onClick={() => navigate(createPageUrl("AddAppsFromList"))}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <ListPlus className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-800">הוספת אפליקציות</h3>
                </div>
              </button>

              <button
                onClick={() => navigate(createPageUrl("BulkDataLoader"))}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                    <UploadCloud className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-800">טעינת נתונים</h3>
                </div>
              </button>

              <button
                onClick={() => navigate(createPageUrl("UpdateAppsFromPDF"))}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-800">עדכון אפליקציות</h3>
                </div>
              </button>

              <button
                onClick={() => navigate(createPageUrl("DataImport"))}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <UploadCloud className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-800">ייבוא נתונים</h3>
                </div>
              </button>

              <button
                onClick={() => navigate(createPageUrl("DataUpdater"))}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center">
                    <Link2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-800">עדכון</h3>
                </div>
              </button>

              <button
                onClick={() => navigate(createPageUrl("UpdateAppStatus"))}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-800">עדכון סטטוס</h3>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Bottom Button */}
        <div className="flex justify-center">
          <button
            onClick={() => setSecretOpen(true)}
            className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-2xl px-12 py-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-red-600">אל תלחץ כאן</h3>
          </button>
        </div>
      </div>

      {/* Secret Dialog */}
      <Dialog open={secretOpen} onOpenChange={setSecretOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>מזל שאתה לא נשיא ארצות הברית וזה לא הכפתור האדום</DialogTitle>
          </DialogHeader>
          <div className="text-slate-600">
            לחץ המשך
          </div>
          <DialogFooter className="justify-end">
            <Button
              onClick={() => {
                setSecretOpen(false);
                setShowHidden(true);
              }}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold"
            >
              המשך
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}