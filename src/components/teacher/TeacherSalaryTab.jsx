import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";

export default function TeacherSalaryTab({ teacher, onUpdate }) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  
  // Stats State
  const [loadingStats, setLoadingStats] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [reportedHours, setReportedHours] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: {
      bank_name: teacher.bank_name || "",
      bank_branch: teacher.bank_branch || "",
      bank_account_number: teacher.bank_account_number || "",
    }
  });

  // Fetch Stats Only When Component Mounts or Date Range Changes
  const loadStats = async () => {
    if (!teacher.id) return;
    setLoadingStats(true);
    try {
      // Convert dates to ISO strings for filtering if needed, or just fetch all and filter client side if backend filtering is limited
      // Note: Base44 filter usually supports basic equality. Range queries might need client-side filtering if not supported directly efficiently.
      // To be safe and performant: Fetch records around the date range.
      
      // Fetching Schedules
      const schedulesData = await base44.entities.ScheduleEntry.filter({
        assigned_teacher_id: teacher.id
      }, { start_datetime: -1 }, 500); // Fetch last 500

      // Fetching Reports
      const reportedHoursData = await base44.entities.ReportedHours.filter({
        teacher_id: teacher.id
      }, { date: -1 }, 500); // Fetch last 500

      setSchedules(schedulesData);
      setReportedHours(reportedHoursData);
    } catch (error) {
      console.error("Error loading payroll stats:", error);
      toast({ title: "שגיאה בטעינת נתונים", description: "לא ניתן לטעון נתוני שכר", variant: "destructive" });
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [teacher.id]); // Reload when teacher changes, date filtering is client side for now to avoid complex queries

  const payrollStats = useMemo(() => {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    toDate.setHours(23, 59, 59, 999); // End of day

    // Filter Schedules
    const relevantSchedules = schedules.filter(s => {
      const sDate = new Date(s.start_datetime);
      const inRange = sDate >= fromDate && sDate <= toDate;
      const isPayable = ["approved", "done"].includes(s.status);
      return inRange && isPayable;
    });

    const scheduleHours = relevantSchedules.reduce((acc, curr) => {
       const start = new Date(curr.start_datetime);
       const end = new Date(curr.end_datetime);
       const hours = (end - start) / (1000 * 60 * 60);
       return acc + (hours > 0 ? hours : 0);
    }, 0);

    // Filter Reported Hours
    const relevantReports = reportedHours.filter(r => {
      const rDate = new Date(r.date);
      const inRange = rDate >= fromDate && rDate <= toDate;
      const isPayable = ["approved", "verified"].includes(r.status);
      return inRange && isPayable;
    });

    const reportedHoursTotal = relevantReports.reduce((acc, curr) => acc + (Number(curr.hours_amount) || 0), 0);

    const totalHours = scheduleHours + reportedHoursTotal;
    const hourlyRate = Number(teacher.hourlyRate) || 0;

    return {
      totalHours: totalHours.toFixed(2),
      totalPayment: (totalHours * hourlyRate).toFixed(2),
      details: { scheduleCount: relevantSchedules.length, reportCount: relevantReports.length }
    };
  }, [schedules, reportedHours, dateRange, teacher.hourlyRate]);

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      await base44.entities.Teacher.update(teacher.id, data);
      toast({ title: "נשמר בהצלחה", description: "פרטי הבנק עודכנו" });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving bank details:", error);
      toast({ title: "שגיאה", description: "לא ניתן לשמור את השינויים", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Bank Details Section */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 bg-white rounded-lg shadow-sm space-y-6">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">פרטי חשבון בנק</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="bank_name">שם הבנק</Label>
            <Input id="bank_name" {...register("bank_name")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bank_branch">מספר סניף</Label>
            <Input id="bank_branch" {...register("bank_branch")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bank_account_number">מספר חשבון</Label>
            <Input id="bank_account_number" {...register("bank_account_number")} />
          </div>
        </div>

        {isDirty && (
          <div className="flex justify-end">
             <Button type="submit" disabled={isSaving} className="bg-[var(--yoya-purple)] hover:bg-[var(--yoya-dark)]">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              שמור פרטי בנק
            </Button>
          </div>
        )}
      </form>

      {/* Stats Section - Self Contained */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-800">יומן שעות ושכר</h3>
          <Button variant="ghost" size="sm" onClick={loadStats} disabled={loadingStats}>
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-4 rounded-md">
             <div>
                <span className="text-sm text-gray-500 block">מתאריך</span>
                <input 
                   type="date" 
                   className="border rounded px-2 py-1"
                   value={dateRange.from}
                   onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                />
             </div>
             <div>
                <span className="text-sm text-gray-500 block">עד תאריך</span>
                <input 
                   type="date" 
                   className="border rounded px-2 py-1"
                   value={dateRange.to}
                   onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                />
             </div>
             <div className="mr-auto text-left">
                {loadingStats ? (
                  <div className="flex items-center text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin mr-2" /> מחשב...</div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-[var(--yoya-dark)]">₪{payrollStats.totalPayment}</div>
                    <div className="text-sm text-gray-500">{payrollStats.totalHours} שעות סה"כ</div>
                  </>
                )}
             </div>
          </div>
          
          <div className="text-sm text-gray-500 mt-2">
             * מחושב לפי {payrollStats.details.scheduleCount} משמרות ו-{payrollStats.details.reportCount} דיווחים מאושרים.
          </div>
        </div>
      </div>
    </div>
  );
}