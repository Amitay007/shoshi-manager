import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { DollarSign, Clock, TrendingUp, Pencil, User, Calendar, FileText, Upload, Trash2, Save } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useLoading } from "@/components/common/LoadingContext";
import { with429Retry } from "@/components/utils/retry";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function TeacherProfile() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const teacherId = searchParams.get("teacherId");

  const [teacher, setTeacher] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Personal Details State
  const [editMode, setEditMode] = useState(false);
  const [personalData, setPersonalData] = useState({
    start_work_date: "",
    end_work_date: "",
    job_title: "",
    hourlyRate: 0,
    cv_url: "",
    notes: "",
    management_notes: ""
  });

  // Date Range for Payroll
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to: format(endOfMonth(new Date()), "yyyy-MM-dd")
  });

  // Edit/Delete Shift Dialogs
  const [showEditShift, setShowEditShift] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    date: "",
    start_time: "",
    end_time: "",
    program_name: ""
  });

  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    loadData();
  }, [teacherId]);

  const loadData = async () => {
    if (!teacherId) return;

    showLoader();
    setLoading(true);
    try {
      const teachersData = await with429Retry(() => base44.entities.Teacher.list());
      const selectedTeacher = teachersData.find(t => t.id === teacherId);
      
      if (!selectedTeacher) {
        toast({ title: "שגיאה", description: "מורה לא נמצא", variant: "destructive" });
        return;
      }

      setTeacher(selectedTeacher);
      setPersonalData({
        start_work_date: selectedTeacher.start_work_date || "",
        end_work_date: selectedTeacher.end_work_date || "",
        job_title: selectedTeacher.job_title || "",
        hourlyRate: selectedTeacher.hourlyRate || 0,
        cv_url: selectedTeacher.cv_url || "",
        notes: selectedTeacher.notes || "",
        management_notes: selectedTeacher.management_notes || ""
      });

      // Fetch Real Shifts (ScheduleEntry + ReportedHours)
      let scheduleEntries = [];
      let reportedHours = [];
      
      try {
        const results = await Promise.allSettled([
            with429Retry(() => base44.entities.ScheduleEntry.list()),
            with429Retry(() => base44.entities.ReportedHours.list())
        ]);
        
        scheduleEntries = results[0].status === 'fulfilled' ? results[0].value : [];
        reportedHours = results[1].status === 'fulfilled' ? results[1].value : [];
        
        if (results[1].status === 'rejected') {
            console.warn("Failed to fetch ReportedHours", results[1].reason);
        }
      } catch (err) {
        console.error("Critical error fetching shifts", err);
      }

      // Process Schedule Entries
      const processedSchedule = (scheduleEntries || [])
        .filter(entry => entry.assigned_teacher_id === teacherId && entry.status !== 'cancelled')
        .map(entry => {
          const start = new Date(entry.start_datetime);
          const end = new Date(entry.end_datetime);
          const duration = (end - start) / (1000 * 60 * 60);
          
          return {
            id: entry.id,
            type: 'schedule',
            date: format(start, 'yyyy-MM-dd'),
            start_time: format(start, 'HH:mm'),
            end_time: format(end, 'HH:mm'),
            program_name: 'שיבוץ מערכת', // Ideally fetch program name
            duration: parseFloat(duration.toFixed(2)),
            status: entry.status,
            employee_verified: entry.employee_verified,
            notes: entry.notes
          };
        });

      // Process Reported Hours
      const processedReports = (reportedHours || [])
        .filter(report => report.teacher_id === teacherId)
        .map(report => ({
          id: report.id,
          type: 'manual',
          date: report.date,
          start_time: '-',
          end_time: '-',
          program_name: report.description || 'דיווח ידני',
          duration: report.hours_amount,
          status: report.status,
          employee_verified: report.employee_verified,
          is_manual: true
        }));

      setShifts([...processedSchedule, ...processedReports]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "שגיאה", description: "לא הצלחנו לטעון את הנתונים", variant: "destructive" });
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const handleSavePersonalData = async () => {
    try {
      await with429Retry(() => base44.entities.Teacher.update(teacherId, personalData));
      setTeacher({ ...teacher, ...personalData });
      setEditMode(false);
      toast({ title: "הצלחה", description: "הפרטים האישיים נשמרו בהצלחה" });
    } catch (error) {
      toast({ title: "שגיאה", description: "לא הצלחנו לשמור את הפרטים", variant: "destructive" });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showLoader();
      const { file_url } = await with429Retry(() => base44.integrations.Core.UploadFile({ file }));
      setPersonalData({ ...personalData, cv_url: file_url });
      toast({ title: "הצלחה", description: "הקובץ הועלה בהצלחה" });
    } catch (error) {
      toast({ title: "שגיאה", description: "לא הצלחנו להעלות את הקובץ", variant: "destructive" });
    } finally {
      hideLoader();
    }
  };

  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      return shiftDate >= fromDate && shiftDate <= toDate;
    });
  }, [shifts, dateRange]);

  const payrollStats = useMemo(() => {
    const totalHours = filteredShifts.reduce((sum, shift) => sum + shift.duration, 0);
    const hourlyRate = personalData.hourlyRate || 0;
    const totalToPay = totalHours * hourlyRate;
    
    return { totalHours, totalToPay, hourlyRate };
  }, [filteredShifts, personalData.hourlyRate]);

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      program_name: shift.program_name
    });
    setShowEditShift(true);
  };

  const handleSaveShift = () => {
    const start = new Date(`2000-01-01T${shiftForm.start_time}`);
    const end = new Date(`2000-01-01T${shiftForm.end_time}`);
    const duration = (end - start) / (1000 * 60 * 60);

    const updatedShift = {
      ...editingShift,
      date: shiftForm.date,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
      program_name: shiftForm.program_name,
      duration: parseFloat(duration.toFixed(2))
    };

    setShifts(shifts.map(s => s.id === editingShift.id ? updatedShift : s));
    setShowEditShift(false);
    setEditingShift(null);
    toast({ title: "הצלחה", description: "המשמרת עודכנה בהצלחה" });
  };

  const handleDeleteShift = (shiftId) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק משמרת זו?")) return;
    
    setShifts(shifts.filter(s => s.id !== shiftId));
    toast({ title: "הצלחה", description: "המשמרת נמחקה בהצלחה" });
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
    return (
        <div className="p-8 text-center bg-slate-50 min-h-screen flex flex-col items-center justify-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">מורה לא נמצא</h2>
            <p className="text-slate-600 mb-4">לא ניתן להציג את פרטי המורה. ייתכן שהמורה נמחק או שהמזהה שגוי.</p>
            <BackHomeButtons backTo="TeachersList" backLabel="חזור לרשימה" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 bg-gradient-to-br from-purple-500 to-cyan-500 shadow-lg">
              <AvatarFallback className="text-white text-2xl font-bold">
                {getInitials(teacher.name)}
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
          <BackHomeButtons backTo="TeachersList" backLabel="חזור לרשימת מורים" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="personal" dir="rtl">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="personal" className="gap-2">
              <User className="w-4 h-4" />
              פרטים אישיים (משאבי אנוש)
            </TabsTrigger>
            <TabsTrigger value="payroll" className="gap-2">
              <DollarSign className="w-4 h-4" />
              יומן שעות ושכר
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Personal Details */}
          <TabsContent value="personal">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <User className="w-6 h-6 text-purple-600" />
                    פרטים אישיים
                  </CardTitle>
                  {!editMode ? (
                    <Button onClick={() => setEditMode(true)} className="gap-2">
                      <Pencil className="w-4 h-4" />
                      עריכה
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => {
                        setEditMode(false);
                        setPersonalData({
                          start_work_date: teacher.start_work_date || "",
                          end_work_date: teacher.end_work_date || "",
                          job_title: teacher.job_title || "",
                          hourlyRate: teacher.hourlyRate || 0,
                          cv_url: teacher.cv_url || "",
                          notes: teacher.notes || "",
                          management_notes: teacher.management_notes || ""
                        });
                      }}>
                        ביטול
                      </Button>
                      <Button onClick={handleSavePersonalData} className="gap-2 bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4" />
                        שמור
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Profile Section */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-cyan-50 rounded-lg">
                  <Avatar className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500">
                    <AvatarFallback className="text-white text-xl font-bold">
                      {getInitials(teacher.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{teacher.name}</h2>
                    <p className="text-slate-600">מדריך VR ומומחה מציאות מדומה</p>
                  </div>
                </div>

                {/* HR Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Job Title */}
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      תפקיד
                    </Label>
                    <Input
                      type="text"
                      value={personalData.job_title}
                      onChange={(e) => setPersonalData({ ...personalData, job_title: e.target.value })}
                      disabled={!editMode}
                      className={!editMode ? "bg-slate-50" : ""}
                      placeholder="לדוגמה: מדריך בכיר"
                    />
                  </div>

                  {/* Hourly Wage */}
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      שכר שעתי (₪)
                    </Label>
                    <Input
                      type="number"
                      value={personalData.hourlyRate}
                      onChange={(e) => setPersonalData({ ...personalData, hourlyRate: parseFloat(e.target.value) || 0 })}
                      disabled={!editMode}
                      className={!editMode ? "bg-slate-50" : ""}
                      placeholder="0"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      תאריך תחילת עבודה
                    </Label>
                    <Input
                      type="date"
                      value={personalData.start_work_date}
                      onChange={(e) => setPersonalData({ ...personalData, start_work_date: e.target.value })}
                      disabled={!editMode}
                      className={!editMode ? "bg-slate-50" : ""}
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-red-600" />
                      תאריך סיום עבודה
                    </Label>
                    <Input
                      type="date"
                      value={personalData.end_work_date}
                      onChange={(e) => setPersonalData({ ...personalData, end_work_date: e.target.value })}
                      disabled={!editMode}
                      className={!editMode ? "bg-slate-50" : ""}
                    />
                  </div>

                  {/* CV / Documents */}
                  <div className="md:col-span-2">
                    <Label className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-orange-600" />
                      קורות חיים / מסמכים
                    </Label>
                    <div className="flex gap-2">
                      {personalData.cv_url ? (
                        <>
                          <Input
                            value={personalData.cv_url}
                            disabled
                            className="flex-1 bg-slate-50"
                          />
                          <Button
                            variant="outline"
                            onClick={() => window.open(personalData.cv_url, '_blank')}
                            className="gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            צפה
                          </Button>
                          {editMode && (
                            <Button
                              variant="destructive"
                              onClick={() => setPersonalData({ ...personalData, cv_url: "" })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Input
                            type="file"
                            onChange={handleFileUpload}
                            disabled={!editMode}
                            className="flex-1"
                            accept=".pdf,.doc,.docx"
                          />
                          <Button
                            variant="outline"
                            onClick={() => document.querySelector('input[type="file"]').click()}
                            disabled={!editMode}
                            className="gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            העלה
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Follow-up Log (Management Notes) */}
                  <div className="md:col-span-2">
                    <Label className="mb-2 flex items-center gap-2 text-amber-700 font-bold">
                       <FileText className="w-4 h-4" />
                       יומן מעקב / הערות מנהל (פרטי)
                    </Label>
                    <Textarea
                      value={personalData.management_notes}
                      onChange={(e) => setPersonalData({ ...personalData, management_notes: e.target.value })}
                      disabled={!editMode}
                      className={!editMode ? "bg-amber-50 border-amber-200" : "border-amber-400 focus:ring-amber-400"}
                      placeholder="תיעוד שיחות, סיכומי פגישות ומידע רגיש..."
                      rows={6}
                    />
                  </div>

                  {/* General Notes */}
                  <div className="md:col-span-2">
                    <Label className="mb-2 block">הערות כלליות</Label>
                    <Textarea
                      value={personalData.notes}
                      onChange={(e) => setPersonalData({ ...personalData, notes: e.target.value })}
                      disabled={!editMode}
                      className={!editMode ? "bg-slate-50" : ""}
                      placeholder="הערות כלליות..."
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Hours & Payroll */}
          <TabsContent value="payroll">
            <div className="space-y-6">
              
              {/* Date Range Picker */}
              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <Label>מתאריך</Label>
                      <Input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                      />
                    </div>
                    <div className="flex-1">
                      <Label>עד תאריך</Label>
                      <Input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={() => setDateRange({
                        from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
                        to: format(endOfMonth(new Date()), "yyyy-MM-dd")
                      })}
                      variant="outline"
                    >
                      החודש הנוכחי
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      סה"כ שעות עבודה
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-blue-900">{payrollStats.totalHours}</div>
                    <p className="text-sm text-blue-600 mt-1">שעות</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      שכר שעתי
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-green-900">₪{payrollStats.hourlyRate}</div>
                    <p className="text-sm text-green-600 mt-1">לשעה</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      סה"כ לתשלום
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-purple-900">₪{payrollStats.totalToPay.toFixed(0)}</div>
                    <p className="text-sm text-purple-600 mt-1">לתקופה זו</p>
                  </CardContent>
                </Card>
              </div>

              {/* Employee Updates Button */}
              <div className="flex justify-end mb-4">
                  <Dialog>
                    <DialogTrigger asChild>
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                            <TrendingUp className="w-4 h-4" />
                            שעות שדווחו/בוטלו ע"י העובד
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>עדכוני שעות מהעובד</DialogTitle>
                            <DialogDescription>
                                רשימת שעות שהוזנו ידנית או סומנו כ"נדחה" ע"י העובד
                            </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="p-2 text-right">תאריך</th>
                                        <th className="p-2 text-right">סוג</th>
                                        <th className="p-2 text-right">תיאור</th>
                                        <th className="p-2 text-right">שעות</th>
                                        <th className="p-2 text-right">סטטוס</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shifts.filter(s => s.is_manual || s.employee_verified === 'rejected').map(shift => (
                                        <tr key={shift.id} className="border-b">
                                            <td className="p-2">{formatDate(shift.date)}</td>
                                            <td className="p-2">
                                                {shift.is_manual ? 
                                                    <span className="text-blue-600 font-bold">הוספה ידנית</span> : 
                                                    <span className="text-red-600 font-bold">דיווח ביטול</span>
                                                }
                                            </td>
                                            <td className="p-2">{shift.program_name}</td>
                                            <td className="p-2 font-bold">{shift.duration}</td>
                                            <td className="p-2">
                                                {shift.is_manual ? 'ממתין' : 'נדחה ע"י עובד'}
                                            </td>
                                        </tr>
                                    ))}
                                    {shifts.filter(s => s.is_manual || s.employee_verified === 'rejected').length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-4 text-center text-slate-500">אין דיווחים חריגים</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </DialogContent>
                  </Dialog>
              </div>

              {/* Payroll Table */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    יומן משמרות מפורט
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredShifts.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">אין משמרות לטווח תאריכים זה</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b-2 border-slate-200">
                          <tr className="text-right">
                            <th className="py-3 px-4 font-semibold text-slate-700">תאריך</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">שעות</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">תיאור/תוכנית</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">משך</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">אישור עובד</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">הרוויח (₪)</th>
                            <th className="py-3 px-4 font-semibold text-slate-700">פעולות</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredShifts.map((shift) => {
                            const earned = shift.duration * payrollStats.hourlyRate;
                            return (
                              <tr key={shift.id} className={`border-b border-slate-100 hover:bg-slate-50 ${shift.is_manual ? 'bg-blue-50/30' : ''}`}>
                                <td className="py-3 px-4 font-medium">{formatDate(shift.date)}</td>
                                <td className="py-3 px-4 text-slate-600">
                                    {shift.start_time !== '-' ? `${shift.start_time} - ${shift.end_time}` : '-'}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`inline-block px-3 py-1 rounded-full text-sm ${shift.is_manual ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                    {shift.program_name}
                                  </span>
                                  {shift.is_manual && <span className="mr-2 text-xs text-blue-600">(ידני)</span>}
                                </td>
                                <td className="py-3 px-4 text-slate-700 font-bold">{shift.duration} שעות</td>
                                <td className="py-3 px-4">
                                    {shift.employee_verified === 'verified' && <span className="text-green-600 font-bold">✓ אושר</span>}
                                    {shift.employee_verified === 'rejected' && <span className="text-red-600 font-bold">✕ נדחה</span>}
                                    {shift.employee_verified === 'pending' && <span className="text-slate-400">-</span>}
                                </td>
                                <td className="py-3 px-4 font-bold text-green-600">₪{earned.toFixed(0)}</td>
                                <td className="py-3 px-4">
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeleteShift(shift.id)}
                                      title="מחק רשומה"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                          <tr>
                            <td colSpan="4" className="py-3 px-4 font-bold text-slate-900">סה"כ</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{payrollStats.totalHours} שעות</td>
                            <td className="py-3 px-4 font-bold text-green-700 text-lg">₪{payrollStats.totalToPay.toFixed(0)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Shift Dialog */}
      <Dialog open={showEditShift} onOpenChange={setShowEditShift}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>עריכת משמרת</DialogTitle>
            <DialogDescription>ערוך את פרטי המשמרת</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>תאריך</Label>
              <Input
                type="date"
                value={shiftForm.date}
                onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>שעת התחלה</Label>
                <Input
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>שעת סיום</Label>
                <Input
                  type="time"
                  value={shiftForm.end_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>שם התוכנית</Label>
              <Input
                value={shiftForm.program_name}
                onChange={(e) => setShiftForm({ ...shiftForm, program_name: e.target.value })}
                placeholder="למשל: סדנת VR מתקדמת"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditShift(false)}>ביטול</Button>
            <Button onClick={handleSaveShift}>שמור שינויים</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}