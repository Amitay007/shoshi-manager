import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, setMonth, setYear, parseISO, startOfDay } from "date-fns";
import { he } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronRight, ChevronLeft, Plus, Calendar as CalendarIcon, Clock, School, Users, BookOpen } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useLoading } from "@/components/common/LoadingContext";
import { with429Retry } from "@/components/utils/retry";
import { cn } from "@/lib/utils";

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

export default function ManagerScheduler() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignments, setAssignments] = useState([]);
  
  // Data for form
  const [teachers, setTeachers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);

  // Form State
  const [newAssignment, setNewAssignment] = useState({
    teacherId: "",
    schoolId: "",
    programId: "",
    targetClass: "",
    sessionsCount: "",
    time: "08:00"
  });

  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchMonthlyAssignments();
  }, [currentDate]);

  const loadData = async () => {
    showLoader();
    try {
      const [teachersData, schoolsData, programsData] = await Promise.all([
        with429Retry(() => base44.entities.Teacher.list()),
        with429Retry(() => base44.entities.EducationInstitution.list()),
        with429Retry(() => base44.entities.Syllabus.list())
      ]);
      setTeachers(teachersData || []);
      setSchools(schoolsData || []);
      setPrograms(programsData || []);
    } catch (error) {
      console.error("Error loading initial data", error);
    } finally {
      hideLoader();
    }
  };

  const fetchMonthlyAssignments = async () => {
    // In a real app we'd filter by date range. For now fetching all and filtering in client
    // or fetch with query if backend supports it efficiently.
    // Fetching all for simplicity as per previous implementation pattern
    const all = await with429Retry(() => base44.entities.ScheduleEntry.list());
    setAssignments(all);
  };

  const handleMonthSelect = (monthIndex) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(monthIndex);
    setCurrentDate(newDate);
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setNewAssignment(prev => ({ ...prev, sessionsCount: "" })); // Reset
    setIsModalOpen(true);
  };

  const handleSaveAssignment = async () => {
    if (!newAssignment.teacherId || !newAssignment.schoolId || !newAssignment.programId) {
      toast({ title: "שגיאה", description: "נא למלא את כל שדות החובה", variant: "destructive" });
      return;
    }

    showLoader();
    try {
      // Construct datetime
      const [hours, minutes] = newAssignment.time.split(':');
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(parseInt(hours), parseInt(minutes));
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(startDateTime.getHours() + 1); // Default duration 1 hour

      await base44.entities.ScheduleEntry.create({
        program_id: newAssignment.programId,
        institution_id: newAssignment.schoolId,
        assigned_teacher_id: newAssignment.teacherId,
        target_class: newAssignment.targetClass,
        sessions_count: newAssignment.sessionsCount ? parseInt(newAssignment.sessionsCount) : 0,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        status: "pending_teacher_approval"
      });

      toast({ title: "הצלחה", description: "השיבוץ נוצר בהצלחה" });
      setIsModalOpen(false);
      fetchMonthlyAssignments();
      
      // Reset form (keep some fields for easier entry if needed, but resetting here)
      setNewAssignment({
        teacherId: "",
        schoolId: "",
        programId: "",
        targetClass: "",
        sessionsCount: "",
        time: "08:00"
      });
    } catch (error) {
      console.error(error);
      toast({ title: "שגיאה", description: "אירעה שגיאה בשמירת השיבוץ", variant: "destructive" });
    } finally {
      hideLoader();
    }
  };

  // Calendar Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get assignments for a specific day
  const getDayAssignments = (day) => {
    return assignments.filter(a => isSameDay(parseISO(a.start_datetime), day));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">לוח שיבוצים</h1>
            <p className="text-slate-600">ניהול מערכת שעות חודשית</p>
          </div>
          <BackHomeButtons backTo="Humanmanagement" />
        </div>

        {/* Month Selector Bar */}
        <div className="bg-white rounded-xl shadow-sm border p-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 flex gap-2 overflow-x-auto px-2">
            {MONTHS.map((month, index) => (
              <button
                key={month}
                onClick={() => handleMonthSelect(index)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                  currentDate.getMonth() === index
                    ? "bg-purple-600 text-white shadow-md"
                    : "hover:bg-slate-100 text-slate-600"
                )}
              >
                {month}
              </button>
            ))}
          </div>

          <div className="text-lg font-bold px-4 border-r">
            {currentDate.getFullYear()}
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Large Calendar Grid */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-purple-600 text-white p-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">
                {format(currentDate, 'MMMM yyyy', { locale: he })}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 bg-slate-100 border-b">
              {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map(day => (
                <div key={day} className="py-3 text-center font-bold text-slate-600 text-sm">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 auto-rows-[140px] md:auto-rows-[180px] bg-slate-200 gap-px">
              {/* Empty cells for start of month offset if needed - simplistic approach here: 
                  date-fns eachDayOfInterval returns actual days. 
                  For a perfect grid we might need to pad the start.
                  Let's just map the actual days for now. 
               */}
              {Array(monthStart.getDay()).fill(null).map((_, i) => (
                 <div key={`empty-${i}`} className="bg-white/50" />
              ))}

              {calendarDays.map(day => {
                const dayAssignments = getDayAssignments(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div 
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "bg-white p-2 relative group cursor-pointer hover:bg-purple-50 transition-colors",
                      isToday && "bg-blue-50"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1",
                      isToday ? "bg-blue-600 text-white" : "text-slate-700 group-hover:bg-purple-200"
                    )}>
                      {format(day, 'd')}
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[calc(100%-2rem)] pr-1 custom-scrollbar">
                      {dayAssignments.map(assignment => {
                         const teacher = teachers.find(t => t.id === assignment.assigned_teacher_id);
                         const school = schools.find(s => s.id === assignment.institution_id);
                         
                         return (
                           <div key={assignment.id} className="bg-purple-100 text-purple-900 text-xs p-1.5 rounded border border-purple-200 shadow-sm truncate">
                             <div className="font-bold">{teacher?.name || 'מורה לא ידוע'}</div>
                             <div className="text-purple-700">{school?.name}</div>
                             {assignment.target_class && <div className="text-[10px] bg-white/50 inline-block px-1 rounded mt-0.5">{assignment.target_class}</div>}
                           </div>
                         );
                      })}
                    </div>

                    <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" className="h-6 w-6 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Assignment Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>שיבוץ חדש</DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, 'EEEE, d בMMMM yyyy', { locale: he })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שעה</Label>
                <div className="relative">
                   <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input 
                      type="time" 
                      className="pr-9"
                      value={newAssignment.time} 
                      onChange={e => setNewAssignment({...newAssignment, time: e.target.value})}
                   />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>מספר מפגשים</Label>
                <Input 
                  type="number" 
                  placeholder="למשל: 5"
                  value={newAssignment.sessionsCount} 
                  onChange={e => setNewAssignment({...newAssignment, sessionsCount: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>מורה</Label>
              <Select 
                value={newAssignment.teacherId} 
                onValueChange={val => setNewAssignment({...newAssignment, teacherId: val})}
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

            <div className="space-y-2">
              <Label>בית ספר / מוסד</Label>
              <Select 
                value={newAssignment.schoolId} 
                onValueChange={val => setNewAssignment({...newAssignment, schoolId: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר מוסד" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>כיתה</Label>
                <Input 
                  placeholder="למשל: ז'3"
                  value={newAssignment.targetClass} 
                  onChange={e => setNewAssignment({...newAssignment, targetClass: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>תוכנית</Label>
                <Select 
                  value={newAssignment.programId} 
                  onValueChange={val => setNewAssignment({...newAssignment, programId: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר תוכנית" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title || p.course_topic || 'ללא שם'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>ביטול</Button>
            <Button onClick={handleSaveAssignment} className="bg-purple-600 hover:bg-purple-700">שמור שיבוץ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}