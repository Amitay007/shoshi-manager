import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Clock, Calendar, AlertCircle, Plus, Minus, CheckCircle, HourglassIcon } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useLoading } from "@/components/common/LoadingContext";

export default function HoursReport() {
  const [currentUser, setCurrentUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportShift, setShowReportShift] = useState(false);
  const [showReportAbsence, setShowReportAbsence] = useState(false);
  
  const [newShift, setNewShift] = useState({
    date: "",
    start_time: "",
    end_time: "",
    school_id: "",
    status: "ממתין לאישור"
  });

  const [newAbsence, setNewAbsence] = useState({
    date: "",
    type: "מחלה",
    notes: ""
  });

  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    showLoader();
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const [schoolsData] = await Promise.all([
        base44.entities.EducationInstitution.list()
      ]);
      
      setSchools(schoolsData || []);

      // Mock data for current month - Past shifts only
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      const mockShifts = [
        {
          id: "1",
          user_id: user.id,
          date: "2026-01-03",
          start_time: "08:00",
          end_time: "14:00",
          school_id: schoolsData?.[0]?.id || "school1",
          school_name: schoolsData?.[0]?.name || "בי\"ס יעלים",
          duration: 6,
          status: "מאושר"
        },
        {
          id: "2",
          user_id: user.id,
          date: "2026-01-05",
          start_time: "09:00",
          end_time: "15:30",
          school_id: schoolsData?.[1]?.id || "school2",
          school_name: schoolsData?.[1]?.name || "בי\"ס הדסים",
          duration: 6.5,
          status: "ממתין לאישור"
        },
        {
          id: "3",
          user_id: user.id,
          date: "2026-01-02",
          start_time: "08:30",
          end_time: "13:30",
          school_id: schoolsData?.[0]?.id || "school1",
          school_name: schoolsData?.[0]?.name || "בי\"ס יעלים",
          duration: 5,
          status: "מאושר"
        },
        {
          id: "4",
          user_id: user.id,
          date: "2026-01-06",
          start_time: "10:00",
          end_time: "16:00",
          school_id: schoolsData?.[2]?.id || "school3",
          school_name: schoolsData?.[2]?.name || "בי\"ס רימון",
          duration: 6,
          status: "ממתין לאישור"
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
    const approvedShifts = shifts.filter(s => s.status === "מאושר");
    const totalHours = approvedShifts.reduce((sum, shift) => sum + shift.duration, 0);
    const daysWorked = new Set(approvedShifts.map(s => s.date)).size;
    const pendingApproval = shifts.filter(s => s.status === "ממתין לאישור").length;
    
    return { totalHours, daysWorked, pendingApproval };
  }, [shifts]);

  const sortedShifts = useMemo(() => {
    return [...shifts].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [shifts]);

  const handleSaveShift = async () => {
    // Calculate duration
    const start = new Date(`2000-01-01T${newShift.start_time}`);
    const end = new Date(`2000-01-01T${newShift.end_time}`);
    const duration = (end - start) / (1000 * 60 * 60);

    const school = schools.find(s => s.id === newShift.school_id);
    
    const shift = {
      id: Date.now().toString(),
      user_id: currentUser.id,
      date: newShift.date,
      start_time: newShift.start_time,
      end_time: newShift.end_time,
      school_id: newShift.school_id,
      school_name: school?.name || "לא צוין",
      duration: duration,
      status: newShift.status
    };

    setShifts([...shifts, shift]);
    setShowReportShift(false);
    setNewShift({ date: "", start_time: "", end_time: "", school_id: "", status: "ממתין לאישור" });
    
    toast({ title: "הצלחה", description: "המשמרת נוספה בהצלחה" });
  };

  const handleSaveAbsence = async () => {
    toast({ title: "הצלחה", description: `היעדרות (${newAbsence.type}) דווחה בהצלחה` });
    setShowReportAbsence(false);
    setNewAbsence({ date: "", type: "מחלה", notes: "" });
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

  if (loading) {
    return <div className="p-8 text-center">טוען נתונים...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4 lg:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
              שלום, {currentUser?.full_name || "משתמש"}
            </h1>
            <p className="text-slate-600">דוח שעות - ינואר 2026</p>
          </div>
          <BackHomeButtons backTo="Humanmanagement" backLabel="חזור למרכז יחסי אנוש" />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                סה"כ שעות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-900">{stats.totalHours}</div>
              <p className="text-sm text-purple-600 mt-1">שעות מאושרות</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                ימים שעבד
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-900">{stats.daysWorked}</div>
              <p className="text-sm text-blue-600 mt-1">ימי עבודה</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                ממתין לאישור
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-900">{stats.pendingApproval}</div>
              <p className="text-sm text-orange-600 mt-1">משמרות</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button 
            onClick={() => setShowReportShift(true)}
            className="flex-1 lg:flex-none gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-5 h-5" />
            דווח משמרת
          </Button>
          <Button 
            onClick={() => setShowReportAbsence(true)}
            variant="outline"
            className="flex-1 lg:flex-none gap-2"
          >
            <Minus className="w-5 h-5" />
            דווח היעדרות
          </Button>
        </div>

        {/* Shifts History */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">היסטוריית משמרות</h2>
          
          {sortedShifts.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-500">אין משמרות לחודש זה</p>
            </Card>
          ) : (
            sortedShifts.map((shift) => (
              <Card key={shift.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Date & Day */}
                    <div className="flex flex-col items-center min-w-[60px]">
                      <div className="text-2xl font-bold text-slate-900">{formatDate(shift.date)}</div>
                      <div className="text-xs text-slate-500">{getDayName(shift.date)}</div>
                    </div>

                    {/* Center: School & Hours */}
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{shift.school_name}</div>
                      <div className="text-sm text-slate-600">{shift.start_time} - {shift.end_time}</div>
                    </div>

                    {/* Right: Duration & Status */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-lg font-bold text-purple-600">{shift.duration} שעות</div>
                      <div>
                        {shift.status === "מאושר" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            מאושר
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                            <HourglassIcon className="w-3 h-3" />
                            ממתין
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Report Shift Dialog */}
      <Dialog open={showReportShift} onOpenChange={setShowReportShift}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>דיווח משמרת חדשה</DialogTitle>
            <DialogDescription>מלא את פרטי המשמרת</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>תאריך</Label>
              <Input
                type="date"
                value={newShift.date}
                onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>שעת התחלה</Label>
                <Input
                  type="time"
                  value={newShift.start_time}
                  onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>שעת סיום</Label>
                <Input
                  type="time"
                  value={newShift.end_time}
                  onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>בית ספר / מיקום</Label>
              <Select
                value={newShift.school_id}
                onValueChange={(value) => setNewShift({ ...newShift, school_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר בית ספר" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>סטטוס</Label>
              <Select
                value={newShift.status}
                onValueChange={(value) => setNewShift({ ...newShift, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ממתין לאישור">ממתין לאישור</SelectItem>
                  <SelectItem value="מאושר">מאושר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportShift(false)}>ביטול</Button>
            <Button onClick={handleSaveShift}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Absence Dialog */}
      <Dialog open={showReportAbsence} onOpenChange={setShowReportAbsence}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>דיווח היעדרות</DialogTitle>
            <DialogDescription>דווח על מחלה או חופשה</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>תאריך</Label>
              <Input
                type="date"
                value={newAbsence.date}
                onChange={(e) => setNewAbsence({ ...newAbsence, date: e.target.value })}
              />
            </div>
            <div>
              <Label>סוג היעדרות</Label>
              <Select
                value={newAbsence.type}
                onValueChange={(value) => setNewAbsence({ ...newAbsence, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="מחלה">מחלה</SelectItem>
                  <SelectItem value="חופשה">חופשה</SelectItem>
                  <SelectItem value="מילואים">מילואים</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>הערות</Label>
              <Input
                value={newAbsence.notes}
                onChange={(e) => setNewAbsence({ ...newAbsence, notes: e.target.value })}
                placeholder="הערות נוספות..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportAbsence(false)}>ביטול</Button>
            <Button onClick={handleSaveAbsence}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}