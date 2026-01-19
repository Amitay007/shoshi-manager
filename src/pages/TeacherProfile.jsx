import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Briefcase, Phone, Mail, Calendar, BookOpen, User } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useLoading } from "@/components/common/LoadingContext";
import { with429Retry } from "@/components/utils/retry";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

export default function TeacherProfile() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const teacherId = searchParams.get("teacherId");

  const [teacher, setTeacher] = useState(null);
  const [assignedPrograms, setAssignedPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    loadData();
  }, [teacherId]);

  const loadData = async () => {
    if (!teacherId) return;

    showLoader();
    setLoading(true);
    try {
      // Fetch Teacher
      const teacherData = await with429Retry(() => base44.entities.Teacher.get(teacherId));
      if (!teacherData) {
        toast({ title: "שגיאה", description: "מורה לא נמצא", variant: "destructive" });
        return;
      }
      setTeacher(teacherData);

      // Fetch Assigned Programs via ScheduleEntry
      // We look for schedule entries assigned to this teacher to deduce programs
      const entries = await with429Retry(() => base44.entities.ScheduleEntry.filter({ assigned_teacher_id: teacherId }));
      
      // Extract unique program IDs
      const uniqueProgramIds = [...new Set(entries.map(e => e.program_id))];
      
      // Fetch Syllabus details for these programs
      if (uniqueProgramIds.length > 0) {
        const programsData = await Promise.all(
          uniqueProgramIds.map(id => with429Retry(() => base44.entities.Syllabus.get(id)).catch(() => null))
        );
        setAssignedPrograms(programsData.filter(Boolean));
      } else {
        setAssignedPrograms([]);
      }

    } catch (error) {
      console.error("Error loading profile:", error);
      toast({ title: "שגיאה", description: "לא הצלחנו לטעון את הנתונים", variant: "destructive" });
    } finally {
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
    return <div className="p-8 text-center">טוען נתונים...</div>;
  }

  if (!teacher) {
    return (
        <div className="p-8 text-center bg-slate-50 min-h-screen flex flex-col items-center justify-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">מורה לא נמצא</h2>
            <BackHomeButtons backTo="TeachersList" backLabel="חזור לרשימה" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
             <BackHomeButtons backTo="TeachersList" backLabel="חזור לרשימה" />
        </div>

        {/* Minimalist Employee Card */}
        <Card className="shadow-lg overflow-hidden border-0">
            <div className="h-32 bg-gradient-to-r from-purple-600 to-cyan-600"></div>
            <CardContent className="relative pt-0 px-6 pb-6">
                <div className="flex flex-col items-center -mt-16 mb-6">
                    <Avatar className="w-32 h-32 border-4 border-white shadow-md bg-white">
                        <AvatarFallback className="text-4xl font-bold bg-slate-100 text-slate-700">
                            {getInitials(teacher.name)}
                        </AvatarFallback>
                    </Avatar>
                    <h1 className="text-3xl font-bold text-slate-900 mt-4">{teacher.name}</h1>
                    <div className="flex items-center gap-2 text-slate-500 font-medium mt-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{teacher.job_title || "ללא תפקיד מוגדר"}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                            <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-400">טלפון</div>
                            <div className="font-semibold text-slate-800" dir="ltr">{teacher.phone || "-"}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-sm text-slate-400">אימייל</div>
                            <div className="font-semibold text-slate-800">{teacher.email || "-"}</div>
                        </div>
                    </div>
                    
                    {teacher.start_work_date && (
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm text-slate-400">תחילת עבודה</div>
                                <div className="font-semibold text-slate-800">
                                    {format(new Date(teacher.start_work_date), "dd/MM/yyyy")}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* Assigned Programs (Read Only) */}
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    תוכניות לימוד משויכות
                </CardTitle>
            </CardHeader>
            <CardContent>
                {assignedPrograms.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">לא נמצאו תוכניות משויכות למורה זה</p>
                ) : (
                    <div className="grid gap-3">
                        {assignedPrograms.map(prog => (
                            <div key={prog.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-purple-200 transition-colors">
                                <div className="font-medium text-slate-800">
                                    {prog.title || prog.course_topic || "תוכנית ללא שם"}
                                </div>
                                <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                    {prog.subject || "כללי"}
                                </div>
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