import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";

export default function TeacherJournalTab({ teacher, onUpdate }) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: {
      internal_notes: teacher.internal_notes || "",
    }
  });

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      await base44.entities.Teacher.update(teacher.id, data);
      toast({ title: "נשמר בהצלחה", description: "יומן המסע עודכן" });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving journal:", error);
      toast({ title: "שגיאה", description: "לא ניתן לשמור את השינויים", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 h-full flex flex-col">
      <div className="bg-white rounded-lg shadow-sm p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h3 className="text-xl font-semibold text-gray-800">יומן מסע</h3>
          <p className="text-sm text-gray-500">תיעוד והערות פנימיות למעקב</p>
        </div>
        
        <div className="flex-1 flex flex-col gap-2">
          <Label htmlFor="internal_notes" className="sr-only">תוכן היומן</Label>
          <Textarea 
            id="internal_notes" 
            {...register("internal_notes")} 
            className="flex-1 min-h-[400px] resize-none text-base leading-relaxed p-4"
            placeholder="כתוב כאן תיעוד, הערות, ונקודות חשובות למעקב..."
          />
        </div>
      </div>

      {isDirty && (
        <div className="fixed bottom-6 left-6 z-50">
          <Button type="submit" size="lg" disabled={isSaving} className="shadow-xl bg-[var(--yoya-purple)] hover:bg-[var(--yoya-dark)] text-white rounded-full px-8 h-14 text-lg">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            שמור יומן
          </Button>
        </div>
      )}
    </form>
  );
}