import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";

export default function TeacherSalaryTab({ teacher, onUpdate, children }) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: {
      bank_name: teacher.bank_name || "",
      bank_branch: teacher.bank_branch || "",
      bank_account_number: teacher.bank_account_number || "",
    }
  });

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

      {/* Existing Hours/Salary Log (Passed as children from parent to reuse logic) */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-4 mb-4">יומן שעות ושכר</h3>
        {children}
      </div>
    </div>
  );
}