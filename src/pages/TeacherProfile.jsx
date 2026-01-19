import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Syllabus } from "@/entities/Syllabus"; // שימוש בישות הנכונה
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Phone, Mail, BookOpen, Pencil, FileText } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { with429Retry } from "@/components/utils/retry";
import { createPageUrl } from "@/utils";

export default function TeacherProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const teacherId = searchParams.get("teacherId");

  const [teacher, setTeacher] = useState(null);
  const [assignedPrograms, setAssignedPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teacherId) {
      loadData();
    } else {
      setLoading(false); // הפסקת טעינה אם אין ID
    }
  }, [teacherId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const teacherData = await with429Retry(() => base44.entities.Teacher.get(teacherId));
      setTeacher(teacherData);

      // ניסיון למצוא סילבוסים שקשורים למורה (לפי שם המורה)
      if (teacherData?.name) {
        const allSyllabi = await with429Retry(() => Syllabus.list());
        const filtered = allSyllabi.filter(s => s.teacher_name === teacherData.name);
        setAssignedPrograms(filtered);
      }
    } catch (error) {
      console.error("Profile load error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">טוען פרופיל עובד...</div>;
  
  if (!teacher) return (
    <div className="p-20 text-center space-y-4">
      <p className="text-slate-500">עובד לא נמצא או שלא נבחר מורה.</p>
      <BackHomeButtons backTo="TeachersList" backLabel="חזור לרשימה" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
             <BackHomeButtons backTo="TeachersList" backLabel="חזור לרשימה" />
             <Button variant="outline" className="gap-2" onClick={() => navigate(createPageUrl(`CreateTeacher?id=${teacher.id}`))}>
               <Pencil className="w-4 h-4" /> עריכה
             </Button>
        </div>

        <Card className="shadow-lg overflow-hidden border-0">
            <div className="h-32 bg-gradient-to-r from-cyan-600 to-teal-500" />
            <CardContent className="relative pt-0 px-6 pb-6 text-center">
                <div className="flex flex-col items-center -mt-16 mb-6">
                    <Avatar className="w-32 h-32 border-4 border-white shadow-md bg-white">
                        <AvatarFallback className="text-4xl font-bold bg-slate-100 text-slate-700">
                            {teacher.name?.[0] || "?"}
                        </AvatarFallback>
                    </Avatar>
                    <h1 className="text-3xl font-bold text-slate-900 mt-4">{teacher.name}</h1>
                    <Badge variant={teacher.active ? "default" : "secondary"} className="mt-2">
                       {teacher.active ? "פעיל" : "לא פעיל"}
                    </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                        <Phone className="w-5 h-5 text-green-600" />
                        <div>
                            <div className="text-xs text-slate-400">טלפון</div>
                            <div className="font-semibold">{teacher.phone || "-"}</div>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                        <Mail className="w-5 h-5 text-blue-600" />
                        <div>
                            <div className="text-xs text-slate-400">אימייל</div>
                            <div className="font-semibold">{teacher.email || "-"}</div>
                        </div>
                    </div>
                </div>

                {teacher.notes && (
                  <div className="mt-6 p-4 bg-cyan-50/50 rounded-xl border border-cyan-100 text-right">
                    <div className="flex items-center gap-2 text-cyan-800 font-semibold mb-2">
                      <FileText className="w-4 h-4" /> <span>הערות</span>
                    </div>
                    <p className="text-sm text-slate-600 italic">"{teacher.notes}"</p>
                  </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}