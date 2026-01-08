import React from "react";
import { Syllabus } from "@/entities/Syllabus";
import { Program } from "@/entities/Program";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { VRApp } from "@/entities/VRApp";
import { VRDevice } from "@/entities/VRDevice";
import { DeviceApp } from "@/entities/DeviceApp";
// InstitutionProgram is deprecated for new Programs, but we keep it if needed for legacy or clean it up.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, FileText, Save, X, Plus, Trash2, Glasses, Calendar, School } from "lucide-react";
import VRIcon from "@/components/icons/VRIcon";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { with429Retry } from "@/components/utils/retry";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { format } from "date-fns";

export default function ProgramView() {
  const urlParams = new URLSearchParams(window.location.search);
  const programId = urlParams.get("id");

  const [loading, setLoading] = React.useState(true);
  const [program, setProgram] = React.useState(null);
  const [apps, setApps] = React.useState([]);
  const [selectedDeviceNumbers, setSelectedDeviceNumbers] = React.useState([]);
  const [deviceIdByNumber, setDeviceIdByNumber] = React.useState({});
  
  const [editMode, setEditMode] = React.useState(false);
  const [editData, setEditData] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  
  const [showAddDevices, setShowAddDevices] = React.useState(false);
  const [allDevices, setAllDevices] = React.useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = React.useState([]);
  const [selectedDevicesForRemoval, setSelectedDevicesForRemoval] = React.useState(new Set());
  
  // NEW: State for multi-selection in add devices dialog
  const [tempSelectedDeviceIds, setTempSelectedDeviceIds] = React.useState([]);
  
  const [showAddApps, setShowAddApps] = React.useState(false);
  const [allApps, setAllApps] = React.useState([]);
  const [selectedAppIds, setSelectedAppIds] = React.useState([]);
  const [selectedAppsForRemoval, setSelectedAppsForRemoval] = React.useState(new Set());

  const [instPrograms, setInstPrograms] = React.useState([]);
  const [schools, setSchools] = React.useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = React.useState("none");
  const [assignedDeviceIds, setAssignedDeviceIds] = React.useState([]); // For storing manual assignments
  // NEW: Map device numbers to full device data for checking disabled status
  const [deviceDataByNumber, setDeviceDataByNumber] = React.useState({});
  // NEW: Map for quick lookup: appId -> Set of deviceIds that have this app
  const [appToDeviceMap, setAppToDeviceMap] = React.useState(new Map());


  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try to fetch as Program Entity
      let programEntity = null;
      let syllabusEntity = null;
      let isLegacy = false;

      try {
         programEntity = await with429Retry(() => Program.get(programId));
      } catch (e) {
         // If failed, maybe it's a legacy Syllabus ID (fallback)
         isLegacy = true;
      }

      if (programEntity) {
         // It's a new Program Entity!
         const syllabus = await with429Retry(() => Syllabus.get(programEntity.syllabus_id));
         syllabusEntity = syllabus;
         
         // Combine them for display, prioritizing Program fields
         setProgram({
            ...syllabus, // Content blueprint
            ...programEntity, // Instance details (name, devices, etc)
            id: programEntity.id, // ID is Program ID
            syllabus_id: syllabus.id // Keep reference
         });
         setEditData({
            ...syllabus,
            ...programEntity
         });

         setSelectedSchoolId(programEntity.institution_id || "none");
         setAssignedDeviceIds(programEntity.assigned_device_ids || []);
      } else {
         // Legacy mode (Syllabus acting as Program)
         const initialProg = await with429Retry(() => Syllabus.get(programId));
         syllabusEntity = initialProg;
         setProgram(initialProg);
         setEditData(initialProg);
         
         // Try to load InstitutionProgram for legacy
         // ... (omitted for brevity, but existing logic would go here if we wanted strictly legacy support)
         // For now, assuming new structure is preferred.
         setAssignedDeviceIds(initialProg.assigned_device_ids || []);
      }

      // --- Common Loading (Apps, Devices) ---
      // Use syllabusEntity for content (apps)
      
      const allSchools = await with429Retry(() => EducationInstitution.list());
      setSchools(allSchools || []);

      // Collect ALL app IDs from teaching_materials, enrichment_materials AND sessions
      const appIds = new Set();
      
      if (syllabusEntity) {
        // From teaching_materials
        (syllabusEntity.teaching_materials || []).forEach(tm => {
          (tm.app_ids || []).forEach(id => appIds.add(id));
          (tm.experiences || []).forEach(id => appIds.add(id)); 
        });
        
        // From enrichment_materials
        (syllabusEntity.enrichment_materials || []).forEach(em => {
          (em.app_ids || []).forEach(id => appIds.add(id));
          (em.experiences || []).forEach(id => appIds.add(id)); 
        });
        
        // From sessions
        (syllabusEntity.sessions || []).forEach(session => {
          (session.app_ids || []).forEach(id => appIds.add(id));
          (session.experience_ids || []).forEach(id => appIds.add(id)); 
        });
      }

      const allAppsData = await with429Retry(() => VRApp.list());
      setAllApps(allAppsData || []);
      const relevantApps = (allAppsData || []).filter(app => appIds.has(app.id));
      setApps(relevantApps);
      setSelectedAppIds(Array.from(appIds));

      const [allDevicesData, allDeviceApps] = await Promise.all([
        with429Retry(() => VRDevice.list()),
        with429Retry(() => DeviceApp.filter({ app_id: { $in: Array.from(appIds) } }, null, 10000))
      ]);
      
      setAllDevices(allDevicesData || []);

      const tempAppToDeviceMap = new Map();
      (allDeviceApps || []).forEach(da => {
        if (!tempAppToDeviceMap.has(da.app_id)) {
          tempAppToDeviceMap.set(da.app_id, new Set());
        }
        tempAppToDeviceMap.get(da.app_id).add(da.device_id);
      });
      setAppToDeviceMap(tempAppToDeviceMap);
      
      // Calculate devices based on ASSIGNED devices (from Program or Legacy Syllabus)
      const currentAssigned = programEntity ? (programEntity.assigned_device_ids || []) : (syllabusEntity.assigned_device_ids || []);
      
      const relevantDevices = (allDevicesData || []).filter(d => currentAssigned.includes(d.id));
      const numbers = relevantDevices.map(d => Number(d.binocular_number)).filter(n => Number.isFinite(n)).sort((a,b) => a-b);
      setSelectedDeviceNumbers(numbers);
      setSelectedDeviceIds(currentAssigned);
      setAssignedDeviceIds(currentAssigned); // Ensure state is synced

      const mapping = {};
      relevantDevices.forEach(d => {
        const num = Number(d.binocular_number);
        if (Number.isFinite(num)) {
          mapping[num] = d.id;
        }
      });
      setDeviceIdByNumber(mapping);
      
      const allDeviceDataMapping = {};
      (allDevicesData || []).forEach(d => {
        const num = Number(d.binocular_number);
        if (Number.isFinite(num)) {
          allDeviceDataMapping[num] = d;
        }
      });
      setDeviceDataByNumber(allDeviceDataMapping);

    } catch (error) {
      console.error("Error loading program:", error);
    }
    setLoading(false);
  }, [programId]);

  React.useEffect(() => {
    if (programId) loadData();
  }, [programId, loadData]);

  const handleDuplicate = async () => {
    if (!confirm("האם לשכפל את התוכנית? ייווצר עותק חדש עם כל הפרטים")) return;
    
    setSaving(true);
    try {
      // Create a copy of the program data without system fields
      const { id, created_date, updated_date, created_by_id, created_by, is_sample, ...programData } = program;
      
      // Add "- עותק" to the title
      const duplicateData = {
        ...programData,
        title: `${program.title || program.course_topic || program.subject || "תוכנית"} - עותק`,
        status: "draft"
      };
      
      // Create the new program
      const newProgram = await with429Retry(() => Syllabus.create(duplicateData));
      
      if (newProgram && newProgram.id) {
        // Navigate to the new program
        window.location.href = createPageUrl(`ProgramView?id=${newProgram.id}`);
      }
    } catch (error) {
      console.error("Error duplicating program:", error);
      alert("שגיאה בשכפול התוכנית");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Check if we are editing a Program Entity or a Legacy Syllabus
      const isProgramEntity = !!program.syllabus_id;

      if (isProgramEntity) {
         // --- UPDATE PROGRAM ENTITY ---
         const programUpdateData = {
            name: editData.title || editData.name, // Title maps to name in Program
            institution_id: selectedSchoolId !== "none" ? selectedSchoolId : null,
            assigned_device_ids: assignedDeviceIds,
            status: editData.program_status || editData.status || "active",
            notes: editData.notes
         };

         await with429Retry(() => Program.update(programId, programUpdateData));

         // Also update Syllabus Content (optional, if we want to allow editing syllabus details from here)
         // But "editData" currently mixes both. 
         // Let's assume user might edit syllabus fields (like content_areas).
         // Ideally, we should separate, but for now we sync back common fields if needed.
         // Actually, let's keep syllabus editing restricted or separate.
         // But the form allows editing. So we must update Syllabus too.
         
         if (program.syllabus_id) {
            const syllabusUpdateData = { ...editData };
            // Remove Program specific fields
            delete syllabusUpdateData.id;
            delete syllabusUpdateData.syllabus_id;
            delete syllabusUpdateData.institution_id;
            delete syllabusUpdateData.assigned_device_ids;
            delete syllabusUpdateData.name;
            delete syllabusUpdateData.program_number;
            
             // Convert arrays to strings if needed
            if (Array.isArray(syllabusUpdateData.content_areas)) {
               syllabusUpdateData.content_areas = syllabusUpdateData.content_areas.join(", ");
            }
            if (Array.isArray(syllabusUpdateData.purposes)) {
               syllabusUpdateData.purposes = syllabusUpdateData.purposes.join(", ");
            }

            await with429Retry(() => Syllabus.update(program.syllabus_id, syllabusUpdateData));
         }

      } else {
         // --- LEGACY UPDATE (SYLLABUS) ---
         // Keep existing logic for fallback
          const { id, ...updateData } = editData;
          const fixedData = { ...updateData };
           if (Array.isArray(fixedData.content_areas)) fixedData.content_areas = fixedData.content_areas.join(", ");
           if (Array.isArray(fixedData.purposes)) fixedData.purposes = fixedData.purposes.join(", ");
          
           await with429Retry(() => Syllabus.update(programId, fixedData));
      }

      setEditMode(false);
      await loadData();
    } catch (error) {
      console.error("Error saving program:", error);
      alert("שגיאה בשמירת הנתונים");
    }
    setSaving(false);
  };

  const handleAddDevices = () => {
    setTempSelectedDeviceIds([]); // Reset selection
    setShowAddDevices(true);
  };

  const confirmDeviceSelection = async () => {
    const newAssignedIds = [...new Set([...assignedDeviceIds, ...tempSelectedDeviceIds])];
    setAssignedDeviceIds(newAssignedIds);

    // Install Apps on new devices
    const appsToInstall = Array.from(selectedAppIds);
    const relations = [];
    tempSelectedDeviceIds.forEach(deviceId => {
      appsToInstall.forEach(appId => {
        relations.push({ device_id: deviceId, app_id: appId });
      });
    });

    if (relations.length > 0) {
      try {
         await with429Retry(() => DeviceApp.bulkCreate(relations));
      } catch (e) {
         console.error("Failed to install apps", e);
      }
    }

    // Update Program Entity immediately
    const isProgramEntity = !!program.syllabus_id;
    if (isProgramEntity) {
       await with429Retry(() => Program.update(programId, {
          assigned_device_ids: newAssignedIds
       }));
    } else {
       // Legacy Syllabus Update
       await with429Retry(() => Syllabus.update(programId, {
          assigned_device_ids: newAssignedIds
       }));
    }

    setProgram(prev => ({ ...prev, assigned_device_ids: newAssignedIds }));

    setShowAddDevices(false);
    setTempSelectedDeviceIds([]); 
    await loadData();
  };

  const toggleDeviceSelection = (deviceId) => {
    setTempSelectedDeviceIds(prev => {
      if (prev.includes(deviceId)) {
        return prev.filter(id => id !== deviceId);
      }
      return [...prev, deviceId];
    });
  };

  const handleBulkRemoveDevices = async () => {
    if (selectedDevicesForRemoval.size === 0) {
      alert("נא לבחור לפחות משקפת אחת להסרה");
      return;
    }

    const count = selectedDevicesForRemoval.size;
    if (!confirm(`האם להסיר ${count} משקפות מהתוכנית?`)) return;

    // Collect IDs to remove
    const idsToRemove = [];
    for (const deviceNumber of selectedDevicesForRemoval) {
       const deviceId = deviceIdByNumber[deviceNumber];
       if (deviceId) idsToRemove.push(deviceId);
    }

    // 1. Remove from assigned list in DB
    const newAssigned = assignedDeviceIds.filter(id => !idsToRemove.includes(id));
    setAssignedDeviceIds(newAssigned);

    // Update DB
    const isProgramEntity = !!program.syllabus_id;
    if (isProgramEntity) {
       await with429Retry(() => Program.update(programId, {
          assigned_device_ids: newAssigned
       }));
    } else {
       // Legacy
       await with429Retry(() => Syllabus.update(programId, {
          assigned_device_ids: newAssigned
       }));
    }

    setProgram(prev => ({ ...prev, assigned_device_ids: newAssigned }));

    // 2. Clean up DeviceApps (apps installed on these devices for this program)
    // (This logic remains the same - cleaning up installations is good practice)
    for (const deviceNumber of selectedDevicesForRemoval) {
      const device = allDevices.find(d => Number(d.binocular_number) === deviceNumber);
      if (!device) continue;

      try {
        const deviceAppsToRemove = await with429Retry(() => DeviceApp.filter({ device_id: device.id }));

        for (const da of deviceAppsToRemove) {
          if (selectedAppIds.includes(da.app_id)) {
            try {
              await with429Retry(() => DeviceApp.delete(da.id));
            } catch (deleteErr) {
              // Ignore 404
            }
          }
        }
      } catch (filterErr) {
        console.error("Error filtering DeviceApps:", filterErr);
      }
    }

    setSelectedDevicesForRemoval(new Set());
    await loadData();
  };

  const handleAddApps = () => {
    setShowAddApps(true);
  };

  const confirmAppSelection = async (newAppIds) => {
    const currentAppIds = new Set(selectedAppIds);
    const appsToAdd = newAppIds.filter(id => !currentAppIds.has(id));
    
    if (appsToAdd.length > 0) {
      const updatedTeachingMaterials = [...(editData.teaching_materials || [])];
      if (updatedTeachingMaterials.length === 0) {
        updatedTeachingMaterials.push({
          app_ids: [],
          experiences: [],
          links: []
        });
      }
      
      const existingAppIds = updatedTeachingMaterials[0].app_ids || [];
      updatedTeachingMaterials[0].app_ids = [...new Set([...existingAppIds, ...appsToAdd])];
      
      const updated = { ...editData, teaching_materials: updatedTeachingMaterials };
      setEditData(updated);
      await with429Retry(() => Syllabus.update(programId, updated));
      
      const installRelations = [];
      selectedDeviceIds.forEach(deviceId => {
        appsToAdd.forEach(appId => {
          installRelations.push({ device_id: deviceId, app_id: appId });
        });
      });
      
      if (installRelations.length > 0) {
        await with429Retry(() => DeviceApp.bulkCreate(installRelations));
      }
    }
    
    setShowAddApps(false);
    await loadData();
  };

  const handleBulkRemoveApps = async () => {
    if (selectedAppsForRemoval.size === 0) {
      alert("נא לבחור לפחות אפליקציה אחת להסרה");
      return;
    }
    
    const count = selectedAppsForRemoval.size;
    if (!confirm(`האם להסיר ${count} אפליקציות מהתוכנית?`)) return;

    for (const appId of selectedAppsForRemoval) {
      // Remove from teaching_materials, enrichment_materials, and sessions
      const updatedTeaching = (editData.teaching_materials || []).map(tm => ({
        ...tm,
        app_ids: (tm.app_ids || []).filter(id => id !== appId),
        experiences: (tm.experiences || []).filter(id => id !== appId)
      }));
      
      const updatedEnrichment = (editData.enrichment_materials || []).map(em => ({
        ...em,
        app_ids: (em.app_ids || []).filter(id => id !== appId),
        experiences: (em.experiences || []).filter(id => id !== appId)
      }));
      
      const updatedSessions = (editData.sessions || []).map(session => ({
        ...session,
        app_ids: (session.app_ids || []).filter(id => id !== appId),
        experience_ids: (session.experience_ids || []).filter(id => id !== appId)
      }));
      
      const updated = {
        ...editData,
        teaching_materials: updatedTeaching,
        enrichment_materials: updatedEnrichment,
        sessions: updatedSessions
      };
      
      setEditData(updated);
      await with429Retry(() => Syllabus.update(programId, updated));
      
      // Remove app from all program devices
      try {
        const deviceAppsToRemove = await with429Retry(() => DeviceApp.filter({ app_id: appId }));
        for (const da of deviceAppsToRemove) {
          if (selectedDeviceIds.includes(da.device_id)) {
            try {
              await with429Retry(() => DeviceApp.delete(da.id));
            } catch (deleteErr) {
              // Improved 404 detection
              const statusCode = deleteErr?.response?.status;
              const errorMsg = deleteErr?.message || "";
              const responseMsg = deleteErr?.response?.data?.message || "";
              
              // Check if it's a 404 or "not found" error
              const is404 = statusCode === 404 || 
                           errorMsg.toLowerCase().includes("not found") || 
                           responseMsg.toLowerCase().includes("not found");
              
              if (is404) {
                // Silently skip already deleted records
                continue;
              }
              
              console.error("Error deleting DeviceApp:", deleteErr);
            }
          }
        }
      } catch (filterErr) {
        console.error("Error filtering DeviceApps:", filterErr);
      }
    }
    
    setSelectedAppsForRemoval(new Set());
    await loadData();
  };

  const handleRemoveApp = async (appId) => {
    const app = apps.find(a => a.id === appId);
    if (!confirm(`האם להסיר את ${app?.name} מהתוכנית?`)) return;
    
    const updatedTeaching = (editData.teaching_materials || []).map(tm => ({
      ...tm,
      app_ids: (tm.app_ids || []).filter(id => id !== appId),
      experiences: (tm.experiences || []).filter(id => id !== appId)
    }));
    
    const updatedEnrichment = (editData.enrichment_materials || []).map(em => ({
      ...em,
      app_ids: (em.app_ids || []).filter(id => id !== appId),
      experiences: (em.experiences || []).filter(id => id !== appId)
    }));
    
    const updatedSessions = (editData.sessions || []).map(session => ({
      ...session,
      app_ids: (session.app_ids || []).filter(id => id !== appId),
      experience_ids: (session.experience_ids || []).filter(id => id !== appId)
    }));
    
    const updated = {
      ...editData,
      teaching_materials: updatedTeaching,
      enrichment_materials: updatedEnrichment,
      sessions: updatedSessions
    };
    
    setEditData(updated);
    await with429Retry(() => Syllabus.update(programId, updated));
    
    try {
      const deviceAppsToRemove = await with429Retry(() => DeviceApp.filter({ app_id: appId }));
      for (const da of deviceAppsToRemove) {
        if (selectedDeviceIds.includes(da.device_id)) {
          try {
            await with429Retry(() => DeviceApp.delete(da.id));
          } catch (deleteErr) {
            // Improved 404 detection
            const statusCode = deleteErr?.response?.status;
            const errorMsg = deleteErr?.message || "";
            const responseMsg = deleteErr?.response?.data?.message || "";
            
            // Check if it's a 404 or "not found" error
            const is404 = statusCode === 404 || 
                         errorMsg.toLowerCase().includes("not found") || 
                         responseMsg.toLowerCase().includes("not found");
            
            if (is404) {
              // Silently skip already deleted records
              continue;
            }
            
            console.error("Error deleting DeviceApp:", deleteErr);
          }
        }
      }
    } catch (filterErr) {
      console.error("Error filtering DeviceApps:", filterErr);
    }
    
    await loadData();
  };

  if (loading) {
    return <div className="p-8 text-center" dir="rtl">טוען תוכנית...</div>;
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
        <div className="flex items-center gap-3 mb-6">
          <BackHomeButtons />
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">תוכנית לא נמצאה</h2>
            <Link to={createPageUrl("Programs")}>
              <Button>חזרה לתוכניות</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const title = program.title || program.course_topic || program.subject || "תוכנית ללא שם";
  
  // FIX: Handle content_areas as string
  const contentAreasDisplay = typeof program.content_areas === 'string'
    ? program.content_areas
    : (Array.isArray(program.content_areas) ? program.content_areas.join(", ") : "—");

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
              תוכנית
              {program.program_number && (
                <Badge variant="outline" className="text-xs bg-slate-50">
                  #{program.program_number}
                </Badge>
              )}
            </span>
            <h1 className="text-3xl font-bold text-cyan-900">
              {editMode ? (
                <div className="space-y-2">
                  <Input 
                    value={editData.title || ""} 
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                    className="bg-white border-slate-300 text-cyan-900 font-bold text-xl"
                    placeholder="שם התוכנית"
                  />
                  <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                    <SelectTrigger className="w-[300px] bg-white text-right">
                      <SelectValue placeholder="בחר בית ספר" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">לא משוייך</SelectItem>
                      {schools.map(school => (
                        <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : title}
            </h1>
            {!editMode && (
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                {instPrograms.length > 0 ? (
                  <>
                     {(() => {
                        const school = schools.find(s => s.id === instPrograms[0].institution_id);
                        return school ? (
                          <>
                             {school.logo_url ? (
                               <img src={school.logo_url} alt="" className="w-6 h-6 rounded-full object-contain bg-white border" />
                             ) : (
                               <School className="w-4 h-4" />
                             )}
                             <span>{school.name}</span>
                          </>
                        ) : <span>מוסד לא נמצא</span>;
                     })()}
                  </>
                ) : (
                  <span className="text-slate-400 italic">לא משוייך</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to={createPageUrl(`SchedulerPage?programId=${programId}`)}>
              <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
                <Calendar className="w-4 h-4" />
                שבץ תוכנית
              </Button>
            </Link>
            {!editMode ? (
              <>
                <Button 
                  className="gap-2 bg-blue-600 hover:bg-blue-700" 
                  onClick={handleDuplicate}
                  disabled={saving}
                >
                  <Plus className="w-4 h-4" />
                  שכפל תוכנית
                </Button>
                <Button className="gap-2 bg-cyan-600 hover:bg-cyan-700" onClick={() => setEditMode(true)}>
                  <Pencil className="w-4 h-4" />
                  עריכה
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setEditMode(false); setEditData(program); }}>
                  <X className="w-4 h-4" />
                  ביטול
                </Button>
                <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4" />
                  {saving ? "שומר..." : "שמור"}
                </Button>
              </>
            )}
            <BackHomeButtons />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Right Column - Program Details (Wider) */}
          <div className="lg:col-span-5">
            <Card className="shadow-lg h-full">
              <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-t-lg">
                 <div className="flex justify-between items-center">
                    <CardTitle className="text-xl">פרטי התוכנית</CardTitle>
                    {/* Status Toggle in Header */}
                    <div className="bg-white/20 p-1 rounded-lg backdrop-blur-sm inline-flex gap-1" dir="rtl">
                      {[
                        { id: "פעילה", label: "פעיל" },
                        { id: "לא פעילה", label: "לא פעיל" },
                        { id: "מדף", label: "מדף" },
                      ].map(opt => {
                        const currentStatus = instPrograms.length > 0 
                          ? (instPrograms[0]?.status || "פעילה")
                          : (editData.program_status || "פעילה");
                          
                        return (
                          <button
                            key={opt.id}
                            disabled={!editMode}
                            onClick={() => {
                               const newStatus = opt.id;
                               if (instPrograms.length > 0) {
                                 // Update local instPrograms state
                                 const updated = [...instPrograms];
                                 updated[0] = { ...updated[0], status: newStatus };
                                 setInstPrograms(updated);
                               } else {
                                 // Update local syllabus state
                                 setEditData(prev => ({ ...prev, program_status: newStatus }));
                               }
                            }}
                            className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                              currentStatus === opt.id
                                ? "bg-white text-cyan-800 shadow-sm"
                                : "text-white/70 hover:text-white disabled:opacity-50"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">מורה:</span>
                    <span className="font-semibold text-slate-800">{editData.teacher_name || "—"}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">סוג פעילות:</span>
                    <span className="font-semibold text-slate-800">{editData.activity_type || "—"}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">מספר מפגשים:</span>
                    <span className="font-semibold text-slate-800">{editData.meetings_count || (editData.sessions || []).length || "—"}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">קהל יעד:</span>
                    <span className="font-semibold text-slate-800">
                      {Array.isArray(editData.target_audience) 
                        ? editData.target_audience.join(", ") 
                        : (editData.target_audience || "—")}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">תחום דעת:</span>
                    <span className="font-semibold text-slate-800">
                      {contentAreasDisplay}
                    </span>
                  </div>

                  {/* Institution Programs */}
                  {instPrograms.length > 0 && (
                    <>
                      <div className="border-t pt-3 mt-3">
                        <div className="text-slate-500 font-semibold mb-2">מוסדות חינוך:</div>
                        {instPrograms.map((ip, idx) => {
                          const school = schools.find(s => s.id === ip.institution_id);
                          return (
                            <div key={idx} className="mb-2 p-2 bg-slate-50 rounded text-xs">
                              <div className="font-medium text-slate-800">{school?.name || "—"}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Replaced by Header Toggle */}

                      {instPrograms[0]?.start_date && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">תאריך התחלה:</span>
                          <span className="font-semibold text-slate-800">
                            {format(new Date(instPrograms[0].start_date), "dd/MM/yyyy")}
                          </span>
                        </div>
                      )}

                      {instPrograms[0]?.end_date && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">תאריך סיום:</span>
                          <span className="font-semibold text-slate-800">
                            {format(new Date(instPrograms[0].end_date), "dd/MM/yyyy")}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Syllabus Button */}
                <div className="pt-4">
                  <Link to={createPageUrl(`SyllabusWizard?id=${programId}&viewOnly=true`)}>
                    <Button size="lg" className="w-full gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-lg py-6 shadow-lg">
                      <FileText className="w-5 h-5" />
                      סילבוס
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Apps */}
          <div className="lg:col-span-4">
            <Card className="shadow-lg h-full">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">אפליקציות ({apps.length})</CardTitle>
                  {editMode && (
                    <div className="flex gap-2">
                      {selectedAppsForRemoval.size > 0 && (
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={handleBulkRemoveApps}
                          className="gap-1 h-8 text-xs bg-white text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          הסר ({selectedAppsForRemoval.size})
                        </Button>
                      )}
                      <Button size="sm" onClick={handleAddApps} className="gap-2 bg-white text-purple-700 hover:bg-purple-50">
                        <Plus className="w-4 h-4" />
                        הוסף
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {apps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {apps.map(app => (
                      <div key={app.id} className="relative">
                        <Link to={createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`)}>
                          <Badge 
                            className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-2 border-purple-300 transition-all cursor-pointer px-3 py-1.5 text-sm font-medium"
                          >
                            {app.name}
                          </Badge>
                        </Link>
                        {editMode && (
                          <div className="absolute -top-1 -right-1 z-10">
                            <Checkbox
                              checked={selectedAppsForRemoval.has(app.id)}
                              onCheckedChange={(checked) => {
                                setSelectedAppsForRemoval(prev => {
                                  const next = new Set(prev);
                                  if (checked) {
                                    next.add(app.id);
                                  } else {
                                    next.delete(app.id);
                                  }
                                  return next;
                                });
                              }}
                              className="bg-white border-2 border-purple-600"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 text-sm py-8">
                    אין אפליקציות
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Left Column - Devices (Grid) */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg h-full">
              <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <VRIcon className="w-6 h-6 text-white" />
                    משקפות משוייכות ({selectedDeviceNumbers.length})
                  </CardTitle>
                  {editMode && (
                    <div className="flex gap-2">
                      {selectedDevicesForRemoval.size > 0 && (
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={handleBulkRemoveDevices}
                          className="gap-1 h-8 text-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                          ({selectedDevicesForRemoval.size})
                        </Button>
                      )}
                      <Button size="sm" onClick={handleAddDevices} className="gap-2 bg-white text-emerald-700 hover:bg-emerald-50 h-8 text-xs">
                        <Plus className="w-4 h-4" />
                        הוסף
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-2">
                  {/* Use assignedDeviceIds to derive numbers for display */}
                  {(() => {
                     // Filter allDevices by assignedDeviceIds
                     const assignedDevices = allDevices.filter(d => assignedDeviceIds.includes(d.id));
                     const assignedNumbers = assignedDevices.map(d => Number(d.binocular_number)).sort((a,b) => a-b);
                     
                     if (assignedNumbers.length === 0) return (
                        <div className="col-span-full text-center text-slate-500 text-sm py-8">
                          אין משקפות משויכות לתוכנית זו
                        </div>
                     );

                     return assignedNumbers.map(num => {
                        const device = deviceDataByNumber[num];
                        const isDisabled = device?.is_disabled || false;
                        
                        return (
                          <div key={num} className="relative group">
                            <Link
                              to={createPageUrl(`DeviceInfo?id=${deviceIdByNumber[num]}`)}
                              className="block"
                            >
                              <div 
                                className={`p-2 rounded-lg text-center cursor-pointer border-2 transition-colors aspect-square flex flex-col items-center justify-center ${
                                  isDisabled 
                                    ? 'bg-slate-200 hover:bg-slate-300 border-slate-400 hover:border-slate-500' 
                                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 hover:border-emerald-300'
                                }`}
                                title={isDisabled ? `משקפת ${num} - מושבת${device?.disable_reason ? `: ${device.disable_reason}` : ''}` : `משקפת ${num}`}
                                >
                                <VRIcon className={`w-8 h-8 mb-1 ${isDisabled ? 'text-slate-500' : 'text-emerald-600'}`} />
                                <p className={`text-xs font-bold ${isDisabled ? 'text-slate-600' : 'text-slate-800'}`}>
                                  #{String(num).padStart(3, '0')}
                                </p>
                              </div>
                            </Link>
                            {editMode && (
                              <div className="absolute -top-1 -right-1 z-10">
                                <Checkbox
                                  checked={selectedDevicesForRemoval.has(num)}
                                  onCheckedChange={(checked) => {
                                    setSelectedDevicesForRemoval(prev => {
                                      const next = new Set(prev);
                                      if (checked) {
                                        next.add(num);
                                      } else {
                                        next.delete(num);
                                      }
                                      return next;
                                    });
                                  }}
                                  className="bg-white border-2 border-emerald-600"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            )}
                          </div>
                        );
                     });
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* NEW: Session Mapping Table */}
        <Card className="shadow-lg mt-6">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-xl">מיפוי לפי מפגש</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {program.sessions && program.sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300">
                      <th className="p-3 text-right font-bold text-slate-700 border-l border-slate-300">מספר מפגש</th>
                      <th className="p-3 text-right font-bold text-slate-700 border-l border-slate-300">אפליקציות במפגש</th>
                      <th className="p-3 text-right font-bold text-slate-700">משקפות שהאפליקציות קיימות בהן</th>
                    </tr>
                  </thead>
                  <tbody>
                    {program.sessions.map((session, idx) => {
                      // Get all apps in this session
                      const sessionAppIds = [...(session.app_ids || []), ...(session.experience_ids || [])];
                      const sessionApps = apps.filter(app => sessionAppIds.includes(app.id));
                      
                      // For each app, find which devices have it (from general inventory)
                      const appDeviceMapping = {};
                      sessionApps.forEach(app => {
                        const devicesWithThisAppIds = appToDeviceMap.get(app.id) || new Set();

                        // Get ALL devices that have this app from general inventory
                        const allDevicesWithAppNumbers = [];

                        Object.keys(deviceDataByNumber).forEach(numStr => {
                          const num = Number(numStr);
                          const device = deviceDataByNumber[num];
                          if (device && devicesWithThisAppIds.has(device.id)) {
                            allDevicesWithAppNumbers.push(num);
                          }
                        });

                        // Sort numbers
                        allDevicesWithAppNumbers.sort((a, b) => a - b);
                        appDeviceMapping[app.id] = allDevicesWithAppNumbers;
                      });

                      return (
                        <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                          <td className="p-3 border-l border-slate-200 font-semibold text-slate-800">
                            מפגש {session.number || idx + 1}
                          </td>
                          <td className="p-3 border-l border-slate-200">
                            {sessionApps.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {sessionApps.map(app => (
                                  <Link 
                                    key={app.id}
                                    to={createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`)}
                                  >
                                    <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border border-indigo-300 cursor-pointer transition-colors text-xs">
                                      {app.name}
                                    </Badge>
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">אין אפליקציות</span>
                            )}
                          </td>
                          <td className="p-3">
                            {sessionApps.length > 0 ? (
                              <div className="space-y-2">
                                {sessionApps.map(app => {
                                  const devicesWithApp = appDeviceMapping[app.id] || [];
                                  return (
                                    <div key={app.id} className="flex items-start gap-2">
                                      <span className="text-xs font-medium text-slate-600 shrink-0 pt-0.5">
                                        {app.name}:
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {devicesWithApp.length > 0 ? (
                                          devicesWithApp.map(num => {
                                            const device = deviceDataByNumber[num];
                                            const isDisabled = device?.is_disabled || false;
                                            // Highlight devices that are assigned to the program
                                            const isAssigned = selectedDeviceNumbers.includes(num);

                                            return (
                                              <Link 
                                                key={num}
                                                to={createPageUrl(`DeviceInfo?id=${device?.id}`)}
                                              >
                                                <Badge 
                                                  className={`${
                                                    isDisabled 
                                                      ? 'bg-slate-200 text-slate-600 hover:bg-slate-300 border border-slate-400' 
                                                      : isAssigned
                                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                                  } cursor-pointer transition-colors text-xs`}
                                                  title={isDisabled ? `משקפת ${num} - מושבת${device?.disable_reason ? `: ${device.disable_reason}` : ''}` : `משקפת ${num}${isAssigned ? ' (משויכת)' : ''}`}
                                                >
                                                  #{String(num).padStart(3, '0')}
                                                </Badge>
                                              </Link>
                                            );
                                          })
                                        ) : (
                                          <span className="text-slate-400 text-xs italic">לא מותקן על אף משקפת</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-8">
                אין מפגשים מוגדרים בתוכנית
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Device Selector Dialog */}
      <Dialog open={showAddDevices} onOpenChange={setShowAddDevices}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת משקפות לתוכנית ({tempSelectedDeviceIds.length} נבחרו)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-8 gap-2">
              {allDevices
                .filter(d => !assignedDeviceIds.includes(d.id))
                .map(device => {
                  const num = Number(device.binocular_number);
                  const isSelected = tempSelectedDeviceIds.includes(device.id);
                  const isDisabled = device?.is_disabled || false;
                  
                  return (
                    <button
                      key={device.id}
                      onClick={() => !isDisabled && toggleDeviceSelection(device.id)}
                      disabled={isDisabled}
                      className={`aspect-square border-2 rounded-lg transition-all flex items-center justify-center font-semibold ${
                        isDisabled
                          ? 'bg-slate-200 border-slate-400 text-slate-500 cursor-not-allowed'
                          : isSelected 
                            ? 'border-cyan-500 bg-cyan-100 text-slate-700' 
                            : 'border-slate-300 hover:border-cyan-400 hover:bg-cyan-50 text-slate-700'
                      }`}
                      title={isDisabled ? `משקפת ${num} - מושבת${device?.disable_reason ? `: ${device.disable_reason}` : ''}` : `משקפת ${num}`}
                    >
                      {num}
                    </button>
                  );
                })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDevices(false)}>ביטול</Button>
            <Button 
              onClick={confirmDeviceSelection}
              disabled={tempSelectedDeviceIds.length === 0}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              הוסף {tempSelectedDeviceIds.length} משקפות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* App Selector Dialog */}
      <Dialog open={showAddApps} onOpenChange={setShowAddApps}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת אפליקציות לתוכנית</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              {allApps
                .filter(a => !selectedAppIds.includes(a.id))
                .map(app => (
                  <button
                    key={app.id}
                    onClick={() => {
                      confirmAppSelection([...selectedAppIds, app.id]);
                    }}
                    className="border-2 border-slate-200 rounded-lg p-3 hover:border-cyan-500 hover:bg-cyan-50 transition-all text-center"
                  >
                    <div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-lg font-bold">
                      {app.name.charAt(0)}
                    </div>
                    <p className="font-medium text-sm text-slate-800 truncate" title={app.name}>
                      {app.name}
                    </p>
                  </button>
                ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddApps(false)}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}