import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calendar, Check, X, MapPin, Phone, Bell, Clock, 
  ChevronRight, Navigation, FileText, AlertCircle, History, MessageSquare, Briefcase
} from "lucide-react";
import { format, addDays, subDays, startOfMonth, endOfMonth } from "date-fns";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// --- Mock Data ---
const generateMockData = () => {
  const today = new Date();
  
  return [
    // 1. Pending Approval
    {
      id: "evt_pending_1",
      status: "pending_teacher_approval",
      start_time: addDays(today, 2).setHours(8, 30, 0, 0),
      end_time: addDays(today, 2).setHours(12, 30, 0, 0),
      school_name: "תיכון עירוני ד'",
      address: "ויצמן 14, תל אביב",
      class_name: "כיתה י'3 - מגמת רפואה",
      program_name: "מבוא לאנטומיה ב-VR",
      contact_phone: "050-1234567"
    },
    // 2. Upcoming Events
    {
      id: "evt_upcoming_1",
      status: "approved",
      start_time: addDays(today, 1).setHours(9, 0, 0, 0),
      end_time: addDays(today, 1).setHours(11, 0, 0, 0),
      school_name: "חטיבת ביניים שז\"ר",
      address: "העצמאות 40, קריית אונו",
      class_name: "כיתה ח'2",
      program_name: "מסע בחלל",
      contact_phone: "052-9876543"
    },
    {
      id: "evt_upcoming_2",
      status: "approved",
      start_time: addDays(today, 3).setHours(10, 0, 0, 0),
      end_time: addDays(today, 3).setHours(13, 0, 0, 0),
      school_name: "בי\"ס יסודי גורדון",
      address: "אחד העם 3, גבעתיים",
      class_name: "כיתה ו'1",
      program_name: "סיור וירטואלי בירושלים",
      contact_phone: "054-5555555"
    },
    {
      id: "evt_upcoming_3",
      status: "approved",
      start_time: addDays(today, 5).setHours(12, 0, 0, 0),
      end_time: addDays(today, 5).setHours(14, 30, 0, 0),
      school_name: "תיכון אהל שם",
      address: "רוקח 110, רמת גן",
      class_name: "כיתה ט'5",
      program_name: "פיזיקה ורכבות הרים",
      contact_phone: "03-6789012"
    },
    // 3. Past Events
    {
      id: "evt_past_1",
      status: "done",
      start_time: subDays(today, 2).setHours(8, 0, 0, 0),
      end_time: subDays(today, 2).setHours(11, 0, 0, 0), // 3 hours
      school_name: "בי\"ס המגן",
      address: "ההגנה 12, חולון",
      class_name: "כיתה ה'2",
      program_name: "עולם הים",
      personal_notes: "היה שיעור מצוין, התלמידים היו מאוד מעורבים.",
      contact_phone: "050-1112222"
    },
    {
      id: "evt_past_2",
      status: "cancelled",
      start_time: subDays(today, 5).setHours(10, 0, 0, 0),
      end_time: subDays(today, 5).setHours(12, 0, 0, 0),
      school_name: "מרכז קהילתי אשכול",
      address: "הפלמ\"ח 7, ראשון לציון",
      class_name: "קבוצת נוער",
      program_name: "מנהיגות טכנולוגית",
      personal_notes: "בוטל עקב מחלת המדריך המחליף.",
      contact_phone: "052-3334444"
    }
  ];
};

