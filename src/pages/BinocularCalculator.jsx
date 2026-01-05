import React, { useState, useEffect, useMemo } from "react";
import { Syllabus } from "@/entities/Syllabus";
import { VRApp } from "@/entities/VRApp";
import { VRDevice } from "@/entities/VRDevice";
import { DeviceApp } from "@/entities/DeviceApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, Glasses, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { with429Retry } from "@/components/utils/retry";

export default function BinocularCalculator() {
  const [programs, setPrograms] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [allDeviceApps, setAllDeviceApps] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selected programs (up to 3)
  const [selectedProgram1, setSelectedProgram1] = useState("");
  const [selectedProgram2, setSelectedProgram2] = useState("");
  const [selectedProgram3, setSelectedProgram3] = useState("");

  // Device numbers for each program
  const [program1Devices, setProgram1Devices] = useState([]);
  const [program2Devices, setProgram2Devices] = useState([]);
  const [program3Devices, setProgram3Devices] = useState([]);

  // Map device number to device data for checking disabled status
  const [deviceDataByNumber, setDeviceDataByNumber] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [progs, apps, devices, deviceApps] = await Promise.all([
        with429Retry(() => Syllabus.list()),
        with429Retry(() => VRApp.list()),
        with429Retry(() => VRDevice.list()),
        with429Retry(() => DeviceApp.list())
      ]);

      setPrograms(progs || []);
      setAllApps(apps || []);
      setAllDevices(devices || []);
      setAllDeviceApps(deviceApps || []);

      // Create mapping from device number to device data
      const deviceMapping = {};
      (devices || []).forEach(d => {
        const num = Number(d.binocular_number);
        if (Number.isFinite(num)) {
          deviceMapping[num] = d;
        }
      });
      setDeviceDataByNumber(deviceMapping);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  // Function to get all app IDs from a program
  const getProgramAppIds = (program) => {
    const appIds = new Set();
    
    // From teaching_materials
    (program.teaching_materials || []).forEach(tm => {
      (tm.app_ids || []).forEach(id => appIds.add(id));
      (tm.experiences || []).forEach(id => appIds.add(id));
    });
    
    // From enrichment_materials
    (program.enrichment_materials || []).forEach(em => {
      (em.app_ids || []).forEach(id => appIds.add(id));
      (em.experiences || []).forEach(id => appIds.add(id));
    });
    
    // From sessions
    (program.sessions || []).forEach(session => {
      (session.app_ids || []).forEach(id => appIds.add(id));
      (session.experience_ids || []).forEach(id => appIds.add(id));
    });
    
    return Array.from(appIds);
  };

  // Function to get device numbers for a program based on its apps
  const getDeviceNumbersForProgram = (program) => {
    const appIds = getProgramAppIds(program);
    
    // Find all devices that have at least one of these apps
    const deviceIdsWithApps = new Set();
    allDeviceApps.forEach(da => {
      if (appIds.includes(da.app_id)) {
        deviceIdsWithApps.add(da.device_id);
      }
    });
    
    // Convert device IDs to device numbers
    const deviceNumbers = [];
    allDevices.forEach(d => {
      if (deviceIdsWithApps.has(d.id)) {
        const num = Number(d.binocular_number);
        if (Number.isFinite(num)) {
          deviceNumbers.push(num);
        }
      }
    });
    
    return deviceNumbers.sort((a, b) => a - b);
  };

  // Update device lists when programs are selected
  useEffect(() => {
    if (selectedProgram1) {
      const program = programs.find(p => p.id === selectedProgram1);
      if (program) {
        setProgram1Devices(getDeviceNumbersForProgram(program));
      }
    } else {
      setProgram1Devices([]);
    }
  }, [selectedProgram1, programs, allDevices, allDeviceApps]);

  useEffect(() => {
    if (selectedProgram2) {
      const program = programs.find(p => p.id === selectedProgram2);
      if (program) {
        setProgram2Devices(getDeviceNumbersForProgram(program));
      }
    } else {
      setProgram2Devices([]);
    }
  }, [selectedProgram2, programs, allDevices, allDeviceApps]);

  useEffect(() => {
    if (selectedProgram3) {
      const program = programs.find(p => p.id === selectedProgram3);
      if (program) {
        setProgram3Devices(getDeviceNumbersForProgram(program));
      }
    } else {
      setProgram3Devices([]);
    }
  }, [selectedProgram3, programs, allDevices, allDeviceApps]);

  // Calculate overlapping devices
  const overlappingDevices = useMemo(() => {
    const allSelected = [];
    if (selectedProgram1) allSelected.push(program1Devices);
    if (selectedProgram2) allSelected.push(program2Devices);
    if (selectedProgram3) allSelected.push(program3Devices);

    if (allSelected.length < 2) return new Set();

    // Find devices that appear in more than one program
    const deviceCounts = {};
    allSelected.forEach(deviceList => {
      deviceList.forEach(deviceNum => {
        deviceCounts[deviceNum] = (deviceCounts[deviceNum] || 0) + 1;
      });
    });

    const overlapping = new Set();
    Object.entries(deviceCounts).forEach(([deviceNum, count]) => {
      if (count > 1) {
        overlapping.add(Number(deviceNum));
      }
    });

    return overlapping;
  }, [selectedProgram1, selectedProgram2, selectedProgram3, program1Devices, program2Devices, program3Devices]);

  // Get program title
  const getProgramTitle = (programId) => {
    const program = programs.find(p => p.id === programId);
    if (!program) return "";
    return program.title || program.course_topic || program.subject || "תוכנית ללא שם";
  };

  // Render device grid for a program
  const renderDeviceGrid = (devices, programColor) => {
    if (devices.length === 0) {
      return (
        <div className="text-center text-slate-500 py-8 text-sm">
          אין משקפות משויכות לתוכנית זו
        </div>
      );
    }

    return (
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {devices.map(num => {
          const isOverlapping = overlappingDevices.has(num);
          const device = deviceDataByNumber[num];
          const isDisabled = device?.is_disabled || false;
          
          return (
            <Link 
              key={num}
              to={createPageUrl(`DeviceInfo?id=${num}`)}
              className="block"
            >
              <div
                className={`aspect-square rounded-2xl border-3 transition-all flex flex-col items-center justify-center font-bold cursor-pointer shadow-md hover:shadow-xl hover:scale-105 ${
                  isDisabled
                    ? 'bg-gray-400 border-gray-500 text-gray-700' // Updated color for disabled
                    : isOverlapping
                      ? 'bg-gradient-to-br from-red-500 to-red-700 border-red-700 text-white hover:from-red-600 hover:to-red-800' // Updated color for overlapping
                      : `bg-gradient-to-br ${programColor} border-transparent text-white`
                }`}
                title={
                  isDisabled 
                    ? `משקפת ${num} - מושבת${device?.disable_reason ? `: ${device.disable_reason}` : ''}`
                    : isOverlapping 
                      ? `משקפת ${num} - חופפת עם תוכנית אחרת`
                      : `משקפת ${num} - פנויה`
                }
              >
                <Glasses className="w-5 h-5 mb-1" />
                <span className="text-sm font-extrabold">{num}</span>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  const selectedPrograms = [
    { id: selectedProgram1, devices: program1Devices, setter: setSelectedProgram1, color: 'from-purple-500 to-purple-700', title: getProgramTitle(selectedProgram1), bgCard: 'bg-gradient-to-br from-purple-50 to-purple-100', borderCard: 'border-purple-400' },
    { id: selectedProgram2, devices: program2Devices, setter: setSelectedProgram2, color: 'from-blue-400 to-cyan-500', title: getProgramTitle(selectedProgram2), bgCard: 'bg-gradient-to-br from-blue-50 to-cyan-50', borderCard: 'border-cyan-400' },
    { id: selectedProgram3, devices: program3Devices, setter: setSelectedProgram3, color: 'from-green-500 to-green-700', title: getProgramTitle(selectedProgram3), bgCard: 'bg-gradient-to-br from-green-50 to-green-100', borderCard: 'border-green-400' }
  ];

  return (
    <div className="min-h-screen bg-white p-4 sm:p-8" dir="rtl">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
        body { 
          font-family: 'Heebo', sans-serif;
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto">
        {/* Mobile Header */}
        <div className="lg:hidden mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">מחשבון משקפות</h1>
              <p className="text-gray-600 text-xs mt-1">בדיקת זמינות בין תוכניות</p>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <Link to={createPageUrl("SilshuchCreator")} className="flex-1">
              <Button variant="outline" className="w-full">סילשוך</Button>
            </Link>
            <Link to={createPageUrl("CRMHub")} className="flex-1">
              <Button variant="outline" className="w-full">יחסי אנוש</Button>
            </Link>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Calculator className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-gray-900">מחשבון משקפות</h1>
              <p className="text-gray-600 font-medium mt-1">בדיקת זמינות בין תוכניות</p>
            </div>
          </div>
          <BackHomeButtons backTo="Programs" />
        </div>

        {/* Mobile Legend */}
        <div className="lg:hidden bg-gradient-to-r from-purple-50 via-cyan-50 to-green-50 rounded-xl p-4 mb-6 shadow-md border border-purple-200">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-0.5 w-8 bg-purple-600"></div>
            <span className="text-xs font-bold text-purple-700">1</span>
            <div className="h-0.5 w-8 bg-purple-600"></div>
            <div className="h-0.5 w-8 bg-cyan-500"></div>
            <span className="text-xs font-bold text-cyan-600">2</span>
            <div className="h-0.5 w-8 bg-cyan-500"></div>
            <div className="h-0.5 w-8 bg-green-600"></div>
            <span className="text-xs font-bold text-green-700">3</span>
            <div className="h-0.5 w-8 bg-green-600"></div>
          </div>
          <div className="space-y-1 text-center">
            <div className="text-xs font-bold text-red-700">חופפת - אדום</div>
            <div className="text-xs font-bold text-gray-600">מושבתת - אפור</div>
          </div>
        </div>

        {/* Desktop Legend */}
        <div className="hidden lg:block bg-gradient-to-r from-purple-50 via-cyan-50 to-green-50 rounded-2xl p-6 mb-8 shadow-md border-2 border-purple-200">
          <div className="space-y-3">
            <div className="flex flex-row justify-start gap-8 overflow-x-auto pb-2 px-2 no-scrollbar">
              <span className="text-sm font-bold text-purple-700">תוכנית 1 - סגול</span>
              <span className="text-sm font-bold text-cyan-600">תוכנית 2 - כחול תורכיז</span>
              <span className="text-sm font-bold text-green-700">תוכנית 3 - ירוק</span>
            </div>
            <div className="flex flex-row justify-start gap-8 overflow-x-auto pb-2 px-2 no-scrollbar">
              <span className="text-sm font-bold text-red-700">משקפת חופפת - אדום</span>
              <span className="text-sm font-bold text-gray-600">משקפת מושבתת - אפור</span>
            </div>
          </div>
        </div>

        {/* Program Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {selectedPrograms.map((prog, idx) => (
            <Card key={idx} className={`${prog.bgCard} border-2 ${prog.borderCard} shadow-xl rounded-2xl overflow-hidden transition-all hover:shadow-2xl`}>
              <CardHeader className="bg-white/80 backdrop-blur-sm border-b-2 border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-black text-gray-900">תוכנית {idx + 1}</CardTitle>
                  {prog.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hover:bg-red-100 text-red-600 rounded-full"
                      onClick={() => prog.setter("")}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Select value={prog.id} onValueChange={prog.setter}>
                  <SelectTrigger className="w-full h-12 text-base font-semibold border-2 border-gray-300 rounded-xl hover:border-purple-400 transition-colors">
                    <SelectValue placeholder="בחר תוכנית..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl" align="end" className="lg:max-h-80">
                    {programs
                      .filter(p => 
                        p.id === prog.id || 
                        (!selectedPrograms.some((sp, i) => i !== idx && sp.id === p.id))
                      )
                      .map(program => {
                        const title = program.title || program.course_topic || program.subject || "תוכנית ללא שם";
                        return (
                          <SelectItem 
                            key={program.id} 
                            value={program.id} 
                            className="font-medium text-right lg:whitespace-normal lg:h-auto lg:py-3"
                          >
                            <div className="lg:max-w-md lg:leading-relaxed">
                              {title}
                            </div>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>

                {prog.id && (
                  <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between bg-white/70 backdrop-blur-sm p-4 rounded-xl border-2 border-gray-200 gap-3">
                      <div className="font-bold text-gray-900 text-sm lg:text-base flex-1 leading-relaxed">
                        {prog.title}
                      </div>
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">
                        {prog.devices.length} משקפות
                      </Badge>
                    </div>
                    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border-2 border-gray-200">
                      {renderDeviceGrid(prog.devices, prog.color)}
                    </div>
                  </div>
                )}

                {!prog.id && (
                  <div className="text-center py-16 text-gray-400">
                    <Calculator className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="font-semibold">בחר תוכנית להצגת משקפות</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        {(selectedProgram1 || selectedProgram2 || selectedProgram3) && (
          <Card className="shadow-2xl rounded-2xl overflow-hidden border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
            <CardHeader className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white py-6">
              <CardTitle className="text-2xl font-black text-center">סיכום כללי</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
                <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-green-300">
                  <div className="text-5xl font-black bg-gradient-to-br from-green-500 to-teal-500 bg-clip-text text-transparent mb-2">
                    {[...new Set([...program1Devices, ...program2Devices, ...program3Devices])].length - overlappingDevices.size}
                  </div>
                  <div className="text-sm font-bold text-gray-700">משקפות פנויות</div>
                </div>
                <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-red-300">
                  <div className="text-5xl font-black bg-gradient-to-br from-red-500 to-pink-500 bg-clip-text text-transparent mb-2">
                    {overlappingDevices.size}
                  </div>
                  <div className="text-sm font-bold text-gray-700">משקפות חופפות</div>
                </div>
                <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-purple-300">
                  <div className="text-5xl font-black bg-gradient-to-br from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
                    {[...new Set([...program1Devices, ...program2Devices, ...program3Devices])].length}
                  </div>
                  <div className="text-sm font-bold text-gray-700">סה"כ משקפות ייחודיות</div>
                </div>
              </div>

              {/* Device Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Overlapping Devices List */}
                {overlappingDevices.size > 0 && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-red-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center">
                        <Glasses className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-black text-gray-900">רשימת משקפות חופפות</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(overlappingDevices).sort((a, b) => a - b).map(num => (
                        <Link key={num} to={createPageUrl(`DeviceInfo?id=${num}`)}>
                          <Badge className="bg-gradient-to-br from-red-500 to-red-700 text-white hover:from-red-600 hover:to-red-800 cursor-pointer transition-all px-3 py-1.5 text-sm font-bold shadow-md hover:shadow-lg">
                            #{String(num).padStart(3, '0')}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Devices List */}
                {(() => {
                  const allDeviceNumbers = [...new Set([...program1Devices, ...program2Devices, ...program3Devices])];
                  const availableDevices = allDeviceNumbers.filter(num => !overlappingDevices.has(num)).sort((a, b) => a - b);
                  
                  return availableDevices.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-green-300">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                          <Glasses className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">רשימת משקפות פנויות</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableDevices.map(num => {
                          // Determine which program color to use
                          let colorClass = 'from-purple-500 to-purple-700'; // Default to P1 color
                          const isInP1 = program1Devices.includes(num);
                          const isInP2 = program2Devices.includes(num);
                          const isInP3 = program3Devices.includes(num);

                          if (isInP2 && !isInP1 && !isInP3) {
                            colorClass = 'from-blue-400 to-cyan-500';
                          } else if (isInP3 && !isInP1 && !isInP2) {
                            colorClass = 'from-green-500 to-green-700';
                          }
                          
                          return (
                            <Link key={num} to={createPageUrl(`DeviceInfo?id=${num}`)}>
                              <Badge className={`bg-gradient-to-br ${colorClass} text-white hover:opacity-80 cursor-pointer transition-all px-3 py-1.5 text-sm font-bold shadow-md hover:shadow-lg`}>
                                #{String(num).padStart(3, '0')}
                              </Badge>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}