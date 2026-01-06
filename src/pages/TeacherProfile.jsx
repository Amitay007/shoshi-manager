import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { DollarSign, Clock, TrendingUp, Edit, Calendar, BookOpen, ArrowRight } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useLoading } from "@/components/common/LoadingContext";
import { with429Retry } from "@/components/utils/retry";

export default function TeacherProfile() {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditRate, setShowEditRate] = useState(false);
  const [newRate, setNewRate] = useState("");

  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    loadData();
  }, [teacherId]);

  const loadData = async () => {
    if (!teacherId) {
      toast({ title: "שגיאה", description: "מזהה מורה חסר", variant: "destructive" });
      return;
    }

    showLoader();
    setLoading(true);
    try {
      const [teacherData, scheduleData, syllabusData] = await Promise.all([
        with429Retry(() => base44.entities.Teacher.list()),
        with429Retry(() => base44.entities.ScheduleEntry.list()),
        with429Retry(() => base44.entities.Syllabus.list())
      ]);

      const selectedTeacher = teacherData.find(t => t.id === teacherId);
      if (!selectedTeacher) {
        toast({ title: "שגיאה", description: "מורה לא נמצא", variant: "destructive" });
        navigate(-1);
        return;
      }

      setTeacher(selectedTeacher);
      setNewRate(selectedTeacher.hourly_rate || 0);

      // Mock shifts for this teacher (current month, completed)
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      const mockShifts = [
        {
          id: "1",
          teacher_id: teacherId,
          date: "2026-01-03",
          start_time: "08:00",
          end_time: "14:00",
          duration: 6,
          program_id: syllabusData?.[0]?.id || "prog1",
          program_name: syllabusData?.[0]?.title || "סדנת VR מתקדמת",
          status: "הסתיים"
        },
        {
          id: "2",
          teacher_id: teacherId,
          date: "2026-01-05",
          start_time: "09:00",
          end_time: "15:30",
          duration: 6.5,
          program_id: syllabusData?.[1]?.id || "prog2",
          program_name: syllabusData?.[1]?.title || "הכרת מציאות מדומה",
          status: "הסתיים"
        },
        {
          id: "3",
          teacher_id: teacherId,
          date: "2026-01-02",
          start_time: "08:30",
          end_time: "13:30",
          duration: 5,
          program_id: syllabusData?.[2]?.id || "prog3",
          program_name: syllabusData?.[2]?.title || "שיעור גיאוגרפיה בVR",
          status: "הסתיים"
        },
        {
          id: "4",
          teacher_id: teacherId,
          date: "2026-01-04",
          start_time: "10:00",
          end_time: "16:00",
          duration: 6,
          program_id: syllabusData?.[3]?.id || "prog4",
          program_name: syllabusData?.[3]?.title || "מסע בחלל",
          status: "הסתיים"
        }
      ].filter(shift => {
        const shiftDate = new Date(shift.date);
        return shiftDate.getMonth() === currentMonth && 
               shiftDate.getFullYear() === currentYear &&
               shiftDate <= today;
      });

      setShifts(mockShifts);
      setPrograms(syllabusData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את הנתונים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const stats = useMemo(() => {
    const hourlyRate = teacher?.hourly_rate || 0;
    const totalHours = shifts.reduce((sum, shift) => sum + shift.duration, 0);
    const earnedSoFar = totalHours * hourlyRate;
    
    return { hourlyRate, totalHours, earnedSoFar };
  }, [shifts, teacher]);

  const sortedShifts = useMemo(() => {
    return [...shifts].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [shifts]);

  const handleUpdateRate = async () => {
    try {
      await with429Retry(() => base44.entities.Teacher.update(teacherId, { hourly_rate: parseFloat(newRate) }));
      setTeacher({ ...teacher, hourly_rate: parseFloat(newRate) });
      setShowEditRate(false);
      toast({ title: "הצלחה", description: "שכר שעתי עודכן בהצלחה" });
      loadData();
    } catch (error) {
      toast({ title: "שגיאה", description: "לא הצלחנו לעדכן את השכר", variant: "destructive" });
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name[0];
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  if (loading) {
    return <div className="p-8 text-center">טוען נתונים...</div>;
  }

  if (!teacher) {
    return <div className="p-8 text-center">מורה לא נמצא</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4 lg:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 bg-gradient-to-br from-purple-500 to-cyan-500">
              <AvatarFallback className="text-white text-2xl font-bold">
                {getInitials(teacher.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">{teacher.name}</h1>
              <p className="text-slate-600">{teacher.role || "מדריך VR"}</p>
              {teacher.email && <p className="text-sm text-slate-500">{teacher.email}</p>}
            </div>
          </div>
          <BackHomeButtons backTo="CRMHub" backLabel="חזור למרכז ניהול" />
        </div>

        {/* Payroll Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  שכר לשעה
                </span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowEditRate(true)}
                >
                  <Edit className="w-4 h-4 text-green-600" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-900">₪{stats.hourlyRate}</div>
              <p className="text-sm text-green-600 mt-1">לשעה</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                שעות שבוצעו
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-900">{stats.totalHours}</div>
              <p className="text-sm text-blue-600 mt-1">החודש</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                רווח עד כה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-900">₪{stats.earnedSoFar.toFixed(0)}</div>
              <p className="text-sm text-purple-600 mt-1">החודש</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Shifts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              לוג משמרות מפורט
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedShifts.length === 0 ? (
              <p className="text-center text-slate-500 py-8">אין משמרות לחודש זה</p>
            ) : (
              <div className="space-y-3">
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b-2 border-slate-200">
                      <tr className="text-right">
                        <th className="py-3 px-4 font-semibold text-slate-700">תאריך</th>
                        <th className="py-3 px-4 font-semibold text-slate-700">שעות</th>
                        <th className="py-3 px-4 font-semibold text-slate-700">שם תוכנית</th>
                        <th className="py-3 px-4 font-semibold text-slate-700">משך</th>
                        <th className="py-3 px-4 font-semibold text-slate-700">רווח</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedShifts.map((shift) => {
                        const earnings = shift.duration * stats.hourlyRate;
                        return (
                          <tr key={shift.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 font-medium">{formatDate(shift.date)}</td>
                            <td className="py-3 px-4 text-slate-600">{shift.start_time} - {shift.end_time}</td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 text-purple-600 font-medium">
                                <BookOpen className="w-4 h-4" />
                                {shift.program_name}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700">{shift.duration} שעות</td>
                            <td className="py-3 px-4 font-bold text-green-700">₪{earnings.toFixed(0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                      <tr>
                        <td colSpan="3" className="py-3 px-4 font-bold text-slate-900">סה"כ</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{stats.totalHours} שעות</td>
                        <td className="py-3 px-4 font-bold text-green-700 text-lg">₪{stats.earnedSoFar.toFixed(0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {sortedShifts.map((shift) => {
                    const earnings = shift.duration * stats.hourlyRate;
                    return (
                      <Card key={shift.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-bold text-lg">{formatDate(shift.date)}</div>
                              <div className="text-sm text-slate-600">{shift.start_time} - {shift.end_time}</div>
                            </div>
                            <div className="text-left">
                              <div className="text-sm text-slate-600">{shift.duration} שעות</div>
                              <div className="text-lg font-bold text-green-700">₪{earnings.toFixed(0)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-purple-600 font-medium text-sm">
                            <BookOpen className="w-4 h-4" />
                            {shift.program_name}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  <Card className="bg-slate-100">
                    <CardContent className="p-4 flex justify-between items-center">
                      <span className="font-bold text-slate-900">סה"כ החודש:</span>
                      <div className="text-left">
                        <div className="text-sm text-slate-700">{stats.totalHours} שעות</div>
                        <div className="text-xl font-bold text-green-700">₪{stats.earnedSoFar.toFixed(0)}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Hourly Rate Dialog */}
      <Dialog open={showEditRate} onOpenChange={setShowEditRate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>עריכת שכר שעתי</DialogTitle>
            <DialogDescription>עדכן את שכר השעה של {teacher.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שכר לשעה (₪)</Label>
              <Input
                type="number"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="80"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditRate(false)}>ביטול</Button>
            <Button onClick={handleUpdateRate}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}