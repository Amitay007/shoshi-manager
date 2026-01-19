import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Plus, Filter, Search, Calendar, Users, GraduationCap, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { with429Retry } from "@/components/utils/retry";
import { format } from "date-fns";

export default function SyllabusHub() {
  const [syllabi, setSyllabi] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [instPrograms, setInstPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSchool, setFilterSchool] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // טעינת סילבוסים ראשונה כדי להבטיח שהם יוצגו גם אם ישויות אחרות נכשלות
      const syllabiData = await with429Retry(() => base44.entities.Syllabus.list());
      setSyllabi(syllabiData || []);

      // טעינת נתונים משניים עם "הגנה" מפני שגיאות בישויות אחרות (כמו מורים או מוסדות)
      try {
        const [schoolsData, teachersData, instProgramsData] = await Promise.all([
          with429Retry(() => base44.entities.EducationInstitution.list()).catch(() => []),
          with429Retry(() => base44.entities.Teacher.list()).catch(() => []),
          with429Retry(() => base44.entities.InstitutionProgram.list()).catch(() => [])
        ]);
        setSchools(schoolsData || []);
        setTeachers(teachersData || []);
        setInstPrograms(instProgramsData || []);
      } catch (secondaryError) {
        console.warn("Could not load some secondary entities:", secondaryError);
      }
    } catch (error) {
      console.error("Error loading syllabi:", error);
      toast({ title: "שגיאה בטעינת הסילבוסים", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleDelete = async (syllabus, e) => {
    e.stopPropagation();
    if (!confirm(`האם למחוק את הסילבוס "${syllabus.title || "סילבוס"}"?`)) return;

    try {
      await with429Retry(() => base44.entities.Syllabus.delete(syllabus.id));
      setSyllabi(prev => prev.filter(s => s.id !== syllabus.id));
      toast({ title: "הסילבוס נמחק בהצלחה" });
    } catch (error) {
      toast({ title: "שגיאה במחיקת הסילבוס", variant: "destructive" });
    }
  };

  const safeRender = (val) => {
    if (!val) return "לא הוגדר";
    return Array.isArray(val) ? val.join(", ") : val;
  };

  const filteredSyllabi = useMemo(() => 
    syllabi.filter(s => {
      const matchesSearch = !searchTerm || 
        (s.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.subject || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || s.status === filterStatus;
      const matchesSchool = filterSchool === "all" || s.school_id === filterSchool;
      return matchesSearch && matchesStatus && matchesSchool;
    }),
    [syllabi, searchTerm, filterStatus, filterSchool]
  );

  if (loading) return <div className="p-12 text-center text-slate-500">טוען נתונים...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">מרכז סילבוסים</h1>
              <p className="text-slate-500">ניהול תכנים פדגוגיים</p>
            </div>
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <Link to={createPageUrl("SyllabusWizard")} className="flex-1">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 gap-2 text-white">
                <Plus className="w-4 h-4" /> סילבוס חדש
              </Button>
            </Link>
            <BackHomeButtons backTo="CRMHub" backLabel="אנשי קשר" />
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-0">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                placeholder="חיפוש סילבוס..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pr-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="סטטוס" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="draft">טיוטה</SelectItem>
                <SelectItem value="final">מאושר</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSchool} onValueChange={setFilterSchool}>
              <SelectTrigger><SelectValue placeholder="בית ספר" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל בתי הספר</SelectItem>
                {schools.map(sch => <SelectItem key={sch.id} value={sch.id}>{sch.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Grid */}
        {filteredSyllabi.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">לא נמצאו סילבוסים</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSyllabi.map(syllabus => (
              <Card key={syllabus.id} className="hover:shadow-md transition-all cursor-pointer bg-white group overflow-hidden">
                <div className="h-1.5 bg-purple-500" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg line-clamp-1 group-hover:text-purple-600">
                      {syllabus.title || syllabus.subject || "סילבוס ללא שם"}
                    </CardTitle>
                    <Badge variant={syllabus.status === "draft" ? "outline" : "default"} className={syllabus.status === "draft" ? "bg-amber-50 text-amber-700" : "bg-green-600"}>
                      {syllabus.status === "draft" ? "טיוטה" : "מאושר"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <GraduationCap className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">תחומי תוכן:</span>
                    <span className="truncate">{safeRender(syllabus.content_areas)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4 text-cyan-500" />
                    <span className="font-medium">קהל יעד:</span>
                    <span className="truncate">{safeRender(syllabus.target_audience)}</span>
                  </div>
                  <div className="pt-3 border-t flex gap-2">
                    <Button 
                      variant="outline" size="sm" className="flex-1 text-xs"
                      onClick={() => window.location.href = createPageUrl(`SyllabusWizard?id=${syllabus.id}`)}
                    >
                      עריכה
                    </Button>
                    <Button 
                      variant="outline" size="icon" className="h-8 w-8 text-red-500 border-red-100 hover:bg-red-50"
                      onClick={(e) => handleDelete(syllabus, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}