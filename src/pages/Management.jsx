import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardTitle, CardContent, CardHeader } from "@/components/ui/card";
import { Users, Wallet, FileText, BarChart3, Briefcase, Building2, Calendar, Receipt } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";

export default function Management() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">מרכז ניהול</h1>
              <p className="text-slate-600">דשבורד מנהלים ראשי</p>
            </div>
          </div>
          <BackHomeButtons />
        </div>

        {/* Main Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Scheduling Management - Added per request */}
          <Link to={createPageUrl("ManagerScheduler")}>
            <Card className="bg-amber-50 hover:bg-amber-100/50 hover:shadow-xl transition-all duration-300 border-amber-200 border cursor-pointer h-full group ring-1 ring-amber-100">
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Calendar className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-amber-900">ניהול שיבוצים</h3>
                  <p className="text-amber-700 mt-1">שיבוץ מורים ומשקפות</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Yoya Team - Added per request */}
          <Link to={createPageUrl("TeachersList")}>
            <Card className="bg-cyan-50 hover:bg-cyan-100/50 hover:shadow-xl transition-all duration-300 border-cyan-200 border cursor-pointer h-full group ring-1 ring-cyan-100">
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-cyan-100 text-cyan-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-cyan-900">צוות יויה</h3>
                  <p className="text-cyan-700 mt-1">ניהול כרטיסי עובד ושעות</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          {/* Finance */}
          <Link to={createPageUrl("CashFlow")}>
            <Card className="bg-white hover:shadow-xl transition-all duration-300 border-0 cursor-pointer h-full group">
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wallet className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">מרכז שליטה לתזרים מזומנים</h3>
                  <p className="text-slate-500 mt-1">ניהול תזרים, תקציב וצפי שנתי</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* CRM (Manager Mode) */}
          <Link to={createPageUrl("CRMHub") + "?mode=manager"}>
            <Card className="bg-white hover:shadow-xl transition-all duration-300 border-0 cursor-pointer h-full group">
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">קשרי לקוחות</h3>
                  <p className="text-slate-500 mt-1">ניהול מלא (CRM)</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Contracts - Placeholder */}
          <Card className="bg-white hover:shadow-xl transition-all duration-300 border-0 cursor-pointer h-full group opacity-80">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">חוזים</h3>
                <p className="text-slate-500 mt-1">ניהול הסכמים ומסמכים</p>
              </div>
            </CardContent>
          </Card>

          {/* Reports - Placeholder */}
          <Card className="bg-white hover:shadow-xl transition-all duration-300 border-0 cursor-pointer h-full group opacity-80">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">דוחות</h3>
                <p className="text-slate-500 mt-1">סטטיסטיקות וניתוחים</p>
              </div>
            </CardContent>
          </Card>

          {/* Price Quotes - Placeholder */}
          <Card className="bg-white hover:shadow-xl transition-all duration-300 border-0 cursor-pointer h-full group opacity-80">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Receipt className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">הצעות מחיר</h3>
                <p className="text-slate-500 mt-1">ניהול והפקת הצעות מחיר</p>
              </div>
            </CardContent>
          </Card>

        </div>
        
        {/* Additional Management Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to={createPageUrl("Schools")}>
                <Card className="bg-gradient-to-br from-white to-slate-50 hover:shadow-md transition-all cursor-pointer border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <Building2 className="w-5 h-5 text-indigo-500" />
                            ניהול מוסדות חינוך
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600">גישה ישירה לרשימת בתי הספר, עריכת פרטים וניהול הקצאות ברמת המוסד.</p>
                    </CardContent>
                </Card>
            </Link>
        </div>

      </div>
    </div>
  );
}