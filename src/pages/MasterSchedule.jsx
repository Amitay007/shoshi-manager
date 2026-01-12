import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useToast } from "@/components/ui/use-toast";
import { Calendar as CalendarIcon, AlertCircle, CheckCircle, Clock, Building2, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useLoading } from "@/components/common/LoadingContext";
import { with429Retry } from "@/components/utils/retry";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from "date-fns";
import { he } from "date-fns/locale";

export default function MasterSchedule() {
  const [shifts, setShifts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showNewShiftDialog, setShowNewShiftDialog] = useState(false);
  const [openSchoolSelect, setOpenSchoolSelect] = useState(false);

  const [newShift, setNewShift] = useState({
    program_id: "",
    institution_id: "",
    assigned_teacher_id: "",
    start_datetime: "",
    end_datetime: "",
    learning_space: "",
    device_ids: [],
    notes: ""
  });

  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    showLoader();
    setLoading(true);
    try {
      const [shiftsData, schoolsData, programsData, teachersData] = await Promise.all([
        with429Retry(() => base44.entities.ScheduleEntry.list()),
        with429Retry(() => base44.entities.EducationInstitution.list()),
        with429Retry(() => base44.entities.Syllabus.list()),
        with429Retry(() => base44.entities.Teacher.list())
      ]);

      setShifts(shiftsData || []);
      setSchools(schoolsData || []);
      setPrograms(programsData || []);
      setTeachers(teachersData || []);
    } catch (error) {
      console.error("Error loading schedule data:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את הנתונים",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const handleCreateShift = async () => {
    if (!newShift.institution_id || !newShift.assigned_teacher_id || !newShift.start_datetime || !newShift.end_datetime) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות החובה",
        variant: "destructive"
      });
      return;
    }

    try {
      showLoader();
      await with429Retry(() => base44.entities.ScheduleEntry.create(newShift));
      
      toast({
        title: "הצלחה",
        description: "המשמרת נוצרה בהצלחה"
      });

      setShowNewShiftDialog(false);
      resetNewShiftForm();
      await loadData();
    } catch (error) {
      console.error("Error creating shift:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו ליצור את המשמרת",
        variant: "destructive"
      });
    } finally {
      hideLoader();
    }
  };

  const resetNewShiftForm = () => {
    setNewShift({
      program_id: "",
      institution_id: "",
      assigned_teacher_id: "",
      start_datetime: "",
      end_datetime: "",
      learning_space: "",
      device_ids: [],
      notes: ""
    });
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dateStr = format(date, "yyyy-MM-dd");
    setNewShift({
      ...newShift,
      start_datetime: `${dateStr}T08:00`,
      end_datetime: `${dateStr}T14:00`
    });
    setShowNewShiftDialog(true);
  };

  const getShiftsForDate = (date) => {
    return shifts.filter(shift => 
      isSameDay(parseISO(shift.start_datetime), date)
    );
  };

  const pendingShifts = shifts.filter(s => !s.confirmed && new Date(s.start_datetime) > new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

  if (loading) {
    return <div className="p-8 text-center">טוען נתונים...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
              <CalendarIcon className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">לוח המשמרות הראשי</h1>
              <p className="text-slate-600">ניהול שיבוצים והקצאת מורים</p>
            </div>
          </div>
          <BackHomeButtons backTo="CRMHub" backLabel="חזור למרכז ניהול" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Calendar */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold">
                    {format(currentMonth, "MMMM yyyy", { locale: he })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(new Date())}
                      className="cursor-pointer"
                    >
                      היום
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-slate-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const dayShifts = getShiftsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={idx}
                        onClick={() => handleDateClick(day)}
                        className={`
                          min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all
                          ${isCurrentMonth ? 'bg-white hover:bg-purple-50' : 'bg-slate-50 text-slate-400'}
                          ${isToday ? 'border-purple-400 border-2' : 'border-slate-200'}
                          hover:shadow-md
                        `}
                      >
                        <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-purple-700' : ''}`}>
                          {format(day, "d")}
                        </div>
                        
                        {/* Shifts for this day */}
                        <div className="space-y-1">
                          {dayShifts.slice(0, 3).map((shift) => {
                            const teacher = teachers.find(t => t.id === shift.assigned_teacher_id);
                            const isConfirmed = shift.confirmed === true;
                            
                            return (
                              <div
                                key={shift.id}
                                className={`
                                  text-[10px] px-1 py-0.5 rounded truncate
                                  ${isConfirmed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}
                                `}
                                title={teacher?.name || "מורה לא מוגדר"}
                              >
                                {format(parseISO(shift.start_datetime), "HH:mm")} • {teacher?.name?.split(' ')[0] || "?"}
                              </div>
                            );
                          })}
                          {dayShifts.length > 3 && (
                            <div className="text-[9px] text-slate-500">
                              +{dayShifts.length - 3} עוד
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 rounded"></div>
                    <span className="text-xs text-slate-600">ממתין לאישור</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded"></div>
                    <span className="text-xs text-slate-600">מאושר</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel - Pending Confirmations */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  ממתינים לאישור
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {pendingShifts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">כל המשמרות אושרו!</p>
                  </div>
                ) : (
                  pendingShifts.map((shift) => {
                    const teacher = teachers.find(t => t.id === shift.assigned_teacher_id);
                    const school = schools.find(s => s.id === shift.institution_id);
                    const shiftDate = parseISO(shift.start_datetime);

                    return (
                      <Card key={shift.id} className="bg-orange-50 border-orange-200">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-sm text-slate-900">
                                {teacher?.name || "מורה לא מוגדר"}
                              </div>
                              <div className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                {format(shiftDate, "dd/MM • HH:mm")}
                              </div>
                            </div>
                            <Badge className="bg-orange-100 text-orange-700 text-[10px]">
                              ממתין
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-600 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {school?.name || "בית ספר לא צוין"}
                          </div>
                          {teacher?.phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs h-7 cursor-pointer"
                              onClick={() => window.location.href = `tel:${teacher.phone}`}
                            >
                              התקשר לתזכורת
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* New Shift Dialog */}
      <Dialog open={showNewShiftDialog} onOpenChange={setShowNewShiftDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl">משמרת חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            
            {/* School Selection - Searchable Combobox */}
            <div>
              <Label>בית ספר *</Label>
              <Popover open={openSchoolSelect} onOpenChange={setOpenSchoolSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSchoolSelect}
                    className="w-full justify-between cursor-pointer"
                  >
                    {newShift.institution_id
                      ? schools.find((school) => school.id === newShift.institution_id)?.name
                      : "חפש בית ספר..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command className="rounded-lg border shadow-md">
                    <CommandInput placeholder="הקלד לחיפוש..." />
                    <CommandEmpty>לא נמצא בית ספר.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                      {schools.map((school) => (
                        <CommandItem
                          key={school.id}
                          value={`${school.name} ${school.city}`}
                          onSelect={() => {
                            setNewShift({ ...newShift, institution_id: school.id });
                            setOpenSchoolSelect(false);
                          }}
                          className="cursor-pointer"
                        >
                          {school.name} - {school.city}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Program Selection */}
            <div>
              <Label>תוכנית / סילבוס</Label>
              <Select
                value={newShift.program_id}
                onValueChange={(v) => setNewShift({ ...newShift, program_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר תוכנית (אופציונלי)" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map(program => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.title || program.course_topic || `תוכנית ${program.id.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher Selection */}
            <div>
              <Label>מורה מוביל *</Label>
              <Select
                value={newShift.assigned_teacher_id}
                onValueChange={(v) => setNewShift({ ...newShift, assigned_teacher_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר מורה" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>שעת התחלה *</Label>
                <Input
                  type="datetime-local"
                  value={newShift.start_datetime}
                  onChange={(e) => setNewShift({ ...newShift, start_datetime: e.target.value })}
                />
              </div>
              <div>
                <Label>שעת סיום *</Label>
                <Input
                  type="datetime-local"
                  value={newShift.end_datetime}
                  onChange={(e) => setNewShift({ ...newShift, end_datetime: e.target.value })}
                />
              </div>
            </div>

            {/* Learning Space */}
            <div>
              <Label>מרחב למידה (כיתה/מסדרון)</Label>
              <Input
                value={newShift.learning_space}
                onChange={(e) => setNewShift({ ...newShift, learning_space: e.target.value })}
                placeholder="לדוגמה: כיתה 304"
              />
            </div>

            {/* Notes */}
            <div>
              <Label>הערות</Label>
              <Input
                value={newShift.notes}
                onChange={(e) => setNewShift({ ...newShift, notes: e.target.value })}
                placeholder="הערות נוספות..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewShiftDialog(false)} className="cursor-pointer">
              ביטול
            </Button>
            <Button onClick={handleCreateShift} className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
              צור משמרת
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}