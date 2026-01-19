import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
// ייבוא ישיר של הישויות כדי למנוע בלבול
import { Syllabus } from "@/entities/Syllabus";
import { Teacher } from "@/entities/Teacher";
import { ScheduleEntry } from "@/entities/ScheduleEntry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Phone, Mail, Calendar, BookOpen, User, Pencil, FileText, ArrowRight } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useLoading } from "@/components/common/LoadingContext";
import { with429Retry } from "@/components/utils/retry";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function TeacherProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const teacherId = searchParams.get("teacherId");

  const [teacher, setTeacher] = useState(null);
  const [assignedPrograms, setAssignedPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    // מנגנון בטיחות: אם אין מזהה, הפסק טעינה מיד
    if (!teacherId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [teacherId]);

  const loadData = async () => {
    showLoader();
    setLoading(true);
    try {
      // 1. טעינת פרטי המורה
      const teacherData = await with429Retry(() => Teacher.get(teacherId));
      
      if (!teacherData) {
        toast({ title: "שגיאה", description: "מורה לא נמצא במערכת", variant: "destructive" });
        setLoading(false);
        hideLoader();
        return;
      }
      setTeacher(teacherData);

      // 2. ניסיון למצוא תוכניות משויכות (לפי יומן או לפי שם מורה)
      try {
        const entries = await with429Retry(() => ScheduleEntry.filter({ assigned_teacher_id: teacherId })).catch(() => []);
        
        // טעינת סילבוסים שבהם המורה מופיע כ"מחבר" או משויך ביומן
        const allSyllabi = await with429Retry(() => Syllabus.list()).catch(() => []);
        
        const relevantPrograms = allSyllabi.filter(s => 
          s.teacher_name === teacherData.name || // לפי שם
          entries.some(e => e.program_id === s.id) // לפי יומן
        );

        setAssignedPrograms(relevantPrograms);
      } catch (err) {
        console.warn("Could not load assigned programs", err);
      }

    } catch (error) {
      console.error("Error loading profile:", error);
      toast({ title: "שגיאה", description: "תקלה בטעינת הפרופיל", variant: "destructive" });
    } finally {
      // חובה לכבות את הטעינה תמיד!
      setLoading(false);
      hideLoader();
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        <p className="text-slate-500">טוען פרופיל עובד...</p>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-4 text-center">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">העובד לא נמצא</h2>
        <p className="text-slate-500 max-w-md">ייתכן שהקישור שבור או שהעובד הוסר מהמערכת.</p>
        <Button onClick={() => navigate(createPageUrl("TeachersList"))}>
          <ArrowRight className="w-4 h-4 ml-2" /> חזרה לרשימה
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* כפתורי ניווט עליונים */}
        <div className="flex justify-between items-center">
             <BackHomeButtons backTo="TeachersList" backLabel="חזור לרשימה" />
             <Button 
               variant="outline" 
               className="gap-2 border-cyan-200 text-cyan-700 hover:bg-cyan-50 shadow-sm bg-white"
               onClick={() => navigate(createPageUrl(`CreateTeacher?id=${teacher.id}`))}
             >
               <Pencil className="w-4 h-4" /> עריכת פרופיל
             </Button>
        </div>

        {/* כרטיס ראשי מעוצב */}
        <Card className="shadow-xl overflow-hidden border-0 bg-white">
            <div className="h-32 bg-gradient-to-r from-cyan-600 via-blue-500 to-purple-500"></div>
            <CardContent className="relative pt-0 px-6 pb-8 text-center">
                <div className="flex flex-col items-center -mt-16 mb-6">
                    <Avatar className="w-32 h-32 border-4 border-white shadow-lg bg-white">
                        <AvatarFallback className="text-4xl font-bold bg-slate-50 text-slate-700">
                            {getInitials(teacher.name)}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <h1 className="text-3xl font-bold text-slate-900">{teacher.name}</h1>
                      <div className="flex items-center gap-2">
                        <Badge variant={teacher.active ? "default" : "secondary"} className={teacher.active ? "bg-green-600 hover:bg-green-700" : ""}>
                           {teacher.active ? "פעיל במערכת" : "לא פעיל / ארכיון"}
                        </Badge>
                        {teacher.job_title && (
                          <Badge variant="outline" className="border-slate-300 text-slate-600">
                            {teacher.job_title}
                          </Badge>
                        )}
                      </div>
                    </div>
                </div>

                {/* פרטי התקשרות */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right max-w-2xl mx-auto">
                    <div className="flex items-center gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100 hover:border-cyan-200 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-green-600">
                          <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">טלפון</div>
                            <div className="font-semibold text-slate-800 dir-ltr text-left">{teacher.phone || "-"}</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">אימייל</div>
                            <div className="font-semibold text-slate-800">{teacher.email || "-"}</div>
                        </div>
                    </div>

                    {teacher.start_work_date && (
                      <div className="flex items-center gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100 hover:border-orange-200 transition-colors md:col-span-2">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-orange-600">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">תחילת עבודה</div>
                              <div className="font-semibold text-slate-800">
                                {format(new Date(teacher.start_work_date), "dd/MM/yyyy")}
                              </div>
                          </div>
                      </div>
                    )}
                </div>

                {/* הערות */}
                {teacher.notes && (
                  <div className="mt-8 mx-auto max-w-2xl bg-amber-50/50 rounded-xl p-5 text-right border border-amber-100">
                    <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" /> הערות מנהל
                    </h3>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {teacher.notes}
                    </p>
                  </div>
                )}
            </CardContent>
        </Card>

        {/* כרטיס תוכניות משויכות */}
        <Card className="shadow-md border-0 bg-white">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    סילבוסים ותוכניות לימוד
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                {assignedPrograms.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500">לא נמצאו תוכניות המשויכות למורה זה.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {assignedPrograms.map(prog => (
                            <div 
                              key={prog.id} 
                              className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group"
                              onClick={() => navigate(createPageUrl(`SyllabusWizard?id=${prog.id}&viewOnly=true`))}
                            >
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-8 bg-purple-500 rounded-full group-hover:h-10 transition-all"></div>
                                  <div>
                                    <div className="font-semibold text-slate-800 group-hover:text-purple-700 transition-colors">
                                      {prog.title || prog.course_topic || "תוכנית ללא שם"}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {prog.subject || "נושא כללי"}
                                    </div>
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 transform group-hover:translate-x-[-4px] transition-all" />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}