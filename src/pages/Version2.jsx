import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutGrid, Calculator, Users, Smartphone, FileText, 
  School, Calendar, GraduationCap, Database, Plus, 
  Upload, RefreshCw, Settings, UserPlus, CreditCard, 
  Menu, Edit, Shield, Eye, Image, Trash2, CheckCircle, 
  HelpCircle, Copy, AlertTriangle, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export default function Version2() {
  const navigate = useNavigate();
  const [selectedPages, setSelectedPages] = useState(() => {
    // Restore from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('version2_selected_pages');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  useEffect(() => {
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('version2_selected_pages', JSON.stringify(selectedPages));
    }
  }, [selectedPages]);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [analyzingPage, setAnalyzingPage] = useState(null);

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

    { name: "SyllabusWizard", icon: GraduationCap, title: "אשף הסילבוסים" },

    { name: "AddAppToDevice", icon: Plus, title: "הוספת אפליקציה למכשיר" },
    { name: "AddAppsFromList", icon: Plus, title: "הוספת אפליקציות מרשימה" },
    { name: "AppDevices", icon: Smartphone, title: "מכשירי אפליקציה" },

    { name: "BulkDataLoader", icon: Upload, title: "טעינת נתונים המונית" },

    { name: "CreateProgram", icon: Plus, title: "יצירת תוכנית" },
    { name: "CreateTeacher", icon: UserPlus, title: "יצירת מורה" },
    { name: "DataImport", icon: Database, title: "ייבוא נתונים" },
    { name: "DataUpdater", icon: RefreshCw, title: "עדכון נתונים" },
    { name: "DeviceMenu", icon: Menu, title: "תפריט מכשיר" },
    { name: "EditHeadset", icon: Edit, title: "עריכת משקפת" },

    { name: "ProgramView", icon: Eye, title: "צפייה בתוכנית" },
    { name: "Programs", icon: GraduationCap, title: "תוכניות" },
    { name: "ResearchPage", icon: FileText, title: "דף מחקר" },
    { name: "TeacherProfile", icon: Users, title: "פרופיל מורה" },
    { name: "TeachersList", icon: Users, title: "רשימת מורים" },
    { name: "UpdateAppStatus", icon: RefreshCw, title: "עדכון סטטוס אפליקציה" },

    { name: "Version2", icon: LayoutGrid, title: "היסטוריה (דף זה)" },
    { name: "GeneralApps", icon: LayoutGrid, title: "אפליקציות כללי" },
    { name: "AddNewHeadset", icon: Plus, title: "הוספת משקפת חדשה" },
    { name: "DataRepositoryList", icon: Database, title: "רשימת מאגרי מידע" },
    { name: "DataRepositories", icon: Database, title: "מאגרי מידע" },
    { name: "RelationalCenter", icon: Users, title: "מרכז קשרים" }
  ];

  const handleSelection = (pageName, status) => {
    setSelectedPages(prev => {
      const newState = { ...prev };
      if (newState[pageName] === status) {
        delete newState[pageName];
      } else {
        newState[pageName] = status;
      }
      return newState;
    });
  };

  const getStats = () => {
    const stats = { delete: 0, review: 0, keep: 0 };
    Object.values(selectedPages).forEach(status => stats[status]++);
    return stats;
  };

  const copyToClipboard = (status) => {
    const pages = Object.entries(selectedPages)
      .filter(([_, s]) => s === status)
      .map(([name, _]) => {
        const page = allPages.find(p => p.name === name);
        return `${page?.title} (${name})`;
      })
      .join('\n');
    
    if (pages) {
      navigator.clipboard.writeText(pages);
      toast.success(`הועתקה רשימת עמודים ל${
        status === 'delete' ? 'מחיקה' : 
        status === 'review' ? 'בדיקה' : 'שמירה'
      }`);
    } else {
      toast.info("אין עמודים ברשימה זו");
    }
  };

  const initiateDeleteAnalysis = (page) => {
    setAnalyzingPage(page);
    setAnalysisModalOpen(true);
  };

  // Mock Analysis Logic
  const getAnalysisData = (pageName) => {
    const commonRisks = {
      links: ["Layout.js", "Version2.js"],
      backend: "לא זוהו פונקציות ייעודיות",
      impact: "נמוכה"
    };

    switch (pageName) {
      case "HoursReport":
        return {
          entities: ["ReportedHours", "Teacher"],
          links: ["Layout.js", "Version2.js", "TeacherAgenda.js"],
          backend: "processHours.js (פוטנציאלי)",
          impact: "גבוהה - משבית את מערכת דיווח השעות",
          recommendation: "לא למחוק ללא תחליף",
          isCritical: true
        };
      case "SyllabusHub":
        return {
          entities: ["Syllabus", "Teacher", "InstitutionProgram"],
          links: ["Layout.js", "Dashboard.js", "Programs.js"],
          backend: "generateSyllabusWord.js",
          impact: "קריטית - ליבת המערכת הפדגוגית",
          recommendation: "אסור למחוק!",
          isCritical: true
        };
      case "BinocularCalculator":
        return {
          entities: ["VRDevice", "VRApp", "ScheduleEntry"],
          links: ["Layout.js", "Dashboard.js"],
          backend: "אין",
          impact: "בינונית - כלי עזר למנהלים",
          recommendation: "לשמור או להעביר לארכיון",
          isCritical: false
        };
      default:
        return {
          entities: ["SystemDiagnostics (פוטנציאלי)"],
          links: ["Version2.js"],
          backend: "אין",
          impact: "נמוכה - ככל הנראה עמוד עזר או טופס",
          recommendation: "ניתן למחוק בזהירות",
          isCritical: false
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            שושי 2.0 - ניהול היסטוריה ({allPages.length})
          </h1>
          <p className="text-slate-600 text-lg mb-6">
            ניהול מחזור חיים של עמודי האפליקציה: סימון למחיקה, בדיקה או שמירה.
          </p>
          
          {/* Summary Bar */}
          <div className="flex justify-center gap-4 mb-8">
            <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full text-red-600 font-bold">{getStats().delete}</div>
              <span className="text-slate-700 font-medium">למחיקה</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard('delete')}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-full text-yellow-600 font-bold">{getStats().review}</div>
              <span className="text-slate-700 font-medium">לבדיקה</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard('review')}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full text-green-600 font-bold">{getStats().keep}</div>
              <span className="text-slate-700 font-medium">לשמירה</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard('keep')}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allPages.map((page, index) => {
            const Icon = page.icon;
            const status = selectedPages[page.name];
            
            return (
              <div 
                key={index}
                className={`
                  relative flex flex-col p-4 bg-white rounded-xl border transition-all duration-200 group
                  ${status === 'delete' ? 'border-red-500 bg-red-50/30' : 
                    status === 'review' ? 'border-yellow-500 bg-yellow-50/30' : 
                    status === 'keep' ? 'border-green-500 bg-green-50/30' : 'border-slate-200 hover:shadow-md'}
                `}
              >
                {/* Header & Icon */}
                <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex gap-1">
                        <Button
                            size="icon"
                            variant="ghost" 
                            className={`h-7 w-7 ${status === 'keep' ? 'bg-green-100 text-green-600' : 'text-slate-300 hover:text-green-600'}`}
                            onClick={() => handleSelection(page.name, 'keep')}
                            title="לשמירה"
                        >
                            <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost" 
                            className={`h-7 w-7 ${status === 'review' ? 'bg-yellow-100 text-yellow-600' : 'text-slate-300 hover:text-yellow-600'}`}
                            onClick={() => handleSelection(page.name, 'review')}
                            title="לבדיקה"
                        >
                            <HelpCircle className="w-4 h-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost" 
                            className={`h-7 w-7 ${status === 'delete' ? 'bg-red-100 text-red-600' : 'text-slate-300 hover:text-red-600'}`}
                            onClick={() => handleSelection(page.name, 'delete')}
                            title="למחיקה"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <h3 className="font-semibold text-slate-800 mb-1 truncate" title={page.title}>{page.title}</h3>
                <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded w-fit mb-4">
                  {page.name}
                </span>

                <div className="mt-auto flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs"
                        onClick={() => navigate(createPageUrl(page.name))}
                    >
                        <Eye className="w-3 h-3 mr-1" /> צפייה
                    </Button>
                    {status === 'delete' && (
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            className="flex-1 text-xs"
                            onClick={() => initiateDeleteAnalysis(page)}
                        >
                            <AlertTriangle className="w-3 h-3 mr-1" /> ניתוח
                        </Button>
                    )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Analysis Modal */}
        <Dialog open={analysisModalOpen} onOpenChange={setAnalysisModalOpen}>
            <DialogContent className="max-w-2xl" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <AlertTriangle className="text-red-500" />
                        ניתוח השפעת מחיקה: {analyzingPage?.title}
                    </DialogTitle>
                    <DialogDescription>
                        המערכת מבצעת ניתוח תלויות כדי למנוע נזק למערכת.
                    </DialogDescription>
                </DialogHeader>

                {analyzingPage && (
                    <div className="space-y-6 mt-4">
                        {(() => {
                            const data = getAnalysisData(analyzingPage.name);
                            return (
                                <>
                                    <div className={`p-4 rounded-lg border ${data.isCritical ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                                        <h4 className="font-bold mb-2 flex items-center gap-2">
                                            {data.isCritical ? <X className="text-red-600 w-5 h-5" /> : <HelpCircle className="text-yellow-600 w-5 h-5" />}
                                            המלצת המערכת: {data.recommendation}
                                        </h4>
                                        <p className="text-sm opacity-90">רמת סיכון: {data.impact}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-lg">
                                            <h5 className="font-semibold mb-2 text-sm text-slate-700">ישויות מושפעות (Entities)</h5>
                                            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                                {data.entities.map(e => <li key={e}>{e}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-lg">
                                            <h5 className="font-semibold mb-2 text-sm text-slate-700">קישורים נכנסים (Incoming Links)</h5>
                                            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                                {data.links.map(l => <li key={l}>{l}</li>)}
                                            </ul>
                                        </div>
                                    </div>

                                    {data.backend && (
                                        <div className="bg-slate-50 p-4 rounded-lg">
                                            <h5 className="font-semibold mb-2 text-sm text-slate-700">פונקציות Backend קשורות</h5>
                                            <p className="text-sm text-slate-600">{data.backend}</p>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}

                <DialogFooter className="mt-6 sm:justify-start gap-2">
                    <Button variant="outline" onClick={() => setAnalysisModalOpen(false)}>
                        סגור
                    </Button>
                    <Button variant="destructive" disabled>
                        מחיקה (כרגע במצב סימולציה)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}