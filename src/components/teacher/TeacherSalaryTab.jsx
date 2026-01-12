import React, { useState, useMemo } from "react";
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
  // Removed heavy data fetching for performance optimization
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

  // Cosmetic Placeholder Stats (No actual data fetching)
  const payrollStats = useMemo(() => {
    return {
      totalHours: "0.00",
      totalPayment: "0.00",
      details: { scheduleCount: 0, reportCount: 0 }
    };
  }, []);

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

      {/* Stats Section - Cosmetic Only */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-800">יומן שעות ושכר (תצוגה בלבד)</h3>
          <Button variant="ghost" size="sm" disabled={true} className="opacity-50 cursor-not-allowed">
            <RefreshCw className="w-4 h-4" />
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
                <div className="text-2xl font-bold text-[var(--yoya-dark)]">₪{payrollStats.totalPayment}</div>
                <div className="text-sm text-gray-500">{payrollStats.totalHours} שעות סה"כ</div>
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