import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Plus, Search, Users, GraduationCap, Trash2, RotateCcw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { with429Retry } from "@/components/utils/retry";

export default function SyllabusHub() {
  const [syllabi, setSyllabi] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // הגדרות סינון
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSchool, setFilterSchool] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // טעינת סילבוסים ובתי ספר במקביל
      const [syllabiData, schoolsData] = await Promise.all([
        with429Retry(() => base44.entities.Syllabus.list()),
        with429Retry(() => base44.entities.EducationInstitution.list()).catch(() => [])
      ]);
      
      setSyllabi(syllabiData || []);
      setSchools(schoolsData || []);
      console.log("Data loaded:", syllabiData);
    } catch (error) {
      console.error("Critical error:", error);
      toast({ title: "שגיאה בטעינה", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterSchool("all");
  };

  // לוגיקת סינון סופר-גמישה
  const filteredSyllabi = syllabi.filter(s => {
    // 1. חיפוש טקסט (בודק כותרת או נושא)
    const title = (s.title || s.subject || s.course_topic || "").toLowerCase();
    const matchesSearch = !searchTerm || title.includes(searchTerm.toLowerCase());
    
    // 2. סינון סטטוס (אם אין סטטוס, הוא נחשב כטיוטה)
    const status = s.status || "draft";
    const matchesStatus = filterStatus === "all" || status === filterStatus;
    
    // 3. סינון בית ספר
    const matchesSchool = filterSchool === "all" || s.school_id === filterSchool;

    return matchesSearch && matchesStatus && matchesSchool;
  });

  if (loading) return <div className="p-12 text-center text-slate-500">טוען סילבוסים...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">מרכז סילבוסים</h1>
              <p className="text-slate-500">נמצאו {filteredSyllabi.length} מתוך {syllabi.length} סילבוסים</p>
            </div>
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <Link to={createPageUrl("SyllabusWizard")} className="flex-1">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2 text-white">
                <Plus className="w-4 h-4" /> סילבוס חדש
              </Button>
            </Link>
            <BackHomeButtons backTo="CRMHub" backLabel="אנשי קשר" />
          </div>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                placeholder="חיפוש..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pr-10"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="סטטוס" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="draft">טיוטה</SelectItem>
                <SelectItem value="final">מאושר</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSchool} onValueChange={setFilterSchool}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="בית ספר" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל בתי הספר</SelectItem>
                {schools.map(sch => <SelectItem key={sch.id} value={sch.id}>{sch.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button variant="ghost" onClick={resetFilters} title="אפס סינונים">
              <RotateCcw className="w-4 h-4 text-slate-400" />
            </Button>
          </CardContent>
        </Card>

        {/* Grid */}
        {filteredSyllabi.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-xl border-2 border-dashed">
            <p className="text-slate-400">לא נמצאו סילבוסים להצגה.</p>
            {syllabi.length > 0 && <Button variant="link" onClick={resetFilters}>נקה את כל המסננים</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSyllabi.map(s => (
              <Card 
                key={s.id} 
                className="hover:shadow-md transition-all cursor-pointer bg-white group overflow-hidden"
                onClick={() => window.location.href = createPageUrl(`SyllabusWizard?id=${s.id}`)}
              >
                <div className="h-1 bg-indigo-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg group-hover:text-indigo-600">
                    {s.title || s.subject || s.course_topic || "סילבוס ללא שם"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-500 italic">
                    <GraduationCap className="w-4 h-4" />
                    <span>{schools.find(sch => sch.id === s.school_id)?.name || "בית ספר כללי"}</span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Badge variant="outline">{s.status === "final" ? "מאושר" : "טיוטה"}</Badge>
                    <Badge variant="secondary">{s.activity_type || "פעילות"}</Badge>
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