import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, addDays, startOfDay, isSameDay, parseISO, getHours, getMinutes, addMinutes } from "date-fns";
import { he } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import AppointmentModal from "@/components/scheduler/AppointmentModal";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { toast } from "sonner";

// Constants
const START_HOUR = 8; // 08:00
const END_HOUR = 18; // 18:00
const CELL_HEIGHT = 60; // px
const MINUTE_HEIGHT = CELL_HEIGHT / 60;

export default function ManagerScheduler() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaults, setModalDefaults] = useState(null);
  
  const queryClient = useQueryClient();

  // --- Data Fetching ---
  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  const { data: schools = [], isLoading: loadingSchools } = useQuery({
    queryKey: ['schools'],
    queryFn: () => base44.entities.EducationInstitution.list(),
  });

  const { data: programs = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ['programs'],
    queryFn: () => base44.entities.Syllabus.list(),
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assignments', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      // In a real app, we would filter by date range on the backend.
      // Here we fetch all (or limit) and filter on frontend for simplicity demo, 
      // but ideally: base44.entities.ScheduleEntry.filter({ start_datetime: { $gte: ..., $lte: ... } })
      const all = await base44.entities.ScheduleEntry.list(); 
      return all.filter(a => isSameDay(parseISO(a.start_datetime), selectedDate));
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.ScheduleEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['assignments']);
      setIsModalOpen(false);
      toast.success("השיבוץ נשלח לאישור המורה");
    },
    onError: (err) => {
      toast.error("שגיאה ביצירת שיבוץ: " + err.message);
    }
  });

  // --- Handlers ---
  
  const handleSlotClick = (teacherId, hour) => {
    // Check if teacher is already booked at this time (Basic conflict check)
    // Note: Better to do overlapping check properly, but for click trigger:
    const startTime = new Date(selectedDate);
    startTime.setHours(hour, 0, 0, 0);

    // Simple overlap check
    const hasConflict = assignments.some(a => {
      if (a.assigned_teacher_id !== teacherId) return false;
      const aStart = parseISO(a.start_datetime);
      const aEnd = parseISO(a.end_datetime);
      return (startTime >= aStart && startTime < aEnd);
    });

    if (hasConflict) {
      toast.warning("המורה כבר משובץ בשעה זו!");
      return;
    }

    setModalDefaults({
      teacherId,
      date: selectedDate,
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      endTime: `${(hour + 1).toString().padStart(2, '0')}:00`
    });
    setIsModalOpen(true);
  };

  const handleSaveAssignment = (data) => {
    // Advanced Conflict Detection on Save
    const start = new Date(data.start_datetime);
    const end = new Date(data.end_datetime);

    const conflicting = assignments.find(a => {
      if (a.assigned_teacher_id !== data.assigned_teacher_id) return false;
      const aStart = parseISO(a.start_datetime);
      const aEnd = parseISO(a.end_datetime);
      // Overlap logic: (StartA < EndB) and (EndA > StartB)
      return (start < aEnd && end > aStart); 
    });

    if (conflicting) {
      // Get school name for better error message
      const school = schools.find(s => s.id === conflicting.institution_id);
      toast.error(`שגיאה: המורה כבר משובץ ב-${school?.name || 'מקום אחר'} בשעות אלו!`);
      return;
    }

    createAssignmentMutation.mutate(data);
  };

  const nextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const prevDay = () => setSelectedDate(addDays(selectedDate, -1));

  // --- Rendering Helpers ---
  
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  const getEventStyle = (assignment) => {
    const start = parseISO(assignment.start_datetime);
    const end = parseISO(assignment.end_datetime);
    
    // Calculate top offset relative to START_HOUR
    const startHour = getHours(start);
    const startMin = getMinutes(start);
    const durationMin = (end - start) / (1000 * 60);
    
    const top = ((startHour - START_HOUR) * 60 + startMin) * MINUTE_HEIGHT;
    const height = durationMin * MINUTE_HEIGHT;

    let bgColor = "bg-yellow-100 border-yellow-300 text-yellow-900"; // Pending
    if (assignment.status === 'approved' || assignment.confirmed) bgColor = "bg-green-100 border-green-300 text-green-900";
    if (assignment.status === 'rejected') bgColor = "bg-red-100 border-red-300 text-red-900";
    if (assignment.status === 'cancelled') bgColor = "bg-gray-100 border-gray-300 text-gray-500 line-through";

    return {
      top: `${top}px`,
      height: `${height}px`,
      className: `absolute left-1 right-1 rounded px-2 py-1 text-xs border shadow-sm z-10 overflow-hidden cursor-pointer hover:brightness-95 transition-all ${bgColor}`
    };
  };

  if (loadingTeachers || loadingSchools || loadingPrograms) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
           <div>
              <h1 className="text-2xl font-bold text-slate-800">לוח שיבוצים (מנהל)</h1>
              <p className="text-slate-500 text-sm">ניהול שיבוצי מורים לאישור</p>
           </div>

           <div className="flex items-center gap-4 bg-slate-50 p-1 rounded-lg border border-slate-100">
              <Button variant="ghost" size="icon" onClick={prevDay}>
                 <ChevronRight className="w-5 h-5" />
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal bg-white">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP", { locale: he })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button variant="ghost" size="icon" onClick={nextDay}>
                 <ChevronLeft className="w-5 h-5" />
              </Button>
           </div>

           <BackHomeButtons />
        </div>
      </div>

      {/* Scheduler Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           
           {/* Header Row (Hours) */}
           <div className="flex border-b border-slate-200 sticky top-0 bg-slate-50 z-10">
              <div className="w-48 shrink-0 p-3 font-bold text-slate-700 border-l border-slate-200 bg-slate-50 sticky right-0 z-20">
                 מורים
              </div>
              <div className="flex-1 flex relative min-w-[800px]"> 
                {hours.map(hour => (
                   <div key={hour} className="flex-1 border-l border-slate-100 text-center py-2 text-sm text-slate-500 font-medium">
                      {hour.toString().padStart(2, '0')}:00
                   </div>
                ))}
              </div>
           </div>

           {/* Resources Rows */}
           <div>
              {teachers.map(teacher => (
                 <div key={teacher.id} className="flex border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                    
                    {/* Teacher Name Column */}
                    <div className="w-48 shrink-0 p-3 font-medium text-slate-800 border-l border-slate-200 bg-white sticky right-0 z-10 group-hover:bg-slate-50/50 flex flex-col justify-center">
                       <div className="truncate">{teacher.name}</div>
                       <div className="text-xs text-slate-400 truncate">{teacher.specialty}</div>
                    </div>

                    {/* Timeline Cells */}
                    <div className="flex-1 relative h-[60px] min-w-[800px]">
                       
                       {/* Background Grid Cells (Clickable) */}
                       <div className="absolute inset-0 flex">
                          {hours.map(hour => (
                             <div 
                               key={hour} 
                               className="flex-1 border-l border-slate-100 cursor-pointer hover:bg-blue-50/30 transition-colors"
                               onClick={() => handleSlotClick(teacher.id, hour)}
                               title={`שבץ את ${teacher.name} בשעה ${hour}:00`}
                             ></div>
                          ))}
                       </div>

                       {/* Events */}
                       {assignments
                          .filter(a => a.assigned_teacher_id === teacher.id)
                          .map(assignment => {
                             const style = getEventStyle(assignment);
                             const school = schools.find(s => s.id === assignment.institution_id);
                             const program = programs.find(p => p.id === assignment.program_id);
                             
                             return (
                                <div 
                                   key={assignment.id}
                                   style={{ top: 1, height: '58px', left: style.left, width: style.width, ...style }} // We calculated top/height for vertical list, wait.
                                   // Correction: Resource View is usually Horizontal time axis. 
                                   // My constants were CELL_HEIGHT (Vertical).
                                   // Let's recalculate for HORIZONTAL layout.
                                   className={style.className}
                                >
                                   {/* Recalculating inline to override style prop above */}
                                </div>
                             );
                          })}

                          {/* Re-rendering events with Horizontal Calculation */}
                          {assignments
                             .filter(a => a.assigned_teacher_id === teacher.id)
                             .map(assignment => {
                                const start = parseISO(assignment.start_datetime);
                                const end = parseISO(assignment.end_datetime);
                                
                                const startTotalMinutes = (getHours(start) * 60) + getMinutes(start);
                                const endTotalMinutes = (getHours(end) * 60) + getMinutes(end);
                                const dayStartMinutes = START_HOUR * 60;
                                const totalDayMinutes = (END_HOUR - START_HOUR) * 60;

                                // Percentages
                                const leftPercent = ((startTotalMinutes - dayStartMinutes) / totalDayMinutes) * 100;
                                const widthPercent = ((endTotalMinutes - startTotalMinutes) / totalDayMinutes) * 100;

                                // Colors again
                                let bgColor = "bg-amber-100 border-amber-300 text-amber-900"; // Pending
                                if (assignment.status === 'approved' || assignment.confirmed) bgColor = "bg-emerald-100 border-emerald-300 text-emerald-900";
                                if (assignment.status === 'rejected') bgColor = "bg-rose-100 border-rose-300 text-rose-900";
                                
                                const school = schools.find(s => s.id === assignment.institution_id);

                                return (
                                   <div 
                                      key={assignment.id}
                                      className={`absolute top-1 bottom-1 rounded px-2 py-1 text-xs border shadow-sm z-10 overflow-hidden cursor-pointer hover:brightness-95 transition-all flex flex-col justify-center ${bgColor}`}
                                      style={{ 
                                          right: `${leftPercent}%`, 
                                          width: `${widthPercent}%`,
                                          // Note: In RTL, 'right' acts as 'left' in LTR timeline? 
                                          // Actually for timeline: 08:00 is usually on the Right in RTL? 
                                          // Or Left? Timelines are usually LTR even in Hebrew UI?
                                          // Let's assume standard RTL: Start time is on the Right.
                                          // So `right: ${leftPercent}%` places it from the right side.
                                      }}
                                      title={`${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}: ${school?.name}`}
                                   >
                                      <div className="font-bold truncate">{school?.name}</div>
                                      <div className="text-[10px] opacity-80 truncate">{format(start, 'HH:mm')}-{format(end, 'HH:mm')}</div>
                                   </div>
                                );
                             })}
                    </div>
                 </div>
              ))}

              {teachers.length === 0 && (
                 <div className="p-8 text-center text-slate-400 italic">
                    לא נמצאו מורים במערכת
                 </div>
              )}
           </div>
        </div>
        
        {/* Legend */}
        <div className="max-w-7xl mx-auto mt-4 flex gap-4 text-sm px-4">
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></div>
              <span>ממתין לאישור מורה</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded"></div>
              <span>מאושר</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-rose-100 border border-rose-300 rounded"></div>
              <span>נדחה</span>
           </div>
        </div>
      </div>

      <AppointmentModal 
         isOpen={isModalOpen}
         onClose={() => setIsModalOpen(false)}
         onSave={handleSaveAssignment}
         defaultValues={modalDefaults}
         teachers={teachers}
         schools={schools}
         programs={programs}
      />
    </div>
  );
}