export default function TeacherAgenda() {
  const [events, setEvents] = useState(generateMockData());
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportNotes, setReportNotes] = useState("");
  
  // Manual Hours Reporting
  const [showAddHoursModal, setShowAddHoursModal] = useState(false);
  const [manualReports, setManualReports] = useState([]);
  const [newReport, setNewReport] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: "",
    notes: ""
  });
  
  // Stats Calculations
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    
    // Filter events for current month
    const monthEvents = events.filter(e => {
        const d = new Date(e.start_time);
        return d >= currentMonthStart && d <= currentMonthEnd;
    });

    const executedHours = monthEvents
      .filter(e => e.status === 'done')
      .reduce((acc, curr) => {
        const hours = (new Date(curr.end_time) - new Date(curr.start_time)) / (1000 * 60 * 60);
        return acc + hours;
      }, 0);

    const projectedHours = monthEvents
      .filter(e => e.status !== 'cancelled')
      .reduce((acc, curr) => {
        const hours = (new Date(curr.end_time) - new Date(curr.start_time)) / (1000 * 60 * 60);
        return acc + hours;
      }, 0);

    return { executedHours, projectedHours };
  }, [events]);

  // Section Grouping
  const pendingEvents = events.filter(e => e.status === 'pending_teacher_approval');
  
  const upcomingApprovedEvents = events
    .filter(e => e.status === 'approved' && new Date(e.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const pastEvents = events
    .filter(e => new Date(e.end_time) < new Date())
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

  // Handlers
  const handleApprove = (id) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status: 'approved' } : e));
  };

  const handleReject = (id) => {
    if (confirm("האם אתה בטוח שברצונך לדחות את השיבוץ?")) {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, status: 'cancelled' } : e));
    }
  };

  const handleAddReport = () => {
    if (!newReport.date || !newReport.hours) return;
    
    const report = {
      id: `manual_${Date.now()}`,
      is_manual: true,
      date: newReport.date,
      duration: parseFloat(newReport.hours),
      program_name: newReport.notes || "דיווח ידני",
      status: "pending",
      employee_verified: "verified" // Self verified
    };

    setManualReports(prev => [report, ...prev]);
    setShowAddHoursModal(false);
    setNewReport({ date: new Date().toISOString().split('T')[0], hours: "", notes: "" });
  };

  const handleVerifyShift = (id, isManual = false) => {
    if (isManual) return; // Manual is always verified by creator
    setEvents(prev => prev.map(e => e.id === id ? { ...e, employee_verified: 'verified', status: 'done' } : e));
  };

  const handleDisputeShift = (id, isManual = false) => {
    if (isManual) {
        setManualReports(prev => prev.filter(r => r.id !== id)); // Delete manual
    } else {
        setEvents(prev => prev.map(e => e.id === id ? { ...e, employee_verified: 'rejected' } : e));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8" dir="rtl">
      
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
           <h1 className="text-3xl font-bold text-slate-800">אזור אישי</h1>
           <BackHomeButtons showHomeButton={true} backTo="Humanmanagement" backLabel="חזרה" />
        </div>

        {/* Top Grid: Messages & Pending/Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column: Messages (According to user: "משמאלו הודעות" - To its left messages) */}
            {/* Note: In RTL, left is the second visual column if reading right-to-left naturally, 
                but in grid layout code, we place them. 
                If user says "Right - Pending", "Left - Messages".
                In HTML dir=rtl: First div is Right, Second div is Left. 
            */}
            
            {/* Right Side Column (Pending + Stats) */}
            <div className="space-y-6">
                
                {/* Pending Approvals */}
                <Card className="border-amber-200 bg-amber-50/30 shadow-sm h-fit">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-bold text-amber-700 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            ממתין לאישור ({pendingEvents.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pendingEvents.length === 0 ? (
                            <div className="text-slate-400 text-sm italic">אין שיבוצים הממתינים לאישור</div>
                        ) : (
                            pendingEvents.map(event => (
                                <div key={event.id} className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-slate-800">
                                            {format(new Date(event.start_time), "dd/MM/yyyy")}
                                        </div>
                                        <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">ממתין</Badge>
                                    </div>
                                    <div className="text-sm text-slate-600 mb-3 space-y-1">
                                        <div className="font-bold">{event.school_name}</div>
                                        <div>{format(new Date(event.start_time), "HH:mm")} - {format(new Date(event.end_time), "HH:mm")}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button size="sm" onClick={() => handleReject(event.id)} variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8">
                                            <X className="w-3 h-3 ml-1" /> דחה
                                        </Button>
                                        <Button size="sm" onClick={() => handleApprove(event.id)} className="bg-green-600 hover:bg-green-700 text-white h-8">
                                            <Check className="w-3 h-3 ml-1" /> אשר
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Stats (Underneath Pending) */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <span className="text-sm text-slate-500 font-bold uppercase mb-1">שעות שבוצעו</span>
                            <span className="text-3xl font-black text-emerald-600">{stats.executedHours.toFixed(1)}</span>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <span className="text-sm text-slate-500 font-bold uppercase mb-1">צפי שעות חודשי</span>
                            <span className="text-3xl font-black text-indigo-600">{stats.projectedHours.toFixed(1)}</span>
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* Left Side Column: Messages */}
            <Card className="h-full min-h-[300px] border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        הודעות
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-64">
                    <div className="bg-slate-50 p-4 rounded-full mb-3">
                        <MessageSquare className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-slate-900 font-medium mb-1">אין הודעות חדשות</h3>
                    <p className="text-slate-500 text-sm">הודעות מהמנהל יופיעו כאן</p>
                </CardContent>
            </Card>

        </div>

        {/* Schedule Board (Horizontal) */}
        <div className="space-y-4">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-indigo-600" />
                לוח שיבוצים
             </h2>
             
             {upcomingApprovedEvents.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-dashed text-slate-400">
                    אין שיבוצים עתידיים ביומן
                </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {upcomingApprovedEvents.map(event => (
                        <Link to={createPageUrl(`AssignmentDetails?id=${event.id}`)} key={event.id} className="block group">
                            <Card className="h-full hover:shadow-md transition-all border-slate-200 group-hover:border-indigo-300 cursor-pointer">
                                <CardContent className="p-5 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex flex-col items-center justify-center border border-indigo-100">
                                            <span className="font-bold text-lg leading-none">{format(new Date(event.start_time), "dd")}</span>
                                            <span className="text-[10px] uppercase font-bold">{format(new Date(event.start_time), "MMM")}</span>
                                        </div>
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            {format(new Date(event.start_time), "HH:mm")}
                                        </Badge>
                                    </div>
                                    
                                    <div>
                                        <h3 className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-700 transition-colors" title={event.school_name}>
                                            {event.school_name}
                                        </h3>
                                        <p className="text-sm text-slate-500 line-clamp-1">{event.program_name}</p>
                                    </div>

                                    <div className="pt-2 flex items-center gap-2 text-xs text-slate-400 border-t border-slate-50">
                                        <MapPin className="w-3 h-3" />
                                        <span className="truncate">{event.address}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                 </div>
             )}
        </div>

        {/* Hours Reporting Section */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-6 h-6 text-indigo-600" />
                    דיווח שעות
                </h2>
                <Button onClick={() => setShowAddHoursModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <Clock className="w-4 h-4" />
                    הוסף שעות ידנית
                </Button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-bold grid grid-cols-12 gap-2">
                    <div className="col-span-2">תאריך</div>
                    <div className="col-span-4">תיאור</div>
                    <div className="col-span-2 text-center">שעות</div>
                    <div className="col-span-4 text-center">אישור</div>
                </div>
                
                {[...pastEvents, ...manualReports].sort((a,b) => {
                    const dateA = a.is_manual ? new Date(a.date) : new Date(a.start_time);
                    const dateB = b.is_manual ? new Date(b.date) : new Date(b.start_time);
                    return dateB - dateA;
                }).map((item, idx) => {
                    const isManual = item.is_manual;
                    const date = isManual ? new Date(item.date) : new Date(item.start_time);
                    const duration = isManual ? item.duration : ((new Date(item.end_time) - new Date(item.start_time)) / (1000 * 60 * 60)).toFixed(1);
                    const isVerified = item.employee_verified === 'verified' || isManual;
                    const isRejected = item.employee_verified === 'rejected';

                    return (
                        <div 
                            key={item.id}
                            className={`p-3 grid grid-cols-12 gap-2 items-center hover:bg-slate-50 transition-colors border-b border-slate-100`}
                        >
                            <div className="col-span-2 font-bold text-slate-700">
                                {format(date, "dd/MM")}
                                {!isManual && <div className="text-xs text-slate-400 font-normal">{format(date, "HH:mm")}</div>}
                            </div>
                            <div className="col-span-4">
                                <div className="font-medium text-slate-800 line-clamp-1">
                                    {isManual ? item.program_name : item.school_name}
                                </div>
                                {!isManual && <div className="text-xs text-slate-500 line-clamp-1">{item.program_name}</div>}
                                {isManual && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-50 text-blue-600 border-blue-200">ידני</Badge>}
                            </div>
                            <div className="col-span-2 text-center font-bold text-slate-900">
                                {duration}
                            </div>
                            <div className="col-span-4 flex justify-center gap-2">
                                {isVerified ? (
                                    <div className="flex items-center text-green-600 font-bold text-sm bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                        <Check className="w-3 h-3 mr-1" />
                                        אושר
                                    </div>
                                ) : isRejected ? (
                                    <div className="flex items-center text-red-600 font-bold text-sm bg-red-50 px-2 py-1 rounded-full border border-red-100">
                                        <X className="w-3 h-3 mr-1" />
                                        נדחה
                                    </div>
                                ) : (
                                    <>
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleDisputeShift(item.id, isManual)} 
                                            variant="ghost" 
                                            className="h-8 w-8 p-0 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <X className="w-5 h-5" />
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleVerifyShift(item.id, isManual)} 
                                            variant="ghost" 
                                            className="h-8 w-8 p-0 rounded-full text-green-500 hover:text-green-600 hover:bg-green-50"
                                        >
                                            <Check className="w-5 h-5" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Add Hours Modal */}
        <Dialog open={showAddHoursModal} onOpenChange={setShowAddHoursModal}>
            <DialogContent className="max-w-sm" dir="rtl">
                <DialogHeader>
                    <DialogTitle>דיווח שעות ידני</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>תאריך</Label>
                        <Input 
                            type="date" 
                            value={newReport.date} 
                            onChange={e => setNewReport({...newReport, date: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>מספר שעות</Label>
                        <Input 
                            type="number" 
                            placeholder="למשל: 4.5" 
                            value={newReport.hours} 
                            onChange={e => setNewReport({...newReport, hours: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>הערות / פירוט</Label>
                        <Textarea 
                            placeholder="תיאור הפעילות..." 
                            value={newReport.notes} 
                            onChange={e => setNewReport({...newReport, notes: e.target.value})}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddHoursModal(false)}>ביטול</Button>
                    <Button onClick={handleAddReport} className="bg-indigo-600 hover:bg-indigo-700">שמור דיווח</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}