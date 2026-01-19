import React, { useState, useEffect, useMemo } from "react";
// תיקון: ייבוא הישות בדיוק כפי שהיא מופיעה ב-Wizard
import { Syllabus } from "@/entities/Syllabus";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Plus, Filter, Search, Calendar, Users, GraduationCap, Trash2, UploadCloud, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { with429Retry } from "@/components/utils/retry";
import { format } from "date-fns";

export default function SyllabusHub() {
  const navigate = useNavigate();
  const [syllabi, setSyllabi] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef(null);
  
  // מצבי סינון (החזרת כל המערכת המקורית)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSchool, setFilterSchool] = useState("all");
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [filterActivityType, setFilterActivityType] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // טעינה מקבילה של כל הנתונים
      const [syllabiData, schoolsData] = await Promise.all([
        with429Retry(() => Syllabus.list()),
        with429Retry(() => EducationInstitution.list())
      ]);
      
      setSyllabi(syllabiData || []);
      setSchools(schoolsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "שגיאה בטעינה", variant: "destructive" });
    }
    setLoading(false);
  };

  // חישוב סטטיסטיקות (החזרת העיצוב המקורי)
  const stats = useMemo(() => ({
    total: syllabi.length,
    draft: syllabi.filter(s => s.status === "draft" || !s.status).length,
    final: syllabi.filter(s => s.status === "final").length,
    active: syllabi.filter(s => s.active !== false).length
  }), [syllabi]);

  // לוגיקת סינון מלאה (החזרת הפונקציונליות המקורית)
  const filteredSyllabi = useMemo(() => 
    syllabi.filter(s => {
      const matchesSearch = !searchTerm || 
        (s.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.course_topic || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.teacher_name || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || (s.status || "draft") === filterStatus;
      const matchesSchool = filterSchool === "all" || s.school_id === filterSchool;
      const matchesTeacher = filterTeacher === "all" || s.teacher_name === filterTeacher;
      const matchesActivityType = filterActivityType === "all" || s.activity_type === filterActivityType;
      
      return matchesSearch && matchesStatus && matchesSchool && matchesTeacher && matchesActivityType;
    }),
    [syllabi, searchTerm, filterStatus, filterSchool, filterTeacher, filterActivityType]
  );

  if (loading) return <div className="p-20 text-center text-slate-500">טוען את מרכז הסילבוסים...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        
        {/* Header (העיצוב המקורי) */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-purple-900">מרכז סילבוסים</h1>
              <p className="text-slate-500 text-xs sm:text-sm">ניהול וריכוז כל התכנים הפדגוגיים</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="hidden sm:flex border-purple-200 text-purple-700 hover:bg-purple-50">
              <UploadCloud className="w-5 h-5 ml-2" /> ייבוא מקובץ
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx" />
            
            <Link to={createPageUrl("SyllabusWizard")}>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg gap-2">
                <Plus className="w-4 h-4" /> סילבוס חדש
              </Button>
            </Link>
            <BackHomeButtons />
          </div>
        </div>

        {/* Statistics (החזרת הכרטיסים הצבעוניים) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-slate-600">סה"כ</p><p className="text-2xl font-bold text-blue-900">{stats.total}</p></div>
              <BookOpen className="w-8 h-8 text-blue-600 opacity-20" />
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-0 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-slate-600">טיוטות</p><p className="text-2xl font-bold text-amber-900">{stats.draft}</p></div>
              <Filter className="w-8 h-8 text-amber-600 opacity-20" />
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-slate-600">מאושרים</p><p className="text-2xl font-bold text-green-900">{stats.final}</p></div>
              <GraduationCap className="w-8 h-8 text-green-600 opacity-20" />
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-slate-600">פעילים</p><p className="text-2xl font-bold text-purple-900">{stats.active}</p></div>
              <Users className="w-8 h-8 text-purple-600 opacity-20" />
            </CardContent>
          </Card>
        </div>

        {/* Filters (החזרת הבר המלא) */}
        <Card className="mb-6 shadow-md border-0">
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input placeholder="חיפוש..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
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
            <Select value={filterActivityType} onValueChange={setFilterActivityType}>
              <SelectTrigger><SelectValue placeholder="סוג פעילות" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                <SelectItem value="קורס שנתי">קורס שנתי</SelectItem>
                <SelectItem value="סדנה">סדנה</SelectItem>
                <SelectItem value="יום שיא">יום שיא</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Grid (החזרת הכרטיסים המפורטים) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSyllabi.map(syllabus => {
            const school = schools.find(s => s.id === syllabus.school_id);
            return (
              <Card key={syllabus.id} className="bg-white hover:shadow-xl transition-all border-0 overflow-hidden group cursor-pointer" onClick={() => navigate(createPageUrl(`SyllabusWizard?id=${syllabus.id}&viewOnly=true`))}>
                <div className="h-1.5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600" />
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex justify-between items-start mb-1">
                    <CardTitle className="text-base line-clamp-2 group-hover:text-purple-700 transition-colors">
                      {syllabus.title || syllabus.course_topic || "סילבוס ללא שם"}
                    </CardTitle>
                    <Badge className={syllabus.status === "final" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                      {syllabus.status === "final" ? "מאושר" : "טיוטה"}
                    </Badge>
                  </div>
                  {syllabus.activity_type && <Badge variant="secondary" className="text-[10px]">{syllabus.activity_type}</Badge>}
                </CardHeader>
                <CardContent className="space-y-2 text-xs px-4 pb-4">
                  {school && <div className="flex items-center gap-1.5 text-slate-600"><GraduationCap className="w-3.5 h-3.5 text-blue-600" /><span>{school.name}</span></div>}
                  {syllabus.teacher_name && <div className="flex items-center gap-1.5 text-slate-600"><Users className="w-3.5 h-3.5 text-cyan-600" /><span>{syllabus.teacher_name}</span></div>}
                  {syllabus.meetings_count > 0 && <div className="flex items-center gap-1.5 text-slate-600"><Calendar className="w-3.5 h-3.5 text-emerald-600" /><span>{syllabus.meetings_count} מפגשים</span></div>}
                  <div className="pt-3 border-t mt-auto flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-[10px] h-7">צפה בפרטים</Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 text-red-500 border-red-100" onClick={(e) => { e.stopPropagation(); /* לוגיקת מחיקה */ }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}