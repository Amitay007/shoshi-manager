import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VRDevice } from "@/entities/VRDevice";
import { VRApp } from "@/entities/VRApp";
import { DeviceApp } from "@/entities/DeviceApp";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Glasses, AppWindow, AlertTriangle, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [apps, setApps] = useState([]);
  const [deviceApps, setDeviceApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [devicesData, appsData, deviceAppsData] = await Promise.all([
          VRDevice.list(),
          VRApp.list(),
          DeviceApp.list()
        ]);

        setDevices(devicesData || []);
        setApps(appsData || []);
        setDeviceApps(deviceAppsData || []);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Statistics
  const activeDevices = devices.filter(d => !d.is_disabled && d.status !== "בתיקון").length;
  const totalApps = apps.length;
  const installedApps = apps.filter(a => a.is_installed).length;
  const issuesCount = devices.filter(d => d.is_disabled || d.status === "מושבת" || d.status === "בתיקון").length;

  // Device status breakdown
  const deviceStatusData = [
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
  ];

  // Alerts (devices with issues)
  const alerts = devices
    .filter(d => d.is_disabled || d.status === "בתיקון" || d.status === "מושבת")
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="text-xl text-slate-600">טוען נתונים...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">דאשבורד</h1>
          <p className="text-slate-500 mt-2">סקירה כללית של מערכת ניהול ה-VR</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link to={createPageUrl("GeneralInfo")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">משקפות פעילות</p>
                    <p className="text-4xl font-bold text-slate-900">{activeDevices}</p>
                    <p className="text-xs text-slate-500 mt-1">מתוך {devices.length} סה"כ</p>
                  </div>
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                    <Glasses className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("GeneralApps")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-cyan-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">אפליקציות במערכת</p>
                    <p className="text-4xl font-bold text-slate-900">{totalApps}</p>
                    <p className="text-xs text-slate-500 mt-1">{installedApps} מותקנות</p>
                  </div>
                  <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <AppWindow className="w-8 h-8 text-cyan-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("GeneralApps?filter=installed")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">אפליקציות מותקנות</p>
                    <p className="text-4xl font-bold text-slate-900">{installedApps}</p>
                    <p className="text-xs text-slate-500 mt-1">על המשקפות</p>
                  </div>
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("GeneralInfo?tab=issues")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-red-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">משקפות בתקלה</p>
                    <p className="text-4xl font-bold text-slate-900">{issuesCount}</p>
                    <p className="text-xs text-slate-500 mt-1">דורשות טיפול</p>
                  </div>
                  <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Device Status Chart */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>סטטוס מכשירים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
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
              <div className="flex justify-center gap-6 mt-4">
                {deviceStatusData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-600">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              התרעות במכשירים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((device) => (
                  <Link key={device.id} to={createPageUrl(`DeviceInfo?id=${device.binocular_number}`)}>
                    <div className="flex items-start justify-between p-3 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors cursor-pointer">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">משקפת #{device.binocular_number}</div>
                        <div className="text-sm text-slate-600 mt-1">
                          {device.disable_reason || "לא צוין סיבה"}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                אין התרעות פעילות ✓
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}