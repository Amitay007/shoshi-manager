import React, { useState, useEffect, useMemo } from "react";
import { Syllabus } from "@/entities/Syllabus";
import { Teacher } from "@/entities/Teacher";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { VRDevice } from "@/entities/VRDevice";
import { VRApp } from "@/entities/VRApp";
import { DeviceApp } from "@/entities/DeviceApp";
import { InstitutionProgram } from "@/entities/InstitutionProgram";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Calendar as CalendarIcon, CheckSquare, Square, Save, ArrowRight, LayoutGrid, List, ClipboardPaste } from "lucide-react";
import { with429Retry } from "@/components/utils/retry";
import { createPageUrl } from "@/utils";
import { Link, useNavigate } from "react-router-dom";
import VRIcon from "@/components/icons/VRIcon";
import BackHomeButtons from "@/components/common/BackHomeButtons";

export default function CreateProgram() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Bulk Import State
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteInput, setPasteInput] = useState("");

  // Data Sources
  const [syllabi, setSyllabi] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [deviceAppMap, setDeviceAppMap] = useState({}); // deviceId -> Set(appIds)

  // Form State (The Driver)
  const [selectedSyllabusId, setSelectedSyllabusId] = useState("");
  const [programTitle, setProgramTitle] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [startDate, setStartDate] = useState(null);

  // Selection State (The Cart / Assignment Tool)
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(new Set());

  // Derived State (Visual Reference & Filtering)
  const [syllabusApps, setSyllabusApps] = useState([]);
  const [availableDevices, setAvailableDevices] = useState([]);

  // Load Initial Data
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [
          syllabiData,
          teachersData,
          institutionsData,
          appsData,
          devicesData,
          deviceAppsData
        ] = await Promise.all([
          with429Retry(() => Syllabus.filter({ status: "final" })), // Only approved (final) syllabi
          with429Retry(() => Teacher.filter({ active: true })),
          with429Retry(() => EducationInstitution.list()),
          with429Retry(() => VRApp.list(null, 1000)),
          with429Retry(() => VRDevice.list(null, 1000)),
          with429Retry(() => DeviceApp.list(null, 10000)) // Need all installations for filtering
        ]);

        setSyllabi(syllabiData || []);
        setTeachers(teachersData || []);
        setInstitutions(institutionsData || []);
        setAllApps(appsData || []);
        setAllDevices(devicesData || []);

        // Map device installations
        const map = {};
        (deviceAppsData || []).forEach(da => {
          if (!map[da.device_id]) map[da.device_id] = new Set();
          map[da.device_id].add(da.app_id);
        });
        setDeviceAppMap(map);

      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Handle Syllabus Selection (The Trigger)
  useEffect(() => {
    if (!selectedSyllabusId) {
      setProgramTitle("");
      setSyllabusApps([]);
      setAvailableDevices([]);
      setSelectedDeviceIds(new Set());
      return;
    }

    const syllabus = syllabi.find(s => s.id === selectedSyllabusId);
    if (!syllabus) return;

    // 1. Auto-fill Title (if empty or default)
    setProgramTitle(syllabus.title || syllabus.course_topic || "");

    // 2. Identify Apps in Syllabus
    const appIds = new Set();
    (syllabus.teaching_materials || []).forEach(tm => {
        (tm.app_ids || []).forEach(id => appIds.add(id));
        (tm.experiences || []).forEach(id => appIds.add(id));
    });
    (syllabus.enrichment_materials || []).forEach(em => {
        (em.app_ids || []).forEach(id => appIds.add(id));
        (em.experiences || []).forEach(id => appIds.add(id));
    });
    (syllabus.sessions || []).forEach(s => {
        (s.app_ids || []).forEach(id => appIds.add(id));
        (s.experience_ids || []).forEach(id => appIds.add(id));
    });

    const requiredAppIds = Array.from(appIds);
    const relevantApps = allApps.filter(a => appIds.has(a.id));
    setSyllabusApps(relevantApps);

    // 3. Filter Devices (The Logic)
    // Show devices that have AT LEAST ONE required app installed
    // AND are not disabled
    const qualifiedDevices = allDevices.filter(d => {
      if (d.is_disabled) return false; // Filter out broken headsets
      
      // If syllabus has no required apps, show all available devices
      if (requiredAppIds.length === 0) return true;

      const installed = deviceAppMap[d.id] || new Set();
      // Check if AT LEAST ONE required app is in the installed set
      const hasAnyApp = requiredAppIds.some(reqId => installed.has(reqId));
      return hasAnyApp;
    });

    // Sort by binocular number
    qualifiedDevices.sort((a, b) => (Number(a.binocular_number) || 0) - (Number(b.binocular_number) || 0));
    setAvailableDevices(qualifiedDevices);

  }, [selectedSyllabusId, syllabi, allApps, allDevices, deviceAppMap, selectedInstitutionId, institutions]);


  // Update Title when Institution Changes
  useEffect(() => {
    // Logic removed to prevent auto-renaming of existing syllabus
  }, [selectedInstitutionId]);

  const toggleDevice = (deviceId) => {
    const next = new Set(selectedDeviceIds);
    if (next.has(deviceId)) next.delete(deviceId);
    else next.add(deviceId);
    setSelectedDeviceIds(next);
  };

  const toggleAllDevices = () => {
    if (selectedDeviceIds.size === availableDevices.length) {
      setSelectedDeviceIds(new Set()); // Deselect all
    } else {
      setSelectedDeviceIds(new Set(availableDevices.map(d => d.id))); // Select all
    }
  };

  const handleBulkPaste = () => {
    if (!pasteInput.trim()) return;

    // 1. Parse input (extract numbers)
    // Matches sequences of digits, ignores everything else
    const matches = pasteInput.match(/\d+/g);
    
    if (!matches || matches.length === 0) {
      toast({
        title: "לא נמצאו מספרים",
        description: "אנא וודא שהטקסט שהדבקת מכיל מספרי משקפות.",
        variant: "destructive"
      });
      return;
    }

    const inputNumbers = matches.map(Number);
    
    // 2. Match against AVAILABLE devices (filtered by syllabus)
    const idsToSelect = [];
    const notFoundNumbers = [];
    
    inputNumbers.forEach(num => {
      // Find in availableDevices (which are already filtered by app requirements & not disabled)
      const device = availableDevices.find(d => Number(d.binocular_number) === num);
      if (device) {
        idsToSelect.push(device.id);
      } else {
        notFoundNumbers.push(num);
      }
    });

    // 3. Update Selection
    if (idsToSelect.length > 0) {
      const next = new Set(selectedDeviceIds);
      idsToSelect.forEach(id => next.add(id));
      setSelectedDeviceIds(next);
    }

    // 4. Feedback
    setShowPasteModal(false);
    setPasteInput("");

    if (notFoundNumbers.length > 0) {
      toast({
        title: `סומנו ${idsToSelect.length} משקפות`,
        description: `שים לב: המשקפות הבאות לא נמצאו או שאינן מתאימות לתוכנית: ${notFoundNumbers.join(", ")}`,
        variant: "warning", // or default with styling
        duration: 6000,
      });
    } else {
      toast({
        title: "הייבוא הושלם בהצלחה",
        description: `סומנו ${idsToSelect.length} משקפות מתוך הרשימה.`,
        className: "bg-green-50 border-green-200 text-green-800"
      });
    }
  };

  const handleSave = async () => {
    if (!selectedSyllabusId || !programTitle) {
      alert("אנא מלא את שדות החובה");
      return;
    }

    setSaving(true);
    try {
      const syllabusSource = syllabi.find(s => s.id === selectedSyllabusId);
      const teacher = teachers.find(t => t.id === selectedTeacherId);

      // 1. Update existing Syllabus instead of creating a duplicate
      const updateData = {
        title: programTitle,
        teacher_name: teacher ? teacher.name : syllabusSource.teacher_name,
        assigned_device_ids: Array.from(selectedDeviceIds),
        // program_status removed from Syllabus entity
        status: "final"
      };

      await with429Retry(() => Syllabus.update(selectedSyllabusId, updateData));

      // 2. Link to Institution (if selected)
      if (selectedInstitutionId) {
        // Create new link (Note: logic in ProgramView handles cleaning up duplicates if needed)
        await with429Retry(() => InstitutionProgram.create({
          program_id: selectedSyllabusId,
          institution_id: selectedInstitutionId,
          start_date: startDate ? startDate.toISOString() : new Date().toISOString(),
          status: "פעילה",
          assigned_device_ids: Array.from(selectedDeviceIds)
        }));
      }

      // 3. Navigate
      navigate(createPageUrl(`ProgramView?id=${selectedSyllabusId}`));

    } catch (err) {
      console.error("Error saving program:", err);
      alert("שגיאה בשמירת התוכנית");
    } finally {
      setSaving(false);
    }
  };

  const selectedSyllabus = syllabi.find(s => s.id === selectedSyllabusId);

  if (loading) return <div className="p-10 text-center">טוען נתונים...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900" dir="rtl">
      <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-6 h-[calc(100vh-3rem)]">
        
        {/* LEFT COLUMN: THE CART (2/12) */}
        <div className="col-span-12 lg:col-span-2 flex flex-col gap-4 h-full">
          <Card className="bg-emerald-600 text-white border-none shadow-xl h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckSquare className="w-6 h-6" />
                משקפות שנבחרו
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center">
              <div className="text-8xl font-extrabold tracking-tighter">
                {selectedDeviceIds.size}
              </div>
              <div className="text-emerald-100 text-lg mt-2 font-medium">
                משקפות
              </div>
            </CardContent>
            <div className="p-6 bg-emerald-700/30">
              <Button 
                className="w-full bg-white text-emerald-800 hover:bg-emerald-50 font-bold h-12 text-lg shadow-lg"
                onClick={handleSave}
                disabled={saving || !selectedSyllabusId}
              >
                {saving ? "שומר..." : "שמור תוכנית"}
                <Save className="w-5 h-5 mr-2" />
              </Button>
            </div>
          </Card>
        </div>

        {/* CENTER & RIGHT WRAPPER (10/12) */}
        <div className="col-span-12 lg:col-span-10 grid grid-cols-12 grid-rows-[auto_1fr] gap-6 h-full">
            
            {/* ROW 1: DRIVER & VISUALS */}
            
            {/* CENTER: VISUAL REFERENCE (App Display) (8/12 of inner grid) */}
            <div className="col-span-12 lg:col-span-8">
               <Card className="h-full border-t-4 border-t-purple-600 shadow-sm">
                  <CardHeader className="bg-slate-50 border-b pb-3">
                     <CardTitle className="text-slate-600 text-base">אפליקציות בתוכנית</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                     {selectedSyllabusId ? (
                        syllabusApps.length > 0 ? (
                           <div className="flex flex-wrap gap-4">
                              {syllabusApps.map(app => (
                                 <div key={app.id} className="flex flex-col items-center gap-2 w-24">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
                                       {app.name.charAt(0)}
                                    </div>
                                    <span className="text-xs text-center font-medium leading-tight line-clamp-2" title={app.name}>
                                       {app.name}
                                    </span>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                              <LayoutGrid className="w-12 h-12 mb-2 opacity-20" />
                              <p>אין אפליקציות בסילבוס זה</p>
                           </div>
                        )
                     ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                           <LayoutGrid className="w-16 h-16 mb-4 opacity-20" />
                           <p className="text-lg">בחר סילבוס להצגת תוכן</p>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </div>

            {/* RIGHT: THE DRIVER (Settings) (4/12 of inner grid) */}
            <div className="col-span-12 lg:col-span-4">
              <Card className="h-full shadow-md border-t-4 border-t-cyan-500">
                <CardHeader>
                   <CardTitle className="text-cyan-800">הגדרות תוכנית</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                   {/* 1. Select Syllabus (Trigger) */}
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">בחר סילבוס (בסיס)</label>
                      <Select value={selectedSyllabusId} onValueChange={setSelectedSyllabusId}>
                         <SelectTrigger className="h-11 border-slate-300 bg-slate-50 focus:ring-cyan-500 focus:border-cyan-500">
                            <SelectValue placeholder="בחר מהרשימה..." />
                         </SelectTrigger>
                         <SelectContent>
                            {syllabi.map(s => (
                               <SelectItem key={s.id} value={s.id}>
                                  {s.title || s.course_topic || "ללא שם"}
                               </SelectItem>
                            ))}
                         </SelectContent>
                      </Select>
                   </div>

                   {/* Read Only Info */}
                   <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <div>
                         <span className="block text-slate-400 mb-1">סוג פעילות</span>
                         <span className="font-semibold text-slate-700">{selectedSyllabus?.activity_type || "-"}</span>
                      </div>
                      <div>
                         <span className="block text-slate-400 mb-1">קהל יעד</span>
                         <span className="font-semibold text-slate-700">
                            {Array.isArray(selectedSyllabus?.target_audience) ? selectedSyllabus.target_audience[0] : (selectedSyllabus?.target_audience || "-")}
                         </span>
                      </div>
                   </div>

                   {/* Program Title */}
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">שם התוכנית (לתצוגה)</label>
                      <Input 
                         value={programTitle} 
                         onChange={e => setProgramTitle(e.target.value)} 
                         disabled={!selectedSyllabusId}
                         className="h-10"
                      />
                   </div>

                   {/* Institution */}
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">מוסד חינוכי</label>
                      <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId} disabled={!selectedSyllabusId}>
                         <SelectTrigger className="h-10">
                            <SelectValue placeholder="בחר מוסד" />
                         </SelectTrigger>
                         <SelectContent>
                            {institutions.map(inst => (
                               <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                            ))}
                         </SelectContent>
                      </Select>
                   </div>

                   {/* Teacher */}
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">מורה מוביל</label>
                      <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId} disabled={!selectedSyllabusId}>
                         <SelectTrigger className="h-10">
                            <SelectValue placeholder="בחר מורה" />
                         </SelectTrigger>
                         <SelectContent>
                            {teachers.map(t => (
                               <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                         </SelectContent>
                      </Select>
                   </div>

                   {/* Start Date */}
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">תאריך התחלה</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            disabled={!selectedSyllabusId}
                            className={`w-full justify-start text-right font-normal h-10 ${!startDate && "text-muted-foreground"}`}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {startDate ? format(startDate, "dd/MM/yyyy") : <span>בחר תאריך</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                   </div>

                </CardContent>
              </Card>
            </div>

            {/* ROW 2: BOTTOM (The Assignment Tool) (Full Width of Inner Grid) */}
            <div className="col-span-12 h-full min-h-[400px]">
               <Card className="h-full border-t-4 border-t-emerald-500 shadow-md flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
                     <div className="flex items-center gap-3">
                        <CardTitle className="text-emerald-900">מאגר משקפות זמינות לתוכנית</CardTitle>
                        {selectedSyllabusId && syllabusApps.length > 0 && (
                           <Badge variant="outline" className="bg-white text-slate-500 font-normal">
                              מציג משקפות המכילות לפחות אחת מתוך {syllabusApps.length} האפליקציות הנדרשות
                           </Badge>
                        )}
                     </div>
                     <div className="flex gap-2">
                        <Button
                           variant="outline"
                           size="sm"
                           onClick={() => setShowPasteModal(true)}
                           disabled={!selectedSyllabusId}
                           className="text-purple-700 border-purple-200 hover:bg-purple-50 gap-2"
                        >
                           <ClipboardPaste className="w-4 h-4" />
                           ייבוא רשימה
                        </Button>
                        <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={toggleAllDevices}
                           disabled={!selectedSyllabusId || availableDevices.length === 0}
                           className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        >
                           {selectedDeviceIds.size === availableDevices.length && availableDevices.length > 0 ? "בטל בחירה" : "בחר הכל"}
                        </Button>
                     </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-1 overflow-y-auto bg-slate-50/30">
                     {selectedSyllabusId ? (
                        availableDevices.length > 0 ? (
                           <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                              {availableDevices.map(device => {
                                 const num = Number(device.binocular_number);
                                 const isSelected = selectedDeviceIds.has(device.id);
                                 
                                 return (
                                    <div 
                                       key={device.id}
                                       onClick={() => toggleDevice(device.id)}
                                       className={`
                                          aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200
                                          border-2 relative overflow-hidden group
                                          ${isSelected 
                                             ? "bg-emerald-100 border-emerald-500 shadow-md transform scale-105" 
                                             : "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm"
                                          }
                                       `}
                                    >
                                       {isSelected && (
                                          <div className="absolute top-2 right-2 text-emerald-600">
                                             <CheckSquare className="w-4 h-4" />
                                          </div>
                                       )}
                                       <VRIcon className={`w-8 h-8 mb-2 ${isSelected ? "text-emerald-600" : "text-slate-400 group-hover:text-emerald-400"}`} />
                                       <span className={`font-bold text-lg ${isSelected ? "text-emerald-800" : "text-slate-600"}`}>
                                          {num}
                                       </span>
                                    </div>
                                 );
                              })}
                           </div>
                        ) : (
                           <div className="flex flex-col items-center justify-center h-full text-slate-400">
                              <VRIcon className="w-16 h-16 mb-4 text-slate-200" />
                              <p className="text-lg font-medium text-slate-500">לא נמצאו משקפות מתאימות</p>
                              <p className="text-sm">אף משקפת במאגר לא מכילה אף אחת מהאפליקציות הנדרשות לסילבוס זה.</p>
                           </div>
                        )
                     ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300">
                           <List className="w-16 h-16 mb-4 opacity-20" />
                           <p className="text-lg">בחר סילבוס כדי לטעון משקפות</p>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </div>

        </div>
      </div>
      
      {/* Absolute Back Button */}
      <div className="fixed bottom-6 left-6 z-50">
         <BackHomeButtons showHomeButton={true} />
      </div>

      {/* Bulk Paste Modal */}
      <Dialog open={showPasteModal} onOpenChange={setShowPasteModal}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>ייבוא משקפות מרשימה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                הדבק כאן את רשימת מספרי המשקפות (ניתן להעתיק עמודה מאקסל).
                <br />
                המערכת תסמן אוטומטית רק את המשקפות שמתאימות לתוכנית הנבחרת.
              </p>
              <Textarea 
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder={"100\n101\n102\n..."}
                className="min-h-[200px] font-mono text-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasteModal(false)}>ביטול</Button>
            <Button onClick={handleBulkPaste} className="bg-purple-600 hover:bg-purple-700">
              בצע ייבוא וסימון
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}