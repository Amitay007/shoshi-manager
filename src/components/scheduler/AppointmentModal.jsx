import React, { useEffect } from 'react';
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function AppointmentModal({ 
  isOpen, 
  onClose, 
  onSave, 
  defaultValues, 
  teachers = [], 
  schools = [], 
  programs = [] 
}) {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      assigned_teacher_id: "",
      institution_id: "",
      program_id: "",
      date: "",
      start_time: "",
      end_time: "",
      notes: ""
    }
  });

  useEffect(() => {
    if (isOpen && defaultValues) {
      reset({
        assigned_teacher_id: defaultValues.teacherId || "",
        date: defaultValues.date ? format(defaultValues.date, "yyyy-MM-dd") : "",
        start_time: defaultValues.startTime || "08:00",
        end_time: defaultValues.endTime || "09:00",
        institution_id: "",
        program_id: "",
        notes: ""
      });
    }
  }, [isOpen, defaultValues, reset]);

  const onSubmit = (data) => {
    // Combine date and time
    const startDateTime = new Date(`${data.date}T${data.start_time}`);
    const endDateTime = new Date(`${data.date}T${data.end_time}`);
    
    onSave({
      ...data,
      start_datetime: startDateTime.toISOString(),
      end_datetime: endDateTime.toISOString(),
      status: 'pending_teacher_approval'
    });
  };

  const selectedTeacher = teachers.find(t => t.id === watch("assigned_teacher_id"));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>שיבוץ חדש {selectedTeacher ? `- ${selectedTeacher.name}` : ''}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>תאריך</Label>
              <Input type="date" {...register("date", { required: true })} />
            </div>
            <div className="space-y-2">
               <Label>מורה</Label>
               <Select 
                 value={watch("assigned_teacher_id")} 
                 onValueChange={(val) => setValue("assigned_teacher_id", val)}
                 disabled={!!defaultValues?.teacherId} // Lock if pre-selected from row
               >
                 <SelectTrigger>
                   <SelectValue placeholder="בחר מורה" />
                 </SelectTrigger>
                 <SelectContent>
                   {teachers.map(t => (
                     <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>שעת התחלה</Label>
              <Input type="time" {...register("start_time", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>שעת סיום</Label>
              <Input type="time" {...register("end_time", { required: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>מוסד חינוכי</Label>
            <Select 
              value={watch("institution_id")} 
              onValueChange={(val) => setValue("institution_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר בית ספר" />
              </SelectTrigger>
              <SelectContent>
                {schools.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} - {s.city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>תוכנית / סילבוס</Label>
            <Select 
              value={watch("program_id")} 
              onValueChange={(val) => setValue("program_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר תוכנית" />
              </SelectTrigger>
              <SelectContent>
                {programs.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title || p.course_topic || "תוכנית ללא שם"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>הערות למורה</Label>
            <Textarea 
              {...register("notes")} 
              placeholder="הוראות מיוחדות, כיתה ספציפית וכו'..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>ביטול</Button>
            <Button type="submit">שלח לאישור</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}