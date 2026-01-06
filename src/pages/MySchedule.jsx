import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Navigation, CheckCircle, AlertCircle } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useLoading } from "@/components/common/LoadingContext";
import { with429Retry } from "@/components/utils/retry";
import { format, isToday, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

export default function MySchedule() {
  const [shifts, setShifts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const { showLoader, hideLoader } = useLoading();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    showLoader();
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const [shiftsData, schoolsData, programsData] = await Promise.all([
        with429Retry(() => base44.entities.ScheduleEntry.list()),
        with429Retry(() => base44.entities.EducationInstitution.list()),
        with429Retry(() => base44.entities.Syllabus.list())
      ]);

      // Filter shifts for current user
      const myShifts = (shiftsData || []).filter(shift => 
        shift.assigned_teacher_id === user.teacher_id || 
        shift.created_by === user.email
      );

      setShifts(myShifts);
      setSchools(schoolsData || []);
      setPrograms(programsData || []);
    } catch (error) {
      console.error("Error loading schedule:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את המשמרות",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const handleConfirmArrival = async (shiftId) => {
    try {
      await with429Retry(() => 
        base44.entities.ScheduleEntry.update(shiftId, { confirmed: true })
      );
      
      setShifts(shifts.map(s => 
        s.id === shiftId ? { ...s, confirmed: true } : s
      ));

      toast({
        title: "✅ אושר!",
        description: "ההגעה למשמרת אושרה בהצלחה"
      });
    } catch (error) {
      console.error("Error confirming shift:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לאשר את ההגעה",
        variant: "destructive"
      });
    }
  };

  const handleNavigate = (address) => {
    if (!address) {
      toast({
        title: "שגיאה",
        description: "אין כתובת זמינה לניווט",
        variant: "destructive"
      });
      return;
    }
    
    const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
    window.open(wazeUrl, '_blank');
  };

  const handleCall = (phone) => {
    if (!phone) {
      toast({
        title: "שגיאה",
        description: "אין מספר טלפון זמין",
        variant: "destructive"
      });
      return;
    }
    
    window.location.href = `tel:${phone}`;
  };

  const sortedShifts = [...shifts].sort((a, b) => 
    new Date(a.start_datetime) - new Date(b.start_datetime)
  );

  const getDayName = (date) => {
    const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    return days[date.getDay()];
  };

  const formatShiftTime = (startDatetime, endDatetime) => {
    const start = parseISO(startDatetime);
    const end = parseISO(endDatetime);
    
    const dayName = getDayName(start);
    const dateStr = format(start, "dd/MM");
    const timeStart = format(start, "HH:mm");
    const timeEnd = format(end, "HH:mm");
    
    return {
      dayName,
      dateStr,
      timeRange: `${timeStart} - ${timeEnd}`
    };
  };

  if (loading) {
    return <div className="p-8 text-center">טוען משמרות...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4 lg:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">המשמרות שלי</h1>
            <p className="text-slate-600 mt-1">ניהול משמרות והגעות</p>
          </div>
          <BackHomeButtons backTo="HoursReport" backLabel="חזור לדוח שעות" />
        </div>

        {/* Shifts List */}
        {sortedShifts.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">אין משמרות קרובות</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedShifts.map((shift) => {
              const school = schools.find(s => s.id === shift.institution_id);
              const program = programs.find(p => p.id === shift.program_id);
              const { dayName, dateStr, timeRange } = formatShiftTime(shift.start_datetime, shift.end_datetime);
              const isTodayShift = isToday(parseISO(shift.start_datetime));
              const isConfirmed = shift.confirmed === true;

              return (
                <Card 
                  key={shift.id} 
                  className={`shadow-lg hover:shadow-xl transition-all ${
                    isTodayShift ? 'border-4 border-purple-400 bg-purple-50/30' : 'bg-white'
                  }`}
                >
                  {/* Header */}
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-700">{dateStr.split('/')[0]}</div>
                          <div className="text-xs text-slate-500">{dateStr.split('/')[1]}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{dayName}</div>
                          <div className="text-sm text-slate-600 flex items-center gap-1">
                            🕐 {timeRange}
                          </div>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <Badge 
                        className={
                          isConfirmed 
                            ? "bg-green-100 text-green-700 flex items-center gap-1" 
                            : "bg-yellow-100 text-yellow-700 flex items-center gap-1"
                        }
                      >
                        {isConfirmed ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            מאושר
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            ממתין לאישור
                          </>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>

                  {/* Body */}
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        {school?.name || "מוסד לא צוין"}
                      </div>
                      {program && (
                        <div className="text-sm text-purple-600 font-medium mt-1">
                          📚 {program.title || program.course_topic || "תוכנית ללא שם"}
                        </div>
                      )}
                      {shift.learning_space && (
                        <div className="text-xs text-slate-500 mt-1">
                          📍 {shift.learning_space}
                        </div>
                      )}
                    </div>

                    {shift.notes && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                        💡 {shift.notes}
                      </div>
                    )}
                  </CardContent>

                  {/* Action Bar */}
                  <div className="border-t border-slate-100 p-4">
                    <div className="flex flex-col gap-2">
                      {/* Confirm Button - Full Width if not confirmed */}
                      {!isConfirmed && (
                        <Button
                          onClick={() => handleConfirmArrival(shift.id)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold gap-2 cursor-pointer z-10"
                        >
                          <CheckCircle className="w-5 h-5" />
                          אשר הגעה למשמרת
                        </Button>
                      )}

                      {/* Secondary Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handleNavigate(school?.address || shift.custom_location)}
                          variant="outline"
                          className="gap-2 cursor-pointer"
                        >
                          <Navigation className="w-4 h-4" />
                          ניווט (Waze)
                        </Button>
                        <Button
                          onClick={() => handleCall(school?.phone)}
                          variant="outline"
                          className="gap-2 cursor-pointer"
                        >
                          <Phone className="w-4 h-4" />
                          התקשר לבית הספר
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}