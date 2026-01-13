import React, { useState, useEffect, useMemo } from "react";
import { InstitutionProgram } from "@/entities/InstitutionProgram";
import { Syllabus } from "@/entities/Syllabus";
import { VRDevice } from "@/entities/VRDevice";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Glasses, X, RefreshCw, Calendar, BookOpen, Layers, AlertTriangle, CheckCircle2 } from "lucide-react";
import { with429Retry } from "@/components/utils/retry";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { motion } from "framer-motion";

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
        .filter(p => p.status === "פעילה")
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
      const activePrograms = instPrograms.filter(p => p.status === "פעילה");
      
      activePrograms.forEach(p => {
        const school = schools.find(s => s.id === p.institution_id);
        const syllabus = syllabi.find(s => s.id === p.program_id);
        
        if (syllabus && syllabus.sessions?.length > 0) {
          const progName = syllabus.title || syllabus.course_topic || "תוכנית";
          
          syllabus.sessions.forEach((session, idx) => {
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
      const [programId] = selectionId.split("|");
      const program = instPrograms.find(p => p.id === programId);
      targetIds = program?.assigned_device_ids || [];
    }

    return targetIds
      .map(id => devices.find(d => d.id === id))
      .filter(Boolean)
      .sort((a, b) => (Number(a.binocular_number) || 0) - (Number(b.binocular_number) || 0));
  };

  const devices1 = useMemo(() => getSelectionDevices(col1), [col1, mode, devices, instPrograms, syllabi]);
  const devices2 = useMemo(() => getSelectionDevices(col2), [col2, mode, devices, instPrograms, syllabi]);
  const devices3 = useMemo(() => getSelectionDevices(col3), [col3, mode, devices, instPrograms, syllabi]);

  const conflictSet = useMemo(() => {
    const counts = {};
    [devices1, devices2, devices3].forEach(list => {
      const uniqueIds = new Set(list.map(d => d.id));
      uniqueIds.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });

    const conflicts = new Set();
    Object.entries(counts).forEach(([id, count]) => {
      if (count > 1) conflicts.add(id);
    });
    
    return conflicts;
  }, [devices1, devices2, devices3]);

  // --- UI COMPONENTS ---

  const DeviceGrid = ({ deviceList, colorTheme }) => {
    if (!deviceList || deviceList.length === 0) {
      return (
        <div className="h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
          <Glasses className="w-8 h-8 mb-2 opacity-20" />
          <span className="text-sm">אין נתונים להצגה</span>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        {deviceList.map(dev => {
          const isConflict = conflictSet.has(dev.id);
          const isDisabled = dev.is_disabled || ["מושבת", "בתיקון", "בתחזוקה"].includes(dev.status);
          const num = dev.binocular_number;

          let baseClasses = "relative aspect-square rounded-lg flex flex-col items-center justify-center border transition-all cursor-default";
          
          if (isDisabled) {
            baseClasses += " bg-slate-100 border-slate-200 text-slate-400";
          } else if (isConflict) {
            baseClasses += " bg-red-50 border-red-200 text-red-600 font-bold shadow-sm";
          } else {
            // Safe
            if (colorTheme === 'purple') baseClasses += " bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100";
            if (colorTheme === 'blue') baseClasses += " bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100";
            if (colorTheme === 'teal') baseClasses += " bg-teal-50 border-teal-100 text-teal-700 hover:bg-teal-100";
          }

          return (
            <Link key={dev.id} to={createPageUrl(`DeviceInfo?id=${num}`)} target="_blank">
              <div 
                className={baseClasses}
                title={`משקפת ${num}${isDisabled ? " (מושבת)" : ""}${isConflict ? " (מתנגש)" : ""}`}
              >
                {isDisabled && <X className="w-3 h-3 absolute top-1 right-1 opacity-50" />}
                {isConflict && <AlertTriangle className="w-3 h-3 absolute top-1 right-1 text-red-500" />}
                <span className="text-sm">#{num}</span>
              </div>
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
    colorTheme,
    accentColor
  }) => {
    return (
      <Card className="shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
        <CardHeader className={`pb-3 border-b border-slate-50 bg-gradient-to-l ${
            colorTheme === 'purple' ? 'from-purple-50/50' : 
            colorTheme === 'blue' ? 'from-blue-50/50' : 
            'from-teal-50/50'
          } to-transparent`}>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-white text-slate-500 font-normal">
              {deviceList.length} משקפות
            </Badge>
            <CardTitle className={`text-base font-bold ${accentColor}`}>
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Select value={value} onValueChange={onChange} dir="rtl">
            <SelectTrigger className="h-10 bg-white border-slate-200 text-right">
              <SelectValue placeholder="בחר להשוואה..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <div className="p-2 sticky top-0 bg-white z-10 border-b mb-1">
                <p className="text-xs text-slate-400 font-medium">
                  {options.length} אפשרויות זמינות
                </p>
              </div>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="py-2.5">
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="font-medium text-slate-700">{opt.label}</span>
                    <span className="text-xs text-slate-400">{opt.subLabel}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {value ? (
            <DeviceGrid deviceList={deviceList} colorTheme={colorTheme} />
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
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
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 rtl" dir="rtl">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">מחשבון משקפות</h1>
              <p className="text-sm text-slate-500">בדיקת היתכנות וזמינות ציוד</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setMode("syllabi"); setCol1(""); setCol2(""); setCol3(""); }}
              className={`text-sm ${mode === "syllabi" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <BookOpen className="w-4 h-4 ml-2" />
              סילבוסים
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setMode("programs"); setCol1(""); setCol2(""); setCol3(""); }}
              className={`text-sm ${mode === "programs" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Layers className="w-4 h-4 ml-2" />
              תוכניות
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setMode("sessions"); setCol1(""); setCol2(""); setCol3(""); }}
              className={`text-sm ${mode === "sessions" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Calendar className="w-4 h-4 ml-2" />
              מפגשים
            </Button>
          </div>
          
          <BackHomeButtons />
        </div>

        {/* COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SelectionColumn 
            title="אפשרות א'" 
            value={col1} 
            onChange={setCol1} 
            deviceList={devices1} 
            colorTheme="purple"
            accentColor="text-purple-600"
          />
          <SelectionColumn 
            title="אפשרות ב'" 
            value={col2} 
            onChange={setCol2} 
            deviceList={devices2} 
            colorTheme="blue"
            accentColor="text-blue-600"
          />
          <SelectionColumn 
            title="אפשרות ג'" 
            value={col3} 
            onChange={setCol3} 
            deviceList={devices3} 
            colorTheme="teal"
            accentColor="text-teal-600"
          />
        </div>

        {/* STATUS FOOTER */}
        {(col1 || col2 || col3) && (
          <Card className={`border shadow-sm ${conflictSet.size > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${conflictSet.size > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                    {conflictSet.size > 0 ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${conflictSet.size > 0 ? "text-red-700" : "text-slate-800"}`}>
                      {conflictSet.size > 0 ? `נמצאו ${conflictSet.size} התנגשויות` : "הכל תקין - אין חפיפה"}
                    </h3>
                    <p className={`text-sm ${conflictSet.size > 0 ? "text-red-600" : "text-slate-500"}`}>
                      {conflictSet.size > 0 
                        ? "ישנן משקפות המופיעות במספר עמודות במקביל" 
                        : "ניתן לבצע את השיבוץ בבטחה, אין כפילויות ציוד"}
                    </p>
                  </div>
                </div>

                {conflictSet.size > 0 && (
                   <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                      {Array.from(conflictSet).sort((a,b) => {
                         const da = devices.find(d=>d.id===a);
                         const db = devices.find(d=>d.id===b);
                         return (Number(da?.binocular_number)||0) - (Number(db?.binocular_number)||0);
                      }).map(id => {
                        const dev = devices.find(d => d.id === id);
                        return (
                          <Badge key={id} variant="outline" className="bg-white border-red-300 text-red-600 font-mono">
                            #{dev?.binocular_number}
                          </Badge>
                        );
                      })}
                   </div>
                )}
                
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}