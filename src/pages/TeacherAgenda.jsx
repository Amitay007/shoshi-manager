import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calendar, Check, X, MapPin, Phone, Bell, Clock, 
  ChevronRight, Navigation, FileText, AlertCircle, History 
} from "lucide-react";
import { format, addDays, subDays, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { he } from "date-fns/locale";
import BackHomeButtons from "@/components/common/BackHomeButtons";

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
  const [alertText, setAlertText] = useState("");
  const [alertEventId, setAlertEventId] = useState(null);

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
  
  const upcomingEvents = events
    .filter(e => (e.status === 'approved' || e.status === 'pending_teacher_approval') && new Date(e.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    
  // Filter out the pending ones from upcoming list to avoid duplication if desired, 
  // OR keep them but "Pending Approvals" section is specifically for acting on them.
  // The requirements say "Pending Approvals" is Section A. "Upcoming Schedule" is Section B (timeline of future APPROVED events).
  // So I will filter upcoming to ONLY approved.
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

  const openReportModal = (event) => {
    setSelectedReport(event);
    setReportNotes(event.personal_notes || "");
  };

  const saveReport = () => {
    setEvents(prev => prev.map(e => e.id === selectedReport.id ? { ...e, personal_notes: reportNotes } : e));
    setSelectedReport(null);
  };

  const handleAddAlert = (id) => {
    if (!alertText) return;
    alert(`התראה נוספה בהצלחה: ${alertText}`);
    setAlertText("");
    setAlertEventId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur shadow-sm border-b border-slate-200">
        <div className="max-w-md mx-auto p-4">
          <div className="flex justify-between items-center mb-4">
             <h1 className="text-xl font-bold text-slate-800">אזור אישי (יומן)</h1>
             <BackHomeButtons showHomeButton={true} backTo="Humanmanagement" backLabel="חזרה" className="text-xs" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 flex flex-col items-center">
              <span className="text-xs text-emerald-600 font-bold uppercase">שעות שבוצעו</span>
              <span className="text-2xl font-black text-emerald-700">{stats.executedHours.toFixed(1)}</span>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100 flex flex-col items-center">
              <span className="text-xs text-indigo-600 font-bold uppercase">צפי שעות חודשי</span>
              <span className="text-2xl font-black text-indigo-700">{stats.projectedHours.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-8 pb-24">
        
        {/* Section A: Pending Approvals */}
        {pendingEvents.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-amber-600 mb-3 flex items-center gap-2 px-1">
              <AlertCircle className="w-4 h-4" />
              ממתינים לאישור ({pendingEvents.length})
            </h2>
            <div className="space-y-4">
              {pendingEvents.map(event => (
                <Card key={event.id} className="border-amber-200 bg-amber-50/50 shadow-sm overflow-hidden">
                  <div className="h-1 bg-amber-400 w-full"></div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                       <div className="font-bold text-lg text-slate-800">
                          {format(new Date(event.start_time), "dd/MM/yyyy")}
                       </div>
                       <Badge className="bg-amber-500 hover:bg-amber-600">ממתין לאישור</Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="font-mono font-bold">
                          {format(new Date(event.start_time), "HH:mm")} - {format(new Date(event.end_time), "HH:mm")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Building2Icon className="w-4 h-4 text-amber-600" />
                        <span className="font-medium">{event.school_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>{event.address}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => handleReject(event.id)} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                        <X className="w-4 h-4 ml-2" /> דחה
                      </Button>
                      <Button onClick={() => handleApprove(event.id)} className="bg-green-600 hover:bg-green-700 text-white">
                        <Check className="w-4 h-4 ml-2" /> אשר
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Section B: Upcoming Schedule */}
        <section>
           <h2 className="text-sm font-bold text-indigo-900 mb-3 px-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              לוז שיבוצים (מאושר)
           </h2>
           
           <div className="space-y-0 relative">
              {/* Timeline Line */}
              <div className="absolute top-4 bottom-4 right-[19px] w-0.5 bg-indigo-100 z-0"></div>

              {upcomingApprovedEvents.length === 0 ? (
                 <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed">
                    אין שיבוצים עתידיים
                 </div>
              ) : (
                upcomingApprovedEvents.map((event, index) => (
                  <div key={event.id} className="relative z-10 mb-6 last:mb-0">
                     <div className="flex gap-4">
                        {/* Date Circle */}
                        <div className="flex flex-col items-center gap-1 shrink-0 w-10 pt-1">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex flex-col items-center justify-center shadow-md border-2 border-white text-xs leading-none">
                                <span className="font-bold">{format(new Date(event.start_time), "dd")}</span>
                                <span className="text-[9px] opacity-80">{format(new Date(event.start_time), "MM")}</span>
                            </div>
                        </div>

                        {/* Event Card */}
                        <Card className="flex-1 border-0 shadow-md hover:shadow-lg transition-shadow bg-white overflow-hidden">
                           <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2 text-indigo-700 font-bold font-mono text-lg">
                                      {format(new Date(event.start_time), "HH:mm")}
                                      <span className="text-slate-300 text-sm font-light">-</span>
                                      {format(new Date(event.end_time), "HH:mm")}
                                  </div>
                              </div>
                              
                              <h3 className="font-bold text-slate-900 text-lg mb-1">{event.school_name}</h3>
                              <p className="text-slate-600 font-medium mb-3 flex items-center gap-2">
                                 <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs">{event.class_name}</span>
                                 <span className="text-xs text-slate-400">•</span>
                                 <span className="text-sm">{event.program_name}</span>
                              </p>

                              <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 bg-slate-50 p-2 rounded">
                                 <MapPin className="w-4 h-4 shrink-0" />
                                 <span className="truncate">{event.address}</span>
                              </div>

                              {/* Actions Toolbar */}
                              <div className="flex gap-2 pt-2 border-t border-slate-100">
                                 <a 
                                    href={`https://waze.com/ul?q=${encodeURIComponent(event.address)}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="flex-1"
                                 >
                                    <Button variant="outline" size="sm" className="w-full gap-1 text-blue-600 border-blue-100 bg-blue-50 hover:bg-blue-100">
                                       <Navigation className="w-3.5 h-3.5" /> Waze
                                    </Button>
                                 </a>
                                 
                                 <a href={`tel:${event.contact_phone}`} className="flex-1">
                                    <Button variant="outline" size="sm" className="w-full gap-1 text-green-600 border-green-100 bg-green-50 hover:bg-green-100">
                                       <Phone className="w-3.5 h-3.5" /> חיוג
                                    </Button>
                                 </a>

                                 <Dialog open={alertEventId === event.id} onOpenChange={(isOpen) => setAlertEventId(isOpen ? event.id : null)}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-10 px-0 text-amber-600 border-amber-100 bg-amber-50 hover:bg-amber-100">
                                            <Bell className="w-4 h-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent dir="rtl">
                                        <DialogHeader>
                                            <DialogTitle>הוספת תזכורת</DialogTitle>
                                        </DialogHeader>
                                        <div className="py-4">
                                            <Label className="mb-2 block">תוכן התזכורת</Label>
                                            <Input 
                                                value={alertText}
                                                onChange={(e) => setAlertText(e.target.value)}
                                                placeholder="למשל: להביא ציוד VR נוסף..."
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={() => handleAddAlert(event.id)}>שמור תזכורת</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                 </Dialog>
                              </div>
                           </CardContent>
                        </Card>
                     </div>
                  </div>
                ))
              )}
           </div>
        </section>

        {/* Section C: History & Reporting */}
        <section className="pt-4 border-t border-slate-200">
           <h2 className="text-sm font-bold text-slate-500 mb-3 px-1 flex items-center gap-2">
              <History className="w-4 h-4" />
              היסטוריה ודיווחים
           </h2>
           
           <div className="space-y-3">
              {pastEvents.map(event => (
                 <div 
                    key={event.id} 
                    onClick={() => openReportModal(event)}
                    className="flex gap-3 items-center p-3 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors group opacity-80 hover:opacity-100"
                 >
                    <div className="flex flex-col items-center min-w-[50px] border-l border-slate-100 pl-3">
                       <span className="font-bold text-slate-700">{format(new Date(event.start_time), "dd/MM")}</span>
                       <span className="text-xs text-slate-400">{format(new Date(event.start_time), "HH:mm")}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                       <h4 className="font-bold text-slate-700 truncate">{event.school_name}</h4>
                       <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{event.class_name}</span>
                          {event.status === 'done' ? (
                             <Badge variant="outline" className="bg-green-50 text-green-700 border-0 h-5 px-1.5 text-[10px]">בוצע</Badge>
                          ) : (
                             <Badge variant="outline" className="bg-red-50 text-red-700 border-0 h-5 px-1.5 text-[10px]">בוטל</Badge>
                          )}
                       </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                 </div>
              ))}
           </div>
        </section>

      </div>

      {/* Report Modal */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
         <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
               <DialogTitle>פרטי דיווח / שיעור</DialogTitle>
            </DialogHeader>
            {selectedReport && (
               <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                     <div>
                        <p className="font-bold text-slate-800">{selectedReport.school_name}</p>
                        <p className="text-sm text-slate-500">{format(new Date(selectedReport.start_time), "dd/MM/yyyy HH:mm")}</p>
                     </div>
                     <Badge className={selectedReport.status === 'done' ? "bg-green-600" : "bg-red-600"}>
                        {selectedReport.status === 'done' ? "בוצע" : "בוטל"}
                     </Badge>
                  </div>
                  
                  <div className="space-y-2">
                     <Label>הערות אישיות / סיכום שיעור</Label>
                     <Textarea 
                        rows={5}
                        value={reportNotes}
                        onChange={(e) => setReportNotes(e.target.value)}
                        placeholder="כתוב כאן הערות לעצמך על השיעור..."
                        className="bg-yellow-50/50 border-yellow-200 focus:border-yellow-400"
                     />
                  </div>
               </div>
            )}
            <DialogFooter>
               <Button onClick={saveReport} className="w-full sm:w-auto">שמור שינויים</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

    </div>
  );
}

// Simple icon wrapper
function Building2Icon({className}) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>;
}