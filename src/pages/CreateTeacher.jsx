import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createPageUrl } from "@/utils";
import { UserPlus, ArrowRight, Save, Loader2, UserCheck } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useToast } from "@/components/ui/use-toast";
import { with429Retry } from "@/components/utils/retry";

export default function CreateTeacher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // זיהוי מצב עריכה
  const searchParams = new URLSearchParams(location.search);
  const editId = searchParams.get("id");
  const isEditMode = !!editId;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: { active: true, notes: "" }
  });

  useEffect(() => {
    if (isEditMode) {
      const loadTeacher = async () => {
        try {
          const data = await with429Retry(() => base44.entities.Teacher.get(editId));
          if (data) reset(data);
        } catch (error) {
          toast({ title: "שגיאה", description: "לא ניתן לטעון את פרטי העובד", variant: "destructive" });
        }
      };
      loadTeacher();
    }
  }, [isEditMode, editId, reset]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await with429Retry(() => base44.entities.Teacher.update(editId, data));
        toast({ title: "עודכן בהצלחה" });
      } else {
        await with429Retry(() => base44.entities.Teacher.create(data));
        toast({ title: "עובד נוצר בהצלחה" });
      }
      navigate(createPageUrl("TeachersList"));
    } catch (error) {
      toast({ title: "שגיאה בשמירה", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-100 text-cyan-600 rounded-xl flex items-center justify-center">
              {isEditMode ? <UserCheck /> : <UserPlus />}
            </div>
            <h1 className="text-3xl font-bold text-slate-900">{isEditMode ? "עריכת עובד" : "עובד חדש"}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}><ArrowRight className="ml-2 w-4 h-4" /> ביטול</Button>
            <BackHomeButtons showHomeButton={true} />
          </div>
        </div>

        <Card className="border-t-4 border-t-cyan-500 shadow-lg">
          <CardHeader><CardTitle>פרטי עובד</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>שם מלא *</Label>
                  <Input {...register("name", { required: "חובה" })} />
                </div>
                <div className="space-y-2">
                  <Label>תפקיד</Label>
                  <Input {...register("job_title")} />
                </div>
                <div className="space-y-2">
                  <Label>אימייל</Label>
                  <Input type="email" {...register("email")} />
                </div>
                <div className="space-y-2">
                  <Label>טלפון</Label>
                  <Input {...register("phone")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>הערות</Label>
                <Textarea {...register("notes")} className="min-h-[100px]" />
              </div>
              <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg border">
                <Switch checked={watch("active")} onCheckedChange={(v) => setValue("active", v)} />
                <Label>{watch("active") ? "עובד פעיל" : "לא פעיל"}</Label>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-700">
                  {isSubmitting ? <Loader2 className="animate-spin ml-2" /> : <Save className="ml-2" />}
                  שמור עובד
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}