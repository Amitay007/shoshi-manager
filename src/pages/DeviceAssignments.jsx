import React, { useState, useEffect, useMemo } from "react";
import { VRDevice } from "@/entities/VRDevice";
import { Silshuch } from "@/entities/Silshuch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Copy, Save, Repeat, Calendar, FileText, Search, CheckCircle, Stamp, MessageSquare, Trash2, X, Edit, ArrowRight } from "lucide-react";
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
  
  // Summary state
  const [summaryText, setSummaryText] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // View mode state
  const [viewMode, setViewMode] = useState("list"); // "list" or "form"
  const [isEditing, setIsEditing] = useState(true); // "read-only" vs "edit"
  const [allSilshuchim, setAllSilshuchim] = useState([]);
  const [editingSilshuch, setEditingSilshuch] = useState(null);
  
  // Calendar integration state
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [creatingCalendarEvent, setCreatingCalendarEvent] = useState(false);

  // Load headsets and silshuchim
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devices, silshuchim] = await Promise.all([
        with429Retry(() => VRDevice.list()),
        with429Retry(() => Silshuch.list())
      ]);
      
      const sortedDevices = (devices || [])
        .filter(d => !d.is_disabled)
        .sort((a, b) => a.binocular_number - b.binocular_number);
      setAllHeadsets(sortedDevices);
      setAllSilshuchim(silshuchim || []);
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
    if (!isEditing) return;
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
      // Logic simplified for now
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
  };

  // Open form for new silshuch
  const createNewSilshuch = () => {
    resetForm();
    setIsEditing(true);
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
    
    setIsEditing(false); // Default to read-only
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
              <h1 className="text-2xl font-bold text-purple-900">שיוך משקפות</h1>
              <p className="text-slate-600 text-xs">ניהול הקצאת משקפות</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mb-4">
            {viewMode === "list" && (
              <>
                <BackHomeButtons backLabel="לעמוד הקודם" showHomeButton={false} />
                <Button onClick={createNewSilshuch} className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 gap-2">
                  <Plus className="w-5 h-5" />
                  צור שיבוץ חדש
                </Button>
              </>
            )}
            {viewMode === "form" && (
              <Button onClick={() => setViewMode("list")} variant="outline" className="gap-2 w-full">
                חזור לרשימה
              </Button>
            )}
          </div>
        </div>

        {/* Desktop Header */}
        <div className="mb-6 hidden lg:block">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
              <Stamp className="text-white" size={28} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-purple-900">שיוך משקפות</h1>
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-600 text-sm">ניהול הקצאת משקפות</p>
            {viewMode === "list" && (
              <div className="flex gap-2">
                <BackHomeButtons backLabel="לעמוד הקודם" showHomeButton={false} />
                <Button onClick={createNewSilshuch} className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 gap-2">
                  <Plus className="w-5 h-5" />
                  צור שיבוץ חדש
                </Button>
              </div>
            )}
            {viewMode === "form" && (
              <Button onClick={() => setViewMode("list")} variant="outline" className="gap-2">
                חזור לרשימה
              </Button>
            )}
          </div>
        </div>

        {/* List View */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {allSilshuchim.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Stamp className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">אין שיבוצים</h3>
                  <p className="text-slate-500 mb-4">צור שיבוץ חדש כדי להתחיל</p>
                  <Button onClick={createNewSilshuch} className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 gap-2">
                    <Plus className="w-5 h-5" />
                    צור שיבוץ חדש
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allSilshuchim.map(silshuch => (
                  <motion.div
                    key={silshuch.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer relative" onClick={() => viewSilshuch(silshuch)}>
                      <CardHeader className={`${silshuch.mode === "static" ? "bg-gradient-to-r from-purple-50 to-purple-100" : "bg-gradient-to-r from-cyan-50 to-cyan-100"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <CardTitle className="text-lg">{silshuch.assignmentName}</CardTitle>
                          <Badge className={silshuch.mode === "static" ? "bg-purple-600" : "bg-cyan-600"}>
                            {silshuch.mode === "static" ? "סטטי" : "דינמי"}
                          </Badge>
                        </div>
                        {silshuch.created_date && (
                          <p className="text-xs text-slate-500">
                            נוצר: {format(new Date(silshuch.created_date), 'dd/MM/yyyy HH:mm')}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="pt-4 pb-12">
                        {silshuch.details && <p className="text-sm text-slate-600 mb-3">{silshuch.details}</p>}
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <VRIcon className="w-4 h-4" />
                            {silshuch.mode === "static" ? `${(silshuch.selectedHeadsets || []).length} משקפות` : `${silshuch.numberOfSessions} מפגשים`}
                          </div>
                        </div>
                        <div className="absolute bottom-2 left-2">
                          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0" onClick={(e) => deleteSilshuch(silshuch, e)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
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
                <span className="text-sm font-medium text-slate-700">סוג שיבוץ:</span>
                <div className="flex gap-2">
                  <Badge onClick={() => isEditing && setMode("static")} className={`cursor-pointer px-4 py-2 ${mode === "static" ? "bg-purple-600" : "bg-slate-200 text-slate-700"}`}>
                    <FileText className="w-3 h-3 mr-1" /> סטטי
                  </Badge>
                  <Badge onClick={() => isEditing && setMode("dynamic")} className={`cursor-pointer px-4 py-2 ${mode === "dynamic" ? "bg-cyan-600" : "bg-slate-200 text-slate-700"}`}>
                    <Repeat className="w-3 h-3 mr-1" /> דינמי
                  </Badge>
                </div>
              </div>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} className="gap-2" variant="outline">
                  <Edit className="w-4 h-4" /> ערוך
                </Button>
              )}
            </div>

            <Card className="mb-6">
              <CardHeader><CardTitle>פרטי השיבוץ</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">שם השיבוץ</label>
                  {isEditing ? (
                    <Input value={assignmentName} onChange={(e) => setAssignmentName(e.target.value)} placeholder="לדוגמה: סדנת VR לכיתה ט'" className="text-base" />
                  ) : (
                    <div className="text-lg font-medium">{assignmentName}</div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">פרטים נוספים</label>
                  {isEditing ? (
                    <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="תאור השיבוץ..." className="min-h-[100px]" />
                  ) : (
                    <div className="text-slate-600">{details || "אין פרטים נוספים"}</div>
                  )}
                </div>
                {mode === "dynamic" && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">מספר מפגשים</label>
                    {isEditing ? (
                      <Input type="number" min="1" max="20" value={numberOfSessions} onChange={(e) => setNumberOfSessions(Math.max(1, parseInt(e.target.value) || 1))} className="text-base w-32" />
                    ) : (
                      <div className="font-medium">{numberOfSessions}</div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                  <label className="text-sm font-medium text-slate-700 flex-1">האם יש תאריכים לשיבוץ?</label>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button type="button" size="sm" variant={!hasDates ? "default" : "outline"} onClick={() => setHasDates(false)} className={!hasDates ? "bg-slate-700" : ""}>אין תאריך</Button>
                        <Button type="button" size="sm" variant={hasDates ? "default" : "outline"} onClick={() => setHasDates(true)} className={hasDates ? "bg-purple-600" : ""}>יש תאריכים</Button>
                      </>
                    ) : (
                      <Badge variant="outline">{hasDates ? "כן" : "לא"}</Badge>
                    )}
                  </div>
                </div>
                {hasDates && isEditing && (
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
                  <div className="flex items-center justify-between">
                    <CardTitle>משקפות משוייכות</CardTitle>
                    {isEditing && (
                      <Button onClick={() => openHeadsetModal(null)} className="bg-gradient-to-r from-purple-600 to-purple-700 gap-2">
                        <Plus className="w-4 h-4" /> הוסף משקפות
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {hasDates && (
                    <div className="mb-4 flex items-center gap-3">
                      <label className="text-sm font-medium text-slate-700">תאריך ביצוע:</label>
                      {isEditing ? (
                        <Input type="date" value={executionDate || ""} onChange={(e) => setExecutionDate(e.target.value)} className="max-w-xs" />
                      ) : (
                        <span>{executionDate ? format(new Date(executionDate), 'dd/MM/yyyy') : "לא נקבע"}</span>
                      )}
                    </div>
                  )}
                  {selectedStaticHeadsets.size > 0 ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {Array.from(selectedStaticHeadsets).map(deviceId => (
                          <div key={deviceId} className="relative group">
                            <Link to={createPageUrl(`DeviceInfo?id=${getHeadsetDisplay(deviceId)}`)}>
                              <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-base px-4 py-2 cursor-pointer hover:from-purple-600 hover:to-purple-700">
                                <VRIcon className="w-4 h-4 mr-2" /> משקפת {getHeadsetDisplay(deviceId)}
                              </Badge>
                            </Link>
                            {isEditing && (
                              <Button size="sm" variant="ghost" className="absolute -top-2 -right-2 w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-red-600 text-white hover:bg-red-700 z-10" onClick={(e) => {
                                e.preventDefault(); e.stopPropagation();
                                const newSet = new Set(selectedStaticHeadsets);
                                newSet.delete(deviceId);
                                setSelectedStaticHeadsets(newSet);
                              }}>
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
                          {isEditing && (
                            <Button onClick={() => openHeadsetModal(idx)} size="sm" className="bg-gradient-to-r from-cyan-600 to-cyan-700 gap-2">
                              <Plus className="w-4 h-4" /> הוסף משקפות
                            </Button>
                          )}
                        </div>
                      </div>
                      {hasDates && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-600">תאריך:</label>
                          {isEditing ? (
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
                                <Badge className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-sm px-3 py-1">
                                  <VRIcon className="w-3 h-3 mr-1" /> {getHeadsetDisplay(deviceId)}
                                </Badge>
                                {isEditing && (
                                  <Button size="sm" variant="ghost" className="absolute -top-2 -right-2 w-4 h-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-red-600 text-white hover:bg-red-700 z-10" onClick={() => {
                                    const newDynamic = [...selectedDynamicHeadsets];
                                    newDynamic[idx] = new Set(sessionSet);
                                    newDynamic[idx].delete(deviceId);
                                    setSelectedDynamicHeadsets(newDynamic);
                                  }}>
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
                  <div className="flex gap-3">
                    {isEditing && (
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
          </>
        )}
      </div>
    </div>
  );
}