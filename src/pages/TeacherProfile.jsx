import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { DollarSign, Clock, TrendingUp, Pencil, User, Calendar } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useLoading } from "@/components/common/LoadingContext";

export default function TeacherProfile() {
  const { teacherId } = useParams();
  const [teacher, setTeacher] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditRate, setShowEditRate] = useState(false);
  const [newHourlyRate, setNewHourlyRate] = useState(0);

  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    loadData();
  }, [teacherId]);

  const loadData = async () => {
    showLoader();
    setLoading(true);
    try {
      // Load teacher data
      const teachers = await base44.entities.Teacher.list();
      const teacherData = teachers.find(t => t.id === teacherId);
      
      if (!teacherData) {
        toast({ title: "שגיאה", description: "מורה לא נמצא", variant: "destructive" });
        return;
      }

      setTeacher(teacherData);
      setNewHourlyRate(teacherData.hourlyRate || 0);

      // Mock shifts data for this teacher (current month)
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
          program_name: "מבוא ל-VR - כיתה ז'",
          duration: 6,
          status: "הסתיים"
        },
        {
          id: "2",
          teacher_id: teacherId,
          date: "2026-01-05",
          start_time: "09:00",
          end_time: "15:30",
          program_name: "סדנת מציאות רבודה",
          duration: 6.5,
          status: "הסתיים"
        },
        {
          id: "3",
          teacher_id: teacherId,
          date: "2026-01-02",
          start_time: "08:30",
          end_time: "13:30",
          program_name: "גיאוגרפיה במציאות מדומה",
          duration: 5,
          status: "הסתיים"
        },
        {
          id: "4",
          teacher_id: teacherId,
          date: "2026-01-06",
          start_time: "10:00",
          end_time: "16:00",
          program_name: "חקר החלל ב-3D",
          duration: 6,
          status: "הסתיים"
        }
      ].filter(shift => {
        const shiftDate = new Date(shift.date);
        return shiftDate.getMonth() === currentMonth && 
               shiftDate.getFullYear() === currentYear &&
               shiftDate <= today;
      });

      setShifts(mockShifts);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "שגיאה", description: "לא הצלחנו לטעון את הנתונים", variant: "destructive" });
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const stats = useMemo(() => {
    const totalHours = shifts.reduce((sum, shift) => sum + shift.duration, 0);
    const hourlyRate = teacher?.hourlyRate || 0;
    const totalEarned = totalHours * hourlyRate;
    
    return { totalHours, hourlyRate, totalEarned };
  }, [shifts, teacher]);

  const sortedShifts = useMemo(() => {
    return [...shifts].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [shifts]);

  const handleUpdateRate = async () => {
    try {
      await base44.entities.Teacher.update(teacherId, { hourlyRate: parseFloat(newHourlyRate) });
      setTeacher({ ...teacher, hourlyRate: parseFloat(newHourlyRate) });
      setShowEditRate(false);
      toast({ title: "הצלחה", description: "שכר שעתי עודכן בהצלחה" });
    } catch (error) {
      toast({ title: "שגיאה", description: "לא הצלחנו לעדכן את השכר", variant: "destructive" });
    }
  };

  const getDayName = (dateStr) => {
    const date = new Date(dateStr);
    const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    return days[date.getDay()];
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  if (loading || !teacher) {
    return <div className="p-8 text-center">טוען נתונים...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4 lg:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-purple-500 to-cyan-500 text-white">
                {teacher.name?.charAt(0) || "M"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">{teacher.name}</h1>
              <div className="flex items-center gap-2 text-slate-600 mt-1">
                <User className="w-4 h-4" />
                <span>מדריך VR</span>
              </div>
            </div>
          </div>
          <BackHomeButtons backTo="CRMHub" backLabel="חזור לרשימת מורים" />
        </div>

        {/* Payroll Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  שכר שעתי
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-green-200"
                  onClick={() => setShowEditRate(true)}
                >
                  <Pencil className="w-4 h-4" />
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
              <p className="text-sm text-blue-600 mt-1">שעות החודש</p>
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
              <div className="text-4xl font-bold text-purple-900">₪{stats.totalEarned.toLocaleString()}</div>
              <p className="text-sm text-purple-600 mt-1">החודש</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-slate-700" />
              רשימת משמרות מפורטת
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedShifts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">אין משמרות להצגה</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">תאריך</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">שעות</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">שם תוכנית</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">משך</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">רווח</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedShifts.map((shift) => {
                      const earnings = shift.duration * stats.hourlyRate;
                      return (
                        <tr key={shift.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{formatDate(shift.date)}</div>
                            <div className="text-xs text-slate-500">{getDayName(shift.date)}</div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {shift.start_time} - {shift.end_time}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                              {shift.program_name}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {shift.duration} שעות
                          </td>
                          <td className="py-3 px-4 font-bold text-green-600">
                            ₪{earnings.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan="3" className="py-3 px-4 text-right">סה"כ</td>
                      <td className="py-3 px-4">{stats.totalHours} שעות</td>
                      <td className="py-3 px-4 text-green-600">₪{stats.totalEarned.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
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
              <Label>שכר שעתי (₪)</Label>
              <Input
                type="number"
                value={newHourlyRate}
                onChange={(e) => setNewHourlyRate(e.target.value)}
                placeholder="0"
                min="0"
                step="0.5"
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