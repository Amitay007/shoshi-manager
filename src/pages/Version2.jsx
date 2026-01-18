import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutGrid, Calculator, Users, Smartphone, FileText, 
  School, Calendar, GraduationCap, Database, Plus, 
  Upload, RefreshCw, Settings, UserPlus, CreditCard, 
  Menu, Edit, Shield, Eye, Image
} from "lucide-react";

export default function Version2() {
  const navigate = useNavigate();

  const allPages = [
    { name: "Dashboard", icon: LayoutGrid, title: "לוח בקרה ראשי" },
    { name: "BinocularCalculator", icon: Calculator, title: "מחשבון משקפות" },
    { name: "CRMHub", icon: Users, title: "ניהול קשרי לקוחות" },
    { name: "DeviceInfo", icon: Smartphone, title: "פרטי מכשיר" },
    { name: "GeneralInfo", icon: Settings, title: "מידע כללי משקפות" },
    { name: "AppDetailsPage", icon: FileText, title: "פרטי אפליקציה" },
    { name: "DeviceAssignments", icon: Smartphone, title: "שיבוץ מכשירים" },
    { name: "AccountsAndUsers", icon: Users, title: "חשבונות ומשתמשים" },
    { name: "ContactDetails", icon: Users, title: "פרטי איש קשר" },
    { name: "Schools", icon: School, title: "בתי ספר" },
    { name: "SyllabusHub", icon: GraduationCap, title: "מרכז סילבוסים" },
    { name: "SyllabusValuesManager", icon: Settings, title: "ניהול ערכי סילבוס" },
    { name: "AddAppPage", icon: Plus, title: "הוספת אפליקציה" },
    { name: "SchoolDetails", icon: School, title: "פרטי בית ספר" },
    { name: "HoursReport", icon: Calendar, title: "דיווח שעות" },
    { name: "MySchedule", icon: Calendar, title: 'הלו"ז שלי' },
    { name: "SyllabusWizard", icon: GraduationCap, title: "אשף הסילבוסים" },
    { name: "TeacherAgenda", icon: Calendar, title: "יומן מורה" },
    { name: "AddAppToDevice", icon: Plus, title: "הוספת אפליקציה למכשיר" },
    { name: "AddAppsFromList", icon: Plus, title: "הוספת אפליקציות מרשימה" },
    { name: "AppDevices", icon: Smartphone, title: "מכשירי אפליקציה" },
    { name: "AssignmentDetails", icon: FileText, title: "פרטי מטלה" },
    { name: "BulkDataLoader", icon: Upload, title: "טעינת נתונים המונית" },
    { name: "CashFlow", icon: CreditCard, title: "תזרים מזומנים" },
    { name: "CreateProgram", icon: Plus, title: "יצירת תוכנית" },
    { name: "CreateTeacher", icon: UserPlus, title: "יצירת מורה" },
    { name: "DataImport", icon: Database, title: "ייבוא נתונים" },
    { name: "DataUpdater", icon: RefreshCw, title: "עדכון נתונים" },
    { name: "DeviceMenu", icon: Menu, title: "תפריט מכשיר" },
    { name: "EditHeadset", icon: Edit, title: "עריכת משקפת" },
    { name: "Management", icon: Shield, title: "ניהול" },
    { name: "ManagerScheduler", icon: Calendar, title: "יומן מנהל" },
    { name: "MasterSchedule", icon: Calendar, title: "לוח זמנים ראשי" },
    { name: "ProgramView", icon: Eye, title: "צפייה בתוכנית" },
    { name: "Programs", icon: GraduationCap, title: "תוכניות" },
    { name: "ResearchPage", icon: FileText, title: "דף מחקר" },
    { name: "TeacherProfile", icon: Users, title: "פרופיל מורה" },
    { name: "TeachersList", icon: Users, title: "רשימת מורים" },
    { name: "UpdateAppStatus", icon: RefreshCw, title: "עדכון סטטוס אפליקציה" },
    { name: "UpdateAppsFromPDF", icon: Upload, title: "עדכון אפליקציות מ-PDF" },
    { name: "UploadLogo", icon: Image, title: "העלאת לוגו" },
    { name: "Version2", icon: LayoutGrid, title: "היסטוריה (דף זה)" },
    { name: "GeneralApps", icon: LayoutGrid, title: "אפליקציות כללי" },
    { name: "AddNewHeadset", icon: Plus, title: "הוספת משקפת חדשה" },
    { name: "DataRepositoryList", icon: Database, title: "רשימת מאגרי מידע" },
    { name: "DataRepositories", icon: Database, title: "מאגרי מידע" },
    { name: "RelationalCenter", icon: Users, title: "מרכז קשרים" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            כל עמודי האפליקציה ({allPages.length})
          </h1>
          <p className="text-slate-600 text-lg">
            אינדקס מלא של כל העמודים הקיימים במערכת
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allPages.map((page, index) => {
            const Icon = page.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(createPageUrl(page.name))}
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200 hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
                  <Icon className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-800 text-center mb-1">{page.title}</h3>
                <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
                  {page.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}