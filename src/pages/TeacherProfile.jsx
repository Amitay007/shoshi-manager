import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Syllabus } from "@/entities/Syllabus";
import { Teacher } from "@/entities/Teacher";
import { ScheduleEntry } from "@/entities/ScheduleEntry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Phone, Mail, Calendar, BookOpen, User, Pencil, FileText, ArrowRight, RefreshCw } from "lucide-react";
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
  const [error, setError] = useState(false);

  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    if (teacherId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [teacherId]);

  const loadData = async () => {
    showLoader();
    setLoading(true);
    setError(false);

    // הגנה מתקיעה: 7 שניות מקסימום
    const timeout = setTimeout(() => {
        setLoading(prev => {
            if (prev) {
                console.error("Profile load timeout");
                setError(true);
                hideLoader();
                return false;
            }
            return false;
        });
    }, 7000);

    try {
      // 1. טעינת פרטי מורה
      const teacherData = await with429Retry(() => Teacher.get(teacherId));
      if (!teacherData) {
        toast({ title: "שגיאה", description: "מורה לא נמצא", variant: "destructive" });
        setLoading(false);
        hideLoader();
        clearTimeout(timeout);
        return;
      }
      setTeacher(teacherData);

      // 2. טעינת תוכניות משויכות (עמיד לשגיאות)
      try {
        const entries = await with429Retry(() => ScheduleEntry.filter({ assigned_teacher_id: teacherId })).catch(() => []);
        const allSyllabi = await with429Retry(() => Syllabus.list()).catch(() => []);
        
        const relevant = allSyllabi.filter(s => 
            s.teacher_name === teacherData.name || 
            entries.some(e => e.program_id === s.id)
        );
        setAssignedPrograms(relevant);
      } catch (e) {
        console.warn("Could not load assigned programs", e);
      }

    } catch (err) {
      console.error("Critical error in profile:", err);
      setError(true);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      hideLoader();
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name[0];
  };

  if (loading) return <div className="p-20 text-center">טוען פרופיל...</div>;
  
  if (error) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
             <div className="text-red-600 font-bold">תקלה בחיבור לשרת</div>
             <Button onClick={() => window.location.reload()} variant="outline"><RefreshCw className="w-4 h-4 ml-2"/> נסה שוב</Button>
             <BackHomeButtons backTo="TeachersList" backLabel="חזרה לרשימה" />
        </div>
    );
  }

  if (!teacher) return <div className="p-20 text-center">עובד לא נמצא.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
             <BackHomeButtons backTo="TeachersList" backLabel="חזרה לרשימה" />
             <Button 
               variant="outline" 
               className="gap-2 border-cyan-200 text-cyan-700 hover:bg-cyan-50 shadow-sm bg-white"
               onClick={() => navigate(createPageUrl(`CreateTeacher?id=${teacher.id}`))}
             >
               <Pencil className="w-4 h-4" /> עריכת פרופיל
             </Button>
        </div>

        {/* Card */}
        <Card className="shadow-lg overflow-hidden border-0 bg-white">
            <div className="h-32 bg-gradient-to-r from-cyan-600 via-blue-500 to-purple-500" />
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
                            <Badge variant={teacher.active ? "default" : "secondary"} className={teacher.active ? "bg-green-600" : ""}>
                                {teacher.active ? "פעיל במערכת" : "לא פעיל"}
                            </Badge>
                            {teacher.job_title && (
                                <Badge variant="outline" className="border-slate-300 text-slate-600">
                                    {teacher.job_title}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right max-w-2xl mx-auto">
                    <div className="flex items-center gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-green-600">
                          <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-medium">טלפון</div>
                            <div className="font-semibold text-slate-800" dir="ltr">{teacher.phone || "-"}</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-medium">אימייל</div>
                            <div className="font-semibold text-slate-800">{teacher.email || "-"}</div>
                        </div>
                    </div>
                </div>

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

        {/* Assigned Programs */}
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
                      <p className="text-slate-500">לא נמצאו תוכניות משויכות.</p>
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
                                    <div className="text-xs text-slate-500">{prog.subject || "כללי"}</div>
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