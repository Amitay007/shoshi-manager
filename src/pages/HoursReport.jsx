import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Clock, Calendar, AlertCircle, Plus, Minus, CheckCircle, HourglassIcon, LogIn, LogOut } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useLoading } from "@/components/common/LoadingContext";

export default function HoursReport() {
  const [currentUser, setCurrentUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportAbsence, setShowReportAbsence] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  
  // Clock In/Out State
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [programName, setProgramName] = useState("");

  const [newAbsence, setNewAbsence] = useState({
    date: "",
    type: "מחלה",
    notes: ""
  });

  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    loadData();
    
    // Load clock state from localStorage
    const savedClockedIn = localStorage.getItem('isClockedIn') === 'true';
    const savedClockInTime = localStorage.getItem('clockInTime');
    
    if (savedClockedIn && savedClockInTime) {
      setIsClockedIn(true);
      setClockInTime(new Date(savedClockInTime));
    }
  }, []);

  // Timer for elapsed time
  useEffect(() => {
    let interval;
    if (isClockedIn && clockInTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - clockInTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isClockedIn, clockInTime]);

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
          status: "מאושר",
          program_name: "סדנת VR מתקדמת"
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
          status: "ממתין לאישור",
          program_name: "הכרת מציאות מדומה"
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
          status: "מאושר",
          program_name: "שיעור גיאוגרפיה בVR"
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
          status: "ממתין לאישור",
          program_name: "מסע בחלל"
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

  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleClockIn = () => {
    const now = new Date();
    setIsClockedIn(true);
    setClockInTime(now);
    setElapsedTime(0);
    
    localStorage.setItem('isClockedIn', 'true');
    localStorage.setItem('clockInTime', now.toISOString());
    
    toast({ title: "כניסה נרשמה", description: "המערכת מתחילה לספור את הזמן" });
  };

  const handleClockOutRequest = () => {
    setShowClockOutModal(true);
  };

  const handleClockOutConfirm = () => {
    if (!programName.trim()) {
      toast({ title: "שגיאה", description: "נא להזין שם תוכנית", variant: "destructive" });
      return;
    }

    const now = new Date();
    const duration = (now - clockInTime) / (1000 * 60 * 60); // hours
    
    const shift = {
      id: Date.now().toString(),
      user_id: currentUser.id,
      date: clockInTime.toISOString().split('T')[0],
      start_time: clockInTime.toTimeString().slice(0, 5),
      end_time: now.toTimeString().slice(0, 5),
      school_id: schools[0]?.id || "",
      school_name: schools[0]?.name || "מיקום לא צוין",
      duration: parseFloat(duration.toFixed(2)),
      status: "ממתין לאישור",
      program_name: programName
    };

    setShifts([...shifts, shift]);
    
    // Reset clock state
    setIsClockedIn(false);
    setClockInTime(null);
    setElapsedTime(0);
    setProgramName("");
    setShowClockOutModal(false);
    
    localStorage.removeItem('isClockedIn');
    localStorage.removeItem('clockInTime');
    
    toast({ title: "יציאה נרשמה", description: "המשמרת נשמרה בהצלחה" });
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

        {/* Clock In/Out Toggle Button */}
        <div className="flex flex-col gap-3">
          {!isClockedIn ? (
            <Button 
              onClick={handleClockIn}
              className="w-full h-20 text-2xl font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg cursor-pointer z-10"
            >
              <LogIn className="w-8 h-8 ml-3" />
              🟢 כניסה לעבודה
            </Button>
          ) : (
            <Button 
              onClick={handleClockOutRequest}
              className="w-full h-20 text-2xl font-bold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg cursor-pointer z-10"
            >
              <LogOut className="w-8 h-8 ml-3" />
              🔴 יציאה מעבודה
              <span className="mr-4 font-mono">{formatElapsedTime(elapsedTime)}</span>
            </Button>
          )}
          
          <Button 
            onClick={() => setShowReportAbsence(true)}
            variant="outline"
            className="gap-2 cursor-pointer"
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

                    {/* Center: School, Hours & Program */}
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{shift.school_name}</div>
                      <div className="text-sm text-slate-600">{shift.start_time} - {shift.end_time}</div>
                      {shift.program_name && (
                        <div className="text-xs text-purple-600 font-medium mt-1">📚 {shift.program_name}</div>
                      )}
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

      {/* Clock Out Modal - Program Name */}
      <Dialog open={showClockOutModal} onOpenChange={setShowClockOutModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>סיום משמרת</DialogTitle>
            <DialogDescription>נא להזין את שם התוכנית/שיעור שלימדת</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם התוכנית / נושא השיעור *</Label>
              <Input
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="לדוגמה: סדנת VR מתקדמת"
                autoFocus
              />
            </div>
            <div className="bg-slate-100 p-3 rounded-lg text-sm">
              <p className="font-semibold text-slate-700">פרטי המשמרת:</p>
              <p className="text-slate-600">זמן כניסה: {clockInTime?.toLocaleTimeString('he-IL')}</p>
              <p className="text-slate-600">משך: {formatElapsedTime(elapsedTime)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClockOutModal(false)} className="cursor-pointer">ביטול</Button>
            <Button onClick={handleClockOutConfirm} className="cursor-pointer">שמור וסיים משמרת</Button>
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
            <Button variant="outline" onClick={() => setShowReportAbsence(false)} className="cursor-pointer">ביטול</Button>
            <Button onClick={handleSaveAbsence} className="cursor-pointer">שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}