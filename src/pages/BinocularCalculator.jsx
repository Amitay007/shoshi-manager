import React, { useState, useEffect, useMemo } from "react";
import { InstitutionProgram } from "@/entities/InstitutionProgram";
import { Syllabus } from "@/entities/Syllabus";
import { VRDevice } from "@/entities/VRDevice";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { VRApp } from "@/entities/VRApp";
import { DeviceApp } from "@/entities/DeviceApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Glasses, X, RefreshCw, Calendar, BookOpen, Layers, CheckCircle2, AlertCircle, AppWindow } from "lucide-react";
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
  const [apps, setApps] = useState([]);
  const [deviceApps, setDeviceApps] = useState([]);
  
  // UI State
  const [mode, setMode] = useState("programs"); // 'programs' | 'syllabi' | 'sessions' | 'apps'
  
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
      const [pData, sData, iData, dData, aData, daData] = await Promise.all([
        with429Retry(() => InstitutionProgram.list()),
        with429Retry(() => Syllabus.list()),
        with429Retry(() => EducationInstitution.list()),
        with429Retry(() => VRDevice.list()),
        with429Retry(() => VRApp.list()),
        with429Retry(() => DeviceApp.list(null, 10000)), // Fetch all to be safe
      ]);

      setInstPrograms(pData || []);
      setSyllabi(sData || []);
      setSchools(iData || []);
      setApps(aData || []);
      setDeviceApps(daData || []);
      
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
    if (mode === "apps") {
      return apps.map(app => ({
        value: app.id,
        label: app.name,
        subLabel: app.purchase_type || "אפליקציה"
      }));
    }

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
  }, [mode, instPrograms, syllabi, schools, apps]);

  // 2. Fetch Devices for a Selection
  const getSelectionDevices = (selectionId) => {
    if (!selectionId) return [];

    let targetIds = [];

    if (mode === "apps") {
      // Find all DeviceApp records for this app
      targetIds = deviceApps
        .filter(da => da.app_id === selectionId)
        .map(da => da.device_id);
    }
    else if (mode === "syllabi") {
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

  // 3. Memoize Device Lists
  const devices1 = useMemo(() => getSelectionDevices(col1), [col1, mode, devices, instPrograms, syllabi, deviceApps]);
  const devices2 = useMemo(() => getSelectionDevices(col2), [col2, mode, devices, instPrograms, syllabi, deviceApps]);
  const devices3 = useMemo(() => getSelectionDevices(col3), [col3, mode, devices, instPrograms, syllabi, deviceApps]);

  // 4. Calculate Conflicts
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

  const DeviceGrid = ({ deviceList, themeColor }) => {
    if (!deviceList || deviceList.length === 0) {
      return (
        <div className="h-48 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <Glasses className="w-8 h-8 mb-2 opacity-20" />
          <span className="text-sm">אין משקפות להצגה</span>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 p-4 bg-gray-50 rounded-xl border border-gray-100 max-h-[350px] overflow-y-auto custom-scrollbar">
        {deviceList.map(dev => {
          const isConflict = conflictSet.has(dev.id);
          const isDisabled = dev.is_disabled || ["מושבת", "בתיקון", "בתחזוקה"].includes(dev.status);
          const num = dev.binocular_number;

          // Static styling logic - NO animations
          let bgClass = "bg-white border-gray-200 text-gray-700 hover:border-gray-300"; // Default
          
          if (isDisabled) {
            bgClass = "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed";
          } else if (isConflict) {
            bgClass = "bg-red-50 border-red-200 text-red-600 font-bold ring-1 ring-red-100";
          } else {
            // Theme accents for valid items
            if (themeColor === "purple") bgClass = "bg-purple-50 border-purple-100 text-purple-700 hover:border-purple-200";
            if (themeColor === "blue") bgClass = "bg-blue-50 border-blue-100 text-blue-700 hover:border-blue-200";
            if (themeColor === "teal") bgClass = "bg-teal-50 border-teal-100 text-teal-700 hover:border-teal-200";
          }

          return (
            <Link key={dev.id} to={createPageUrl(`DeviceInfo?id=${num}`)} target="_blank">
              <div 
                className={`
                  relative aspect-square rounded-lg flex flex-col items-center justify-center border transition-all duration-200 shadow-sm
                  ${bgClass}
                `}
                title={`משקפת ${num}${isDisabled ? " (מושבת)" : ""}${isConflict ? " (מתנגש!)" : ""}`}
              >
                {isDisabled && <X className="w-3 h-3 absolute top-1 right-1 opacity-50" />}
                <span className="text-xs font-semibold">#{num}</span>
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
    themeColor, 
    icon: Icon 
  }) => {
    // Subtle accents
    const accents = {
      purple: "border-purple-500",
      blue: "border-blue-500",
      teal: "border-teal-500"
    };

    return (
      <Card className={`border-t-4 ${accents[themeColor]} shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden`}>
        <CardHeader className="bg-gray-50/50 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-gray-600`}>
                <Icon className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-bold text-gray-800">{title}</CardTitle>
            </div>
            <Badge variant="secondary" className="font-mono text-xs bg-white border-gray-200 text-gray-600">
              {deviceList.length} משקפות
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <Select value={value} onValueChange={onChange} dir="rtl">
            <SelectTrigger className="h-11 bg-white border-gray-200 focus:ring-2 focus:ring-gray-100 text-right">
              <SelectValue placeholder="בחר להשוואה..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <div className="p-2 sticky top-0 bg-white z-10 border-b mb-1">
                <p className="text-xs text-gray-400 font-medium px-1">
                  מציג {options.length} אפשרויות
                </p>
              </div>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="py-2.5 border-b border-gray-50 last:border-0 cursor-pointer">
                  <div className="flex flex-col gap-0.5 text-right w-full">
                    <span className="font-medium text-gray-700 text-sm">{opt.label}</span>
                    <span className="text-[10px] text-gray-400">{opt.subLabel}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {value ? (
            <DeviceGrid deviceList={deviceList} themeColor={themeColor} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <span className="text-xs">לא נבחרה אפשרות</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md text-white">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">מחשבון משקפות</h1>
              <p className="text-gray-500 text-sm">בדיקת היתכנות וזמינות ציוד</p>
            </div>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg w-full lg:w-auto">
            {[
              { id: "programs", label: "תוכניות", icon: Layers },
              { id: "sessions", label: "מפגשים", icon: Calendar },
              { id: "syllabi", label: "סילבוסים", icon: BookOpen },
              { id: "apps", label: "אפליקציות", icon: AppWindow },
            ].map((tab) => {
              const isActive = mode === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setMode(tab.id); setCol1(""); setCol2(""); setCol3(""); }}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                    ${isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}
                  `}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          
          <div className="hidden lg:block">
            <BackHomeButtons />
          </div>
        </div>

        {/* COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SelectionColumn 
            title="אפשרות א'" 
            value={col1} 
            onChange={setCol1} 
            deviceList={devices1} 
            themeColor="purple"
            icon={Glasses}
          />
          <SelectionColumn 
            title="אפשרות ב'" 
            value={col2} 
            onChange={setCol2} 
            deviceList={devices2} 
            themeColor="blue"
            icon={Glasses}
          />
          <SelectionColumn 
            title="אפשרות ג'" 
            value={col3} 
            onChange={setCol3} 
            deviceList={devices3} 
            themeColor="teal"
            icon={Glasses}
          />
        </div>

        {/* SUMMARY FOOTER */}
        <Card className="border-none shadow-md bg-white overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"></div>
          <CardContent className="p-6 lg:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              
              <div className="flex items-center gap-6">
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center border-4 
                  ${conflictSet.size > 0 ? "border-red-100 bg-red-50 text-red-500" : "border-green-100 bg-green-50 text-green-500"}
                `}>
                  {conflictSet.size > 0 ? <AlertCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                </div>
                <div>
                  <h3 className={`text-xl font-bold mb-1 ${conflictSet.size > 0 ? "text-red-600" : "text-green-600"}`}>
                    {conflictSet.size > 0 ? `נמצאו ${conflictSet.size} התנגשויות` : "אין התנגשויות"}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {conflictSet.size > 0 
                      ? "חלק מהמשקפות מופיעות ביותר מרשימה אחת בו-זמנית."
                      : "כל המשקפות שנבחרו פנויות לשיבוץ במקביל."}
                  </p>
                </div>
              </div>

              {/* Static Legend */}
              <div className="flex items-center gap-6 bg-gray-50 px-6 py-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                  <span className="text-sm text-gray-600">התנגשות</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-sm"></div>
                  <span className="text-sm text-gray-600">מושבת</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                  <span className="text-sm text-gray-600">תקין</span>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}