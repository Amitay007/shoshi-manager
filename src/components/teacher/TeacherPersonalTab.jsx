import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";

export default function TeacherPersonalTab({ teacher, onUpdate }) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const { register, handleSubmit, setValue, watch, formState: { isDirty } } = useForm({
    defaultValues: {
      id_number: teacher.id_number || "",
      date_of_birth: teacher.date_of_birth || "",
      address_street: teacher.address_street || "",
      address_city: teacher.address_city || "",
      t_shirt_size: teacher.t_shirt_size || "",
      cv_url: teacher.cv_url || "",
      job_title: teacher.job_title || "",
      emergency_phone: teacher.emergency_phone || "",
      has_car: teacher.has_car || false,
      drivers_license_type: teacher.drivers_license_type || "",

      contract_url: teacher.contract_url || "",
    }
  });

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      await base44.entities.Teacher.update(teacher.id, data);
      toast({ title: "נשמר בהצלחה", description: "הפרטים האישיים עודכנו" });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving teacher personal info:", error);
      toast({ title: "שגיאה", description: "לא ניתן לשמור את השינויים", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-4 bg-white rounded-lg shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">פרטים אישיים</h3>
          
          <div className="grid gap-2">
            <Label htmlFor="id_number">מספר תעודת זהות</Label>
            <Input id="id_number" {...register("id_number")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date_of_birth">תאריך לידה</Label>
            <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="t_shirt_size">מידת חולצה</Label>
            <Select onValueChange={(val) => setValue("t_shirt_size", val)} defaultValue={teacher.t_shirt_size}>
              <SelectTrigger>
                <SelectValue placeholder="בחר מידה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="S">S</SelectItem>
                <SelectItem value="M">M</SelectItem>
                <SelectItem value="L">L</SelectItem>
                <SelectItem value="XL">XL</SelectItem>
                <SelectItem value="XXL">XXL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="job_title">תפקיד</Label>
            <Input id="job_title" {...register("job_title")} />
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">פרטי התקשרות וכתובת</h3>
          
          <div className="grid gap-2">
            <Label htmlFor="address_city">עיר מגורים</Label>
            <Input id="address_city" {...register("address_city")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address_street">רחוב ומספר</Label>
            <Input id="address_street" {...register("address_street")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="emergency_phone">טלפון חירום</Label>
            <Input id="emergency_phone" {...register("emergency_phone")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cv_url">קישור לקורות חיים (Google Drive)</Label>
            <Input id="cv_url" {...register("cv_url")} placeholder="https://drive.google.com/..." />
          </div>
        </div>
      </div>

      {/* Transportation */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">תחבורה</h3>
        <div className="flex flex-wrap gap-6 items-end">
          <div className="flex items-center gap-2 border p-3 rounded-md">
            <Switch 
              id="has_car" 
              checked={watch("has_car")} 
              onCheckedChange={(checked) => setValue("has_car", checked, { shouldDirty: true })} 
            />
            <Label htmlFor="has_car">האם יש רכב?</Label>
          </div>
          
          <div className="grid gap-2 flex-1 min-w-[200px]">
            <Label htmlFor="drivers_license_type">סוג רישיון נהיגה</Label>
            <Input id="drivers_license_type" {...register("drivers_license_type")} />
          </div>
        </div>
      </div>

      {/* Mandatory Documents */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">מסמכים מחייבים</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


          <div className="space-y-3 p-4 bg-gray-50 rounded-md border md:col-span-2">
            <h4 className="font-medium">חוזה העסקה</h4>
            <div className="grid gap-2">
              <Label htmlFor="contract_url">קישור לקובץ החוזה</Label>
              <Input id="contract_url" {...register("contract_url")} placeholder="https://..." />
            </div>
          </div>
        </div>
      </div>

      {isDirty && (
        <div className="fixed bottom-6 left-6 z-50">
          <Button type="submit" size="lg" disabled={isSaving} className="shadow-xl bg-[var(--yoya-purple)] hover:bg-[var(--yoya-dark)] text-white rounded-full px-8 h-14 text-lg">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            שמור שינויים
          </Button>
        </div>
      )}
    </form>
  );
}