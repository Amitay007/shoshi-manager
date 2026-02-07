import React, { useState, useEffect, useMemo } from "react";
import { Syllabus } from "@/entities/Syllabus";
import { InstitutionProgram } from "@/entities/InstitutionProgram";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { GraduationCap, Plus, School, Users, BookOpen, Calendar, Calculator, Eye, Copy, Trash2, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import ProgramsFilterBar from "@/components/filters/ProgramsFilterBar";
import { with429Retry } from "@/components/utils/retry";

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [instPrograms, setInstPrograms] = useState([]);
  const [schools, setSchools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    activity_types: [],
    content_areas: [],
    target_audiences: [],
    schools: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load data in parallel for better performance
      const [allPrograms, allInstPrograms, allSchools] = await Promise.all([
      with429Retry(() => Syllabus.list()),
      with429Retry(() => InstitutionProgram.list()),
      with429Retry(() => EducationInstitution.list())]
      );

      setPrograms(allPrograms || []);
      setInstPrograms(allInstPrograms || []);
      setSchools(allSchools || []);
    } catch (error) {
      console.error("Error loading programs:", error);
      alert("שגיאה בטעינת התוכניות. אנא המתן רגע ורענן את הדף.");
    }
    setIsLoading(false);
  };

  const handleStatusChange = async (program, newStatus, e) => {
    if (e) e.stopPropagation();

    const associatedIPs = instPrograms.filter((ip) => ip.program_id === program.id);

    try {
      if (associatedIPs.length > 0) {
        // Update associated InstitutionPrograms
        await Promise.all(associatedIPs.map((ip) =>
          with429Retry(() => InstitutionProgram.update(ip.id, { status: newStatus }))
        ));

        // Update local state for instPrograms
        setInstPrograms((prev) => prev.map((ip) =>
          ip.program_id === program.id ? { ...ip, status: newStatus } : ip
        ));

        toast({ title: "הסטטוס עודכן בהצלחה" });
      }
    } catch (err) {
      console.error("Failed to update status", err);
      toast({ title: "שגיאה בעדכון הסטטוס", variant: "destructive" });
    }
  };

  const handleDuplicate = async (program, e) => {
    e.stopPropagation();

    if (!confirm(`האם לשכפל את "${program.title || program.course_topic || program.subject}"?`)) return;

    try {
      // Create a copy without system fields
      const { id, created_date, updated_date, created_by_id, created_by, is_sample, ...programData } = program;

      // Generate a random 4-digit number for the duplicate
      const randomNum = Math.floor(1000 + Math.random() * 9000).toString();

      const duplicateData = {
        ...programData,
        title: `${program.title || program.course_topic || program.subject || "תוכנית"} - עותק`,
        status: "draft",
        program_number: randomNum
      };

      const newProgram = await with429Retry(() => Syllabus.create(duplicateData));

      if (newProgram && newProgram.id) {
        // Reload the list to show the new program
        await loadData();
        alert("התוכנית שוכפלה בהצלחה!");
      }
    } catch (error) {
      console.error("Error duplicating program:", error);
      alert("שגיאה בשכפול התוכנית");
    }
  };

  const handleDelete = async (program, e) => {
    e.stopPropagation();

    // Check if there are active programs (InstitutionPrograms) linked to this syllabus
    const associatedIPs = instPrograms.filter((ip) => ip.program_id === program.id);

    if (associatedIPs.length === 0) {
      alert("תוכנית זו אינה משויכת לאף מוסד (היא סילבוס בלבד).\nכדי למחוק את הסילבוס, אנא השתמש ב'מרכז הסילבוסים'.");
      return;
    }

    const schoolNames = associatedIPs.map(ip => {
       const s = schools.find(sch => sch.id === ip.institution_id);
       return s ? s.name : "מוסד לא ידוע";
    }).join(", ");

    if (!confirm(`האם אתה בטוח שברצונך להסיר את התוכנית מ-${schoolNames}?\n\nתוכן הסילבוס יישמר במערכת ולא יימחק.`)) {
      return;
    }

    try {
      // Delete ONLY associated InstitutionPrograms
      await Promise.all(associatedIPs.map((ip) =>
        with429Retry(() => InstitutionProgram.delete(ip.id))
      ));
      
      // Update state: Remove IPs but keep Program (Syllabus)
      setInstPrograms((prev) => prev.filter((ip) => ip.program_id !== program.id));
      toast({ title: "השיוך למוסד נמחק בהצלחה (הסילבוס נשמר)" });

    } catch (error) {
      console.error("Error deleting:", error);
      toast({ title: "שגיאה במחיקה", variant: "destructive" });
    }
  };

  // Calculate Status & Counts
  const programStatusMap = useMemo(() => {
    const map = {};
    programs.forEach(p => {
      const associatedIPs = instPrograms.filter(ip => ip.program_id === p.id);
      if (associatedIPs.length === 0) {
         map[p.id] = "draft"; // Or hidden?
         return;
      }
      // Usually a program has one IP context in this view? Or multiple?
      // Assuming active if ANY IP is active
      const hasActive = associatedIPs.some(ip => (ip.status || "פעילה") === "פעילה");
      const hasShelf = associatedIPs.some(ip => ip.status === "מדף");
      
      if (hasActive) map[p.id] = "active";
      else if (hasShelf) map[p.id] = "shelf";
      else map[p.id] = "inactive";
    });
    return map;
  }, [programs, instPrograms]);

  const counts = useMemo(() => ({
    all: programs.length,
    active: programs.filter(p => programStatusMap[p.id] === "active").length,
    inactive: programs.filter(p => programStatusMap[p.id] === "inactive").length,
    shelf: programs.filter(p => programStatusMap[p.id] === "shelf").length,
    middle_high: programs.filter(p => {
        const audience = Array.isArray(p.target_audience) ? p.target_audience : [];
        return audience.some(a => a.includes("חט") || a.includes("תיכון"));
    }).length,
    primary: programs.filter(p => {
        const audience = Array.isArray(p.target_audience) ? p.target_audience : [];
        return audience.some(a => a.includes("יסודי"));
    }).length,
    special: programs.filter(p => {
        const audience = Array.isArray(p.target_audience) ? p.target_audience : [];
        return audience.some(a => a.includes("חינוך מיוחד") || a.includes("חנ"));
    }).length
  }), [programs, programStatusMap]);

  const filterPills = [
    { key: "active", label: "פעיל", count: counts.active, color: "bg-emerald-50 text-emerald-700 border-emerald-200", activeColor: "bg-emerald-600 text-white border-emerald-600" },
    { key: "inactive", label: "לא פעיל", count: counts.inactive, color: "bg-slate-50 text-slate-600 border-slate-200", activeColor: "bg-slate-600 text-white border-slate-600" },
    { key: "shelf", label: "מדף", count: counts.shelf, color: "bg-amber-50 text-amber-700 border-amber-200", activeColor: "bg-amber-600 text-white border-amber-600" },
    { key: "middle_high", label: "חט\"ב/תיכון", count: counts.middle_high, color: "bg-purple-50 text-purple-700 border-purple-200", activeColor: "bg-purple-600 text-white border-purple-600" },
    { key: "primary", label: "יסודי", count: counts.primary, color: "bg-blue-50 text-blue-700 border-blue-200", activeColor: "bg-blue-600 text-white border-blue-600" },
    { key: "special", label: "חנ\"מ", count: counts.special, color: "bg-orange-50 text-orange-700 border-orange-200", activeColor: "bg-orange-600 text-white border-orange-600" },
    { key: "all", label: "הכל", count: counts.all, color: "bg-slate-100 text-slate-700 border-slate-200", activeColor: "bg-slate-800 text-white border-slate-800" },
  ];

  const filteredPrograms = useMemo(() => {
    let result = [...programs];
    
    // Sort by updated_date (newest first) to show duplicated items
    result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    // Text Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(p => {
         const title = p.title || p.course_topic || p.subject || "";
         const teacher = p.teacher_name || "";
         const schoolsName = instPrograms
            .filter(ip => ip.program_id === p.id)
            .map(ip => schools.find(s => s.id === ip.institution_id)?.name || "")
            .join(" ");
            
         return title.toLowerCase().includes(term) || 
                teacher.toLowerCase().includes(term) ||
                schoolsName.toLowerCase().includes(term);
      });
    }

    // Pill Filter Logic
    if (activeTab !== "all") {
       result = result.filter(p => {
          if (activeTab === "active") return programStatusMap[p.id] === "active";
          if (activeTab === "inactive") return programStatusMap[p.id] === "inactive";
          if (activeTab === "shelf") return programStatusMap[p.id] === "shelf";
          
          const audience = Array.isArray(p.target_audience) ? p.target_audience : [];
          if (activeTab === "middle_high") return audience.some(a => a.includes("חט") || a.includes("תיכון"));
          if (activeTab === "primary") return audience.some(a => a.includes("יסודי"));
          if (activeTab === "special") return audience.some(a => a.includes("חינוך מיוחד") || a.includes("חנ"));
          
          return true;
       });
    }

    return result;
  }, [programs, searchTerm, activeTab, programStatusMap, schools, instPrograms]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-6" dir="rtl">
        <div className="text-center py-12 text-lg">טוען תוכניות...</div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-cyan-900">תוכניות</h1>
              <p className="text-slate-500 text-sm">ניהול תוכניות לימוד וסילבוסים</p>
            </div>
          </div>
        </div>

        {/* Pills & Actions */}
        <div className="flex flex-col gap-4 mb-6">
           <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {filterPills.map(pill => (
                  <button
                    key={pill.key}
                    onClick={() => setActiveTab(pill.key)}
                    className={`px-3 py-1 rounded-full border text-sm font-medium transition-all whitespace-nowrap
                      ${activeTab === pill.key ? pill.activeColor : pill.color}`}
                  >
                    {pill.label} ({pill.count})
                  </button>
                ))}
              </div>

              <Link to={createPageUrl("CreateProgram")}>
                <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md gap-2 rounded-full">
                  <Plus className="w-4 h-4" />
                  תוכנית חדשה
                </Button>
              </Link>
           </div>
           
           <div className="flex gap-2">
             <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש לפי שם, מורה, בית ספר..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 bg-white shadow-sm border-slate-200 rounded-full"
                />
             </div>
           </div>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPrograms.map((program) => {
            const title = program.title || program.course_topic || program.subject || "תוכנית ללא שם";
            const schoolsForProgram = instPrograms.
            filter((ip) => ip.program_id === program.id).
            map((ip) => schools.find((s) => s.id === ip.institution_id)).
            filter(Boolean);

            // FIX: Handle content_areas as string
            const contentAreasArray = typeof program.content_areas === 'string' ?
            program.content_areas.split(',').map((s) => s.trim()).filter(Boolean) :
            Array.isArray(program.content_areas) ? program.content_areas : [];

            const currentStatus = instPrograms.find((ip) => ip.program_id === program.id)?.status ||
            program.program_status ||
            "פעילה";

            const statusColors = {
              "פעילה": "bg-emerald-100 text-emerald-800 border-emerald-200",
              "לא פעילה": "bg-slate-100 text-slate-600 border-slate-200",
              "מדף": "bg-amber-100 text-amber-800 border-amber-200"
            };

            return (
              <Card
                key={program.id}
                className="bg-white hover:shadow-xl transition-all duration-300 border-0 overflow-hidden group cursor-pointer flex flex-col"
                onClick={() => window.location.href = createPageUrl(`ProgramView?id=${program.id}`)}>

                {/* Colored Header */}
                <div className="h-1.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600"></div>
                
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="h-12 flex items-start mb-1 justify-between gap-2">
                    <CardTitle className="text-base leading-tight line-clamp-2 group-hover:text-cyan-700 transition-colors">
                      {title}
                    </CardTitle>
                    {program.program_number &&
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1 rounded border border-slate-100 shrink-0">
                        #{program.program_number}
                      </span>
                    }
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge className={`border w-fit text-[10px] px-2 py-0 ${statusColors[currentStatus] || statusColors["פעילה"]}`}>
                        {currentStatus}
                      </Badge>

                    {schoolsForProgram.length > 0 ?
                    <div className="flex items-center gap-1.5">
                        {schoolsForProgram[0].logo_url ?
                      <img
                        src={schoolsForProgram[0].logo_url}
                        alt={schoolsForProgram[0].name}
                        className="w-5 h-5 object-contain rounded-full bg-slate-50 border border-slate-200" /> :
                      <School className="w-4 h-4 text-indigo-600" />
                      }
                        <span className="text-xs font-medium text-slate-700 truncate">
                          {schoolsForProgram.map((s) => s.name).join(", ")}
                        </span>
                      </div> :

                    <div className="flex items-center gap-1.5">
                        <School className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400 italic">לא משוייך</span>
                      </div>
                    }
                  </div>
                  
                  {program.activity_type &&
                  <div className="mt-2">
                    <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-0 w-fit text-xs px-2 py-0">
                          {program.activity_type}
                        </Badge>
                  </div>
                    }
                  </CardHeader>

                <CardContent className="space-y-2 text-xs flex-1 px-4 pb-3">
                  {/* Teacher */}
                  {program.teacher_name &&
                  <div className="flex items-center gap-1.5 text-slate-600">
                      <Users className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                      <span className="font-medium">מורה:</span>
                      <span className="truncate">{program.teacher_name}</span>
                    </div>
                  }

                  {/* Meetings */}
                  {(program.meetings_count || (program.sessions || []).length > 0) &&
                  <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium">מפגשים:</span>
                      <span>{program.meetings_count || (program.sessions || []).length}</span>
                    </div>
                  }

                  {/* Content Areas */}
                  {contentAreasArray.length > 0 &&
                  <div className="flex items-start gap-1.5 text-slate-600">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">תחומי דעת:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {contentAreasArray.slice(0, 2).map((area, idx) =>
                        <Badge key={idx} variant="secondary" className="text-[10px] bg-slate-100 px-1.5 py-0">
                              {area}
                            </Badge>
                        )}
                          {contentAreasArray.length > 2 &&
                        <Badge variant="secondary" className="text-[10px] bg-slate-100 px-1.5 py-0">
                              +{contentAreasArray.length - 2}
                            </Badge>
                        }
                        </div>
                      </div>
                    </div>
                  }



                  {/* Target Audience */}
                  {(program.target_audience || []).length > 0 &&
                  <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-100">
                      {program.target_audience.slice(0, 3).map((aud, idx) =>
                    <Badge key={idx} className="bg-cyan-100 text-cyan-800 text-[10px] border-0 px-1.5 py-0">
                          {aud}
                        </Badge>
                    )}
                      {(program.target_audience || []).length > 3 &&
                    <Badge className="bg-cyan-100 text-cyan-800 text-[10px] border-0 px-1.5 py-0">
                          +{(program.target_audience || []).length - 3}
                        </Badge>
                    }
                    </div>
                  }
                </CardContent>

                {/* Footer with Actions */}
                <div className="px-4 pb-3 mt-auto border-t border-slate-100 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-24 shrink-0" onClick={(e) => e.stopPropagation()}>
                       <Select
                        value={currentStatus}
                        onValueChange={(v) => handleStatusChange(program, v)}>

                          <SelectTrigger className="h-8 text-xs px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="פעילה">פעילה</SelectItem>
                            <SelectItem value="לא פעילה">לא פעילה</SelectItem>
                            <SelectItem value="מדף">מדף</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 border border-blue-200"
                      onClick={(e) => handleDuplicate(program, e)}
                      title="שכפל">

                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                      onClick={(e) => handleDelete(program, e)}
                      title="מחק">

                      <Trash2 className="w-3 h-3" />
                    </Button>
                    </div>
                </div>
              </Card>);

          })}
        </div>

        {filteredPrograms.length === 0 &&
        <Card className="shadow-lg border-0">
            <CardContent className="text-center py-12">
              <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">לא נמצאו תוכניות התואמות לחיפוש</p>
            </CardContent>
          </Card>
        }
      </div>
    </div>);

}