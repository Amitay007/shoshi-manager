import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Mail, Phone, Search, Plus, Pencil, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useLoading } from "@/components/common/LoadingContext";
import { with429Retry } from "@/components/utils/retry";
import { Button } from "@/components/ui/button";

export default function TeachersList() {
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    showLoader();
    setLoading(true);
    try {
      const teachersData = await with429Retry(() => base44.entities.Teacher.list());
      setTeachers(teachersData || []);
    } catch (error) {
      console.error("Error loading teachers:", error);
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const filteredTeachers = teachers.filter(t =>
    !searchTerm ||
    (t.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.job_title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name[0];
  };

  if (loading) return <div className="p-8 text-center">טוען צוות...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg text-white">
              <Users className="w-9 h-9" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">צוות יויה</h1>
              <p className="text-slate-600">ניהול עובדים ומדריכים</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate(createPageUrl("CreateTeacher"))} className="bg-cyan-600 hover:bg-cyan-700 gap-2 text-white">
              <Plus className="w-4 h-4" /> הוספת עובד חדש
            </Button>
            <BackHomeButtons backTo="CRMHub" backLabel="חזור למרכז ניהול" />
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="חיפוש לפי שם, תפקיד או אימייל..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((teacher) => (
            <Card key={teacher.id} className={`hover:shadow-md transition-all bg-white flex flex-col ${!teacher.active ? "opacity-60 grayscale-[0.5]" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 bg-cyan-100">
                      <AvatarFallback className="text-cyan-700 font-bold">{getInitials(teacher.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{teacher.name}</CardTitle>
                      <p className="text-xs text-cyan-600 font-medium">{teacher.job_title || "ללא תפקיד"}</p>
                    </div>
                  </div>
                  <Badge variant={teacher.active ? "default" : "secondary"} className="text-[10px]">
                    {teacher.active ? "פעיל" : "לא פעיל"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-2 flex-1">
                {teacher.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{teacher.email}</span>
                  </div>
                )}
                {teacher.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{teacher.phone}</span>
                  </div>
                )}
                {teacher.notes && (
                   <div className="mt-3 p-2 bg-slate-50 rounded border-r-2 border-cyan-200 text-xs text-slate-500 line-clamp-2 italic">
                     "{teacher.notes}"
                   </div>
                )}
              </CardContent>

              <CardContent className="pt-0 border-t flex gap-2 pt-3 mt-auto">
                 <Button 
                   variant="outline" 
                   size="sm" 
                   className="flex-1 gap-1 text-xs"
                   onClick={() => navigate(createPageUrl(`CreateTeacher?id=${teacher.id}`))}
                 >
                   <Pencil className="w-3.5 h-3.5" /> ערוך
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className="flex-1 text-xs text-cyan-600 hover:text-cyan-700"
                   onClick={() => navigate(createPageUrl(`TeacherProfile?teacherId=${teacher.id}`))}
                 >
                   פרופיל מלא
                 </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}