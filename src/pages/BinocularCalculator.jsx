import React, { useState, useEffect, useMemo } from "react";
import { InstitutionProgram } from "@/entities/InstitutionProgram";
import { Syllabus } from "@/entities/Syllabus";
import { VRDevice } from "@/entities/VRDevice";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Glasses, X, RefreshCw, Calendar, BookOpen, Layers } from "lucide-react";
import { with429Retry } from "@/components/utils/retry";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { motion, AnimatePresence } from "framer-motion";

export default function BinocularCalculator() {
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  
  // Data Store
  const [instPrograms, setInstPrograms] = useState([]);
  const [syllabi, setSyllabi] = useState([]);
  const [schools, setSchools] = useState([]);
  const [devices, setDevices] = useState([]);
  
  // UI State
  const [mode, setMode] = useState("programs"); // 'programs' | 'syllabi' | 'sessions'
  
  // Selections
  const [col1, setCol1] = useState("");
  const [col2, setCol2] = useState("");
  const [col3, setCol3] = useState("");

  // --- INIT ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pData, sData, iData, dData] = await Promise.all([
        with429Retry(() => InstitutionProgram.list()),
        with429Retry(() => Syllabus.list()),
        with429Retry(() => EducationInstitution.list()),
        with429Retry(() => VRDevice.list()),
      ]);

      setInstPrograms(pData || []);
      setSyllabi(sData || []);
      setSchools(iData || []);
      
      // Sort devices by number for cleaner display
      const sortedDevices = (dData || []).sort((a, b) => 
        (Number(a.binocular_number) || 0) - (Number(b.binocular_number) || 0)
      );
      setDevices(sortedDevices);
    } catch (err) {
      console.error("Failed to load calculator data", err);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC ENGINE ---

  // 1. Generate Dropdown Options based on Mode
  const options = useMemo(() => {
    if (mode === "syllabi") {
      return syllabi.map(s => ({
        value: s.id,
        label: s.title || s.course_topic || s.subject || "סילבוס ללא שם",
        subLabel: s.activity_type || "סילבוס כללי"
      }));
    }

    if (mode === "programs") {
      return instPrograms
        .filter(p => p.status === "פעילה") // Only active programs usually matter for conflicts
        .map(p => {
          const school = schools.find(s => s.id === p.institution_id);
          const syllabus = syllabi.find(s => s.id === p.program_id);
          const progName = syllabus ? (syllabus.title || syllabus.course_topic) : "תוכנית";
          return {
            value: p.id,
            label: `${school?.name || "מוסד"} - ${progName}`,
            subLabel: `מס' תוכנית: ${p.program_number || "—"}`
          };
        });
    }

    if (mode === "sessions") {
      const sessionOptions = [];
      // Iterate Active Programs
      const activePrograms = instPrograms.filter(p => p.status === "פעילה");
      
      activePrograms.forEach(p => {
        const school = schools.find(s => s.id === p.institution_id);
        const syllabus = syllabi.find(s => s.id === p.program_id);
        
        if (syllabus && syllabus.sessions?.length > 0) {
          const progName = syllabus.title || syllabus.course_topic || "תוכנית";
          
          syllabus.sessions.forEach((session, idx) => {
            // Composite ID: ProgramID | SessionIndex
            const value = `${p.id}|${idx}`;
            const label = `${school?.name || "מוסד"} - ${progName} - מפגש ${session.number || (idx + 1)}`;
            const topic = session.topic ? `: ${session.topic}` : "";
            
            sessionOptions.push({
              value,
              label: label + topic,
              subLabel: `מכשירים מהתוכנית (${(p.assigned_device_ids || []).length})`
            });
          });
        }
      });
      return sessionOptions;
    }

    return [];
  }, [mode, instPrograms, syllabi, schools]);

  // 2. Fetch Devices for a Selection
  const getSelectionDevices = (selectionId) => {
    if (!selectionId) return [];

    let targetIds = [];

    if (mode === "syllabi") {
      const syllabus = syllabi.find(s => s.id === selectionId);
      targetIds = syllabus?.assigned_device_ids || [];
    } 
    else if (mode === "programs") {
      const program = instPrograms.find(p => p.id === selectionId);
      targetIds = program?.assigned_device_ids || [];
    } 
    else if (mode === "sessions") {
      // Logic Fix: Parse Composite ID
      const [programId] = selectionId.split("|");
      const program = instPrograms.find(p => p.id === programId);
      // Hardware belongs to the Program, regardless of session
      targetIds = program?.assigned_device_ids || [];
    }

    // Map IDs to full device objects (to get status/number)
    return targetIds
      .map(id => devices.find(d => d.id === id))
      .filter(Boolean)
      .sort((a, b) => (Number(a.binocular_number) || 0) - (Number(b.binocular_number) || 0));
  };

  // 3. Memoize Device Lists for Columns
  const devices1 = useMemo(() => getSelectionDevices(col1), [col1, mode, devices, instPrograms, syllabi]);
  const devices2 = useMemo(() => getSelectionDevices(col2), [col2, mode, devices, instPrograms, syllabi]);
  const devices3 = useMemo(() => getSelectionDevices(col3), [col3, mode, devices, instPrograms, syllabi]);

  // 4. Calculate Conflicts
  const conflictSet = useMemo(() => {
    const counts = {};
    
    // Count occurrences across all 3 lists
    [devices1, devices2, devices3].forEach(list => {
      // Use Set per list to avoid double-counting if a device appears twice in same list (shouldn't happen but safe)
      const uniqueIds = new Set(list.map(d => d.id));
      uniqueIds.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });

    // Identify conflicts (count > 1)
    const conflicts = new Set();
    Object.entries(counts).forEach(([id, count]) => {
      if (count > 1) conflicts.add(id);
    });
    
    return conflicts;
  }, [devices1, devices2, devices3]);

  // --- UI COMPONENTS ---

  const DeviceGrid = ({ deviceList, themeColor }) => {
    if (!deviceList || deviceList.length === 0) {
      return (
        <div className="h-48 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
          <Glasses className="w-8 h-8 mb-2 opacity-20" />
          <span className="text-sm">אין משקפות להצגה</span>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 p-4 bg-slate-50/50 rounded-xl border border-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
        {deviceList.map(dev => {
          const isConflict = conflictSet.has(dev.id);
          const isDisabled = dev.is_disabled || ["מושבת", "בתיקון", "בתחזוקה"].includes(dev.status);
          const num = dev.binocular_number;

          let bgClass = "";
          if (isDisabled) bgClass = "bg-slate-300 text-slate-600 border-slate-400"; // Disabled priority 1
          else if (isConflict) bgClass = "bg-red-500 text-white shadow-red-200 animate-pulse"; // Conflict priority 2
          else {
            // Theme-based coloring for safe items
            if (themeColor === "purple") bgClass = "bg-purple-600 text-white shadow-purple-200";
            if (themeColor === "cyan") bgClass = "bg-cyan-500 text-white shadow-cyan-200";
            if (themeColor === "emerald") bgClass = "bg-emerald-500 text-white shadow-emerald-200";
          }

          return (
            <Link key={dev.id} to={createPageUrl(`DeviceInfo?id=${num}`)} target="_blank">
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className={`
                  relative aspect-square rounded-xl flex flex-col items-center justify-center shadow-md cursor-pointer border-2 border-transparent transition-all
                  ${bgClass}
                `}
                title={`משקפת ${num}${isDisabled ? " (מושבת)" : ""}${isConflict ? " (מתנגש!)" : ""}`}
              >
                {isDisabled && <X className="w-4 h-4 absolute top-1 right-1 opacity-50" />}
                <span className="text-xs font-bold opacity-80">#{num}</span>
                {isConflict && <div className="absolute inset-0 border-2 border-red-300 rounded-xl animate-ping opacity-20"></div>}
              </motion.div>
            </Link>
          );
        })}
      </div>
    );
  };

  const SelectionColumn = ({ 
    title, 
    value, 
    onChange, 
    deviceList, 
    themeColor, 
    icon: Icon 
  }) => {
    // Theme styles
    const themeStyles = {
      purple: { border: "border-purple-200", bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-100" },
      cyan: { border: "border-cyan-200", bg: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-100" },
      emerald: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-100" }
    };
    const style = themeStyles[themeColor];

    return (
      <Card className={`border-t-4 ${style.border} shadow-lg hover:shadow-xl transition-all duration-300`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${style.bg} ${style.text}`}>
              <Icon className="w-5 h-5" />
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {deviceList.length} משקפות
            </Badge>
          </div>
          <CardTitle className="text-lg font-bold mt-2 text-slate-800">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={value} onValueChange={onChange} dir="rtl">
            <SelectTrigger className={`h-12 bg-white border-slate-200 focus:ring-2 ${style.ring}`}>
              <SelectValue placeholder="בחר להשוואה..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <div className="p-2 sticky top-0 bg-white z-10 border-b mb-1">
                <p className="text-xs text-slate-400 font-medium">
                  מציג {options.length} אפשרויות ({mode === 'sessions' ? 'מפגשים' : mode === 'programs' ? 'תוכניות' : 'סילבוסים'})
                </p>
              </div>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="py-3 border-b border-slate-50 last:border-0">
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="font-medium text-slate-700">{opt.label}</span>
                    <span className="text-xs text-slate-400">{opt.subLabel}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {value ? (
            <DeviceGrid deviceList={deviceList} themeColor={themeColor} />
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-sm">אנא בחר אפשרות</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 p-6 rtl" dir="rtl">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200 rotate-3">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">מחשבון משקפות</h1>
              <p className="text-slate-500 font-medium">בדיקת היתכנות וזמינות ציוד</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl">
            <Button
              variant={mode === "syllabi" ? "default" : "ghost"}
              onClick={() => { setMode("syllabi"); setCol1(""); setCol2(""); setCol3(""); }}
              className={mode === "syllabi" ? "bg-white text-purple-700 shadow-sm hover:bg-white" : "text-slate-500 hover:text-slate-700"}
            >
              <BookOpen className="w-4 h-4 ml-2" />
              סילבוסים (Templates)
            </Button>
            <Button
              variant={mode === "programs" ? "default" : "ghost"}
              onClick={() => { setMode("programs"); setCol1(""); setCol2(""); setCol3(""); }}
              className={mode === "programs" ? "bg-white text-cyan-700 shadow-sm hover:bg-white" : "text-slate-500 hover:text-slate-700"}
            >
              <Layers className="w-4 h-4 ml-2" />
              תוכניות (Active)
            </Button>
            <Button
              variant={mode === "sessions" ? "default" : "ghost"}
              onClick={() => { setMode("sessions"); setCol1(""); setCol2(""); setCol3(""); }}
              className={mode === "sessions" ? "bg-white text-emerald-700 shadow-sm hover:bg-white" : "text-slate-500 hover:text-slate-700"}
            >
              <Calendar className="w-4 h-4 ml-2" />
              מפגשים ספציפיים
            </Button>
          </div>
          
          <BackHomeButtons />
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SelectionColumn 
            title="עמודה 1" 
            value={col1} 
            onChange={setCol1} 
            deviceList={devices1} 
            themeColor="purple"
            icon={Glasses}
          />
          <SelectionColumn 
            title="עמודה 2" 
            value={col2} 
            onChange={setCol2} 
            deviceList={devices2} 
            themeColor="cyan"
            icon={Glasses}
          />
          <SelectionColumn 
            title="עמודה 3" 
            value={col3} 
            onChange={setCol3} 
            deviceList={devices3} 
            themeColor="emerald"
            icon={Glasses}
          />
        </div>

        {/* SUMMARY & LEGEND */}
        <Card className="bg-slate-900 text-white border-none shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              
              {/* Conflict Status */}
              <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border-4 ${conflictSet.size > 0 ? "border-red-500 bg-red-500/20 text-red-400" : "border-emerald-500 bg-emerald-500/20 text-emerald-400"}`}>
                  <span className="text-3xl font-black">{conflictSet.size}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-1">
                    {conflictSet.size > 0 ? "נמצאו התנגשויות!" : "הכל תקין"}
                  </h3>
                  <p className="text-slate-400 text-sm max-w-md">
                    {conflictSet.size > 0 
                      ? "ישנן משקפות המופיעות ביותר מעמודה אחת במקביל. יש לפתור את ההתנגשות לפני שיבוץ."
                      : "אין חפיפה בין המשקפות שנבחרו בעמודות השונות. ניתן לבצע שיבוץ בבטחה."}
                  </p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">התנגשות (חמור)</span>
                </div>
                <div className="w-px h-4 bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
                  <span className="text-xs font-medium">מושבת/תקול</span>
                </div>
                <div className="w-px h-4 bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-xs font-medium">תקין ופנוי</span>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}