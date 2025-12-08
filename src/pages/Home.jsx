
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Orbit, AppWindow, Users, Layers, ListPlus, UploadCloud, GraduationCap, Building2, RefreshCw, Calendar, BookOpen, TrendingUp, Link2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { VRApp } from "@/entities/VRApp";

export default function Home() {
  const [secretOpen, setSecretOpen] = React.useState(false);
  const [showHidden, setShowHidden] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [selectedFields, setSelectedFields] = React.useState(new Set());
  const [isExporting, setIsExporting] = React.useState(false);

  // Define all available fields with their display names
  const availableFields = [
    { key: 'name', label: 'שם האפליקציה' },
    { key: 'description', label: 'תיאור' },
    { key: 'purchase_type', label: 'סוג רכישה' },
    { key: 'store_link', label: 'קישור לחנות' },
    { key: 'website_link', label: 'קישור לאתר חברה' },
    { key: 'subscription_store_link', label: 'קישור למנוי' },
    { key: 'subscription_type', label: 'סוג מנוי' },
    { key: 'subscription_price', label: 'מחיר מנוי' },
    { key: 'subscription_currency', label: 'מטבע מנוי' },
    { key: 'subscription_start_date', label: 'תאריך התחלת מנוי' },
    { key: 'subscription_end_date', label: 'תאריך סיום מנוי' },
    { key: 'purchase_price', label: 'מחיר רכישה' },
    { key: 'purchase_currency', label: 'מטבע רכישה' },
    { key: 'purchased_on', label: 'תאריך רכישה' },
    { key: 'downloaded_on', label: 'תאריך הורדה' },
    { key: 'internet_required', label: 'דורש אינטרנט' },
    { key: 'hand_tracking', label: 'תומך ב-Hand Tracking' },
    { key: 'is_research', label: 'אפליקציית מחקר' },
    { key: 'is_installed', label: 'מותקנת' },
    { key: 'in_onboarding', label: 'בתהליך קליטה' },
    { key: 'rating', label: 'דירוג' },
    { key: 'genre', label: 'ז\'אנרים' },
    { key: 'education_field', label: 'תחום חינוכי' },
    { key: 'supported_platforms', label: 'פלטפורמות נתמכות' },
    { key: 'custom_tags', label: 'תגיות מותאמות אישית' },
    { key: 'research_by', label: 'נחקר על ידי (צוות)' },
    { key: 'purchased_by', label: 'נרכש על ידי (צוות)' },
    { key: 'installed_by', label: 'הותקן על ידי (צוות)' },
    { key: 'player_count_details', label: 'פרטי מספר שחקנים' },
    { key: 'developer', label: 'מפתח' },
    { key: 'other_purchase_text', label: 'פרטי רכישה אחרים' },
    { key: 'custom_fields', label: 'שדות מותאמים אישית' },
  ];

  // Default selected fields (recommended fields)
  const defaultFields = [
    'name', 'description', 'purchase_type', 'store_link', 'website_link',
    'subscription_type', 'subscription_price', 'purchase_price',
    'internet_required', 'hand_tracking', 'is_research', 'is_installed',
    'in_onboarding', 'rating', 'genre', 'education_field',
    'supported_platforms', 'custom_tags'
  ];

  // Initialize with default fields when opening the export dialog
  React.useEffect(() => {
    if (exportOpen && selectedFields.size === 0) {
      setSelectedFields(new Set(defaultFields));
    }
  }, [exportOpen, selectedFields.size]); // Added selectedFields.size to dependencies to prevent infinite loop

  const toggleField = (fieldKey) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFields(new Set(availableFields.map(f => f.key)));
  };

  const clearAll = () => {
    setSelectedFields(new Set());
  };

  // Team ID to name mapping
  const teamNames = {
    "tm-amitza": "אמיצה",
    "tm-natznatzit": "נאצנאצית",
    "tm-gibor": "גיבור"
  };

  const formatValue = (value, fieldKey) => {
    if (value === null || value === undefined) return '';
    
    // Handle arrays (lists)
    if (Array.isArray(value)) {
      // For team fields, convert IDs to names
      if (['research_by', 'purchased_by', 'installed_by'].includes(fieldKey)) {
        return value.map(id => teamNames[id] || id).join(', ');
      }
      // For other arrays, just join with commas
      return value.join(', ');
    }
    
    // Handle complex objects - convert to JSON string
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? 'כן' : 'לא';
    }
    
    return String(value);
  };

  const handleExport = async () => {
    if (selectedFields.size === 0) {
      alert('אנא בחר לפחות שדה אחד לייצוא');
      return;
    }

    setIsExporting(true);
    try {
      // Fetch all apps
      const apps = await VRApp.list();
      
      // Get selected field keys in order
      const selectedFieldKeys = availableFields
        .filter(f => selectedFields.has(f.key))
        .map(f => f.key);
      
      // Create CSV header
      const headerLabels = availableFields
        .filter(f => selectedFields.has(f.key))
        .map(f => f.label);
      
      const csvRows = [];
      csvRows.push(headerLabels.join(','));
      
      // Add data rows
      apps.forEach(app => {
        const row = selectedFieldKeys.map(key => {
          const value = formatValue(app[key], key);
          // Escape values that contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvRows.push(row.join(','));
      });
      
      // Create and download CSV file
      const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Hebrew support
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `apps_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExportOpen(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('שגיאה בייצוא הנתונים. אנא נסה שוב.');
    } finally {
      setIsExporting(false);
    }
  };

  const NavButton = ({ to, children, icon }) => (
    <Link to={to} className="w-full sm:w-64">
      <Button
        variant="outline"
        className="w-full h-28 text-xl bg-white border-slate-200 hover:bg-slate-100 hover:border-cyan-600 shadow-sm transition-all duration-300 flex flex-col gap-2 items-center justify-center text-cyan-800 hover:text-cyan-900 rounded-xl"
      >
        {icon}
        <span>{children}</span>
      </Button>
    </Link>
  );

  const InactiveButton = ({ children, icon }) => (
    <div className="w-full sm:w-64">
      <Button
        variant="outline"
        disabled
        className="w-full h-28 text-xl bg-white border-slate-200 text-slate-400 shadow-sm rounded-xl cursor-not-allowed flex flex-col gap-2 items-center justify-center"
      >
        {icon}
        <span>{children}</span>
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex flex-col items-center justify-center p-6" dir="rtl">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-cyan-900">Shoshi</h1>
        <p className="text-slate-500 mt-2">
          VR Device Management System – Accounts & Application Inventory Control
        </p>
        <p className="text-slate-400 mt-1">
          Made By Yoya
        </p>
      </div>
      <div className="flex flex-col sm:flex-row flex-wrap gap-8 justify-center items-center">
        <NavButton to={createPageUrl(`GeneralInfo`)} icon={<Orbit className="w-8 h-8" />}>
          משקפות
        </NavButton>
        <NavButton to={createPageUrl(`GeneralApps`)} icon={<AppWindow className="w-8 h-8" />}>
          אפליקציות
        </NavButton>
        <NavButton to={createPageUrl(`AccountsAndUsers`)} icon={<Users className="w-8 h-8" />}>
          חשבונות ומשתמשים
        </NavButton>

        <NavButton to={createPageUrl(`Programs`)} icon={<GraduationCap className="w-8 h-8" />}>
          תוכניות
        </NavButton>

        <NavButton to={createPageUrl(`Schools`)} icon={<Building2 className="w-8 h-8" />}>
          בתי ספר
        </NavButton>

        <NavButton to={createPageUrl(`SchedulerPage`)} icon={<Calendar className="w-8 h-8" />}>
          לוח זמנים
        </NavButton>

        <NavButton to={createPageUrl(`SyllabusHub`)} icon={<BookOpen className="w-8 h-8" />}>
          מרכז סילבוסים
        </NavButton>

        <NavButton to={createPageUrl(`CRMHub`)} icon={<TrendingUp className="w-8 h-8" />}>
          CRM
        </NavButton>

        {/* Secret gate button */}
        <div className="w-full sm:w-64">
          <Button
            variant="outline"
            className="w-full h-28 text-xl bg-white border-slate-200 hover:bg-slate-100 hover:border-rose-400 shadow-sm transition-all duration-300 flex flex-col gap-2 items-center justify-center text-rose-700 hover:text-rose-800 rounded-xl"
            onClick={() => setSecretOpen(true)}
          >
            אל תלחץ כאן
          </Button>
        </div>

        {/* Reveal these ONLY after pressing 'המשך' in the dialog */}
        {showHidden && (
          <>
            {/* NEW: Export button with bright purple color */}
            <div className="w-full sm:w-64">
              <Button
                variant="outline"
                className="w-full h-28 text-xl bg-purple-500 hover:bg-purple-600 border-purple-600 text-white shadow-sm transition-all duration-300 flex flex-col gap-2 items-center justify-center rounded-xl"
                onClick={() => setExportOpen(true)}
              >
                <Download className="w-8 h-8" />
                <span>ייצוא אפליקציות ל-CSV</span>
              </Button>
            </div>

            {/* Group all data tools together here */}
            <NavButton to={createPageUrl(`DataRepositories`)} icon={<Layers className="w-8 h-8" />}>
              מאגרי מידע
            </NavButton>
            <NavButton to={createPageUrl(`AddAppsFromList`)} icon={<ListPlus className="w-8 h-8" />}>
              הוספת אפליקציות
            </NavButton>
            <NavButton to={createPageUrl(`BulkDataLoader`)} icon={<UploadCloud className="w-8 h-8" />}>
              טעינת נתונים מקבצים
            </NavButton>
            <NavButton to={createPageUrl(`UpdateAppsFromPDF`)} icon={<RefreshCw className="w-8 h-8" />}>
              עדכון אפליקציות
            </NavButton>
            <NavButton to={createPageUrl(`DataImport`)} icon={<UploadCloud className="w-8 h-8" />}>
              ייבוא נתונים
            </NavButton>
            <NavButton to={createPageUrl(`DataUpdater`)} icon={<Link2 className="w-8 h-8" />}>
              עדכון
            </NavButton>
            <NavButton to={createPageUrl(`UpdateAppStatus`)} icon={<RefreshCw className="w-8 h-8" />}>
              עדכון סטטוס אפליקציות
            </NavButton>
          </>
        )}
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
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              המשך
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Download className="w-6 h-6 text-purple-600" />
              ייצוא אפליקציות ל-CSV
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-slate-600">
              בחר את השדות שתרצה לייצא. שדות מומלצים כבר מסומנים עבורך.
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAll}
                className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
              >
                בחר הכל
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAll}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                בטל בחירה
              </Button>
            </div>

            <div className="border rounded-lg p-4 bg-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availableFields.map(field => (
                  <label 
                    key={field.key}
                    className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                  >
                    <Checkbox
                      checked={selectedFields.has(field.key)}
                      onCheckedChange={() => toggleField(field.key)}
                    />
                    <span className="text-sm">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="text-sm text-slate-500">
              נבחרו {selectedFields.size} שדות
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setExportOpen(false)}
              disabled={isExporting}
            >
              ביטול
            </Button>
            <Button 
              onClick={handleExport}
              disabled={isExporting || selectedFields.size === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isExporting ? 'מייצא...' : 'ייצא CSV'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
