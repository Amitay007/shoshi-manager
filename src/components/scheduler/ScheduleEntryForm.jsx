
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Save, X, Repeat } from "lucide-react";
import ProgramDevicesDisplay from "./ProgramDevicesDisplay";
import CalendarPicker from "./CalendarPicker";
import TimeSlotPicker from "./TimeSlotPicker";
import { ScheduleEntry } from "@/entities/ScheduleEntry";
import { Syllabus } from "@/entities/Syllabus";
import { Teacher } from "@/entities/Teacher";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { with429Retry } from "@/components/utils/retry";
import { format, addDays, addMonths, isBefore } from "date-fns";

export default function ScheduleEntryForm({ entry, onSave, onCancel, preselectedProgramId, preselectedDate }) {
  const [formData, setFormData] = useState({
    program_id: preselectedProgramId || "",
    device_ids: [],
    selected_dates: preselectedDate ? [new Date(preselectedDate)] : [], // Changed to array
    start_time: "09:00",
    duration_hours: 2, // Changed default to 2
    institution_id: "",
    custom_location: "",
    learning_space: "",
    status: "מתוכנן",
    notes: "",
    assigned_teacher_id: "",
    recurring: false,
    recurrence_type: "daily",
    recurrence_interval: 1,
    recurrence_days: [],
    recurrence_end_type: "never",
    recurrence_end_date: "",
    recurrence_count: 10
  });

  const [programs, setPrograms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (entry) {
      const startDt = new Date(entry.start_datetime);
      const endDt = new Date(entry.end_datetime);
      const durationHours = (endDt - startDt) / (1000 * 60 * 60);
      
      setFormData({
        program_id: entry.program_id || "",
        device_ids: entry.device_ids || [],
        selected_dates: [startDt], // Changed to array
        start_time: format(startDt, 'HH:mm'),
        duration_hours: durationHours,
        institution_id: entry.institution_id || "",
        custom_location: entry.custom_location || "",
        learning_space: entry.learning_space || "",
        status: entry.status || "מתוכנן",
        notes: entry.notes || "",
        assigned_teacher_id: entry.assigned_teacher_id || "",
        recurring: false,
        recurrence_type: "daily",
        recurrence_interval: 1,
        recurrence_days: [],
        recurrence_end_type: "never",
        recurrence_end_date: "",
        recurrence_count: 10
      });
    }
  }, [entry]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [progs, tchs, insts] = await Promise.all([
        with429Retry(() => Syllabus.list()),
        with429Retry(() => Teacher.list()),
        with429Retry(() => EducationInstitution.list())
      ]);
      setPrograms(progs || []);
      setTeachers(tchs || []);
      setInstitutions(insts || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDevicesLoaded = (deviceIds) => {
    setFormData(prev => ({ ...prev, device_ids: deviceIds }));
  };

  const getScheduleDateTimeForDate = (date) => {
    // Validate inputs - but be lenient during typing
    if (!date) {
      return ["", ""];
    }
    
    // Check if start_time is complete and valid
    if (!formData.start_time || formData.start_time.length < 5 || !formData.start_time.match(/^\d{2}:\d{2}$/)) {
      return ["", ""];
    }
    
    if (!formData.duration_hours || formData.duration_hours <= 0) {
      return ["", ""];
    }

    try {
      const startDateTime = new Date(date);
      
      if (isNaN(startDateTime.getTime())) {
        return ["", ""];
      }
      
      const [hours, minutes] = formData.start_time.split(':');
      const hoursInt = parseInt(hours, 10);
      const minutesInt = parseInt(minutes, 10);
      
      // Validate hours and minutes
      if (isNaN(hoursInt) || isNaN(minutesInt) || hoursInt < 0 || hoursInt > 23 || minutesInt < 0 || minutesInt > 59) {
        return ["", ""];
      }
      
      startDateTime.setHours(hoursInt, minutesInt, 0, 0);
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(startDateTime.getHours() + formData.duration_hours);
      
      return [startDateTime.toISOString(), endDateTime.toISOString()];
    } catch (error) {
      return ["", ""];
    }
  };

  const getScheduleDateTime = () => {
    if (!formData.selected_dates || formData.selected_dates.length === 0) {
      return ["", ""];
    }
    return getScheduleDateTimeForDate(formData.selected_dates[0]);
  };

  const generateRecurrences = () => {
    // If no dates selected, return empty
    if (!formData.selected_dates || formData.selected_dates.length === 0) {
      return [];
    }

    const schedules = [];
    const processedDates = new Set(); // Prevent duplicates

    // If not recurring, create schedule for each selected date
    if (!formData.recurring) {
      for (const date of formData.selected_dates) {
        const dateKey = format(date, 'yyyy-MM-dd');
        if (processedDates.has(dateKey)) continue;
        processedDates.add(dateKey);

        const [startDt, endDt] = getScheduleDateTimeForDate(date);
        if (startDt && endDt) {
          schedules.push({ start_datetime: startDt, end_datetime: endDt });
        }
      }
      return schedules;
    }
    
    // Recurring logic - apply to first selected date
    const baseDate = new Date(formData.selected_dates[0]);
    baseDate.setHours(0, 0, 0, 0);
    let currentDate = new Date(baseDate);
    let count = 0;
    
    const endDate = formData.recurrence_end_type === "date" && formData.recurrence_end_date 
      ? new Date(formData.recurrence_end_date) 
      : null;
    
    const maxCount = formData.recurrence_end_type === "count" 
      ? formData.recurrence_count 
      : 365;
    
    let iterations = 0;
    const MAX_ITERATIONS = 1000; // Prevent infinite loops
    
    while (count < maxCount && iterations < MAX_ITERATIONS) {
      iterations++;
      
      if (endDate && isBefore(endDate, currentDate)) break;
      
      let shouldInclude = false;
      
      if (formData.recurrence_type === "daily") {
        shouldInclude = true;
      } else if (formData.recurrence_type === "weekly") {
        shouldInclude = formData.recurrence_days.includes(currentDate.getDay());
      } else if (formData.recurrence_type === "monthly") {
        shouldInclude = currentDate.getDate() === baseDate.getDate();
      }
      
      if (shouldInclude) {
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        if (!processedDates.has(dateKey)) {
          processedDates.add(dateKey);
          const [recStartDt, recEndDt] = getScheduleDateTimeForDate(currentDate);
          if (recStartDt && recEndDt) { // Only add if valid dates are returned
            schedules.push({ start_datetime: recStartDt, end_datetime: recEndDt });
            count++;
          }
        }
      }
      
      if (formData.recurrence_type === "daily") {
        currentDate = addDays(currentDate, formData.recurrence_interval);
      } else if (formData.recurrence_type === "weekly") {
        currentDate = addDays(currentDate, 1); // Iterate day by day for weekly to check all days
      } else if (formData.recurrence_type === "monthly") {
        // For monthly, iterate by interval. If current dayOfMonth is not base dayOfMonth, it will be skipped by shouldInclude
        currentDate = addMonths(currentDate, formData.recurrence_interval);
      }
    }
    
    return schedules;
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.program_id) {
      errors.push("חובה לבחור תוכנית");
    }
    
    if (!formData.device_ids || formData.device_ids.length === 0) {
      errors.push("לא נמצאו משקפות משויכות לתוכנית זו");
    }
    
    if (!formData.selected_dates || formData.selected_dates.length === 0) {
      errors.push("חובה לבחור לפחות תאריך אחד");
    }
    
    if (!formData.start_time || !formData.start_time.match(/^\d{2}:\d{2}$/)) {
      errors.push("חובה לבחור שעת התחלה בפורמט תקין (HH:MM)");
    }
    
    if (!formData.duration_hours || formData.duration_hours <= 0) {
      errors.push("חובה לבחור משך זמן");
    }
    
    if (!formData.custom_location) { 
      errors.push("חובה למלא מיקום");
    }
    
    if (formData.recurring && formData.recurrence_type === "weekly" && formData.recurrence_days.length === 0) {
      errors.push("בשיבוץ שבועי חובה לבחור לפחות יום אחד");
    }

    if (formData.recurring && formData.recurrence_end_type === "date" && !formData.recurrence_end_date) {
        errors.push("חובה לבחור תאריך סיום לשיבוץ החוזר");
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      const recurrences = generateRecurrences();

      if (recurrences.length === 0 && !entry) {
        alert("שגיאה: לא ניתן ליצור שיבוצים. ייתכן שיש בעיה בנתוני התאריך/שעה/חזרתיות.");
        return;
      }
      
      if (entry) {
        // Update existing entry
        const scheduleData = {
          program_id: formData.program_id,
          device_ids: formData.device_ids,
          start_datetime: recurrences[0].start_datetime,
          end_datetime: recurrences[0].end_datetime,
          status: formData.status,
          notes: formData.notes || ""
        };
        
        if (formData.institution_id) scheduleData.institution_id = formData.institution_id;
        if (formData.custom_location) scheduleData.custom_location = formData.custom_location;
        if (formData.learning_space) scheduleData.learning_space = formData.learning_space;
        if (formData.assigned_teacher_id) scheduleData.assigned_teacher_id = formData.assigned_teacher_id;
        
        console.log("Updating schedule with data:", JSON.stringify(scheduleData, null, 2));
        await with429Retry(() => ScheduleEntry.update(entry.id, scheduleData));
        
        // Notify parent that save completed successfully
        if (onSave) onSave();
      } else {
        // Create new entries
        const createdSchedules = [];
        
        for (const rec of recurrences) {
          if (!formData.program_id || !formData.device_ids || formData.device_ids.length === 0 || !rec.start_datetime || !rec.end_datetime) {
            console.error("Missing required fields:", {
              program_id: formData.program_id,
              device_ids: formData.device_ids,
              start_datetime: rec.start_datetime,
              end_datetime: rec.end_datetime
            });
            alert("שגיאה: חסרים נתונים נדרשים ליצירת השיבוץ");
            return;
          }

          const scheduleData = {
            program_id: formData.program_id,
            device_ids: formData.device_ids,
            start_datetime: rec.start_datetime,
            end_datetime: rec.end_datetime,
            status: formData.status || "מתוכנן",
            notes: formData.notes || ""
          };
          
          if (formData.institution_id) scheduleData.institution_id = formData.institution_id;
          if (formData.custom_location) scheduleData.custom_location = formData.custom_location;
          if (formData.learning_space) scheduleData.learning_space = formData.learning_space;
          if (formData.assigned_teacher_id) scheduleData.assigned_teacher_id = formData.assigned_teacher_id;
          
          console.log("Creating schedule with data:", JSON.stringify(scheduleData, null, 2));
          
          const created = await with429Retry(() => ScheduleEntry.create(scheduleData));
          createdSchedules.push(created);
        }
        
        console.log(`Successfully created ${createdSchedules.length} schedule(s)`);
        
        // Notify parent that save completed successfully
        if (onSave) onSave();
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMsg = error.response?.data?.detail 
        ? (typeof error.response.data.detail === 'string' 
            ? error.response.data.detail 
            : JSON.stringify(error.response.data.detail))
        : error.message;
      alert("שגיאה בשמירת השיבוץ: " + errorMsg);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">טוען...</div>;
  }

  const [startDtPreview, endDtPreview] = getScheduleDateTime();

  const WEEK_DAYS = [
    { value: 0, label: "א'" },
    { value: 1, label: "ב'" },
    { value: 2, label: "ג'" },
    { value: 3, label: "ד'" },
    { value: 4, label: "ה'" },
    { value: 5, label: "ו'" },
    { value: 6, label: "ש'" }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2 text-red-800 mb-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="font-semibold">יש למלא את השדות הבאים:</div>
          </div>
          <ul className="pr-7 space-y-1">
            {validationErrors.map((error, idx) => (
              <li key={idx} className="text-red-700 text-sm">• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <Label htmlFor="program_id">תוכנית *</Label>
        <Select
          value={formData.program_id}
          onValueChange={(value) => setFormData({ ...formData, program_id: value })}
        >
          <SelectTrigger id="program_id">
            <SelectValue placeholder="בחר תוכנית" />
          </SelectTrigger>
          <SelectContent>
            {programs.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.title || p.course_topic || p.subject || "תוכנית ללא שם"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.program_id && (
        <ProgramDevicesDisplay
          programId={formData.program_id}
          startDatetime={startDtPreview}
          endDatetime={endDtPreview}
          onDevicesLoaded={handleDevicesLoaded}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CalendarPicker
          selectedDates={formData.selected_dates}
          onDatesSelect={(dates) => setFormData({ ...formData, selected_dates: dates })}
          multiSelect={true}
        />
        <TimeSlotPicker
          startTime={formData.start_time}
          duration={formData.duration_hours}
          onStartTimeChange={(time) => setFormData({ ...formData, start_time: time })}
          onDurationChange={(duration) => setFormData({ ...formData, duration_hours: duration })}
        />
      </div>

      <div>
        <Label htmlFor="institution_id">מוסד חינוכי (אופציונלי)</Label>
        <Select
          value={formData.institution_id || "none"}
          onValueChange={(value) => setFormData({ ...formData, institution_id: value === "none" ? "" : value })}
        >
          <SelectTrigger id="institution_id">
            <SelectValue placeholder="בחר מוסד חינוכי" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">ללא מוסד</SelectItem>
            {institutions.map(inst => (
              <SelectItem key={inst.id} value={inst.id}>
                {inst.name} - {inst.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="custom_location">מיקום *</Label>
        <Input
          id="custom_location"
          placeholder="הכנס כתובת / מיקום"
          value={formData.custom_location}
          onChange={(e) => setFormData({ ...formData, custom_location: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="learning_space">מרחב למידה (אופציונלי)</Label>
        <Input
          id="learning_space"
          placeholder="כיתה / מסדרון / ממד / שם כיתה"
          value={formData.learning_space}
          onChange={(e) => setFormData({ ...formData, learning_space: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="assigned_teacher_id">מורה מוביל (אופציונלי)</Label>
        <Select
          value={formData.assigned_teacher_id || "none"}
          onValueChange={(value) => setFormData({ ...formData, assigned_teacher_id: value === "none" ? "" : value })}
        >
          <SelectTrigger id="assigned_teacher_id">
            <SelectValue placeholder="בחר מורה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">ללא מורה</SelectItem>
            {teachers.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!entry && (
        <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <Checkbox
              id="recurring"
              checked={formData.recurring}
              onCheckedChange={(checked) => setFormData({ ...formData, recurring: checked, recurrence_days: [] })}
            />
            <Label htmlFor="recurring" className="cursor-pointer flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              חוזר על עצמו
            </Label>
          </div>

          {formData.recurring && (
            <div className="space-y-4 pr-6">
              <div>
                <Label htmlFor="recurrence_type">תדירות</Label>
                <Select
                  value={formData.recurrence_type}
                  onValueChange={(value) => setFormData({ ...formData, recurrence_type: value })}
                >
                  <SelectTrigger id="recurrence_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">יומי</SelectItem>
                    <SelectItem value="weekly">שבועי</SelectItem>
                    <SelectItem value="monthly">חודשי</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="recurrence_interval">חזור כל</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="recurrence_interval"
                    type="number"
                    min="1"
                    value={formData.recurrence_interval}
                    onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value, 10) || 1 })}
                    className="w-20"
                  />
                  <span className="text-sm">
                    {formData.recurrence_type === "daily" && "ימים"}
                    {formData.recurrence_type === "weekly" && "שבועות"}
                    {formData.recurrence_type === "monthly" && "חודשים"}
                  </span>
                </div>
              </div>

              {formData.recurrence_type === "weekly" && (
                <div>
                  <Label>חזור בימים</Label>
                  <div className="flex gap-2 flex-wrap">
                    {WEEK_DAYS.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          const days = formData.recurrence_days.includes(day.value)
                            ? formData.recurrence_days.filter(d => d !== day.value)
                            : [...formData.recurrence_days, day.value];
                          setFormData({ ...formData, recurrence_days: days.sort((a,b) => a-b) });
                        }}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          formData.recurrence_days.includes(day.value)
                            ? "bg-cyan-600 text-white border-cyan-600"
                            : "bg-white text-slate-700 border-slate-300 hover:border-cyan-400"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="recurrence_end_type">מסתיים</Label>
                <Select
                  value={formData.recurrence_end_type}
                  onValueChange={(value) => setFormData({ ...formData, recurrence_end_type: value })}
                >
                  <SelectTrigger id="recurrence_end_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">לעולם לא</SelectItem>
                    <SelectItem value="date">בתאריך</SelectItem>
                    <SelectItem value="count">לאחר מספר שיבוצים</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrence_end_type === "date" && (
                <Input
                  type="date"
                  value={formData.recurrence_end_date}
                  onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                />
              )}

              {formData.recurrence_end_type === "count" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={formData.recurrence_count}
                    onChange={(e) => setFormData({ ...formData, recurrence_count: parseInt(e.target.value, 10) || 1 })}
                    className="w-24"
                  />
                  <span className="text-sm">שיבוצים</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="status">סטטוס</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="מתוכנן">מתוכנן</SelectItem>
            <SelectItem value="פעיל">פעיל</SelectItem>
            <SelectItem value="הסתיים">הסתיים</SelectItem>
            <SelectItem value="בוטל">בוטל</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">הערות</Label>
        <Textarea
          id="notes"
          placeholder="הערות נוספות..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          ביטול
        </Button>
        <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
          <Save className="w-4 h-4 mr-2" />
          {entry ? "עדכן שיבוץ" : "צור שיבוץ"}
        </Button>
      </div>
    </form>
  );
}
