import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { usePerformanceTracker, measureAsync } from "@/components/utils/diagnostics";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import { BookOpen, Plus, Filter, Search, Calendar, Users, GraduationCap, Trash2 } from "lucide-react";
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
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSchool, setFilterSchool] = useState("all");
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [filterActivityType, setFilterActivityType] = useState("all");

  // Diagnostic Tracker
  usePerformanceTracker("SyllabusHub", loading);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await measureAsync("SyllabusHub", "Load All Data", async () => {
          const [syllabiData, schoolsData, teachersData, instProgramsData] = await Promise.all([
            with429Retry(() => base44.entities.Syllabus.list()),
            with429Retry(() => base44.entities.EducationInstitution.list()),
            with429Retry(() => base44.entities.Teacher.list()),
            with429Retry(() => base44.entities.InstitutionProgram.list())
          ]);
          
          setSyllabi(syllabiData || []);
          setSchools(schoolsData || []);
          setTeachers(teachersData || []);
          setInstPrograms(instProgramsData || []);
      });
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      toast({ title: "מעלה קובץ...", description: "אנא המתן" });
      
      // 1. Upload File
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      toast({ title: "מעבד נתונים...", description: "ה-AI מנתח את הסילבוס שלך (זה עשוי לקחת כדקה)" });

      // 2. Process File
      const response = await base44.functions.invoke('processSyllabusFile', { file_url });
      
      if (response.error) throw new Error(response.error);

      toast({ 
        title: "הייבוא הושלם בהצלחה!", 
        description: "הסילבוס החדש נוסף לרשימה כטיוטה.",
        className: "bg-green-50 border-green-200"
      });

      // 3. Refresh List
      await loadData();

    } catch (error) {
      console.error("Import failed:", error);
      toast({ 
        title: "שגיאה בייבוא", 
        description: error.message || "אירעה תקלה בעת עיבוד הקובץ",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (syllabus, e) => {
    e.stopPropagation();

    // Check for active assignments
    const activeAssignments = instPrograms.filter(ip => ip.program_id === syllabus.id);

    if (activeAssignments.length > 0) {
        const schoolNames = activeAssignments.map(ip => {
              const s = schools.find(sch => sch.id === ip.institution_id);
              return s ? s.name : "מוסד לא ידוע";
        }).join(", ");
        alert(`לא ניתן למחוק את הסילבוס כיוון שהוא משויך ל-${activeAssignments.length} בתי ספר פעילים:\n${schoolNames}\n\nיש להסיר את השיוך ב'תוכניות' לפני המחיקה.`);
        return;
    }

    if (!confirm(`האם למחוק את הסילבוס "${syllabus.title || syllabus.course_topic || syllabus.subject}"? פעולה זו אינה הפיכה.`)) return;

    try {
      await with429Retry(() => base44.entities.Syllabus.delete(syllabus.id));
      setSyllabi(prev => prev.filter(s => s.id !== syllabus.id));
      toast({ title: "הסילבוס נמחק בהצלחה" });
    } catch (error) {
      console.error("Error deleting syllabus:", error);
      toast({ title: "שגיאה במחיקת הסילבוס", variant: "destructive" });
    }
  };

  const filteredSyllabi = useMemo(() => 
    syllabi.filter(s => {
      const matchesSearch = !searchTerm || 
        (s.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.course_topic || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.teacher_name || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || s.status === filterStatus;
      const matchesSchool = filterSchool === "all" || s.school_id === filterSchool;
      const matchesTeacher = filterTeacher === "all" || s.teacher_name === filterTeacher;
      const matchesActivityType = filterActivityType === "all" || s.activity_type === filterActivityType;
      
      return matchesSearch && matchesStatus && matchesSchool && matchesTeacher && matchesActivityType;
    }),
    [syllabi, searchTerm, filterStatus, filterSchool, filterTeacher, filterActivityType]
  );

  const stats = useMemo(() => ({
    total: syllabi.length,
    draft: syllabi.filter(s => s.status === "draft").length,
    final: syllabi.filter(s => s.status === "final").length,
    active: syllabi.filter(s => s.active !== false).length
  }), [syllabi]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-purple-900">מרכז סילבוסים</h1>
              <p className="text-slate-500 text-xs sm:text-sm">ניהול וריכוז כל הסילבוסים במערכת</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.docx,.txt,.md" 
              onChange={handleFileUpload}
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="border-purple-200 text-purple-700 hover:bg-purple-50 hidden sm:flex"
            >
              {isImporting ? (
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
              ) : (
                <UploadCloud className="w-5 h-5 ml-2" />
              )}
              {isImporting ? "מעבד..." : "ייבוא מקובץ"}
            </Button>

            <Link to={createPageUrl("SyllabusWizard")} className="flex-1 sm:flex-none">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                סילבוס חדש
              </Button>
            </Link>
            <div className="hidden lg:block">
              <BackHomeButtons />
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">סה"כ סילבוסים</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <BookOpen className="w-10 h-10 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">טיוטות</p>
                  <p className="text-3xl font-bold text-amber-900">{stats.draft}</p>
                </div>
                <Filter className="w-10 h-10 text-amber-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">מאושרים</p>
                  <p className="text-3xl font-bold text-green-900">{stats.final}</p>
                </div>
                <GraduationCap className="w-10 h-10 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">פעילים</p>
                  <p className="text-3xl font-bold text-purple-900">{stats.active}</p>
                </div>
                <Users className="w-10 h-10 text-purple-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <Input
                  placeholder="חיפוש..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="draft">טיוטה</SelectItem>
                  <SelectItem value="final">מאושר</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSchool} onValueChange={setFilterSchool}>
                <SelectTrigger>
                  <SelectValue placeholder="בית ספר" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל בתי הספר</SelectItem>
                  {schools.map(school => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="מורה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המורים</SelectItem>
                  {[...new Set(syllabi.map(s => s.teacher_name).filter(Boolean))].map(name => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterActivityType} onValueChange={setFilterActivityType}>
                <SelectTrigger>
                  <SelectValue placeholder="סוג פעילות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  <SelectItem value="קורס שנתי">קורס שנתי</SelectItem>
                  <SelectItem value="קורס חצי שנתי">קורס חצי שנתי</SelectItem>
                  <SelectItem value="שיעור חד-פעמי">שיעור חד-פעמי</SelectItem>
                  <SelectItem value="יום שיא">יום שיא</SelectItem>
                  <SelectItem value="חשיפה VR">חשיפה VR</SelectItem>
                  <SelectItem value="עבודת חקר">עבודת חקר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Syllabi Grid */}
        {loading ? (
          <div className="text-center py-12 text-lg">טוען סילבוסים...</div>
        ) : filteredSyllabi.length === 0 ? (
          <Card className="shadow-lg border-0">
            <CardContent className="text-center py-12">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">לא נמצאו סילבוסים התואמים לחיפוש</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSyllabi.map(syllabus => {
              const school = schools.find(s => s.id === syllabus.school_id);
              const title = syllabus.title || syllabus.course_topic || syllabus.subject || "סילבוס ללא שם";
              
              return (
                <Card 
                  key={syllabus.id}
                  className="bg-white hover:shadow-xl transition-all duration-300 border-0 overflow-hidden group cursor-pointer"
                  onClick={() => window.location.href = createPageUrl(`SyllabusWizard?id=${syllabus.id}&viewOnly=true`)}
                >
                  <div className="h-1.5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600"></div>
                  
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-base leading-tight line-clamp-2 group-hover:text-purple-700 transition-colors flex-1">
                        {title}
                      </CardTitle>
                      <Badge className={
                        syllabus.status === "draft" 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-green-100 text-green-800"
                      }>
                        {syllabus.status === "draft" ? "טיוטה" : "מאושר"}
                      </Badge>
                    </div>
                    
                    {syllabus.activity_type && (
                      <Badge className="bg-purple-100 text-purple-800 border-0 w-fit text-xs px-2 py-0">
                        {syllabus.activity_type}
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-2 text-xs px-4 pb-3">
                    {school && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-medium">בית ספר:</span>
                        <span className="truncate">{school.name}</span>
                      </div>
                    )}

                    {syllabus.teacher_name && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Users className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        <span className="font-medium">מורה:</span>
                        <span className="truncate">{syllabus.teacher_name}</span>
                      </div>
                    )}

                    {syllabus.meetings_count > 0 && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-medium">מפגשים:</span>
                        <span>{syllabus.meetings_count}</span>
                      </div>
                    )}

                    {(syllabus.target_audience || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-100">
                        {syllabus.target_audience.slice(0, 3).map((aud, idx) => (
                          <Badge key={idx} className="bg-cyan-100 text-cyan-800 text-[10px] border-0 px-1.5 py-0">
                            {aud}
                          </Badge>
                        ))}
                        {(syllabus.target_audience || []).length > 3 && (
                          <Badge className="bg-cyan-100 text-cyan-800 text-[10px] border-0 px-1.5 py-0">
                            +{(syllabus.target_audience || []).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {syllabus.created_date && (
                      <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                        נוצר: {format(new Date(syllabus.created_date), "dd/MM/yyyy")}
                      </div>
                    )}
                  </CardContent>

                  <div className="px-4 pb-3 mt-auto border-t border-slate-100 pt-2 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 border border-purple-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:border-purple-400 transition-all text-xs h-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = createPageUrl(`SyllabusWizard?id=${syllabus.id}&viewOnly=true`);
                      }}
                    >
                      צפה בסילבוס
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 shrink-0 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                      onClick={(e) => handleDelete(syllabus, e)}
                      title="מחק"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}