import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VRDevice } from "@/entities/VRDevice";
import { Syllabus } from "@/entities/Syllabus";
import { VRApp } from "@/entities/VRApp";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BookOpen, School, AlertTriangle, AppWindow } from "lucide-react";
import VRIcon from "@/components/icons/VRIcon";
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
  
  const todayHebrewDate = new Intl.DateTimeFormat('he-IL', { dateStyle: 'full', calendar: 'hebrew' }).format(new Date());

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="text-xl text-slate-600">טוען נתונים...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center sm:text-right">
          <h1 className="text-3xl font-bold text-slate-900">שושי 2.1</h1>
          <p className="text-slate-500 mt-1">סקירה כללית של מערכת ניהול ה-VR</p>
        </div>

        {/* Top KPI Cards - Order based on image 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Faults - Red - Leftmost in image (RTL) */}
          <Link to={createPageUrl("GeneralInfo") + "?tab=issues"}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-t-4 border-t-red-500">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.issuesCount}</p>
                <p className="text-sm text-slate-600 mt-1">תקלות</p>
                <p className="text-[10px] text-slate-400">מכשירים בתקלה</p>
              </CardContent>
            </Card>
          </Link>

          {/* Apps - Cyan */}
          <Link to={createPageUrl("GeneralApps")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-t-4 border-t-cyan-500">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center mb-3">
                  <AppWindow className="w-6 h-6 text-cyan-600" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalApps}</p>
                <p className="text-sm text-slate-600 mt-1">אפליקציות</p>
                <p className="text-[10px] text-slate-400">סה"כ אפליקציות במערכת</p>
              </CardContent>
            </Card>
          </Link>

          {/* Programs - Purple */}
          <Link to={createPageUrl("SyllabusHub")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-t-4 border-t-purple-500">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalPrograms}</p>
                <p className="text-sm text-slate-600 mt-1">תוכניות</p>
                <p className="text-[10px] text-slate-400">תוכניות לימוד</p>
              </CardContent>
            </Card>
          </Link>

          {/* Active Devices - Green */}
          <Link to={createPageUrl("GeneralInfo")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-t-4 border-t-green-500">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <VRIcon className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats.activeDevices}</p>
                <p className="text-sm text-slate-600 mt-1">משקפות פעילות</p>
                <p className="text-[10px] text-slate-400">סה"כ משקפות פעילות</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Content Layout - 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 min-h-[400px]">
          
          {/* Left: Device Status Pie Chart */}
          <Card className="lg:col-span-1 h-full border-2 border-slate-900 rounded-3xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-base">סטטוס מכשירים</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[300px]">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      dataKey="value"
                      stroke="none"
                    >
                      {deviceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {deviceStatusData.map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Middle: Device Alerts */}
          <Card className="lg:col-span-1 h-full border-2 border-slate-900 rounded-3xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-base flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" /> 
                התרעות במכשירים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.length > 0 ? (
                  alerts.map((device) => (
                    <div key={device.id} className="p-3 bg-red-50 rounded-lg text-center">
                      <div className="font-bold text-red-900 text-sm">משקפת {device.binocular_number} תקולה</div>
                      <div className="text-xs text-red-700 mt-1">{device.disable_reason || "ללא סיבה"}</div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {device.updated_date ? format(new Date(device.updated_date), 'HH:mm dd/MM/yyyy') : ''}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm">אין התרעות</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right: Yoya Updates (Placeholder) */}
          <Card className="lg:col-span-2 h-full border-2 border-slate-900 rounded-3xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-base">עדכוני יויה</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center text-slate-400">
              <p>אין עדכונים חדשים</p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Card: Dates */}
        <Card className="mb-8 border-2 border-slate-900 rounded-3xl">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-medium text-slate-800">תאריך לועזי ותאריך עברי של היום</h2>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {format(new Date(), 'dd/MM/yyyy')}
            </div>
            <div className="mt-1 text-lg text-slate-600">
              {todayHebrewDate}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}