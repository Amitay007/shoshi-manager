import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Plus, Search, Trash2, GraduationCap, RotateCcw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { with429Retry } from "@/components/utils/retry";

export default function SyllabusHub() {
  const [syllabi, setSyllabi] = useState([]);
  const [schools, setSchools] = useState([]);
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
      // טעינת הנתונים
      const res = await with429Retry(() => base44.entities.Syllabus.list());
      const schoolsData = await with429Retry(() => base44.entities.EducationInstitution.list()).catch(() => []);
      
      // הדפסה לבדיקה - תפתח F12 ותראה מה מופיע כאן
      console.log("Raw Syllabus Response:", res);

      // טיפול במקרה שהשרת מחזיר אובייקט עם results במקום מערך (נפוץ ב-Base44)
      const dataArray = Array.isArray(res) ? res : (res?.results || res?.data || []);
      
      setSyllabi(dataArray);
      setSchools(schoolsData);
    } catch (error) {
      console.error("Load Error:", error);
      toast({ title: "שגיאה בטעינה", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredSyllabi = useMemo(() => {
    return syllabi.filter(s => {
      // בודק את כל השדות האפשריים לשם הסילבוס
      const title = (s.title || s.subject || s.course_topic || s.name || "").toLowerCase();
      const matchesSearch = !searchTerm || title.includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || (s.status || "draft") === filterStatus;
      const matchesSchool = filterSchool === "all" || s.school_id === filterSchool;
      
      return matchesSearch && matchesStatus && matchesSchool;
    });
  }, [syllabi, searchTerm, filterStatus, filterSchool]);

  if (loading) return <div className="p-12 text-center">טוען נתונים...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">מרכז סילבוסים</h1>
              <p className="text-slate-500">נמצאו {filteredSyllabi.length} סילבוסים</p>
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

        {/* פאנל סינון */}
        <Card className="shadow-sm border-none">
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
            <Button variant="outline" onClick={() => {setSearchTerm(""); setFilterStatus("all"); setFilterSchool("all");}} className="gap-2">
              <RotateCcw className="w-4 h-4" /> איפוס
            </Button>
          </CardContent>
        </Card>

        {/* רשימה */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSyllabi.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-all cursor-pointer bg-white" onClick={() => window.location.href = createPageUrl(`SyllabusWizard?id=${s.id}`)}>
              <div className="h-1 bg-purple-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{s.title || s.subject || s.course_topic || s.name || "סילבוס ללא שם"}</CardTitle>
                <Badge variant="outline" className="w-fit">{s.status === "final" ? "מאושר" : "טיוטה"}</Badge>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4 text-purple-400" />
                  <span>{schools.find(sch => sch.id === s.school_id)?.name || "שיוך כללי"}</span>
                </div>
                <div className="flex justify-end pt-4 border-t mt-4">
                   <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); if(confirm("למחוק?")) base44.entities.Syllabus.delete(s.id).then(loadData); }}>
                     <Trash2 className="w-4 h-4" />
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}