import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Plus, Search, Users, GraduationCap, Trash2, Filter } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { with429Retry } from "@/components/utils/retry";

export default function SyllabusHub() {
  const [syllabi, setSyllabi] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // מצבי סינון
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSchool, setFilterSchool] = useState("all");
  const [filterTeacher, setFilterTeacher] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. טעינת סילבוסים (הכי חשוב)
      const syllabiData = await with429Retry(() => base44.entities.Syllabus.list());
      setSyllabi(syllabiData || []);

      // 2. טעינת נתונים משלימים (עם הגנה מפני שגיאות בישויות אחרות)
      try {
        const [schoolsData, teachersData] = await Promise.all([
          with429Retry(() => base44.entities.EducationInstitution.list()).catch(() => []),
          with429Retry(() => base44.entities.Teacher.list()).catch(() => [])
        ]);
        setSchools(schoolsData || []);
        setTeachers(teachersData || []);
      } catch (err) {
        console.warn("Secondary data failed to load, but syllabi are safe.");
      }
    } catch (error) {
      console.error("Critical error loading syllabi:", error);
      toast({ title: "שגיאה בטעינת נתונים", variant: "destructive" });
    }
    setLoading(false);
  };

  // לוגיקת סינון משופרת וחסינה
  const filteredSyllabi = useMemo(() => {
    return syllabi.filter(s => {
      // חיפוש טקסט חופשי
      const matchesSearch = !searchTerm || 
        (s.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.subject || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      // סינון סטטוס
      const matchesStatus = filterStatus === "all" || s.status === filterStatus;
      
      // סינון בית ספר (בודק שדה קיים)
      const matchesSchool = filterSchool === "all" || s.school_id === filterSchool;
      
      // סינון מורה (חסין לערכי null)
      const matchesTeacher = filterTeacher === "all" || s.teacher_name === filterTeacher;

      return matchesSearch && matchesStatus && matchesSchool && matchesTeacher;
    });
  }, [syllabi, searchTerm, filterStatus, filterSchool, filterTeacher]);

  if (loading) return <div className="p-12 text-center">טוען נתונים...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">מרכז סילבוסים</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("SyllabusWizard")}>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                <Plus className="w-4 h-4" /> סילבוס חדש
              </Button>
            </Link>
            <BackHomeButtons backTo="CRMHub" backLabel="אנשי קשר" />
          </div>
        </div>

        {/* Filters Panel */}
        <Card className="shadow-sm">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                placeholder="חיפוש..." 
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

            <Select value={filterTeacher} onValueChange={setFilterTeacher}>
              <SelectTrigger><SelectValue placeholder="מורה" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המורים</SelectItem>
                {[...new Set(syllabi.map(s => s.teacher_name).filter(Boolean))].map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSyllabi.map(s => (
             <Card 
                key={s.id} 
                className="hover:shadow-md transition-all cursor-pointer bg-white overflow-hidden"
                onClick={() => window.location.href = createPageUrl(`SyllabusWizard?id=${s.id}`)}
             >
                <div className="h-1 bg-purple-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{s.title || s.subject || "סילבוס"}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <GraduationCap className="w-4 h-4" />
                    <span>{schools.find(sch => sch.id === s.school_id)?.name || "בית ספר לא מוגדר"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Users className="w-4 h-4" />
                    <span>{s.teacher_name || "מורה לא מוגדר"}</span>
                  </div>
                </CardContent>
             </Card>
          ))}
        </div>
      </div>
    </div>
  );
}