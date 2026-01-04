import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VRDevice } from "@/entities/VRDevice";
import { VRApp } from "@/entities/VRApp";
import { Syllabus } from "@/entities/Syllabus";
import { DeviceApp } from "@/entities/DeviceApp";
import { ScheduleEntry } from "@/entities/ScheduleEntry";
import { with429Retry } from "@/components/utils/retry";
import { CheckCircle, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";

export default function DeviceAssignmentModal({ open, onClose, programId, startDatetime, endDatetime, onComplete, currentlySelectedDeviceIds = [] }) {
  const [devices, setDevices] = useState([]);
  const [programApps, setProgramApps] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(new Set());
  const [deviceStatus, setDeviceStatus] = useState({}); // "free", "busy", "current"
  const [busyDetails, setBusyDetails] = useState({}); // program name, date, time
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (open && programId) {
      loadData();
    }
  }, [open, programId]);

  useEffect(() => {
    if (open && startDatetime && endDatetime) {
      checkAvailability();
    }
  }, [open, startDatetime, endDatetime]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load program to get its apps
      const program = await with429Retry(() => Syllabus.get(programId));
      
      // Extract all app IDs
      const appIds = new Set();
      if (program.enrichment_materials) {
        program.enrichment_materials.forEach(m => {
          if (m.app_ids) m.app_ids.forEach(id => appIds.add(id));
          if (m.experiences) m.experiences.forEach(id => appIds.add(id));
        });
      }
      if (program.teaching_materials) {
        program.teaching_materials.forEach(m => {
          if (m.app_ids) m.app_ids.forEach(id => appIds.add(id));
          if (m.experiences) m.experiences.forEach(id => appIds.add(id));
        });
      }
      if (program.sessions) {
        program.sessions.forEach(s => {
          if (s.app_ids) s.app_ids.forEach(id => appIds.add(id));
          if (s.experience_ids) s.experience_ids.forEach(id => appIds.add(id));
        });
      }

      const [allDevices, allApps] = await Promise.all([
        with429Retry(() => VRDevice.list()),
        with429Retry(() => VRApp.list())
      ]);

      setDevices((allDevices || []).sort((a, b) => a.binocular_number - b.binocular_number));
      setProgramApps((allApps || []).filter(app => appIds.has(app.id)));
      
      // Initialize selection with currentlySelectedDeviceIds
      setSelectedDeviceIds(new Set(currentlySelectedDeviceIds || []));
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const checkAvailability = async () => {
    if (!startDatetime || !endDatetime) return;

    try {
      const allSchedules = await with429Retry(() => ScheduleEntry.list());
      
      const startTime = new Date(startDatetime);
      const endTime = new Date(endDatetime);
      const statusMap = {};
      const detailsMap = {};

      // Initialize all as free
      devices.forEach(device => {
        statusMap[device.id] = "free";
      });

      // Mark currently selected devices
      (currentlySelectedDeviceIds || []).forEach(deviceId => {
        statusMap[deviceId] = "current";
      });

      // Check conflicts
      for (const schedule of allSchedules) {
        if (schedule.status === "בוטל") continue;

        const scheduleStart = new Date(schedule.start_datetime);
        const scheduleEnd = new Date(schedule.end_datetime);

        const hasOverlap = startTime < scheduleEnd && endTime > scheduleStart;
        if (!hasOverlap) continue;

        // Load program name
        let programName = schedule.program_id;
        try {
          const prog = await with429Retry(() => Syllabus.get(schedule.program_id));
          programName = prog?.title || prog?.course_topic || programName;
        } catch (e) {
          // Keep ID if can't load
        }

        (schedule.device_ids || []).forEach(deviceId => {
          // Don't override "current" status
          if (statusMap[deviceId] !== "current") {
            statusMap[deviceId] = "busy";
            detailsMap[deviceId] = {
              programName,
              date: format(scheduleStart, "dd/MM/yyyy"),
              time: `${format(scheduleStart, "HH:mm")}-${format(scheduleEnd, "HH:mm")}`
            };
          }
        });
      }

      setDeviceStatus(statusMap);
      setBusyDetails(detailsMap);
    } catch (error) {
      console.error("Error checking availability:", error);
    }
  };

  const toggleDevice = (deviceId) => {
    setSelectedDeviceIds(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const handleAssign = async () => {
    if (selectedDeviceIds.size === 0) {
      alert("נא לבחור לפחות משקפת אחת");
      return;
    }

    // Check if any selected device is busy
    const busyDevices = Array.from(selectedDeviceIds).filter(
      id => deviceStatus[id] === "busy"
    );

    if (busyDevices.length > 0) {
      if (!confirm(`${busyDevices.length} משקפות תפוסות בזמן זה. האם להמשיך בכל זאת?`)) {
        return;
      }
    }

    setAssigning(true);
    try {
      // Create DeviceApp records for each device and each program app
      const relations = [];
      selectedDeviceIds.forEach(deviceId => {
        programApps.forEach(app => {
          relations.push({
            device_id: deviceId,
            app_id: app.id
          });
        });
      });

      if (relations.length > 0) {
        await with429Retry(() => DeviceApp.bulkCreate(relations));
      }

      alert(`הותקנו ${programApps.length} אפליקציות על ${selectedDeviceIds.size} משקפות בהצלחה!`);
      if (onComplete) onComplete(Array.from(selectedDeviceIds));
      onClose();
    } catch (error) {
      console.error("Error assigning devices:", error);
      alert("שגיאה בשיוך המשקפות");
    }
    setAssigning(false);
  };

  const getDeviceColor = (deviceId) => {
    const status = deviceStatus[deviceId];
    const isSelected = selectedDeviceIds.has(deviceId);
    
    if (status === "current") {
      // Blue for currently in use by this program
      return isSelected
        ? "border-blue-500 bg-blue-100 text-blue-800"
        : "border-blue-400 bg-blue-50 text-blue-700";
    }
    
    if (status === "busy") {
      // Red for busy/occupied
      return isSelected
        ? "border-red-500 bg-red-100 text-red-800"
        : "border-red-400 bg-red-50 text-red-700";
    }
    
    // Green for free
    return isSelected
      ? "border-green-500 bg-green-100 text-green-800"
      : "border-slate-300 bg-white text-slate-700 hover:border-green-400 hover:bg-green-50";
  };

  const getStatusIcon = (deviceId) => {
    const status = deviceStatus[deviceId];
    
    if (status === "current") {
      return <div className="w-3 h-3 rounded-full bg-blue-500" />;
    }
    
    if (status === "busy") {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
    
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent dir="rtl">
          <div className="text-center py-8">טוען נתונים...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>שיוך משקפות לתוכנית</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 text-sm">
            <div className="font-medium text-blue-900 mb-1">
              האפליקציות הבאות יותקנו על המשקפות ({programApps.length}):
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {programApps.slice(0, 5).map(app => (
                <Badge key={app.id} className="bg-blue-100 text-blue-800">
                  {app.name}
                </Badge>
              ))}
              {programApps.length > 5 && (
                <Badge className="bg-blue-100 text-blue-800">
                  +{programApps.length - 5} נוספות
                </Badge>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border rounded-lg p-3">
            <div className="flex items-center gap-4 text-xs mb-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>פנוי</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>תפוס</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>בשימוש התוכנית כרגע</span>
              </div>
            </div>
            
            <div className="font-medium mb-2">בחר משקפות ({selectedDeviceIds.size} נבחרו):</div>
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-14 gap-2 max-h-[350px] overflow-y-auto p-2 border rounded-lg bg-white">
              {devices.map(device => {
                const isSelected = selectedDeviceIds.has(device.id);
                const status = deviceStatus[device.id];
                const details = busyDetails[device.id];

                return (
                  <div
                    key={device.id}
                    className="relative group"
                  >
                    <button
                      onClick={() => toggleDevice(device.id)}
                      className={`w-full aspect-square border-2 rounded-lg transition-all flex flex-col items-center justify-center font-bold text-sm ${getDeviceColor(device.id)}`}
                      title={
                        status === "busy" && details
                          ? `תפוס: ${details.programName}\n${details.date} ${details.time}`
                          : status === "current"
                          ? "משקפת משויכת לתוכנית זו"
                          : "זמין"
                      }
                    >
                      <div className="text-xs font-bold">{device.binocular_number}</div>
                      <div className="absolute -top-1 -right-1">
                        {getStatusIcon(device.id)}
                      </div>
                    </button>
                    
                    {/* Tooltip for busy devices */}
                    {status === "busy" && details && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                        <div className="bg-slate-900 text-white text-xs rounded-lg p-2 shadow-lg whitespace-nowrap">
                          <div className="font-semibold">{details.programName}</div>
                          <div className="text-slate-300">{details.date}</div>
                          <div className="text-slate-300">{details.time}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedDeviceIds.size > 0 && (
            <div className="bg-slate-100 border rounded-lg p-3 text-sm">
              <div className="font-medium mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                סיכום בחירה:
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-600">פנויות:</span>{" "}
                  <span className="font-semibold text-green-700">
                    {Array.from(selectedDeviceIds).filter(id => deviceStatus[id] === "free").length}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600">תפוסות:</span>{" "}
                  <span className="font-semibold text-red-700">
                    {Array.from(selectedDeviceIds).filter(id => deviceStatus[id] === "busy").length}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600">משויכות כבר:</span>{" "}
                  <span className="font-semibold text-blue-700">
                    {Array.from(selectedDeviceIds).filter(id => deviceStatus[id] === "current").length}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedDeviceIds.size === 0 || assigning}
              className="bg-green-600 hover:bg-green-700"
            >
              {assigning ? "משייך..." : `שייך ${selectedDeviceIds.size} משקפות`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}