import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Phone, Mail, Calendar, BookOpen, User, Pencil, FileText } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useLoading } from "@/components/common/LoadingContext";
import { with429Retry } from "@/components/utils/retry";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from "@/utils";

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
    if (teacherId) loadData();
  }, [teacherId]);

  const loadData = async () => {
    showLoader();
    setLoading(true);
    try {
      const teacherData = await with429Retry(() => base44.entities.Teacher.get(teacherId));
      if (!teacherData) {
        toast({ title: "שגיאה", description: "מורה לא נמצא", variant: "destructive" });
        return;
      }
      setTeacher(teacherData);

      const entries = await with429Retry(() => base44.entities.ScheduleEntry.filter({ assigned_teacher_id: teacherId }));
      const uniqueProgramIds = [...new Set(entries.map(e => e.program_id))];
      
      if (uniqueProgramIds.length > 0) {
        const programsData = await Promise.all(
          uniqueProgramIds.map(id => with429Retry(() => base44.entities.Syllabus.get(id)).catch(() => null))
        );
        setAssignedPrograms(programsData.filter(Boolean));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
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

  if (loading) return <div className="p-8 text-center">טוען פרופיל...</div>;
  if (!teacher) return <div className="p-8 text-center">עובד לא נמצא.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center">
             <BackHomeButtons backTo="TeachersList" backLabel="חזור לרשימה" />
             <Button 
               variant="outline" 
               className="gap-2 border-cyan-200 text-cyan-700 hover:bg-cyan-50 shadow-sm"
               onClick={() => navigate(createPageUrl(`CreateTeacher?id=${teacher.id}`))}
             >
               <Pencil className="w-4 h-4" /> עריכת פרופיל
             </Button>
        </div>

        <Card className="shadow-lg overflow-hidden border-0">
            <div className="h-32 bg-gradient-to-r from-cyan-600 to-teal-500"></div>
            <CardContent className="relative pt-0 px-6 pb-6 text-center">
                <div className="flex flex-col items-center -mt-16 mb-6">
                    <Avatar className="w-32 h-32 border-4 border-white shadow-md bg-white">
                        <AvatarFallback className="text-4xl font-bold bg-slate-100 text-slate-700">
                            {getInitials(teacher.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <h1 className="text-3xl font-bold text-slate-900">{teacher.name}</h1>
                      <Badge variant={teacher.active ? "default" : "secondary"}>
                         {teacher.active ? "פעיל במערכת" : "לא פעיל"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 font-medium mt-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{teacher.job_title || "ללא תפקיד מוגדר"}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <Phone className="w-5 h-5 text-green-600" />
                        <div>
                            <div className="text-xs text-slate-400">טלפון</div>
                            <div className="font-semibold text-slate-800" dir="ltr">{teacher.phone || "-"}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <Mail className="w-5 h-5 text-blue-600" />
                        <div>
                            <div className="text-xs text-slate-400">אימייל</div>
                            <div className="font-semibold text-slate-800">{teacher.email || "-"}</div>
                        </div>
                    </div>
                </div>

                {teacher.notes && (
                  <div className="mt-6 p-4 bg-cyan-50/50 rounded-xl border border-cyan-100 text-right">
                    <div className="flex items-center gap-2 text-cyan-800 font-semibold mb-2">
                      <FileText className="w-4 h-4" />
                      <span>הערות ומידע נוסף</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed italic">"{teacher.notes}"</p>
                  </div>
                )}
            </CardContent>
        </Card>

        <Card className="shadow-md">
            <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    תוכניות לימוד משויכות
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                {assignedPrograms.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">טרם שויכו תוכניות לימוד לעובד זה</p>
                ) : (
                    <div className="grid gap-3">
                        {assignedPrograms.map(prog => (
                            <div key={prog.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-lg hover:border-purple-200 transition-colors shadow-sm">
                                <div className="font-medium text-slate-800">{prog.title || prog.course_topic || "תוכנית ללא שם"}</div>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100">{prog.subject || "כללי"}</Badge>
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