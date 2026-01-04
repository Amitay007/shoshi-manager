import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VRDevice } from "@/entities/VRDevice";
import { Syllabus } from "@/entities/Syllabus";
import { VRApp } from "@/entities/VRApp";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Glasses, BookOpen, School, AlertTriangle, AppWindow } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [schools, setSchools] = useState([]);
  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [devicesData, programsData, schoolsData, appsData] = await Promise.all([
          VRDevice.list(),
          Syllabus.list(),
          EducationInstitution.list(),
          VRApp.list()
        ]);

        setDevices(devicesData || []);
        setPrograms(programsData || []);
        setSchools(schoolsData || []);
        setApps(appsData || []);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Statistics - Memoized for performance
  const stats = useMemo(() => {
    const activeDevices = devices.filter(d => !d.is_disabled && d.status !== "בתיקון").length;
    const totalPrograms = programs.length;
    const issuesCount = devices.filter(d => d.is_disabled || d.status === "מושבת" || d.status === "בתיקון").length;
    const totalApps = apps.length;
    
    return { activeDevices, totalPrograms, issuesCount, totalApps };
  }, [devices, programs, apps]);

  // Device status breakdown - Memoized
  const deviceStatusData = useMemo(() => [
    {
      name: "פעיל",
      value: devices.filter(d => !d.is_disabled && d.status !== "בתיקון" && d.status !== "בתחזוקה").length,
      color: "#10b981"
    },
    {
      name: "בתחזוקה",
      value: devices.filter(d => d.status === "בתיקון" || d.status === "בתחזוקה").length,
      color: "#f59e0b"
    },
    {
      name: "מושבת",
      value: devices.filter(d => d.is_disabled || d.status === "מושבת").length,
      color: "#ef4444"
    }
  ], [devices]);

  // Alerts - Memoized
  const alerts = useMemo(() => 
    devices
      .filter(d => d.is_disabled || d.status === "בתיקון" || d.status === "מושבת")
      .slice(0, 5),
    [devices]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="text-xl text-slate-600">טוען נתונים...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-3 sm:p-6" dir="rtl">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-8 w-full">
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">דאשבורד</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1 sm:mt-2">סקירה כללית של מערכת ניהול ה-VR</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
          <Link to={createPageUrl("GeneralInfo")} className="w-full">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-green-500 w-full">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-slate-600 mb-1">משקפות פעילות</p>
                    <p className="text-2xl sm:text-4xl font-bold text-slate-900">{stats.activeDevices}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1">סה"כ משקפות פעילות</p>
                  </div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 bg-green-100 rounded-xl flex items-center justify-center ml-3">
                    <Glasses className="w-5 h-5 sm:w-8 sm:h-8 flex-shrink-0 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("SyllabusHub")} className="w-full">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-purple-500 w-full">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-slate-600 mb-1">סילבוסים</p>
                    <p className="text-2xl sm:text-4xl font-bold text-slate-900">{stats.totalPrograms}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1">תוכניות לימוד</p>
                  </div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 bg-purple-100 rounded-xl flex items-center justify-center ml-3">
                    <BookOpen className="w-5 h-5 sm:w-8 sm:h-8 flex-shrink-0 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("GeneralApps")} className="w-full">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-cyan-500 w-full">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-slate-600 mb-1">אפליקציות</p>
                    <p className="text-2xl sm:text-4xl font-bold text-slate-900">{stats.totalApps}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1">סה"כ אפליקציות במערכת</p>
                  </div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 bg-cyan-100 rounded-xl flex items-center justify-center ml-3">
                    <AppWindow className="w-5 h-5 sm:w-8 sm:h-8 flex-shrink-0 text-cyan-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("GeneralInfo?tab=issues")} className="w-full">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-red-500 w-full">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-slate-600 mb-1">התראות</p>
                    <p className="text-2xl sm:text-4xl font-bold text-slate-900">{stats.issuesCount}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1">מכשירים בעייתיים</p>
                  </div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 bg-red-100 rounded-xl flex items-center justify-center ml-3">
                    <AlertTriangle className="w-5 h-5 sm:w-8 sm:h-8 flex-shrink-0 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-3 sm:gap-6 mb-4 sm:mb-8">
          {/* Device Status Pie Chart */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">סטטוס מכשירים</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="h-48 sm:h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {deviceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-3 sm:gap-6 mt-3 sm:mt-4 flex-wrap w-full">
                {deviceStatusData.map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-3 h-3 sm:w-3 sm:h-3 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs sm:text-sm text-slate-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 gap-3 sm:gap-6">
          {/* Alerts */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg w-full">
                <AlertTriangle className="w-5 h-5 sm:w-5 sm:h-5 flex-shrink-0 text-orange-600" />
                התרעות במכשירים
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {alerts.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {alerts.map((device) => (
                    <div key={device.id} className="flex flex-col sm:flex-row items-start sm:justify-between p-3 bg-red-50 rounded-lg border border-red-200 w-full gap-2">
                      <div className="flex-1 w-full">
                        <div className="font-semibold text-sm sm:text-base text-slate-900">משקפת {device.binocular_number} במצוקה</div>
                        <div className="text-xs sm:text-sm text-slate-600 mt-1">
                          {device.disable_reason || "לא צוין סיבה"}
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-500 mt-1">
                          {device.updated_date ? format(new Date(device.updated_date), 'dd/MM/yyyy HH:mm') : ''}
                        </div>
                      </div>
                      <Link to={createPageUrl(`GeneralInfo`)} className="w-full sm:w-auto">
                        <button className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium whitespace-nowrap bg-white rounded border border-red-300 hover:bg-red-50 transition-colors">
                          צפייה
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-slate-500">
                  אין התרעות פעילות
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}