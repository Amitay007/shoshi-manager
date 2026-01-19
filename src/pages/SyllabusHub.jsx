import React, { useState, useEffect, useMemo } from "react";
// שימוש בייבוא המדויק מה-Wizard וה-Programs
import { Syllabus } from "@/entities/Syllabus";
import { EducationInstitution } from "@/entities/EducationInstitution";
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
  
  // מצבי סינון
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSchool, setFilterSchool] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // טעינה באמצעות הישויות המיובאות (בדיוק כמו ב-Programs)
      const [syllabiData, schoolsData] = await Promise.all([
        with429Retry(() => Syllabus.list()),
        with429Retry(() => EducationInstitution.list())
      ]);
      
      setSyllabi(syllabiData || []);
      setSchools(schoolsData || []);
    } catch (error) {
      console.error("Error loading syllabus hub:", error);
      toast({ title: "שגיאה בטעינת הנתונים", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("האם למחוק את הסילבוס? פעולה זו אינה הפיכה.")) return;
    try {
      await with429Retry(() => Syllabus.delete(id));
      setSyllabi(prev => prev.filter(s => s.id !== id));
      toast({ title: "הסילבוס נמחק" });
    } catch (error) {
      toast({ title: "שגיאה במחיקה", variant: "destructive" });
    }
  };

  const filteredSyllabi = useMemo(() => {
    return syllabi.filter(s => {
      // בדיקת שם/נושא/מקצוע (חסין ל-null)
      const title = (s.title || s.course_topic || s.subject || "").toLowerCase();
      const matchesSearch = !searchTerm || title.includes(searchTerm.toLowerCase());
      
      // סינון סטטוס
      const matchesStatus = filterStatus === "all" || (s.status || "draft") === filterStatus;
      
      // סינון בית ספר
      const matchesSchool = filterSchool === "all" || s.school_id === filterSchool;

      return matchesSearch && matchesStatus && matchesSchool;
    });
  }, [syllabi, searchTerm, filterStatus, filterSchool]);

  if (loading) return <div className="p-12 text-center text-slate-500">טוען סילבוסים...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg text-white">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">מרכז סילבוסים</h1>
              <p className="text-slate-500">ניהול וריכוז התכנים הפדגוגיים</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("SyllabusWizard")}>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-md">
                <Plus className="w-4 h-4" /> סילבוס חדש
              </Button>
            </Link>
            <BackHomeButtons backTo="CRMHub" backLabel="אנשי קשר" />
          </div>
        </div>

        {/* Filters Panel */}
        <Card className="border-none shadow-sm">
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
                {schools.map(sch => (
                  <SelectItem key={sch.id} value={sch.id}>{sch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {setSearchTerm(""); setFilterStatus("all"); setFilterSchool("all");}} className="gap-2">
              <RotateCcw className="w-4 h-4" /> איפוס
            </Button>
          </CardContent>
        </Card>

        {/* Grid Results */}
        {filteredSyllabi.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-xl border-2 border-dashed">
            <p className="text-slate-400">לא נמצאו סילבוסים להצגה.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSyllabi.map(s => (
              <Card 
                key={s.id} 
                className="hover:shadow-md transition-all cursor-pointer bg-white group overflow-hidden"
                onClick={() => window.location.href = createPageUrl(`SyllabusWizard?id=${s.id}`)}
              >
                <div className="h-1 bg-purple-500" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg line-clamp-1 group-hover:text-purple-600">
                      {s.title || s.course_topic || s.subject || "סילבוס"}
                    </CardTitle>
                    <Badge variant={s.status === "final" ? "default" : "outline"} className={s.status === "final" ? "bg-green-600" : ""}>
                      {s.status === "final" ? "מאושר" : "טיוטה"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <GraduationCap className="w-4 h-4 text-purple-400" />
                    <span className="truncate">{schools.find(sch => sch.id === s.school_id)?.name || "שיוך כללי"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>{s.teacher_name || "מורה לא מוגדר"}</span>
                  </div>
                  <div className="pt-3 border-t flex justify-end gap-2">
                    <Button 
                      variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50"
                      onClick={(e) => handleDelete(s.id, e)}
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