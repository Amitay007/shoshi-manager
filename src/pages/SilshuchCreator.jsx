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
import { Plus, Copy, Save, Repeat, Glasses, Calendar, FileText, Search, CheckCircle, Stamp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { with429Retry } from "@/components/utils/retry";

export default function SilshuchCreator() {
  const { toast } = useToast();
  
  // Core state
  const [mode, setMode] = useState("static"); // "static" or "dynamic"
  const [assignmentName, setAssignmentName] = useState("");
  const [details, setDetails] = useState("");
  const [numberOfSessions, setNumberOfSessions] = useState(3);
  
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
  const [allSilshuchim, setAllSilshuchim] = useState([]);
  const [editingSilshuch, setEditingSilshuch] = useState(null);

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
      } else if (numberOfSessions < currentLength) {
        // Remove extra sets
        setSelectedDynamicHeadsets(selectedDynamicHeadsets.slice(0, numberOfSessions));
      }
    }
  }, [numberOfSessions, mode]);

  // Open modal for headset selection
  const openHeadsetModal = (sessionIndex = null) => {
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
        status: "active"
      };

      if (mode === "static") {
        silshuchData.selectedHeadsets = Array.from(selectedStaticHeadsets);
      } else {
        silshuchData.numberOfSessions = numberOfSessions;
        silshuchData.sessions = selectedDynamicHeadsets.map((sessionSet, idx) => ({
          sessionNumber: idx + 1,
          headsets: Array.from(sessionSet)
        }));
      }

      await with429Retry(() => Silshuch.create(silshuchData));
      
      toast({
        title: "נשמר בהצלחה!",
        description: "השיבוץ נשמר במערכת",
      });

      // Reset form and return to list
      setAssignmentName("");
      setDetails("");
      setSelectedStaticHeadsets(new Set());
      setSelectedDynamicHeadsets([new Set(), new Set(), new Set()]);
      setShowSummary(false);
      setSummaryText("");
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

  // Open form for new silshuch
  const createNewSilshuch = () => {
    setEditingSilshuch(null);
    setAssignmentName("");
    setDetails("");
    setMode("static");
    setNumberOfSessions(3);
    setSelectedStaticHeadsets(new Set());
    setSelectedDynamicHeadsets([new Set(), new Set(), new Set()]);
    setShowSummary(false);
    setSummaryText("");
    setViewMode("form");
  };

  // View existing silshuch
  const viewSilshuch = (silshuch) => {
    setEditingSilshuch(silshuch);
    setAssignmentName(silshuch.assignmentName);
    setDetails(silshuch.details || "");
    setMode(silshuch.mode);
    
    if (silshuch.mode === "static") {
      setSelectedStaticHeadsets(new Set(silshuch.selectedHeadsets || []));
    } else {
      setNumberOfSessions(silshuch.numberOfSessions || 3);
      const sessions = (silshuch.sessions || []).map(s => new Set(s.headsets || []));
      setSelectedDynamicHeadsets(sessions);
    }
    
    setViewMode("form");
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
              <h1 className="text-2xl font-bold text-purple-900">ניהול שיבוצים</h1>
              <p className="text-slate-600 text-xs">יוצר שיבוץ משקפות</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mb-4">
            {viewMode === "list" && (
              <>
                <Button
                  onClick={createNewSilshuch}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 gap-2"
                >
                  <Plus className="w-5 h-5" />
                  צור שיבוץ
                </Button>
                <BackHomeButtons backLabel="לעמוד הקודם" showHomeButton={false} />
              </>
            )}
            {viewMode === "form" && (
              <Button
                onClick={() => setViewMode("list")}
                variant="outline"
                className="gap-2 w-full"
              >
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
            <h1 className="text-2xl sm:text-3xl font-bold text-purple-900">ניהול שיבוצים</h1>
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-600 text-sm">יוצר שיבוץ משקפות</p>
            {viewMode === "list" && (
              <Button
                onClick={createNewSilshuch}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 gap-2"
              >
                <Plus className="w-5 h-5" />
                צור שיבוץ חדש
              </Button>
            )}
            {viewMode === "form" && (
              <Button
                onClick={() => setViewMode("list")}
                variant="outline"
                className="gap-2"
              >
                חזור לרשימה
              </Button>
            )}
          </div>
          <BackHomeButtons backLabel="לעמוד הקודם" showHomeButton={false} />
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
                  <Button
                    onClick={createNewSilshuch}
                    className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    צור שיבוץ חדש
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allSilshuchim.map(silshuch => (
                  <Card
                    key={silshuch.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => viewSilshuch(silshuch)}
                  >
                    <CardHeader className={`${
                      silshuch.mode === "static" 
                        ? "bg-gradient-to-r from-purple-50 to-purple-100" 
                        : "bg-gradient-to-r from-cyan-50 to-cyan-100"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-lg">{silshuch.assignmentName}</CardTitle>
                        <Badge className={
                          silshuch.mode === "static"
                            ? "bg-purple-600"
                            : "bg-cyan-600"
                        }>
                          {silshuch.mode === "static" ? "סטטי" : "דינמי"}
                        </Badge>
                      </div>
                      {silshuch.created_date && (
                        <p className="text-xs text-slate-500">
                          נוצר: {format(new Date(silshuch.created_date), 'dd/MM/yyyy HH:mm')}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-4">
                      {silshuch.details && (
                        <p className="text-sm text-slate-600 mb-3">{silshuch.details}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Glasses className="w-4 h-4" />
                          {silshuch.mode === "static" 
                            ? `${(silshuch.selectedHeadsets || []).length} משקפות`
                            : `${silshuch.numberOfSessions} מפגשים`
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Form View */}
        {viewMode === "form" && (
          <>
        {/* Mode Toggle */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>בחר סוג שיבוץ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                onClick={() => setMode("static")}
                className={`flex-1 h-20 ${
                  mode === "static"
                    ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <div className="text-center">
                  <FileText className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-bold">שיבוץ סטטי</div>
                  <div className="text-xs opacity-80">אירוע חד פעמי / קבוע</div>
                </div>
              </Button>
              <Button
                onClick={() => setMode("dynamic")}
                className={`flex-1 h-20 ${
                  mode === "dynamic"
                    ? "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <div className="text-center">
                  <Repeat className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-bold">שיבוץ דינמי</div>
                  <div className="text-xs opacity-80">סילבוס עם מפגשים מרובים</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>פרטי השיבוץ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">שם השיבוץ</label>
              <Input
                value={assignmentName}
                onChange={(e) => setAssignmentName(e.target.value)}
                placeholder="לדוגמה: סדנת VR לכיתה ט'"
                className="text-base"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">פרטים נוספים</label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="תאור השיבוץ, הערות, וכו'"
                className="min-h-[100px]"
              />
            </div>
            {mode === "dynamic" && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">מספר מפגשים</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={numberOfSessions}
                  onChange={(e) => setNumberOfSessions(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-base w-32"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Static Mode - Single Assignment */}
        {mode === "static" && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>משקפות משוייכות</CardTitle>
                <Button
                  onClick={() => openHeadsetModal(null)}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  הוסף משקפות
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedStaticHeadsets.size > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {Array.from(selectedStaticHeadsets).map(deviceId => (
                      <Badge
                        key={deviceId}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-base px-4 py-2"
                      >
                        <Glasses className="w-4 h-4 mr-2" />
                        משקפת {getHeadsetDisplay(deviceId)}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    סה"כ משקפות: {selectedStaticHeadsets.size}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Glasses className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>טרם נבחרו משקפות</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dynamic Mode - Multiple Sessions */}
        {mode === "dynamic" && (
          <div className="space-y-4 mb-6">
            {selectedDynamicHeadsets.map((sessionSet, idx) => (
              <Card key={idx} className="border-2 border-cyan-200">
                <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-cyan-600" />
                      מפגש {idx + 1}
                    </CardTitle>
                    <Button
                      onClick={() => openHeadsetModal(idx)}
                      size="sm"
                      className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      הוסף משקפות
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {sessionSet.size > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {Array.from(sessionSet).map(deviceId => (
                        <Badge
                          key={deviceId}
                          className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-sm px-3 py-1"
                        >
                          <Glasses className="w-3 h-3 mr-1" />
                          {getHeadsetDisplay(deviceId)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-sm">
                      אין משקפות למפגש זה
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <Card className="mb-6 border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-green-600" />
              פעולות
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <Button
              onClick={saveSilshuch}
              disabled={saving}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white gap-2 h-12 text-base"
            >
              <Save className="w-5 h-5" />
              {saving ? "שומר..." : "שמור שיבוץ"}
            </Button>
          </CardContent>
        </Card>

        {/* Generate Summary Section */}
        <Card className="mb-6 border-2 border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-cyan-50">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              ייצוא סיכום
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <Button
              onClick={generateSummary}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white gap-2 h-12 text-base"
            >
              <CheckCircle className="w-5 h-5" />
              צור סיכום WhatsApp
            </Button>

            {showSummary && summaryText && (
              <div className="space-y-3">
                <Textarea
                  value={summaryText}
                  readOnly
                  className="min-h-[200px] bg-slate-50 font-mono text-sm"
                />
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Copy className="w-4 h-4" />
                  העתק ללוח
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Headset Selection Modal */}
        <Dialog open={isHeadsetModalOpen} onOpenChange={setIsHeadsetModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Glasses className="w-6 h-6 text-purple-600" />
              בחר משקפות
              {currentSessionIndex !== null && ` - מפגש ${currentSessionIndex + 1}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[50vh] p-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {allHeadsets.map(device => (
                <div
                  key={device.id}
                  onClick={() => toggleHeadsetInTemp(device.id)}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    tempSelection.has(device.id)
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 bg-white hover:border-purple-300"
                  }`}
                >
                  <div className="absolute top-2 right-2">
                    <Checkbox checked={tempSelection.has(device.id)} />
                  </div>
                  <div className="text-center pt-4">
                    <Glasses className={`w-6 h-6 mx-auto mb-2 ${
                      tempSelection.has(device.id) ? "text-purple-600" : "text-slate-400"
                    }`} />
                    <div className={`font-bold text-lg ${
                      tempSelection.has(device.id) ? "text-purple-900" : "text-slate-700"
                    }`}>
                      {device.binocular_number}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <div className="flex-1 text-sm text-slate-600">
              נבחרו: {tempSelection.size} משקפות
            </div>
            <Button
              variant="outline"
              onClick={() => setIsHeadsetModalOpen(false)}
            >
              ביטול
            </Button>
            <Button
              onClick={confirmHeadsetSelection}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
            >
              אישור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </>
        )}
      </div>
    </div>
  );
}