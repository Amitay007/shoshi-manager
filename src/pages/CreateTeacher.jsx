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
  
  // זיהוי האם מדובר בעריכה לפי ה-ID בכתובת
  const searchParams = new URLSearchParams(location.search);
  const teacherId = searchParams.get("id");
  const isEditMode = !!teacherId;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      active: true,
      notes: ""
    }
  });

  // טעינת נתונים אם אנחנו במצב עריכה
  useEffect(() => {
    if (isEditMode) {
      const fetchTeacher = async () => {
        try {
          const data = await with429Retry(() => base44.entities.Teacher.get(teacherId));
          if (data) {
            reset(data);
          }
        } catch (error) {
          console.error("Error fetching teacher:", error);
          toast({ title: "שגיאה", description: "לא הצלחנו לטעון את נתוני העובד", variant: "destructive" });
        }
      };
      fetchTeacher();
    }
  }, [isEditMode, teacherId, reset]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await with429Retry(() => base44.entities.Teacher.update(teacherId, data));
        toast({ title: "העדכון בוצע", description: "פרטי העובד עודכנו בהצלחה" });
      } else {
        await with429Retry(() => base44.entities.Teacher.create(data));
        toast({ title: "עובד נוצר", description: "העובד החדש נוסף למערכת" });
      }
      navigate(createPageUrl("TeachersList"));
    } catch (error) {
      console.error("Error saving teacher:", error);
      toast({ title: "שגיאה בשמירה", description: "אירעה שגיאה בעת שמירת הנתונים", variant: "destructive" });
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
              {isEditMode ? <UserCheck className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{isEditMode ? "עריכת עובד" : "עובד חדש"}</h1>
              <p className="text-slate-500">{isEditMode ? `מעדכן את הפרטים של ${watch("name")}` : "הקמת כרטיס עובד במערכת"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <ArrowRight className="w-4 h-4" /> ביטול
            </Button>
            <BackHomeButtons showHomeButton={true} backLabel="" className="w-auto" />
          </div>
        </div>

        <Card className="border-t-4 border-t-cyan-500 shadow-lg">
          <CardHeader>
            <CardTitle>פרטי עובד</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">שם מלא *</Label>
                  <Input 
                    id="name" 
                    {...register("name", { required: "שם מלא הוא שדה חובה" })} 
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job_title">תפקיד</Label>
                  <Input id="job_title" {...register("job_title")} placeholder="לדוגמה: מדריך VR" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">אימייל</Label>
                  <Input id="email" type="email" {...register("email")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">טלפון</Label>
                  <Input id="phone" {...register("phone")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">כתובת</Label>
                <Input id="address" {...register("address")} placeholder="רחוב, מספר, עיר" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">הערות כלליות</Label>
                <Textarea 
                   id="notes" 
                   {...register("notes")} 
                   placeholder="מידע נוסף, כישורים מיוחדים וכו'..."
                   className="min-h-[100px]" 
                />
              </div>

              <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <Switch
                  id="active"
                  checked={watch("active")}
                  onCheckedChange={(checked) => setValue("active", checked)}
                />
                <Label htmlFor="active" className="cursor-pointer">
                   {watch("active") ? "עובד פעיל במערכת" : "עובד לא פעיל (ארכיון)"}
                </Label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-700 min-w-[120px]">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  {isEditMode ? "עדכן פרטים" : "שמור עובד"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}