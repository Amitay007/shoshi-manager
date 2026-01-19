import React, { useState, useEffect, useMemo } from "react";
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
  const [items, setItems] = useState([]);
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
      // טעינה משולבת מכל המקורות האפשריים
      const [progData, syllabiData, schoolsData] = await Promise.all([
        with429Retry(() => base44.entities.InstitutionProgram.list()).catch(() => []),
        with429Retry(() => base44.entities.Syllabus.list()).catch(() => []),
        with429Retry(() => base44.entities.EducationInstitution.list()).catch(() => [])
      ]);

      // איחוד רשימות למניעת היעלמות
      const combined = [...(progData || []), ...(syllabiData || [])];
      setItems(combined);
      setSchools(schoolsData || []);
    } catch (error) {
      console.error("Load Error:", error);
      toast({ title: "שגיאה בטעינת נתונים", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const name = (item.title || item.name || item.subject || "").toLowerCase();
      const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || (item.status || "draft") === filterStatus;
      const matchesSchool = filterSchool === "all" || item.institution_id === filterSchool || item.school_id === filterSchool;
      
      return matchesSearch && matchesStatus && matchesSchool;
    });
  }, [items, searchTerm, filterStatus, filterSchool]);

  if (loading) return <div className="p-12 text-center">טוען נתונים...</div>;

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
              <p className="text-slate-500">ניהול תוכניות הלימוד של יויה</p>
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
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                placeholder="חיפוש חופשי..." 
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
              <RotateCcw className="w-4 h-4" /> איפוס סינונים
            </Button>
          </CardContent>
        </Card>

        {/* רשימת תוצאות */}
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-xl border-2 border-dashed">
            <p className="text-slate-400 text-lg">לא נמצאו סילבוסים להצגה.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <Card 
                key={item.id} 
                className="hover:shadow-md transition-all cursor-pointer bg-white group overflow-hidden"
                onClick={() => window.location.href = createPageUrl(`SyllabusWizard?id=${item.id}`)}
              >
                <div className="h-1 bg-purple-500" />
                <CardHeader>
                  <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">
                    {item.title || item.name || item.subject || "סילבוס ללא שם"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <GraduationCap className="w-4 h-4 text-purple-400" />
                    <span className="truncate">{schools.find(sch => sch.id === (item.institution_id || item.school_id))?.name || "שיוך כללי"}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t">
                    <Badge variant="secondary">{item.status === "final" ? "מאושר" : "טיוטה"}</Badge>
                    <Trash2 className="w-4 h-4 text-red-500" />
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