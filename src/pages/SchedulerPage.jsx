
import React, { useState, useEffect, useMemo } from "react";
import { ScheduleEntry } from "@/entities/ScheduleEntry";
import { Syllabus } from "@/entities/Syllabus";
import { VRDevice } from "@/entities/VRDevice";
import { Teacher } from "@/entities/Teacher";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { with429Retry } from "@/components/utils/retry";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import ScheduleEntryForm from "@/components/scheduler/ScheduleEntryForm";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { Calendar, Plus, ChevronRight, ChevronLeft, Filter, Glasses, MapPin, User, Clock, Trash2, ListChecks } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, startOfMonth, endOfMonth, getDaysInMonth, startOfYear, addMonths, addYears, isSameMonth } from "date-fns";
import { he } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from 'react-router-dom';

export default function SchedulerPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedProgramId = urlParams.get('programId');
  const preselectedInstitutionId = urlParams.get('institutionId');

  const [schedules, setSchedules] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false); // NEW: prevent concurrent loads

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null); // FIXED: was `= null` instead of `= useState(null)`
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const [filters, setFilters] = useState({
    program: preselectedProgramId || "",
    institution: preselectedInstitutionId || "",
    status: ""
  });

  // NEW: State for bulk deletion
  const [selectedScheduleIds, setSelectedScheduleIds] = useState(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    // Add a small initial delay before loading to avoid rate limits on page load
    const timer = setTimeout(() => {
      loadData();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (preselectedProgramId) {
      setShowForm(true);
    }
  }, [preselectedProgramId]);

  const loadData = async () => {
    // Prevent concurrent loads
    if (isLoadingData) {
      console.log("Load already in progress, skipping...");
      return;
    }
    
    setLoading(true);
    setIsLoadingData(true);
    
    try {
      // Load data SEQUENTIALLY with delays to avoid rate limiting
      console.log("Loading schedules...");
      const scheds = await with429Retry(() => ScheduleEntry.list());
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("Loading programs...");
      const progs = await with429Retry(() => Syllabus.list());
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("Loading devices...");
      const devs = await with429Retry(() => VRDevice.list());
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("Loading teachers...");
      const tchs = await with429Retry(() => Teacher.list());
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("Loading institutions...");
      const insts = await with429Retry(() => EducationInstitution.list());
      
      setSchedules(scheds || []);
      setPrograms(progs || []);
      setDevices(devs || []);
      setTeachers(tchs || []);
      setInstitutions(insts || []);
      
      console.log("Data loaded successfully");
    } catch (error) {
      console.error("Error loading data:", error);
      // Show a user-friendly error message
      alert("שגיאה בטעינת הנתונים. אנא המתן רגע ורענן את הדף.");
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  };

  // Helper function to create URLs, assuming a basic mapping or defined elsewhere in the project
  // This is a placeholder; adjust according to your project's routing conventions.
  const createPageUrl = (pageName) => {
    switch (pageName) {
      case 'ActiveSchedulesSummary':
        return '/active-schedules-summary'; // Example path for active schedules
      // Add other page mappings as needed
      default:
        // Basic conversion for other potential page names
        return `/${pageName.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '').replace(/ /g, '-')}`;
    }
  };


  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const daysCount = getDaysInMonth(currentDate);
    const startWeekday = start.getDay();
    
    const days = [];
    // Add empty slots for days before month starts
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }
    // Add actual days
    for (let i = 0; i < daysCount; i++) {
      days.push(addDays(start, i));
    }
    
    return days;
  }, [currentDate]);

  const yearMonths = useMemo(() => {
    const start = startOfYear(currentDate);
    return Array.from({ length: 12 }, (_, i) => addMonths(start, i));
  }, [currentDate]);

  const filteredSchedules = useMemo(() => {
    // Use Map to prevent duplicates by ID while applying filters
    const uniqueSchedules = new Map();
    
    schedules.forEach(s => {
      if (filters.program && s.program_id !== filters.program) return;
      if (filters.status && s.status !== filters.status) return;
      if (filters.institution) {
        const program = programs.find(p => p.id === s.program_id);
        if (program && program.school_id !== filters.institution) return;
      }
      
      // Only add if not already in map (prevents duplicates)
      // If s.id is truly unique from the backend, this effectively collects filtered items.
      uniqueSchedules.set(s.id, s);
    });
    
    return Array.from(uniqueSchedules.values());
  }, [schedules, filters, programs]);

  const getSchedulesForDay = (date) => {
    if (!date) return [];
    return filteredSchedules.filter(s => {
      const start = parseISO(s.start_datetime);
      return isSameDay(start, date);
    });
  };

  const getSchedulesForMonth = (month) => {
    return filteredSchedules.filter(s => {
      const start = parseISO(s.start_datetime);
      return isSameMonth(start, month);
    });
  };

  const handleDayClick = (date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'));
    setEditingEntry(null);
    setShowForm(true);
  };

  const handleSaveEntry = async () => {
    // Simply close form and reload - the actual save is done in the form component
    setShowForm(false);
    setEditingEntry(null);
    setSelectedDate(null);
    
    // Reload data to show new/updated schedule
    await loadData();
  };

  const handleDeleteEntry = async (entryId) => {
    if (!confirm("האם למחוק את השיבוץ?")) return;
    await with429Retry(() => ScheduleEntry.delete(entryId));
    await loadData();
    setSelectedEntry(null);
  };

  // IMPROVED: Bulk delete with rate limit handling
  const handleBulkDelete = async () => {
    if (selectedScheduleIds.size === 0) {
      alert("נא לבחור לפחות שיבוץ אחד למחיקה.");
      return;
    }

    if (!confirm(`האם למחוק ${selectedScheduleIds.size} שיבוצים? פעולה זו בלתי הפיכה.`)) return;

    setShowBulkDelete(true);
    const idsArray = Array.from(selectedScheduleIds);
    setDeletionProgress({ current: 0, total: idsArray.length });
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < idsArray.length; i++) {
      const id = idsArray[i];
      try {
        await with429Retry(() => ScheduleEntry.delete(id));
        successCount++;
      } catch (err) {
        console.error(`Failed to delete schedule ${id}:`, err);
        errorCount++;
      }
      
      setDeletionProgress({ current: i + 1, total: idsArray.length });
      
      // Add delay every 10 deletions to avoid rate limit
      if ((i + 1) % 10 === 0 && i < idsArray.length - 1) { // Only delay if not the last item
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setSelectedScheduleIds(new Set());
    setShowBulkDelete(false);
    setDeletionProgress({ current: 0, total: 0 });
    
    if (errorCount > 0) {
      alert(`הושלם! נמחקו ${successCount} שיבוצים. ${errorCount} נכשלו.`);
    } else {
      alert(`נמחקו בהצלחה ${successCount} שיבוצים!`);
    }
    
    await loadData();
  };

  // NEW: Toggle schedule selection
  const toggleScheduleSelection = (scheduleId) => {
    setSelectedScheduleIds(prev => {
      const next = new Set(prev);
      if (next.has(scheduleId)) {
        next.delete(scheduleId);
      } else {
        next.add(scheduleId);
      }
      return next;
    });
  };

  // NEW: Select all visible schedules
  const selectAllVisible = () => {
    const allIds = new Set(filteredSchedules.map(s => s.id));
    setSelectedScheduleIds(allIds);
  };

  // NEW: Clear selection
  const clearSelection = () => {
    setSelectedScheduleIds(new Set());
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "מתוכנן": return "bg-blue-100 text-blue-800";
      case "פעיל": return "bg-green-100 text-green-800";
      case "הסתיים": return "bg-gray-100 text-gray-600";
      case "בוטל": return "bg-red-100 text-red-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  const programById = Object.fromEntries((programs || []).map(p => [p.id, p]));
  const teacherById = Object.fromEntries((teachers || []).map(t => [t.id, t]));
  const deviceById = Object.fromEntries((devices || []).map(d => [d.id, d]));

  const navigateDate = (direction) => {
    switch (viewMode) {
      case "day":
        setCurrentDate(addDays(currentDate, direction));
        break;
      case "week":
        setCurrentWeekStart(addDays(currentWeekStart, direction * 7));
        break;
      case "month":
        setCurrentDate(addMonths(currentDate, direction));
        break;
      case "year":
        setCurrentDate(addYears(currentDate, direction));
        break;
    }
  };

  const getNavigationLabel = () => {
    switch (viewMode) {
      case "day":
        return format(currentDate, 'd MMMM yyyy', { locale: he });
      case "week":
        return `${format(currentWeekStart, 'd MMMM', { locale: he })} - ${format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), 'd MMMM yyyy', { locale: he })}`;
      case "month":
        return format(currentDate, 'MMMM yyyy', { locale: he });
      case "year":
        return format(currentDate, 'yyyy', { locale: he });
      default:
        return "";
    }
  };

  if (loading) {
    return <div className="p-8 text-center" dir="rtl">טוען לוח זמנים...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-900 flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              לוח זמנים - שיבוץ משקפות
            </h1>
            <p className="text-slate-600 mt-1">ניהול שיבוץ משקפות לתוכניות ומניעת כפילויות</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk delete button with progress */}
            {selectedScheduleIds.size > 0 && (
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                className="gap-2"
                disabled={showBulkDelete}
              >
                {showBulkDelete ? (
                  <>מוחק... ({deletionProgress.current}/{deletionProgress.total})</>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    מחק {selectedScheduleIds.size} שיבוצים
                  </>
                )}
              </Button>
            )}
            
            {/* NEW: Active Schedules Summary Button */}
            <Link to={createPageUrl(`ActiveSchedulesSummary`)}>
              <Button variant="outline" className="gap-2 bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100">
                <ListChecks className="w-4 h-4" />
                שיבוצים פעילים
              </Button>
            </Link>
            
            <Button
              onClick={() => {
                setEditingEntry(null);
                setSelectedDate(null);
                setShowForm(true);
              }}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              שיבוץ חדש
            </Button>
            <BackHomeButtons />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="w-5 h-5 text-slate-500" />
              
              <Select
                value={filters.program}
                onValueChange={(value) => setFilters({ ...filters, program: value })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="כל התוכניות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>כל התוכניות</SelectItem>
                  {programs.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title || p.course_topic || "תוכנית"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.institution}
                onValueChange={(value) => setFilters({ ...filters, institution: value })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="כל המוסדות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>כל המוסדות</SelectItem>
                  {institutions.map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="כל הסטטוסים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>הכל</SelectItem>
                  <SelectItem value="מתוכנן">מתוכנן</SelectItem>
                  <SelectItem value="פעיל">פעיל</SelectItem>
                  <SelectItem value="הסתיים">הסתיים</SelectItem>
                  <SelectItem value="בוטל">בוטל</SelectItem>
                </SelectContent>
              </Select>

              {(filters.program || filters.institution || filters.status) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ program: "", institution: "", status: "" })}
                >
                  נקה סינונים
                </Button>
              )}

              {/* NEW: Selection controls */}
              {filteredSchedules.length > 0 && (
                <>
                  <div className="mr-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllVisible}
                    >
                      בחר הכל ({filteredSchedules.length})
                    </Button>
                    {selectedScheduleIds.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSelection}
                      >
                        נקה בחירה
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* View Mode Selector and Navigation */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "day" ? "default" : "outline"}
              onClick={() => setViewMode("day")}
              size="sm"
            >
              יום
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              onClick={() => setViewMode("week")}
              size="sm"
            >
              שבוע
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              onClick={() => setViewMode("month")}
              size="sm"
            >
              חודש
            </Button>
            <Button
              variant={viewMode === "year" ? "default" : "outline"}
              onClick={() => setViewMode("year")}
              size="sm"
            >
              שנה
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigateDate(-1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="text-lg font-semibold min-w-[200px] text-center">
              {getNavigationLabel()}
            </div>
            <Button variant="outline" onClick={() => navigateDate(1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCurrentDate(new Date());
                setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
              }}
            >
              היום
            </Button>
          </div>
        </div>

        {/* Daily View */}
        {viewMode === "day" && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {getSchedulesForDay(currentDate).length > 0 ? (
                  getSchedulesForDay(currentDate).map(schedule => {
                    const program = programById[schedule.program_id];
                    const teacher = teacherById[schedule.assigned_teacher_id];
                    const isSelected = selectedScheduleIds.has(schedule.id);

                    return (
                      <div
                        key={schedule.id}
                        className={`p-4 rounded-lg border-2 hover:border-cyan-400 transition-all bg-white ${
                          isSelected ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* NEW: Checkbox for selection */}
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleScheduleSelection(schedule.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                          
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => setSelectedEntry(schedule)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-semibold text-lg text-slate-800">
                                {program?.title || program?.course_topic || "תוכנית"}
                              </div>
                              <Badge className={getStatusColor(schedule.status)}>
                                {schedule.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {format(parseISO(schedule.start_datetime), 'HH:mm')} - {format(parseISO(schedule.end_datetime), 'HH:mm')}
                              </div>
                              {schedule.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  {schedule.location}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Glasses className="w-4 h-4" />
                                {schedule.device_ids?.length || 0} משקפות
                              </div>
                              {teacher && (
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  {teacher.name}
                                </div>
                              )}
                            </div>
                            {schedule.created_by && (
                              <div className="text-xs text-slate-500 mt-2">
                                נוצר על ידי: {schedule.created_by}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <div className="text-slate-500 mb-4">אין שיבוצים ביום זה</div>
                    <Button onClick={() => handleDayClick(currentDate)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      צור שיבוץ חדש
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly View */}
        {viewMode === "week" && (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, idx) => {
              const daySchedules = getSchedulesForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <Card 
                  key={idx} 
                  className={`${isToday ? 'ring-2 ring-cyan-500' : ''} cursor-pointer hover:shadow-lg transition-all`}
                  onClick={() => handleDayClick(day)} // Clickable card to add new entry
                >
                  <CardContent className="p-3">
                    <div className={`text-center font-semibold mb-3 pb-2 border-b ${isToday ? 'text-cyan-700' : 'text-slate-700'}`}>
                      <div>{format(day, 'EEEE', { locale: he })}</div>
                      <div className="text-2xl">{format(day, 'd', { locale: he })}</div>
                    </div>

                    <div className="space-y-2">
                      {daySchedules.map(schedule => {
                        const program = programById[schedule.program_id];
                        const isSelected = selectedScheduleIds.has(schedule.id);

                        return (
                          <div
                            key={schedule.id}
                            className={`p-2 rounded-lg border-2 hover:border-cyan-400 transition-all bg-white text-xs ${
                              isSelected ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {/* NEW: Checkbox for selection */}
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleScheduleSelection(schedule.id)}
                                onClick={(e) => e.stopPropagation()} // Prevent card's onClick
                              />
                              <div
                                className="flex-1 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent card's onClick from firing
                                  setSelectedEntry(schedule);
                                }}
                              >
                                <div className="font-semibold text-slate-800 truncate">
                                  {program?.title || program?.course_topic || "תוכנית"}
                                </div>
                              </div>
                            </div>
                            <div
                               className="cursor-pointer" // This part is still clickable to view details
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedEntry(schedule);
                               }}
                            >
                                <div className="flex items-center gap-1 text-slate-600 mb-1">
                                  <Clock className="w-3 h-3" />
                                  {format(parseISO(schedule.start_datetime), 'HH:mm')} - {format(parseISO(schedule.end_datetime), 'HH:mm')}
                                </div>
                                <div className="flex items-center gap-1 text-slate-600">
                                  <Glasses className="w-3 h-3" />
                                  {schedule.device_ids?.length || 0} משקפות
                                </div>
                                <div className="mt-1">
                                  <Badge className={getStatusColor(schedule.status)} size="sm">
                                    {schedule.status}
                                  </Badge>
                                </div>
                            </div>
                          </div>
                        );
                      })}

                      {daySchedules.length === 0 && (
                        <div className="text-center text-slate-400 text-xs py-4">
                          לחץ להוספת שיבוץ
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Monthly View */}
        {viewMode === "month" && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map(day => (
                  <div key={day} className="text-center font-semibold text-sm py-2 text-slate-700">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="h-24 bg-slate-50 rounded" />;
                  }

                  const daySchedules = getSchedulesForDay(day);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={idx}
                      className={`h-24 border rounded p-1 hover:bg-slate-50 transition-colors cursor-pointer ${
                        isToday ? 'ring-2 ring-cyan-500 bg-cyan-50' : 'bg-white'
                      }`}
                      onClick={() => handleDayClick(day)} // Clickable to add new entry
                    >
                      <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-cyan-700' : 'text-slate-700'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5">
                        {daySchedules.slice(0, 2).map(schedule => {
                          const program = programById[schedule.program_id];
                          const isSelected = selectedScheduleIds.has(schedule.id);

                          return (
                            <div
                              key={schedule.id}
                              className={`flex items-center gap-1 text-[10px] p-1 rounded cursor-pointer ${
                                isSelected ? 'bg-cyan-200 text-cyan-900' : 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200'
                              }`}
                              title={program?.title || program?.course_topic || "תוכנית"}
                            >
                              {/* NEW: Checkbox for selection */}
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleScheduleSelection(schedule.id)}
                                onClick={(e) => e.stopPropagation()} // Prevent parent day's onClick
                                className="w-3 h-3 border-cyan-500 data-[state=checked]:bg-cyan-600"
                              />
                              <span
                                className="flex-1 truncate"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent parent day's onClick from firing
                                  setSelectedEntry(schedule);
                                }}
                              >
                                {format(parseISO(schedule.start_datetime), 'HH:mm')} {program?.title?.substring(0, 8) || program?.course_topic?.substring(0, 8) || "..."}
                              </span>
                            </div>
                          );
                        })}
                        {daySchedules.length > 2 && (
                          <div className="text-[10px] text-slate-500 text-center">
                            +{daySchedules.length - 2} נוספים
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Yearly View */}
        {viewMode === "year" && (
          <div className="grid grid-cols-3 gap-4">
            {yearMonths.map((month, idx) => {
              const monthSchedules = getSchedulesForMonth(month);
              const isCurrentMonth = isSameMonth(month, new Date());

              return (
                <Card
                  key={idx}
                  className={`cursor-pointer hover:shadow-lg transition-all ${
                    isCurrentMonth ? 'ring-2 ring-cyan-500' : ''
                  }`}
                  onClick={() => {
                    setCurrentDate(month);
                    setViewMode("month");
                  }}
                >
                  <CardContent className="p-4">
                    <div className={`text-lg font-bold mb-3 ${isCurrentMonth ? 'text-cyan-700' : 'text-slate-800'}`}>
                      {format(month, 'MMMM', { locale: he })}
                    </div>
                    <div className="text-sm text-slate-600">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4" />
                        {monthSchedules.length} שיבוצים
                      </div>
                      {monthSchedules.length > 0 && (
                        <div className="space-y-1 mt-3">
                          {monthSchedules.slice(0, 3).map(schedule => {
                            const program = programById[schedule.program_id];
                            const isSelected = selectedScheduleIds.has(schedule.id);

                            return (
                              <div
                                key={schedule.id}
                                className={`flex items-center gap-1 text-xs p-1 rounded truncate ${
                                  isSelected ? 'bg-cyan-200 text-cyan-900' : 'bg-slate-100'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent parent card's onClick
                                  toggleScheduleSelection(schedule.id); // Toggle selection directly
                                }}
                              >
                                {/* NEW: Checkbox for selection */}
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleScheduleSelection(schedule.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-3 h-3 border-cyan-500 data-[state=checked]:bg-cyan-600"
                                />
                                <span className="flex-1">
                                  {format(parseISO(schedule.start_datetime), 'd/M')} - {program?.title?.substring(0, 15) || program?.course_topic?.substring(0, 15) || "..."}
                                </span>
                              </div>
                            );
                          })}
                          {monthSchedules.length > 3 && (
                            <div className="text-[10px] text-slate-500">
                              +{monthSchedules.length - 3} נוספים
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "עריכת שיבוץ" : "יצירת שיבוץ חדש"}
            </DialogTitle>
          </DialogHeader>
          <ScheduleEntryForm
            entry={editingEntry}
            onSave={handleSaveEntry}
            onCancel={() => {
              setShowForm(false);
              setEditingEntry(null);
              setSelectedDate(null);
            }}
            preselectedProgramId={preselectedProgramId}
            preselectedDate={selectedDate}
          />
        </DialogContent>
      </Dialog>

      {/* Entry Details Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>פרטי שיבוץ</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-500">תוכנית</div>
                <div className="font-semibold">
                  {programById[selectedEntry.program_id]?.title || programById[selectedEntry.program_id]?.course_topic || "—"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-500">תחילה</div>
                  <div>{format(parseISO(selectedEntry.start_datetime), 'dd/MM/yyyy HH:mm', { locale: he })}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">סיום</div>
                  <div>{format(parseISO(selectedEntry.end_datetime), 'dd/MM/yyyy HH:mm', { locale: he })}</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500 mb-2">משקפות ({selectedEntry.device_ids?.length || 0})</div>
                <div className="flex flex-wrap gap-2">
                  {(selectedEntry.device_ids || []).map(deviceId => {
                    const device = deviceById[deviceId];
                    return device ? (
                      <Badge key={deviceId} className="bg-cyan-100 text-cyan-800">
                        #{device.binocular_number}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>

              {selectedEntry.location && (
                <div>
                  <div className="text-sm text-slate-500">מיקום</div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedEntry.location}
                  </div>
                </div>
              )}

              {selectedEntry.assigned_teacher_id && teacherById[selectedEntry.assigned_teacher_id] && (
                <div>
                  <div className="text-sm text-slate-500">מורה אחראי</div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {teacherById[selectedEntry.assigned_teacher_id].name}
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm text-slate-500">סטטוס</div>
                <Badge className={getStatusColor(selectedEntry.status)}>
                  {selectedEntry.status}
                </Badge>
              </div>

              {selectedEntry.notes && (
                <div>
                  <div className="text-sm text-slate-500">הערות</div>
                  <div className="text-sm">{selectedEntry.notes}</div>
                </div>
              )}

              {selectedEntry.created_by && (
                <div className="pt-4 border-t">
                  <div className="text-sm text-slate-500">נוצר על ידי</div>
                  <div className="text-sm font-medium">{selectedEntry.created_by}</div>
                  {selectedEntry.created_date && (
                    <div className="text-xs text-slate-400">
                      {format(new Date(selectedEntry.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingEntry(selectedEntry);
                    setSelectedEntry(null);
                    setShowForm(true);
                  }}
                >
                  ערוך
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteEntry(selectedEntry.id)}
                >
                  מחק
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
