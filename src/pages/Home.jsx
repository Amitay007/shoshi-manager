import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Glasses, Calendar, School, AlertCircle, TrendingUp, Users, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VRDevice } from "@/entities/VRDevice";
import { ScheduleEntry } from "@/entities/ScheduleEntry";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { Syllabus } from "@/entities/Syllabus";
import { format } from "date-fns";

export default function Home() {
  const [devices, setDevices] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [devicesData, schedulesData, schoolsData, programsData] = await Promise.all([
        VRDevice.list(),
        ScheduleEntry.list(),
        EducationInstitution.list(),
        Syllabus.list()
      ]);
      
      setDevices(devicesData || []);
      setSchedules(schedulesData || []);
      setSchools(schoolsData || []);
      setPrograms(programsData || []);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setIsLoading(false);
  };

  // Calculate statistics
  const availableDevices = devices.filter(d => !d.is_disabled && d.status !== "בתיקון").length;
  const thisWeekSchedules = schedules.filter(s => {
    const start = new Date(s.start_datetime);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return start >= now && start <= weekFromNow;
  }).length;
  const activePrograms = programs.filter(p => p.status !== "draft").length;
  const educationalCenters = schools.length;

  // Upcoming schedules
  const upcomingSchedules = schedules
    .filter(s => new Date(s.start_datetime) > new Date() && s.status !== "בוטל")
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, 3);

  // Device status for pie chart
  const activeDevicesCount = devices.filter(d => !d.is_disabled && d.status !== "בתיקון").length;
  const maintenanceDevicesCount = devices.filter(d => d.status === "בתיקון" || d.status === "בתחזוקה").length;
  const disabledDevicesCount = devices.filter(d => d.is_disabled).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900 mb-2">טוען נתונים...</div>
          <div className="text-slate-500">אנא המתן</div>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, link }) => (
    <Link to={link}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer border-t-4" style={{ borderTopColor: color }}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-2">{title}</p>
              <p className="text-4xl font-bold text-slate-900">{value}</p>
            </div>
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
              <Icon className="w-8 h-8" style={{ color }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">דאשבורד</h1>
          <p className="text-slate-600 mt-2">מידע כללי על Yoya VR Education מערכת ניהול VR</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="משקפות זמינות" 
            value={availableDevices} 
            icon={Glasses}
            color="#00d4ff"
            link={createPageUrl("GeneralInfo")}
          />
          <StatCard 
            title="שיעורים השבוע" 
            value={thisWeekSchedules} 
            icon={Calendar}
            color="#00d4ff"
            link={createPageUrl("SchedulerPage")}
          />
          <StatCard 
            title="כיתות VR" 
            value={activePrograms} 
            icon={Users}
            color="#9f7aea"
            link={createPageUrl("Programs")}
          />
          <StatCard 
            title="מרכזי חינוכיים" 
            value={educationalCenters} 
            icon={School}
            color="#10b981"
            link={createPageUrl("Schools")}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-600" />
                פעילות שבועית
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-around gap-2">
                {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map((day, index) => {
                  const height = Math.floor(Math.random() * 60) + 40;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t-lg hover:from-cyan-600 hover:to-cyan-500 transition-all cursor-pointer"
                        style={{ height: `${height}%` }}
                      />
                      <p className="text-xs text-slate-600 mt-2">{day}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Device Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Glasses className="w-5 h-5 text-cyan-600" />
                סטטוס מכשירים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64">
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {/* Active devices - cyan */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#00d4ff"
                      strokeWidth="20"
                      strokeDasharray={`${(activeDevicesCount / devices.length) * 251.2} 251.2`}
                    />
                    {/* Maintenance - orange */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="20"
                      strokeDasharray={`${(maintenanceDevicesCount / devices.length) * 251.2} 251.2`}
                      strokeDashoffset={-((activeDevicesCount / devices.length) * 251.2)}
                    />
                    {/* Disabled - gray */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="20"
                      strokeDasharray={`${(disabledDevicesCount / devices.length) * 251.2} 251.2`}
                      strokeDashoffset={-(((activeDevicesCount + maintenanceDevicesCount) / devices.length) * 251.2)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-slate-900">{devices.length}</p>
                      <p className="text-sm text-slate-600">סה״כ</p>
                    </div>
                  </div>
                </div>
                <div className="mr-8 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-cyan-500" />
                    <span className="text-sm text-slate-700">פעילים ({activeDevicesCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-500" />
                    <span className="text-sm text-slate-700">בתחזוקה ({maintenanceDevicesCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-slate-400" />
                    <span className="text-sm text-slate-700">לא זמינים ({disabledDevicesCount})</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Classes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-600" />
                שיעורים קרובים
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingSchedules.length > 0 ? (
                <div className="space-y-3">
                  {upcomingSchedules.map((schedule) => {
                    const program = programs.find(p => p.id === schedule.program_id);
                    return (
                      <Link 
                        key={schedule.id}
                        to={createPageUrl("SchedulerPage")}
                        className="block p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-slate-900">
                            {program?.title || program?.course_topic || "תוכנית"}
                          </p>
                          <Badge className="bg-cyan-100 text-cyan-800">
                            {schedule.status || "מתוכנן"}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          {format(new Date(schedule.start_datetime), 'dd/MM/yyyy HH:mm')}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {schedule.learning_space || "מיקום לא צוין"}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>אין שיעורים קרובים</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-cyan-600" />
                התראות מהמערכת
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {maintenanceDevicesCount > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900">משקפת VR לתחזוקה</p>
                      <p className="text-sm text-orange-700">{maintenanceDevicesCount} מכשירים בתחזוקה</p>
                    </div>
                  </div>
                )}
                {disabledDevicesCount > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">משקפת VR מושבתת</p>
                      <p className="text-sm text-red-700">{disabledDevicesCount} מכשירים מושבתים</p>
                    </div>
                  </div>
                )}
                {maintenanceDevicesCount === 0 && disabledDevicesCount === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>אין התראות פעילות</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}