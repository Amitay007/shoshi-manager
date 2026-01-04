import React, { useEffect, useState } from "react";
import { DeviceApp } from "@/entities/DeviceApp";
import { VRDevice } from "@/entities/VRDevice";
import { Syllabus } from "@/entities/Syllabus";
import { ScheduleEntry } from "@/entities/ScheduleEntry";
import { Glasses, AlertCircle, CheckCircle, Plus, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { with429Retry } from "@/components/utils/retry";
import DeviceAssignmentModal from "./DeviceAssignmentModal";
import { format } from "date-fns";

export default function ProgramDevicesDisplay({ programId, startDatetime, endDatetime, onDevicesLoaded, currentlySelectedDeviceIds = [] }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conflicts, setConflicts] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allPrograms, setAllPrograms] = useState([]);

  useEffect(() => {
    if (programId) {
      loadProgramDevices();
    } else {
      setDevices([]);
      if (onDevicesLoaded) onDevicesLoaded([]);
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    if (devices.length > 0 && startDatetime && endDatetime) {
      checkDeviceAvailability();
    } else {
      setConflicts([]);
    }
  }, [devices, startDatetime, endDatetime, currentlySelectedDeviceIds]);

  const loadProgramDevices = async () => {
    setLoading(true);
    try {
      // Load program details and all programs in one go
      const [program, programsList] = await Promise.all([
        with429Retry(() => Syllabus.get(programId)),
        with429Retry(() => Syllabus.list())
      ]);
      
      setAllPrograms(programsList || []);
      
      if (!program) {
        setDevices([]);
        if (onDevicesLoaded) onDevicesLoaded([]);
        setLoading(false);
        return;
      }

      // Extract all app IDs from the program
      const programAppIds = new Set();
      
      if (program.enrichment_materials) {
        program.enrichment_materials.forEach(material => {
          if (material.app_ids) material.app_ids.forEach(id => programAppIds.add(id));
          if (material.experiences) material.experiences.forEach(id => programAppIds.add(id));
        });
      }
      
      if (program.teaching_materials) {
        program.teaching_materials.forEach(material => {
          if (material.app_ids) material.app_ids.forEach(id => programAppIds.add(id));
          if (material.experiences) material.experiences.forEach(id => programAppIds.add(id));
        });
      }
      
      if (program.sessions) {
        program.sessions.forEach(session => {
          if (session.app_ids) session.app_ids.forEach(id => programAppIds.add(id));
          if (session.experience_ids) session.experience_ids.forEach(id => programAppIds.add(id));
        });
      }

      if (programAppIds.size === 0) {
        setDevices([]);
        if (onDevicesLoaded) onDevicesLoaded([]);
        setLoading(false);
        return;
      }

      // Load all devices and device-app relationships
      const [deviceApps, allDevices] = await Promise.all([
        with429Retry(() => DeviceApp.list()),
        with429Retry(() => VRDevice.list())
      ]);

      // Find devices that have at least one app from the program
      const deviceIdSet = new Set();
      (deviceApps || []).forEach(da => {
        if (programAppIds.has(da.app_id)) {
          deviceIdSet.add(da.device_id);
        }
      });

      const programDevices = (allDevices || [])
        .filter(d => deviceIdSet.has(d.id))
        .sort((a, b) => a.binocular_number - b.binocular_number);

      setDevices(programDevices);
      
      if (onDevicesLoaded) {
        onDevicesLoaded(programDevices.map(d => d.id));
      }
    } catch (error) {
      console.error("Error loading program devices:", error);
      setDevices([]);
      if (onDevicesLoaded) onDevicesLoaded([]);
    }
    setLoading(false);
  };

  const checkDeviceAvailability = async () => {
    try {
      const allSchedules = await with429Retry(() => ScheduleEntry.list());
      
      const conflictsList = [];
      const startTime = new Date(startDatetime);
      const endTime = new Date(endDatetime);

      // Create a map of program IDs to names for quick lookup
      const programNameMap = new Map();
      allPrograms.forEach(p => {
        programNameMap.set(p.id, p.title || p.course_topic || p.subject || p.id);
      });

      for (const schedule of allSchedules) {
        if (schedule.status === "בוטל") continue;

        const scheduleStart = new Date(schedule.start_datetime);
        const scheduleEnd = new Date(schedule.end_datetime);

        const hasOverlap = startTime < scheduleEnd && endTime > scheduleStart;
        if (!hasOverlap) continue;

        const deviceIds = devices.map(d => d.id);
        const commonDevices = (schedule.device_ids || []).filter(id => deviceIds.includes(id));

        if (commonDevices.length > 0) {
          const programName = programNameMap.get(schedule.program_id) || schedule.program_id;

          commonDevices.forEach(deviceId => {
            conflictsList.push({
              device_id: deviceId,
              program_name: programName,
              start: scheduleStart,
              end: scheduleEnd
            });
          });
        }
      }

      setConflicts(conflictsList);
    } catch (error) {
      console.error("Error checking availability:", error);
    }
  };

  const handleDevicesAssigned = async (newDeviceIds) => {
    setShowAssignModal(false);
    await loadProgramDevices();
    if (onDevicesLoaded && newDeviceIds) {
      onDevicesLoaded(newDeviceIds);
    }
  };

  const getDeviceStatus = (device) => {
    if (currentlySelectedDeviceIds && currentlySelectedDeviceIds.includes(device.id)) {
      return {
        available: true,
        icon: <div className="w-3 h-3 rounded-full bg-blue-500" />,
        color: "border-blue-400 bg-blue-50",
        textColor: "text-blue-700",
        reason: "משויכת"
      };
    }

    const conflict = conflicts.find(c => c.device_id === device.id);
    
    if (conflict) {
      return {
        available: false,
        icon: <AlertCircle className="w-4 h-4 text-red-500" />,
        color: "border-red-400 bg-red-50",
        textColor: "text-red-700",
        reason: "תפוסה"
      };
    }

    if (device.current_status === "בתחזוקה") {
      return {
        available: false,
        icon: <AlertCircle className="w-4 h-4 text-yellow-500" />,
        color: "border-yellow-400 bg-yellow-50",
        textColor: "text-yellow-700",
        reason: "בתחזוקה"
      };
    }

    if (device.current_status === "מושבת") {
      return {
        available: false,
        icon: <AlertCircle className="w-4 h-4 text-gray-500" />,
        color: "border-gray-400 bg-gray-100",
        textColor: "text-gray-500",
        reason: "מושבת"
      };
    }

    return {
      available: true,
      icon: <CheckCircle className="w-4 h-4 text-green-500" />,
      color: "border-green-400 bg-green-50",
      textColor: "text-green-700",
      reason: "זמינה"
    };
  };

  if (loading) {
    return <div className="text-sm text-slate-500">טוען משקפות...</div>;
  }

  if (!programId) {
    return <div className="text-sm text-slate-500">בחר תוכנית כדי לראות משקפות משויכות</div>;
  }

  if (devices.length === 0) {
    return (
      <>
        <div className="text-sm p-4 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-orange-900 mb-2">לא נמצאו משקפות משויכות לתוכנית זו</div>
              <div className="text-orange-700 text-xs mb-3">
                כדי ליצור שיבוץ, יש צורך להתקין את אפליקציות התוכנית על משקפות
              </div>
              <Button
                onClick={() => setShowAssignModal(true)}
                className="bg-orange-600 hover:bg-orange-700 gap-2"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                הוסף משקפות
              </Button>
            </div>
          </div>
        </div>

        <DeviceAssignmentModal
          open={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          programId={programId}
          startDatetime={startDatetime}
          endDatetime={endDatetime}
          onComplete={handleDevicesAssigned}
          currentlySelectedDeviceIds={currentlySelectedDeviceIds}
        />
      </>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Glasses className="w-4 h-4" />
        <span className="font-medium">משקפות משויכות לתוכנית ({devices.length}):</span>
        <Button
          onClick={() => setShowAssignModal(true)}
          variant="outline"
          size="sm"
          className="mr-auto gap-1 h-7"
        >
          <Plus className="w-3 h-3" />
          הוסף משקפות
        </Button>
      </div>

      <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-14 gap-2 p-3 bg-slate-50 rounded-lg">
        {devices.map(device => {
          const status = getDeviceStatus(device);
          
          return (
            <div
              key={device.id}
              title={`משקפת ${device.binocular_number} - ${status.reason}`}
              className={`relative border-2 rounded-md p-2 text-center ${status.color}`}
            >
              <div className={`font-bold text-sm ${status.textColor}`}>
                {device.binocular_number}
              </div>
              <div className="absolute -top-1 -left-1">
                {status.icon}
              </div>
            </div>
          );
        })}
      </div>

      {startDatetime && endDatetime && conflicts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-2 text-red-800 mb-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold mb-2">⚠️ שים לב: {conflicts.length} משקפות תפוסות בזמן זה</div>
              <div className="text-red-700 font-medium mb-2">פירוט התפוסות:</div>
            </div>
          </div>
          
          {/* Detailed conflict list */}
          <div className="space-y-2 pr-7">
            {conflicts.map((conflict, idx) => {
              const device = devices.find(d => d.id === conflict.device_id);
              return (
                <div key={idx} className="bg-white border border-red-200 rounded p-2 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-red-800">משקפת #{device?.binocular_number || '?'}</span>
                    <span className="text-red-600">•</span>
                    <span className="font-semibold text-red-700">{conflict.program_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-red-600 text-[10px]">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(conflict.start, 'dd/MM/yyyy')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(conflict.start, 'HH:mm')} - {format(conflict.end, 'HH:mm')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-3 pt-3 border-t border-red-300">
            <div className="text-red-700 text-xs font-medium">
              💡 ניתן להמשיך בשיבוץ, אך המשקפות האלו יהיו תפוסות במקביל לתוכנית אחרת
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-slate-600 pt-2 border-t">
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span>זמינה</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-red-500" />
          <span>תפוסה</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>משויכת לשיבוץ</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-yellow-500" />
          <span>בתחזוקה</span>
        </div>
      </div>

      <DeviceAssignmentModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        programId={programId}
        startDatetime={startDatetime}
        endDatetime={endDatetime}
        onComplete={handleDevicesAssigned}
        currentlySelectedDeviceIds={currentlySelectedDeviceIds}
      />
    </div>
  );
}