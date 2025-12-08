import React, { useState, useEffect, useMemo } from "react";
import { ScheduleEntry } from "@/entities/ScheduleEntry";
import { Syllabus } from "@/entities/Syllabus";
import { VRDevice } from "@/entities/VRDevice";
import { Teacher } from "@/entities/Teacher";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { Calendar, Clock, MapPin, Glasses, User, School, ListChecks, Plus } from "lucide-react";
import { with429Retry } from "@/components/utils/retry";
import { format, isFuture } from "date-fns";
import { he } from "date-fns/locale";

export default function ActiveSchedulesSummary() {
  const [schedules, setSchedules] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("active"); // "active" | "upcoming" | "all"

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allSchedules, allPrograms, allDevices, allTeachers, allInstitutions] = await Promise.all([
        with429Retry(() => ScheduleEntry.list()),
        with429Retry(() => Syllabus.list()),
        with429Retry(() => VRDevice.list()),
        with429Retry(() => Teacher.list()),
        with429Retry(() => EducationInstitution.list())
      ]);
      
      setSchedules(allSchedules || []);
      setPrograms(allPrograms || []);
      setDevices(allDevices || []);
      setTeachers(allTeachers || []);
      setInstitutions(allInstitutions || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const programById = useMemo(() => 
    Object.fromEntries((programs || []).map(p => [p.id, p])), 
    [programs]
  );
  
  const deviceById = useMemo(() => 
    Object.fromEntries((devices || []).map(d => [d.id, d])), 
    [devices]
  );
  
  const teacherById = useMemo(() => 
    Object.fromEntries((teachers || []).map(t => [t.id, t])), 
    [teachers]
  );
  
  const institutionById = useMemo(() => 
    Object.fromEntries((institutions || []).map(i => [i.id, i])), 
    [institutions]
  );

  // Filter schedules based on view mode
  const filteredSchedules = useMemo(() => {
    const now = new Date();
    
    return (schedules || []).filter(s => {
      const endTime = new Date(s.end_datetime);
      const startTime = new Date(s.start_datetime);
      
      if (viewMode === "active") {
        // Active: currently happening or soon to happen (within 7 days), not cancelled
        return s.status !== "בוטל" && isFuture(endTime);
      } else if (viewMode === "upcoming") {
        // Upcoming: scheduled in the future, not started yet
        return isFuture(startTime) && s.status === "מתוכנן";
      } else {
        // All active schedules (not cancelled, not ended)
        return s.status !== "בוטל" && s.status !== "הסתיים";
      }
    });
  }, [schedules, viewMode]);

  // Group schedules by program
  const schedulesByProgram = useMemo(() => {
    const grouped = {};
    
    filteredSchedules.forEach(schedule => {
      const programId = schedule.program_id;
      if (!grouped[programId]) {
        grouped[programId] = [];
      }
      grouped[programId].push(schedule);
    });
    
    // Sort schedules within each program by start time
    Object.keys(grouped).forEach(programId => {
      grouped[programId].sort((a, b) => 
        new Date(a.start_datetime) - new Date(b.start_datetime)
      );
    });
    
    return grouped;
  }, [filteredSchedules]);

  const getStatusColor = (status) => {
    switch (status) {
      case "מתוכנן": return "bg-blue-100 text-blue-800";
      case "פעיל": return "bg-green-100 text-green-800";
      case "הסתיים": return "bg-gray-100 text-gray-600";
      case "בוטל": return "bg-red-100 text-red-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  if (loading) {
    return <div className="p-8 text-center" dir="rtl">טוען נתונים...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-purple-900 flex items-center gap-3">
              <ListChecks className="w-8 h-8" />
              שיבוצים פעילים - סיכום לפי תוכניות
            </h1>
            <p className="text-slate-600 mt-1">סקירה מרוכזת של כל השיבוצים הפעילים והעתידיים</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl(`SchedulerPage`)}>
              <Button className="gap-2 bg-cyan-600 hover:bg-cyan-700">
                <Calendar className="w-4 h-4" />
                לוח זמנים מלא
              </Button>
            </Link>
            <BackHomeButtons />
          </div>
        </div>

        {/* View Mode Toggle */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">תצוגה:</span>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "active" ? "default" : "outline"}
                  onClick={() => setViewMode("active")}
                  size="sm"
                >
                  פעילים ועתידיים
                </Button>
                <Button
                  variant={viewMode === "upcoming" ? "default" : "outline"}
                  onClick={() => setViewMode("upcoming")}
                  size="sm"
                >
                  מתוכננים בלבד
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  onClick={() => setViewMode("all")}
                  size="sm"
                >
                  הכל
                </Button>
              </div>
              <div className="mr-auto text-sm text-slate-600">
                סה"כ: {filteredSchedules.length} שיבוצים | {Object.keys(schedulesByProgram).length} תוכניות
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Programs List */}
        {Object.keys(schedulesByProgram).length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ListChecks className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">אין שיבוצים פעילים להצגה</p>
              <Link to={createPageUrl(`SchedulerPage`)}>
                <Button className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  צור שיבוץ חדש
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(schedulesByProgram).map(([programId, programSchedules]) => {
              const program = programById[programId];
              const programTitle = program?.title || program?.course_topic || "תוכנית ללא שם";
              const institution = program?.school_id ? institutionById[program.school_id] : null;

              return (
                <Card key={programId} className="shadow-lg border-0 overflow-hidden">
                  {/* Program Header */}
                  <div className="h-2 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600"></div>
                  
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl text-purple-900 mb-2">
                          {programTitle}
                        </CardTitle>
                        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                          {program?.teacher_name && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {program.teacher_name}
                            </div>
                          )}
                          {institution && (
                            <div className="flex items-center gap-1">
                              <School className="w-4 h-4" />
                              {institution.name}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {programSchedules.length} מפגשים
                          </div>
                        </div>
                      </div>
                      <Link to={createPageUrl(`ProgramView?id=${programId}`)}>
                        <Button variant="outline" size="sm">
                          צפה בתוכנית
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {programSchedules.map(schedule => {
                        const startDate = new Date(schedule.start_datetime);
                        const endDate = new Date(schedule.end_datetime);
                        const teacher = schedule.assigned_teacher_id ? teacherById[schedule.assigned_teacher_id] : null;
                        const deviceCount = (schedule.device_ids || []).length;

                        return (
                          <div 
                            key={schedule.id}
                            className="border-r-4 border-purple-400 bg-white rounded-lg p-4 hover:shadow-md transition-all"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-bold text-purple-900">
                                  {format(startDate, 'd MMMM yyyy', { locale: he })}
                                </div>
                                <Badge className={getStatusColor(schedule.status)}>
                                  {schedule.status}
                                </Badge>
                              </div>
                              <Link to={createPageUrl(`SchedulerPage`)}>
                                <Button variant="ghost" size="sm">
                                  ערוך
                                </Button>
                              </Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-cyan-600" />
                                <span>{format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}</span>
                              </div>

                              {schedule.custom_location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-emerald-600" />
                                  <span>{schedule.custom_location}</span>
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <Glasses className="w-4 h-4 text-purple-600" />
                                <span>{deviceCount} משקפות</span>
                              </div>

                              {teacher && (
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-indigo-600" />
                                  <span>{teacher.name}</span>
                                </div>
                              )}
                            </div>

                            {schedule.notes && (
                              <div className="mt-3 pt-3 border-t text-sm text-slate-500">
                                <span className="font-medium">הערות:</span> {schedule.notes}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}