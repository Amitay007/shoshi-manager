import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VRDevice } from "@/entities/VRDevice";
import { ScheduleEntry } from "@/entities/ScheduleEntry";
import { Syllabus } from "@/entities/Syllabus";
import { VRApp } from "@/entities/VRApp";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Glasses, Calendar, BookOpen, School, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, isAfter, isBefore, addDays, startOfWeek, endOfWeek } from "date-fns";
import { he } from "date-fns/locale";

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [schools, setSchools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [devicesData, schedulesData, programsData, schoolsData] = await Promise.all([
          VRDevice.list(),
          ScheduleEntry.list(),
          Syllabus.list(),
          EducationInstitution.list()
        ]);

        setDevices(devicesData || []);
        setSchedules(schedulesData || []);
        setPrograms(programsData || []);
        setSchools(schoolsData || []);
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
  const upcomingSchedules = schedules.filter(s => {
    const start = new Date(s.start_datetime);
    return isAfter(start, new Date()) && isBefore(start, addDays(new Date(), 7));
  }).length;
  const totalPrograms = programs.length;
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

  // Weekly activity (schedules by day)
  const weekStart = startOfWeek(new Date(), { locale: he });
  const weekEnd = endOfWeek(new Date(), { locale: he });
  const daysOfWeek = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
  const weeklyActivityData = daysOfWeek.map((day, index) => {
    const dayDate = addDays(weekStart, index);
    const daySchedules = schedules.filter(s => {
      const scheduleDate = new Date(s.start_datetime);
      return format(scheduleDate, 'yyyy-MM-dd') === format(dayDate, 'yyyy-MM-dd');
    });
    return {
      name: day,
      value: daySchedules.length
    };
  });

  // Alerts (devices with issues)
  const alerts = devices
    .filter(d => d.is_disabled || d.status === "בתיקון" || d.status === "מושבת")
    .slice(0, 5);

  // Upcoming schedules
  const upcomingSchedulesList = schedules
    .filter(s => {
      const start = new Date(s.start_datetime);
      return isAfter(start, new Date());
    })
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
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
                    <p className="text-xs text-slate-500 mt-1">סה"כ כובל טווח</p>
                  </div>
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                    <Glasses className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("SchedulerPage")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-cyan-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">שיעורים הבא</p>
                    <p className="text-4xl font-bold text-slate-900">{upcomingSchedules}</p>
                    <p className="text-xs text-slate-500 mt-1">סטטוס סה"כ בוקרותואחת</p>
                  </div>
                  <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-cyan-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("Programs")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-r-4 border-r-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">מד ספר</p>
                    <p className="text-4xl font-bold text-slate-900">{totalPrograms}</p>
                    <p className="text-xs text-slate-500 mt-1">היה אחת מילולה</p>
                  </div>
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-purple-600" />
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
                    <p className="text-sm text-slate-600 mb-1">מסביב חקרקום</p>
                    <p className="text-4xl font-bold text-slate-900">{issuesCount}</p>
                    <p className="text-xs text-slate-500 mt-1">חיצוית חקר</p>
                  </div>
                  <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Device Status Pie Chart */}
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
                    <span className="text-sm text-slate-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Activity Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>פעילות שבועית</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyActivityData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <div key={device.id} className="flex items-start justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">משקפת {device.binocular_number} במצוקה</div>
                        <div className="text-sm text-slate-600 mt-1">
                          {device.disable_reason || "לא צוין סיבה"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {device.updated_date ? format(new Date(device.updated_date), 'dd/MM/yyyy HH:mm') : ''}
                        </div>
                      </div>
                      <Link to={createPageUrl(`GeneralInfo`)}>
                        <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                          צפייה
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  אין התרעות פעילות
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Schedules */}
          <Card>
            <CardHeader>
              <CardTitle>שיבוצים קרובים</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingSchedulesList.length > 0 ? (
                <div className="space-y-3">
                  {upcomingSchedulesList.map((schedule) => {
                    const program = programs.find(p => p.id === schedule.program_id);
                    const startDate = new Date(schedule.start_datetime);
                    
                    return (
                      <div key={schedule.id} className="flex items-start justify-between p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">
                            {program?.title || program?.course_topic || "תוכנית"}
                          </div>
                          <div className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {format(startDate, 'dd/MM/yyyy')} • {format(startDate, 'HH:mm')}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {(schedule.device_ids || []).length} משקפות משובצות
                          </div>
                        </div>
                        <Link to={createPageUrl("SchedulerPage")}>
                          <button className="text-cyan-600 hover:text-cyan-800 text-sm font-medium">
                            פרטים
                          </button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  אין שיבוצים קרובים
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}