import React, { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { DeviceApp } from "@/entities/DeviceApp";
import { with429Retry } from "@/components/utils/retry";

export default function DeviceSelector({ 
  devices, 
  selectedDeviceIds, 
  onSelectionChange, 
  conflicts,
  programId
}) {
  const [programDeviceIds, setProgramDeviceIds] = React.useState([]);

  useEffect(() => {
    if (programId) {
      loadProgramDevices();
    } else {
      setProgramDeviceIds([]);
    }
  }, [programId]);

  const loadProgramDevices = async () => {
    try {
      const deviceApps = await with429Retry(() => DeviceApp.list());
      const deviceIds = new Set();
      
      (deviceApps || []).forEach(da => {
        if (da.app_id && devices.find(d => d.id === da.device_id)) {
          deviceIds.add(da.device_id);
        }
      });
      
      setProgramDeviceIds(Array.from(deviceIds));
    } catch (error) {
      console.error("Error loading program devices:", error);
      setProgramDeviceIds([]);
    }
  };

  const getDeviceStatus = (device) => {
    const conflict = (conflicts || []).find(c => c.device_id === device.id);
    if (conflict) {
      return {
        available: false,
        reason: `תפוסה ע"י "${conflict.program_name}"`,
        color: "bg-red-50 border-red-400 cursor-not-allowed",
        textColor: "text-red-700"
      };
    }

    if (device.current_status === "בתחזוקה") {
      return {
        available: false,
        reason: "בתחזוקה",
        color: "bg-yellow-50 border-yellow-400 cursor-not-allowed",
        textColor: "text-yellow-700"
      };
    }

    if (device.current_status === "מושבת") {
      return {
        available: false,
        reason: "מושבת",
        color: "bg-gray-100 border-gray-400 cursor-not-allowed",
        textColor: "text-gray-500"
      };
    }

    return {
      available: true,
      reason: "זמינה",
      color: "bg-white border-slate-300 hover:border-cyan-500 cursor-pointer",
      textColor: "text-slate-800"
    };
  };

  const handleToggle = (device) => {
    const status = getDeviceStatus(device);
    if (!status.available) return;

    const newSelection = selectedDeviceIds.includes(device.id)
      ? selectedDeviceIds.filter(id => id !== device.id)
      : [...selectedDeviceIds, device.id];
    
    onSelectionChange(newSelection);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-h-64 overflow-y-auto p-2">
        {devices.map(device => {
          const status = getDeviceStatus(device);
          const isSelected = selectedDeviceIds.includes(device.id);
          const isProgramDevice = programDeviceIds.includes(device.id);

          return (
            <div
              key={device.id}
              onClick={() => handleToggle(device)}
              title={`משקפת ${device.binocular_number} - ${status.reason}${isProgramDevice ? ' (משויכת לתוכנית)' : ''}`}
              className={`relative border-2 rounded-md p-2 transition-all text-center ${status.color} ${
                isSelected && status.available 
                  ? "ring-2 ring-cyan-500 border-cyan-500 bg-cyan-50" 
                  : isProgramDevice && status.available
                  ? "border-green-500 bg-green-50"
                  : ""
              }`}
            >
              <div className={`font-bold text-sm ${
                isSelected && status.available 
                  ? 'text-cyan-700' 
                  : isProgramDevice && status.available
                  ? 'text-green-700'
                  : status.textColor
              }`}>
                {device.binocular_number}
              </div>
              
              {!status.available && (
                <div className="absolute -top-1 -left-1">
                  <AlertCircle className="w-4 h-4 text-red-500 bg-white rounded-full" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-xs border-t pt-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-white border-2 border-slate-300 rounded"></div>
          <span>זמין</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-50 border-2 border-green-500 rounded"></div>
          <span>משויך לתוכנית</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-cyan-50 border-2 border-cyan-500 rounded"></div>
          <span>נבחר</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-50 border-2 border-red-400 rounded"></div>
          <span>תפוס</span>
        </div>
      </div>
    </div>
  );
}