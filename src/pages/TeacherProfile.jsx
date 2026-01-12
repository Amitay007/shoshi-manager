import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLoading } from "@/components/common/LoadingContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, MessageCircle, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import { startOfMonth, endOfMonth, format } from "date-fns";

// New Components
import TeacherPersonalTab from "@/components/teacher/TeacherPersonalTab";
import TeacherSalaryTab from "@/components/teacher/TeacherSalaryTab";
import TeacherJournalTab from "@/components/teacher/TeacherJournalTab";

export default function TeacherProfile() {
  const { showLoader, hideLoader } = useLoading();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teacher, setTeacher] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [reportedHours, setReportedHours] = useState([]);
  const [activeTab, setActiveTab] = useState("personal");

  // Payroll state (from existing logic)
  const [payrollDateRange, setPayrollDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  // Extract Teacher ID
  const searchParams = new URLSearchParams(location.search);
  const teacherId = searchParams.get("id");

  const loadData = async () => {
    if (!teacherId) return;
    showLoader();
    try {
      // 1. Fetch Teacher
      const teacherData = await base44.entities.Teacher.get(teacherId);
      setTeacher(teacherData);

      // 2. Fetch Schedules (for payroll/stats)
      const schedulesData = await base44.entities.ScheduleEntry.filter({
        assigned_teacher_id: teacherId
      }, { start_datetime: -1 }, 1000); // Fetch enough history
      setSchedules(schedulesData);

      // 3. Fetch Reported Hours (for payroll)
      const reportedHoursData = await base44.entities.ReportedHours.filter({
        teacher_id: teacherId
      }, { date: -1 }, 1000);
      setReportedHours(reportedHoursData);

    } catch (error) {
      console.error("Error loading teacher profile:", error);
      toast({ title: "שגיאה", description: "לא ניתן לטעון את נתוני המורה", variant: "destructive" });
    } finally {
      hideLoader();
    }
  };

  useEffect(() => {
    loadData();
  }, [teacherId]);

  const handleStatusToggle = async (currentStatus) => {
    if (!teacher) return;
    try {
      const newStatus = !currentStatus;
      await base44.entities.Teacher.update(teacher.id, { active: newStatus });
      setTeacher({ ...teacher, active: newStatus });
      toast({ title: "סטטוס עודכן", description: "המורה כעת " + (newStatus ? "פעיל" : "לא פעיל") });
    } catch (error) {
      toast({ title: "שגיאה", description: "עדכון הסטטוס נכשל", variant: "destructive" });
    }
  };

  // Check for alerts
  const hasPoliceAlert = useMemo(() => {
    if (!teacher) return false;
    const noFile = !teacher.police_clearance_url;
    const expired = teacher.police_clearance_expiry_date && new Date(teacher.police_clearance_expiry_date) < new Date();
    return noFile || expired;
  }, [teacher]);

  // Payroll Calculation Logic (Preserved from original)
  const payrollStats = useMemo(() => {
    // Defensive check: if teacher is not loaded yet
    if (!teacher) return { totalHours: 0, totalPayment: 0, details: { scheduleCount: 0, reportCount: 0 } };
    
    if (!schedules.length && !reportedHours.length) return { totalHours: 0, totalPayment: 0, details: { scheduleCount: 0, reportCount: 0 } };
    
    // Filter by date range
    const fromDate = payrollDateRange.from;
    const toDate = payrollDateRange.to;

    // Calculate from Schedules (Approved/Done)
    const relevantSchedules = schedules.filter(s => {
      const sDate = new Date(s.start_datetime);
      const inRange = sDate >= fromDate && sDate <= toDate;
      const isPayable = ["approved", "done"].includes(s.status);
      return inRange && isPayable;
    });

    const scheduleHours = relevantSchedules.reduce((acc, curr) => {
       // Estimate hours from start/end
       const start = new Date(curr.start_datetime);
       const end = new Date(curr.end_datetime);
       const hours = (end - start) / (1000 * 60 * 60);
       return acc + hours;
    }, 0);

    // Calculate from Reported Hours (Verified/Approved)
    const relevantReports = reportedHours.filter(r => {
      const rDate = new Date(r.date);
      const inRange = rDate >= fromDate && rDate <= toDate;
      const isPayable = ["approved", "verified"].includes(r.status);
      return inRange && isPayable;
    });

    const reportedHoursTotal = relevantReports.reduce((acc, curr) => acc + (curr.hours_amount || 0), 0);

    const totalHours = scheduleHours + reportedHoursTotal;
    const hourlyRate = teacher?.hourlyRate || 0;

    return {
      totalHours: totalHours.toFixed(2),
      totalPayment: (totalHours * hourlyRate).toFixed(2),
      details: { scheduleCount: relevantSchedules.length, reportCount: relevantReports.length }
    };
  }, [schedules, reportedHours, payrollDateRange, teacher]);


  if (!teacher) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-[var(--yoya-purple)]" />
        <h2 className="text-xl font-semibold">טוען פרופיל מורה...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <BackHomeButtons backTo="TeachersList" backLabel="חזרה לרשימה" showHomeButton={false} />
            
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{teacher?.name || "שם לא זמין"}</h1>
                {hasPoliceAlert && (
                  <div className="bg-red-100 text-red-600 p-1.5 rounded-full" title="חסר אישור משטרה או פג תוקף">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <Switch 
                  checked={teacher?.active || false} 
                  onCheckedChange={() => handleStatusToggle(teacher?.active)} 
                />
                <span className={`text-sm font-medium ${teacher?.active ? 'text-green-600' : 'text-gray-500'}`}>
                  {teacher?.active ? "פעיל" : "לא פעיל / בחופשה"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <a href={`tel:${teacher?.phone}`}>
              <Button variant="outline" size="icon" className="rounded-full bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100">
                <Phone className="w-5 h-5" />
              </Button>
            </a>
            <a href={`https://wa.me/${teacher?.phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="icon" className="rounded-full bg-green-50 text-green-600 border-green-200 hover:bg-green-100">
                <MessageCircle className="w-5 h-5" />
              </Button>
            </a>
            <a href={`mailto:${teacher?.email}`}>
              <Button variant="outline" size="icon" className="rounded-full bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100">
                <Mail className="w-5 h-5" />
              </Button>
            </a>
          </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          
          <TabsList className="w-full justify-start h-auto p-1 bg-white border rounded-lg overflow-x-auto flex-nowrap md:flex-wrap">
            <TabsTrigger value="personal" className="flex-1 min-w-[150px] py-3 text-base data-[state=active]:bg-[var(--yoya-light)] data-[state=active]:text-[var(--yoya-dark)]">
              מידע אישי ופרטי התקשרות
            </TabsTrigger>
            <TabsTrigger value="salary" className="flex-1 min-w-[150px] py-3 text-base data-[state=active]:bg-[var(--yoya-light)] data-[state=active]:text-[var(--yoya-dark)]">
              חישוב שכר
            </TabsTrigger>
            <TabsTrigger value="journal" className="flex-1 min-w-[150px] py-3 text-base data-[state=active]:bg-[var(--yoya-light)] data-[state=active]:text-[var(--yoya-dark)]">
              יומן מסע
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="focus-visible:outline-none">
            <TeacherPersonalTab teacher={teacher} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="salary" className="focus-visible:outline-none">
            <TeacherSalaryTab teacher={teacher} onUpdate={loadData}>
               {/* Reusing Payroll Logic Display */}
               <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-4 rounded-md">
                     <div>
                        <span className="text-sm text-gray-500 block">מתאריך</span>
                        <input 
                           type="date" 
                           className="border rounded px-2 py-1"
                           value={format(payrollDateRange.from, 'yyyy-MM-dd')}
                           onChange={(e) => setPayrollDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
                        />
                     </div>
                     <div>
                        <span className="text-sm text-gray-500 block">עד תאריך</span>
                        <input 
                           type="date" 
                           className="border rounded px-2 py-1"
                           value={format(payrollDateRange.to, 'yyyy-MM-dd')}
                           onChange={(e) => setPayrollDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
                        />
                     </div>
                     <div className="mr-auto text-left">
                        <div className="text-2xl font-bold text-[var(--yoya-dark)]">₪{payrollStats.totalPayment}</div>
                        <div className="text-sm text-gray-500">{payrollStats.totalHours} שעות סה"כ</div>
                     </div>
                  </div>
                  
                  {/* Detailed breakdown could go here if needed, keeping it simple for now as requested */}
                  <div className="text-sm text-gray-500 mt-2">
                     * מחושב לפי {payrollStats.details.scheduleCount} משמרות ו-{payrollStats.details.reportCount} דיווחים מאושרים.
                  </div>
               </div>
            </TeacherSalaryTab>
          </TabsContent>

          <TabsContent value="journal" className="focus-visible:outline-none">
            <TeacherJournalTab teacher={teacher} onUpdate={loadData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}