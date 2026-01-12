import React, { useState, useEffect, useMemo } from "react";
import { VRDevice } from "@/entities/VRDevice";
import { Silshuch } from "@/entities/Silshuch";
import { Syllabus } from "@/entities/Syllabus";
import { InstitutionProgram } from "@/entities/InstitutionProgram";
import { DeviceApp } from "@/entities/DeviceApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Copy, Save, Repeat, Calendar, FileText, Search, CheckCircle, Stamp, MessageSquare, Trash2, X, Edit, ArrowRight, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { with429Retry } from "@/components/utils/retry";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import VRIcon from "@/components/icons/VRIcon";

export default function DeviceAssignments() {
  const { toast } = useToast();
  
  // Core state
  const [mode, setMode] = useState("static"); // "static" or "dynamic"
  const [assignmentName, setAssignmentName] = useState("");
  const [details, setDetails] = useState("");
  const [numberOfSessions, setNumberOfSessions] = useState(3);
  const [hasDates, setHasDates] = useState(false);
  const [executionDate, setExecutionDate] = useState(null);
  const [sessionDates, setSessionDates] = useState([]);
  
  // Headset selection state
  const [allHeadsets, setAllHeadsets] = useState([]);
  const [selectedStaticHeadsets, setSelectedStaticHeadsets] = useState(new Set());
  const [selectedDynamicHeadsets, setSelectedDynamicHeadsets] = useState([new Set(), new Set(), new Set()]);
  
  // Modal state
  const [isHeadsetModalOpen, setIsHeadsetModalOpen] = useState(false);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(null);
  const [tempSelection, setTempSelection] = useState(new Set());

  const [showProgramsModal, setShowProgramsModal] = useState(false);
  const [programsWithDevices, setProgramsWithDevices] = useState([]);
  const [expandedProgramId, setExpandedProgramId] = useState(null); // For expanding program sessions
  const [deviceAppMap, setDeviceAppMap] = useState({}); // Map of deviceId -> Set of appIds

  // Summary state
  const [summaryText, setSummaryText] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // View mode state
  const [viewMode, setViewMode] = useState("list"); // "list" or "form"
  const [isReadOnly, setIsReadOnly] = useState(true); // Default to Read Only for existing items
  const [allSilshuchim, setAllSilshuchim] = useState([]);
  const [editingSilshuch, setEditingSilshuch] = useState(null);
  
  // Calendar integration state
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [creatingCalendarEvent, setCreatingCalendarEvent] = useState(false);

  // Load headsets and silshuchim
  useEffect(() => {
    loadData();
  }, []);

  const faultyHeadsets = useMemo(() => {
    return allHeadsets.filter(d => d.is_disabled || d.status === "מושבת" || d.status === "בתיקון" || d.status === "בתחזוקה");
  }, [allHeadsets]);

  const todayHebrewDate = new Intl.DateTimeFormat('he-IL', { dateStyle: 'full', calendar: 'hebrew' }).format(new Date());

  const loadData = async () => {
    setLoading(true);
    try {
      const [devices, silshuchim, programs, instPrograms, deviceApps] = await Promise.all([
        with429Retry(() => VRDevice.list()),
        with429Retry(() => Silshuch.list()),
        with429Retry(() => Syllabus.list()),
        with429Retry(() => InstitutionProgram.list()),
        with429Retry(() => DeviceApp.list(null, 10000)) // Fetch all device apps
      ]);
      
      // Build device app map
      const devMap = {};
      (deviceApps || []).forEach(da => {
        if (!devMap[da.device_id]) {
          devMap[da.device_id] = new Set();
        }
        devMap[da.device_id].add(da.app_id);
      });
      setDeviceAppMap(devMap);

      const sortedDevices = (devices || [])
        .filter(d => !d.is_disabled)
        .sort((a, b) => a.binocular_number - b.binocular_number);
      setAllHeadsets(sortedDevices);
      setAllSilshuchim(silshuchim || []);
      
      // Create a map of program_id -> assigned_device_ids from InstitutionProgram
      const instProgramMap = {};
      (instPrograms || []).forEach(ip => {
        if (ip.program_id && ip.assigned_device_ids && ip.assigned_device_ids.length > 0) {
            const existing = instProgramMap[ip.program_id] || [];
            instProgramMap[ip.program_id] = [...new Set([...existing, ...ip.assigned_device_ids])];
        }
      });

      // Filter programs with assigned devices (either in Syllabus or InstitutionProgram)
      const progs = (programs || []).map(p => {
          const syllabusDevices = p.assigned_device_ids || [];
          const instDevices = instProgramMap[p.id] || [];
          // Merge unique devices
          const allDevices = [...new Set([...syllabusDevices, ...instDevices])];
          
          return {
              ...p,
              assigned_device_ids: allDevices
          };
      }).filter(p => p.assigned_device_ids && p.assigned_device_ids.length > 0);

      setProgramsWithDevices(progs);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "לא ניתן לטעון את הנתונים",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  // Handle number of sessions change
  useEffect(() => {
    if (mode === "dynamic") {
      const currentLength = selectedDynamicHeadsets.length;
      if (numberOfSessions > currentLength) {
        // Add new empty sets
        const newSets = Array(numberOfSessions - currentLength).fill(null).map(() => new Set());
        setSelectedDynamicHeadsets([...selectedDynamicHeadsets, ...newSets]);
        // Add new empty dates
        const newDates = Array(numberOfSessions - currentLength).fill(null);
        setSessionDates([...sessionDates, ...newDates]);
      } else if (numberOfSessions < currentLength) {
        // Remove extra sets
        setSelectedDynamicHeadsets(selectedDynamicHeadsets.slice(0, numberOfSessions));
        setSessionDates(sessionDates.slice(0, numberOfSessions));
      }
    }
  }, [numberOfSessions, mode]);

  // Open modal for headset selection
  const openHeadsetModal = (sessionIndex = null) => {
    if (isReadOnly) return;
    setCurrentSessionIndex(sessionIndex);
    if (sessionIndex === null) {
      // Static mode
      setTempSelection(new Set(selectedStaticHeadsets));
    } else {
      // Dynamic mode
      setTempSelection(new Set(selectedDynamicHeadsets[sessionIndex]));
    }
    setIsHeadsetModalOpen(true);
  };

  // Confirm headset selection
  const confirmHeadsetSelection = () => {
    if (currentSessionIndex === null) {
      // Static mode
      setSelectedStaticHeadsets(new Set(tempSelection));
    } else {
      // Dynamic mode
      const newDynamic = [...selectedDynamicHeadsets];
      newDynamic[currentSessionIndex] = new Set(tempSelection);
      setSelectedDynamicHeadsets(newDynamic);
    }
    setIsHeadsetModalOpen(false);
    setTempSelection(new Set());
  };

  // Toggle headset in temp selection
  const toggleHeadsetInTemp = (deviceId) => {
    const newTemp = new Set(tempSelection);
    if (newTemp.has(deviceId)) {
      newTemp.delete(deviceId);
    } else {
      newTemp.add(deviceId);
    }
    setTempSelection(newTemp);
  };

  // Generate summary text
  const generateSummary = () => {
    let summary = `🏷️ שם: ${assignmentName || "ללא שם"}\nℹ️ פרטים: ${details || "אין פרטים"}\n----------------\n`;
    
    if (mode === "static") {
      const headsetNumbers = Array.from(selectedStaticHeadsets)
        .map(id => {
          const device = allHeadsets.find(d => d.id === id);
          return device ? device.binocular_number : id;
        })
        .sort((a, b) => a - b)
        .join(", ");
      summary += `👓 משקפות: ${headsetNumbers || "אין משקפות"} (סה"כ: ${selectedStaticHeadsets.size})`;
    } else {
      selectedDynamicHeadsets.forEach((sessionSet, idx) => {
        const headsetNumbers = Array.from(sessionSet)
          .map(id => {
            const device = allHeadsets.find(d => d.id === id);
            return device ? device.binocular_number : id;
          })
          .sort((a, b) => a - b)
          .join(", ");
        summary += `📅 מפגש ${idx + 1}: ${headsetNumbers || "אין משקפות"}\n`;
      });
    }
    
    setSummaryText(summary);
    setShowSummary(true);
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      toast({
        title: "הועתק ללוח!",
        description: "הסיכום הועתק בהצלחה ללוח",
      });
    } catch (error) {
      toast({
        title: "שגיאה בהעתקה",
        description: "לא ניתן להעתיק ללוח",
        variant: "destructive"
      });
    }
  };

  // Save silshuch
  const saveSilshuch = async () => {
    if (!assignmentName.trim()) {
      toast({
        title: "שגיאה",
        description: "נא להזין שם לשיבוץ",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const silshuchData = {
        assignmentName,
        details,
        mode,
        status: "active",
        hasDates
      };

      if (mode === "static") {
        silshuchData.selectedHeadsets = Array.from(selectedStaticHeadsets);
        if (hasDates && executionDate) {
          silshuchData.executionDate = executionDate;
        }
      } else {
        silshuchData.numberOfSessions = numberOfSessions;
        silshuchData.sessions = selectedDynamicHeadsets.map((sessionSet, idx) => ({
          sessionNumber: idx + 1,
          headsets: Array.from(sessionSet),
          sessionDate: hasDates && sessionDates[idx] ? sessionDates[idx] : undefined
        }));
      }

      if (editingSilshuch) {
        await with429Retry(() => Silshuch.update(editingSilshuch.id, silshuchData));
      } else {
        await with429Retry(() => Silshuch.create(silshuchData));
      }
      
      toast({
        title: "נשמר בהצלחה!",
        description: "השיבוץ נשמר במערכת",
      });

      // Try to create Google Calendar event if dates are present and creating new or user wants update
      if (hasDates && calendarEnabled) {
        setCreatingCalendarEvent(true);
        try {
          const result = await base44.functions.invoke('createCalendarEvent', { silshuchData });
          
          if (result.success) {
            toast({
              title: "אירוע נוצר ביומן! 📅",
              description: `${result.eventsCreated} אירועים נוספו ל-Google Calendar`,
            });
          } else if (result.error?.includes('not authorized')) {
            toast({
              title: "יש לאשר גישה ל-Google Calendar",
              description: "אנא אשר את הגישה בהגדרות",
              variant: "destructive"
            });
          }
        } catch (calError) {
          console.error("Calendar error:", calError);
        }
        setCreatingCalendarEvent(false);
      }

      // Reset form and return to list
      resetForm();
      setViewMode("list");
      await loadData();
    } catch (error) {
      console.error("Error saving silshuch:", error);
      toast({
        title: "שגיאה בשמירה",
        description: "לא ניתן לשמור את השיבוץ",
        variant: "destructive"
      });
    }
    setSaving(false);
  };

  const resetForm = () => {
    setAssignmentName("");
    setDetails("");
    setMode("static");
    setNumberOfSessions(3);
    setSelectedStaticHeadsets(new Set());
    setSelectedDynamicHeadsets([new Set(), new Set(), new Set()]);
    setHasDates(false);
    setExecutionDate(null);
    setSessionDates([]);
    setShowSummary(false);
    setSummaryText("");
    setEditingSilshuch(null);
    setCalendarEnabled(false);
    setIsReadOnly(true);
  };

  // Open form for new silshuch
  const createNewSilshuch = () => {
    resetForm();
    setIsReadOnly(false); // New assignments are editable by default
    setViewMode("form");
  };

  // View existing silshuch
  const viewSilshuch = (silshuch) => {
    setEditingSilshuch(silshuch);
    setAssignmentName(silshuch.assignmentName);
    setDetails(silshuch.details || "");
    setMode(silshuch.mode);
    setHasDates(silshuch.hasDates || false);
    setExecutionDate(silshuch.executionDate || null);
    
    if (silshuch.mode === "static") {
      setSelectedStaticHeadsets(new Set(silshuch.selectedHeadsets || []));
    } else {
      setNumberOfSessions(silshuch.numberOfSessions || 3);
      const sessions = (silshuch.sessions || []).map(s => new Set(s.headsets || []));
      const dates = (silshuch.sessions || []).map(s => s.sessionDate || null);
      setSelectedDynamicHeadsets(sessions);
      setSessionDates(dates);
    }
    
    setIsReadOnly(true); // Read Only by default for existing
    setViewMode("form");
  };

  // Delete silshuch
  const deleteSilshuch = async (silshuch, e) => {
    e.stopPropagation(); 
    if (!confirm(`האם למחוק את השיבוץ "${silshuch.assignmentName}"?`)) return;

    try {
      await with429Retry(() => Silshuch.delete(silshuch.id));
      toast({ title: "נמחק בהצלחה" });
      await loadData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast({ title: "שגיאה במחיקה", variant: "destructive" });
    }
  };

  // Get headset display
  const getHeadsetDisplay = (deviceId) => {
    const device = allHeadsets.find(d => d.id === deviceId);
    return device ? device.binocular_number : deviceId;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 lg:hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
              <Stamp className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-purple-900">
                {viewMode === "form" ? (editingSilshuch ? "עריכת שיבוץ" : "יצירת שיבוץ חדש") : "שיבוץ משקפות"}
              </h1>
              <p className="text-slate-600 text-xs">
                {viewMode === "form" ? "אנא מלא את פרטי השיבוץ" : "ניהול הקצאת משקפות"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mb-4">
            {viewMode === "list" && (
              <div className="flex gap-2 w-full">
                <BackHomeButtons backLabel="לעמוד הקודם" showHomeButton={false} />
                <Button onClick={createNewSilshuch} className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 gap-2">
                  <Plus className="w-5 h-5" />
                  צור שיבוץ חדש
                </Button>
              </div>
            )}
            {viewMode === "form" && (
              <div className="flex gap-2 w-full">
                <Button onClick={() => setViewMode("list")} variant="outline" className="gap-2 flex-1">
                  <ArrowRight className="w-4 h-4" /> חזור לרשימה
                </Button>
                <BackHomeButtons backLabel="" showHomeButton={false} className="w-auto" />
              </div>
            )}
          </div>
        </div>

        {/* Desktop Header */}
        <div className="mb-8 hidden lg:block">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-xl transform rotate-3 hover:rotate-6 transition-transform">
                <Stamp className="text-white w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {viewMode === "form" ? (editingSilshuch ? "עריכת שיבוץ" : "יצירת שיבוץ חדש") : "שיבוץ משקפות"}
                </h1>
                <p className="text-slate-500 text-base font-medium">
                  {viewMode === "form" ? "הזנת פרטים והקצאת מכשירים" : "מרכז ניהול הקצאות ומלאי משקפות"}
                </p>
              </div>
            </div>
            
            {viewMode === "list" && (
                <div className="flex gap-3">
                    <BackHomeButtons backLabel="חזרה לראשי" showHomeButton={true} className="h-12" />
                    <Button onClick={createNewSilshuch} className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 gap-2 h-12 px-6 text-lg rounded-xl shadow-lg transition-all hover:scale-105">
                      <Plus className="w-5 h-5" />
                      שיבוץ חדש
                    </Button>
                </div>
            )}
          </div>

          {/* Dashboard Stats Section */}
          {viewMode === "list" && (
            <div className="grid grid-cols-12 gap-6 mb-10">
              
              {/* Stat Card: Date */}
              <Card className="col-span-6 lg:col-span-3 border-none shadow-md bg-white overflow-hidden relative group">
                 <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
                 <CardContent className="p-6 flex flex-col items-center justify-center h-full relative z-10">
                    <div className="mb-2 p-3 bg-purple-50 rounded-full text-purple-600 group-hover:bg-purple-100 transition-colors">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-medium text-slate-500 mb-1">תאריך נוכחי</div>
                    <div className="text-3xl font-bold text-slate-800 tracking-tight">{format(new Date(), 'dd/MM')}</div>
                    <div className="text-xs font-medium text-purple-600 mt-1 bg-purple-50 px-2 py-0.5 rounded-full">{todayHebrewDate}</div>
                 </CardContent>
              </Card>

              {/* Stat Card: Faulty */}
              <Card className="col-span-6 lg:col-span-3 border-none shadow-md bg-white overflow-hidden relative group">
                 <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
                 <CardContent className="p-6 flex flex-col items-center justify-center h-full relative z-10">
                    <div className="mb-2 p-3 bg-red-50 rounded-full text-red-600 group-hover:bg-red-100 transition-colors">
                        <Trash2 className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-medium text-slate-500 mb-1">משקפות תקולות</div>
                    <div className="text-3xl font-bold text-slate-800 tracking-tight">{faultyHeadsets.length}</div>
                    <div className="text-xs text-slate-400 mt-1">דורש טיפול</div>
                 </CardContent>
              </Card>

              {/* Calculator Action Card */}
              <Link to={createPageUrl("BinocularCalculator")} className="col-span-12 lg:col-span-2">
                <Card className="h-full border-none shadow-md bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 transition-all cursor-pointer group text-white">
                    <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                        <div className="mb-3 p-3 bg-white/10 rounded-full group-hover:scale-110 transition-transform">
                            <Repeat className="w-6 h-6 text-cyan-400" />
                        </div>
                        <h3 className="text-lg font-bold text-center leading-tight">מחשבון<br/>משקפות</h3>
                    </CardContent>
                </Card>
              </Link>

              {/* Faulty List */}
              <Card className="col-span-12 lg:col-span-4 border-none shadow-md bg-white flex flex-col">
                <CardHeader className="py-4 px-6 border-b bg-slate-50/50">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    פירוט תקלות
                  </CardTitle>
                </CardHeader>
                <div className="flex-1 overflow-y-auto max-h-[140px] p-2 custom-scrollbar">
                  {faultyHeadsets.length > 0 ? (
                    <div className="space-y-1">
                      {faultyHeadsets.map(device => (
                        <div key={device.id} className="p-2 hover:bg-slate-50 rounded-md flex justify-between items-center text-sm transition-colors border border-transparent hover:border-slate-100">
                          <div className="flex items-center gap-2">
                             <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 font-mono">#{device.binocular_number}</Badge>
                             <span className="text-slate-600 text-xs truncate max-w-[120px]">{device.primary_email}</span>
                          </div>
                          <Badge variant="secondary" className="bg-red-50 text-red-600 text-[10px] px-1.5">תקול</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <CheckCircle className="w-8 h-8 mb-1 opacity-20" />
                        <span className="text-xs">אין תקלות ידועות</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {viewMode === "form" && (
            <div className="flex gap-2 justify-start mb-4">
              <Button onClick={() => setViewMode("list")} variant="outline" className="gap-2">
                <ArrowRight className="w-4 h-4" /> חזור לרשימה
              </Button>
              {isReadOnly && (
                <Button onClick={() => setIsReadOnly(false)} className="gap-2" variant="outline">
                  <Edit className="w-4 h-4" /> ערוך
                </Button>
              )}
            </div>
          )}
        </div>

        {/* List View */}
        {viewMode === "list" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800 border-r-4 border-cyan-500 pr-3">שיבוצים קיימים</h2>
            
            {allSilshuchim.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Stamp className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-700 mb-2">אין שיבוצים במערכת</h3>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">צור שיבוץ חדש כדי להתחיל לנהל את הקצאת המשקפות לפעילויות השונות.</p>
                <Button onClick={createNewSilshuch} className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 gap-2 px-8 py-6 text-lg rounded-xl shadow-lg">
                  <Plus className="w-5 h-5" />
                  צור שיבוץ ראשון
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allSilshuchim.map(silshuch => (
                  <motion.div
                    key={silshuch.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div 
                        className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-slate-100 flex flex-col h-full group"
                        onClick={() => viewSilshuch(silshuch)}
                    >
                      {/* Card Header Color Strip */}
                      <div className={`h-2 w-full ${silshuch.mode === "static" ? "bg-gradient-to-r from-purple-500 to-purple-400" : "bg-gradient-to-r from-cyan-500 to-cyan-400"}`}></div>
                      
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                           <Badge variant="outline" className={`${silshuch.mode === "static" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-cyan-50 text-cyan-700 border-cyan-200"} px-2 py-0.5 text-xs font-bold`}>
                                {silshuch.mode === "static" ? "סטטי" : "דינמי"}
                           </Badge>
                           {silshuch.created_date && (
                              <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                                {format(new Date(silshuch.created_date), 'dd/MM/yy')}
                              </span>
                            )}
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-1 group-hover:text-purple-700 transition-colors">
                            {silshuch.assignmentName}
                        </h3>
                        
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">
                            {silshuch.details || "אין פרטים נוספים"}
                        </p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                <div className={`p-1.5 rounded-full ${silshuch.mode === "static" ? "bg-purple-100 text-purple-600" : "bg-cyan-100 text-cyan-600"}`}>
                                    <VRIcon className="w-3.5 h-3.5" />
                                </div>
                                <span>
                                    {silshuch.mode === "static" ? `${(silshuch.selectedHeadsets || []).length} משקפות` : `${silshuch.numberOfSessions} מפגשים`}
                                </span>
                            </div>
                            
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" 
                                onClick={(e) => deleteSilshuch(silshuch, e)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Form View */}
        {viewMode === "form" && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">סוג:</span>
                {/* Small Toggle Selector */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => !isReadOnly && setMode("static")} 
                    disabled={isReadOnly}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === "static" ? "bg-white shadow text-purple-700" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    סטטי
                  </button>
                  <button 
                    onClick={() => !isReadOnly && setMode("dynamic")} 
                    disabled={isReadOnly}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === "dynamic" ? "bg-white shadow text-cyan-700" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    דינמי
                  </button>
                </div>
              </div>
              
            </div>

            <Card className="mb-6">
              <CardHeader><CardTitle>פרטי השיבוץ</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">שם השיבוץ</label>
                  {!isReadOnly ? (
                    <Input value={assignmentName} onChange={(e) => setAssignmentName(e.target.value)} placeholder="לדוגמה: סדנת VR לכיתה ט'" className="text-base" />
                  ) : (
                    <div className="text-lg font-medium p-2 bg-slate-50 rounded border border-slate-100">{assignmentName}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">פרטים נוספים</label>
                  {!isReadOnly ? (
                    <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="תאור השיבוץ..." className="min-h-[100px]" />
                  ) : (
                    <div className="text-slate-600 p-2 bg-slate-50 rounded border border-slate-100 min-h-[60px]">{details || "אין פרטים נוספים"}</div>
                  )}
                </div>
                {mode === "dynamic" && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">מספר מפגשים</label>
                    {!isReadOnly ? (
                      <Input type="number" min="1" max="20" value={numberOfSessions} onChange={(e) => setNumberOfSessions(Math.max(1, parseInt(e.target.value) || 1))} className="text-base w-32" />
                    ) : (
                      <div className="font-medium">{numberOfSessions}</div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                  <label className="text-sm font-medium text-slate-700 flex-1">האם יש תאריכים לשיבוץ?</label>
                  <div className="flex gap-2">
                    {!isReadOnly ? (
                      <>
                        <Button type="button" size="sm" variant={!hasDates ? "default" : "outline"} onClick={() => setHasDates(false)} className={!hasDates ? "bg-slate-700" : ""}>אין תאריך</Button>
                        <Button type="button" size="sm" variant={hasDates ? "default" : "outline"} onClick={() => setHasDates(true)} className={hasDates ? "bg-purple-600" : ""}>יש תאריכים</Button>
                      </>
                    ) : (
                      <Badge variant="outline">{hasDates ? "כן" : "לא"}</Badge>
                    )}
                  </div>
                </div>
                {hasDates && !isReadOnly && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-blue-900 block">סנכרון עם Google Calendar 📅</label>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant={!calendarEnabled ? "default" : "outline"} onClick={() => setCalendarEnabled(false)} className={!calendarEnabled ? "bg-slate-600" : ""}>לא</Button>
                      <Button type="button" size="sm" variant={calendarEnabled ? "default" : "outline"} onClick={() => setCalendarEnabled(true)} className={calendarEnabled ? "bg-blue-600" : ""}>כן</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {mode === "static" && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>משקפות משובצות</CardTitle>
                  {!isReadOnly && (
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => openHeadsetModal(null)} className="bg-gradient-to-r from-purple-600 to-purple-700 gap-2 w-fit">
                        <Plus className="w-4 h-4" /> הוסף משקפות
                      </Button>
                      <Button onClick={() => setShowProgramsModal(true)} variant="outline" className="border-purple-200 hover:bg-purple-50 text-purple-700 gap-2 w-fit">
                        <Plus className="w-4 h-4" /> הוסף מתוכנית
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {/* Date Picker moved here for static mode */}
                  {hasDates && (
                    <div className="mb-6 p-3 bg-purple-50 rounded border border-purple-100 flex items-center gap-3">
                      <label className="text-sm font-medium text-purple-900">תאריך ביצוע:</label>
                      {!isReadOnly ? (
                        <Input type="date" value={executionDate || ""} onChange={(e) => setExecutionDate(e.target.value)} className="max-w-xs bg-white" />
                      ) : (
                        <span className="font-medium">{executionDate ? format(new Date(executionDate), 'dd/MM/yyyy') : "לא נקבע"}</span>
                      )}
                    </div>
                  )}
                  
                  {selectedStaticHeadsets.size > 0 ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {Array.from(selectedStaticHeadsets).map(deviceId => (
                          <div key={deviceId} className="relative group">
                            <Link to={createPageUrl(`DeviceInfo?id=${getHeadsetDisplay(deviceId)}`)}>
                              <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-base px-4 py-2 cursor-pointer hover:from-purple-600 hover:to-purple-700 pl-8">
                                <VRIcon className="w-4 h-4 mr-2" /> משקפת {getHeadsetDisplay(deviceId)}
                              </Badge>
                            </Link>
                            {!isReadOnly && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="absolute top-1/2 -translate-y-1/2 left-1 w-6 h-6 p-0 rounded-full bg-red-600 text-white hover:bg-red-700 z-10 opacity-80 hover:opacity-100" 
                                onClick={(e) => {
                                  e.preventDefault(); e.stopPropagation();
                                  const newSet = new Set(selectedStaticHeadsets);
                                  newSet.delete(deviceId);
                                  setSelectedStaticHeadsets(newSet);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-slate-600 font-medium">סה"כ משקפות: {selectedStaticHeadsets.size}</div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <VRIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>טרם נבחרו משקפות</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {mode === "dynamic" && (
              <div className="space-y-4 mb-6">
                {selectedDynamicHeadsets.map((sessionSet, idx) => (
                  <Card key={idx} className="border-2 border-cyan-200">
                    <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-cyan-600" /> מפגש {idx + 1}
                          </CardTitle>
                          {!isReadOnly && (
                            <div className="flex gap-2">
                              <Button onClick={() => openHeadsetModal(idx)} size="sm" className="bg-gradient-to-r from-cyan-600 to-cyan-700 gap-2">
                                <Plus className="w-4 h-4" /> הוסף משקפות
                              </Button>
                              <Button onClick={() => { setCurrentSessionIndex(idx); setShowProgramsModal(true); }} size="sm" variant="outline" className="border-cyan-200 hover:bg-cyan-50 text-cyan-700 gap-2">
                                <Plus className="w-4 h-4" /> הוסף מתוכנית
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      {hasDates && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-600">תאריך:</label>
                          {!isReadOnly ? (
                            <Input type="date" value={sessionDates[idx] || ""} onChange={(e) => {
                              const newDates = [...sessionDates];
                              newDates[idx] = e.target.value;
                              setSessionDates(newDates);
                            }} className="max-w-xs text-sm h-8" />
                          ) : (
                            <span className="text-sm">{sessionDates[idx] ? format(new Date(sessionDates[idx]), 'dd/MM/yyyy') : "לא נקבע"}</span>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="pt-4">
                      {sessionSet.size > 0 ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {Array.from(sessionSet).map(deviceId => (
                              <div key={deviceId} className="relative group">
                                <Badge className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-sm px-3 py-1 pl-6">
                                  <VRIcon className="w-3 h-3 mr-1" /> {getHeadsetDisplay(deviceId)}
                                </Badge>
                                {!isReadOnly && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="absolute top-1/2 -translate-y-1/2 left-1 w-4 h-4 p-0 rounded-full bg-red-600 text-white hover:bg-red-700 z-10 opacity-80 hover:opacity-100" 
                                    onClick={() => {
                                      const newDynamic = [...selectedDynamicHeadsets];
                                      newDynamic[idx] = new Set(sessionSet);
                                      newDynamic[idx].delete(deviceId);
                                      setSelectedDynamicHeadsets(newDynamic);
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          <Button type="button" size="sm" variant="outline" className="w-full gap-2 text-green-600 border-green-600 hover:bg-green-50" onClick={() => {
                            const session = idx + 1;
                            const headsetNumbers = Array.from(sessionSet).map(id => getHeadsetDisplay(id)).sort((a, b) => a - b).join(", ");
                            const whatsappText = `📅 *מפגש ${session}*\n👓 משקפות: ${headsetNumbers}${sessionDates[idx] ? `\n📆 תאריך: ${format(new Date(sessionDates[idx]), 'dd/MM/yyyy')}` : ''}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, '_blank');
                          }}>
                            <MessageSquare className="w-4 h-4" /> WhatsApp למפגש
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-400 text-sm">אין משקפות למפגש זה</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="mb-6">
              <Card className="border-2 border-green-200">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="flex items-center gap-2"><Save className="w-5 h-5 text-green-600" /> פעולות</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex flex-row gap-3">
                    {!isReadOnly && (
                      <Button onClick={saveSilshuch} disabled={saving || creatingCalendarEvent} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 text-white gap-2 h-12 text-base">
                        <Save className="w-5 h-5" /> {saving ? "שומר..." : "שמור שיבוץ"}
                      </Button>
                    )}
                    <Button onClick={generateSummary} className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 text-white gap-2 h-12 text-base">
                      <CheckCircle className="w-5 h-5" /> סיכום WhatsApp
                    </Button>
                  </div>
                  {showSummary && summaryText && (
                    <div className="space-y-3">
                      <Textarea value={summaryText} readOnly className="min-h-[200px] bg-slate-50 font-mono text-sm" />
                      <Button onClick={copyToClipboard} variant="outline" className="w-full gap-2">
                        <Copy className="w-4 h-4" /> העתק ללוח
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Dialog open={isHeadsetModalOpen} onOpenChange={setIsHeadsetModalOpen}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <VRIcon className="w-6 h-6 text-purple-600" /> בחר משקפות {currentSessionIndex !== null && ` - מפגש ${currentSessionIndex + 1}`}
                  </DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto max-h-[50vh] p-4">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {allHeadsets.map(device => (
                      <div key={device.id} onClick={() => toggleHeadsetInTemp(device.id)} className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${tempSelection.has(device.id) ? "border-purple-500 bg-purple-50" : "border-slate-200 bg-white hover:border-purple-300"}`}>
                        <div className="absolute top-2 right-2"><Checkbox checked={tempSelection.has(device.id)} /></div>
                        <div className="text-center pt-4">
                          <VRIcon className={`w-6 h-6 mx-auto mb-2 ${tempSelection.has(device.id) ? "text-purple-600" : "text-slate-400"}`} />
                          <div className={`font-bold text-lg ${tempSelection.has(device.id) ? "text-purple-900" : "text-slate-700"}`}>{device.binocular_number}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <div className="flex-1 text-sm text-slate-600">נבחרו: {tempSelection.size} משקפות</div>
                  <Button variant="outline" onClick={() => setIsHeadsetModalOpen(false)}>ביטול</Button>
                  <Button onClick={confirmHeadsetSelection} className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700">אישור</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Programs Selection Modal */}
            <Dialog open={showProgramsModal} onOpenChange={setShowProgramsModal}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-purple-600" /> בחר תוכנית להוספת משקפות
                  </DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto max-h-[50vh] p-4 space-y-3">
                  {programsWithDevices.length > 0 ? (
                    programsWithDevices.map(program => {
                      const deviceCount = (program.assigned_device_ids || []).length;
                      const title = program.title || program.course_topic || program.subject || "ללא שם";
                      const isExpanded = expandedProgramId === program.id;
                      const hasSessions = program.sessions && program.sessions.length > 0;
                      
                      return (
                        <div key={program.id} className="border rounded-lg transition-colors bg-white overflow-hidden">
                          <div 
                            className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50"
                            onClick={() => {
                              if (hasSessions) {
                                setExpandedProgramId(isExpanded ? null : program.id);
                              } else {
                                // Direct selection if no sessions
                                const deviceIds = program.assigned_device_ids || [];
                                if (currentSessionIndex === null) {
                                  // Static mode
                                  const newSet = new Set(selectedStaticHeadsets);
                                  deviceIds.forEach(id => newSet.add(id));
                                  setSelectedStaticHeadsets(newSet);
                                } else {
                                  // Dynamic mode
                                  const newDynamic = [...selectedDynamicHeadsets];
                                  const newSet = new Set(newDynamic[currentSessionIndex]);
                                  deviceIds.forEach(id => newSet.add(id));
                                  newDynamic[currentSessionIndex] = newSet;
                                  setSelectedDynamicHeadsets(newDynamic);
                                }
                                setShowProgramsModal(false);
                                toast({
                                  title: "המשקפות נוספו",
                                  description: `נוספו ${deviceCount} משקפות מהתוכנית "${title}"`
                                });
                              }
                            }}
                          >
                            <div>
                              <h4 className="font-semibold text-lg text-slate-800">{title}</h4>
                              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                <VRIcon className="w-4 h-4" />
                                <span>{deviceCount} משקפות משובצות</span>
                                {program.program_number && <Badge variant="outline" className="text-xs">#{program.program_number}</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasSessions ? (
                                <Button size="sm" variant="ghost" className="text-slate-500">
                                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" className="text-purple-600">
                                  <Plus className="w-5 h-5" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Sessions List */}
                          <AnimatePresence>
                            {isExpanded && hasSessions && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="bg-slate-50 border-t"
                              >
                                <div className="p-2 space-y-2">
                                  {/* Option to add all devices regardless of session */}
                                  <div 
                                    onClick={() => {
                                      const deviceIds = program.assigned_device_ids || [];
                                      if (currentSessionIndex === null) {
                                        const newSet = new Set(selectedStaticHeadsets);
                                        deviceIds.forEach(id => newSet.add(id));
                                        setSelectedStaticHeadsets(newSet);
                                      } else {
                                        const newDynamic = [...selectedDynamicHeadsets];
                                        const newSet = new Set(newDynamic[currentSessionIndex]);
                                        deviceIds.forEach(id => newSet.add(id));
                                        newDynamic[currentSessionIndex] = newSet;
                                        setSelectedDynamicHeadsets(newDynamic);
                                      }
                                      setShowProgramsModal(false);
                                      toast({ title: "נוספו כל משקפות התוכנית" });
                                    }}
                                    className="p-3 bg-white border rounded hover:bg-purple-50 hover:border-purple-200 cursor-pointer flex justify-between items-center"
                                  >
                                    <span className="font-medium text-slate-700">כל המשקפות בתוכנית ({deviceCount})</span>
                                    <Plus className="w-4 h-4 text-purple-600" />
                                  </div>
                                  
                                  {/* Individual Sessions */}
                                  {program.sessions.map((session, idx) => {
                                    // Calculate matching devices
                                    const sessionAppIds = [...(session.app_ids || []), ...(session.experience_ids || [])];
                                    // Find devices in program that have ANY of these apps
                                    // We use the single source of truth: DeviceApp entity (loaded into deviceAppMap)
                                    const matchingDeviceIds = (program.assigned_device_ids || []).filter(devId => {
                                      const installedAppsSet = deviceAppMap[devId];
                                      if (!installedAppsSet) return false;
                                      return sessionAppIds.some(appId => installedAppsSet.has(appId));
                                    });
                                    
                                    return (
                                      <div 
                                        key={idx}
                                        onClick={() => {
                                          if (matchingDeviceIds.length === 0) {
                                            toast({ title: "אין משקפות מתאימות למפגש זה", variant: "secondary" });
                                            return;
                                          }
                                          if (currentSessionIndex === null) {
                                            const newSet = new Set(selectedStaticHeadsets);
                                            matchingDeviceIds.forEach(id => newSet.add(id));
                                            setSelectedStaticHeadsets(newSet);
                                          } else {
                                            const newDynamic = [...selectedDynamicHeadsets];
                                            const newSet = new Set(newDynamic[currentSessionIndex]);
                                            matchingDeviceIds.forEach(id => newSet.add(id));
                                            newDynamic[currentSessionIndex] = newSet;
                                            setSelectedDynamicHeadsets(newDynamic);
                                          }
                                          setShowProgramsModal(false);
                                          toast({ title: `נוספו ${matchingDeviceIds.length} משקפות למפגש ${session.number}` });
                                        }}
                                        className="p-3 bg-white border rounded hover:bg-cyan-50 hover:border-cyan-200 cursor-pointer flex justify-between items-center ml-4"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium text-slate-700">מפגש {session.number}: {session.topic || "ללא נושא"}</span>
                                          <span className="text-xs text-slate-500">{matchingDeviceIds.length} משקפות מתאימות (מתוך {deviceCount})</span>
                                        </div>
                                        <Plus className="w-4 h-4 text-cyan-600" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <p>לא נמצאו תוכניות עם משקפות משובצות</p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowProgramsModal(false)}>ביטול</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}