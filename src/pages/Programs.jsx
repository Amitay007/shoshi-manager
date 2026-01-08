import React, { useState, useEffect, useMemo } from "react";
import { Syllabus } from "@/entities/Syllabus";
import { Program } from "@/entities/Program"; // New Entity
import { EducationInstitution } from "@/entities/EducationInstitution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { GraduationCap, Plus, School, Users, BookOpen, Calendar, Calculator, Eye, Copy, Trash2 } from "lucide-react";
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
  const [statusFilter, setStatusFilter] = useState("active"); // active, inactive, shelf, all
  const [filters, setFilters] = useState({
    search: "",
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
      // Load Programs (Instances) instead of Syllabi
      const [allPrograms, allSchools, allSyllabi] = await Promise.all([
        with429Retry(() => Program.list()),
        with429Retry(() => EducationInstitution.list()),
        with429Retry(() => Syllabus.list()) // Needed to show syllabus details
      ]);

      // Enrich programs with syllabus data
      const enrichedPrograms = (allPrograms || []).map(p => {
        const syllabus = (allSyllabi || []).find(s => s.id === p.syllabus_id);
        return {
          ...p,
          _syllabus: syllabus // Helper property
        };
      });

      setPrograms(enrichedPrograms || []);
      setSchools(allSchools || []);
    } catch (error) {
      console.error("Error loading programs:", error);
      alert("שגיאה בטעינת התוכניות. אנא המתן רגע ורענן את הדף.");
    }
    setIsLoading(false);
  };

  const handleStatusChange = async (program, newStatus, e) => {
    if (e) e.stopPropagation();

    try {
      // Update Program Status
      await with429Retry(() => Program.update(program.id, { status: newStatus }));

      // Update local state
      setPrograms((prev) => prev.map((p) =>
        p.id === program.id ? { ...p, status: newStatus } : p
      ));

      toast({ title: "הסטטוס עודכן בהצלחה" });
    } catch (err) {
      console.error("Failed to update status", err);
      toast({ title: "שגיאה בעדכון הסטטוס", variant: "destructive" });
    }
  };

  const handleDuplicate = async (program, e) => {
    e.stopPropagation();
    
    // Duplicate the Program Instance
    if (!confirm(`האם לשכפל את "${program.name}"?`)) return;

    try {
      const { id, created_date, updated_date, created_by_id, created_by, _syllabus, ...programData } = program;

      const randomNum = Math.floor(1000 + Math.random() * 9000).toString();

      const duplicateData = {
        ...programData,
        name: `${program.name} - עותק`,
        program_number: randomNum,
        status: "active"
      };

      const newProgram = await with429Retry(() => Program.create(duplicateData));

      if (newProgram && newProgram.id) {
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
    if (!confirm(`האם למחוק את התוכנית "${program.name}"? פעולה זו תמחק רק את השיוך ולא את הסילבוס.`)) return;

    try {
      // Only delete the Program entity
      await with429Retry(() => Program.delete(program.id));

      setPrograms((prev) => prev.filter((p) => p.id !== program.id));

      toast({ title: "התוכנית נמחקה בהצלחה" });
    } catch (error) {
      console.error("Error deleting program:", error);
      toast({ title: "שגיאה במחיקת התוכנית", variant: "destructive" });
    }
  };

  const filteredPrograms = useMemo(() => {
    let result = [...(programs || [])];
    const term = (filters.search || "").toLowerCase().trim();

    // Status Filter
    result = result.filter((p) => {
      if (statusFilter === 'all') return true;
      const status = p.status || "active";
      if (statusFilter === 'active') return status === "active" || status === "פעילה";
      if (statusFilter === 'inactive') return status === "inactive" || status === "לא פעילה";
      if (statusFilter === 'shelf') return status === "shelf" || status === "מדף";
      return false;
    });

    // Search
    if (term) {
      result = result.filter((p) => {
        const title = p.name || "";
        const notes = p.notes || "";
        return title.toLowerCase().includes(term) || notes.toLowerCase().includes(term);
      });
    }

    // Filter by Syllabus Properties
    if ((filters.activity_types || []).length > 0) {
      result = result.filter((p) => p._syllabus && (filters.activity_types || []).includes(p._syllabus.activity_type));
    }

    if ((filters.content_areas || []).length > 0) {
      result = result.filter((p) => {
        if (!p._syllabus) return false;
        const programContentAreas = typeof p._syllabus.content_areas === 'string' ?
          p._syllabus.content_areas.split(',').map((s) => s.trim()).filter(Boolean) :
          Array.isArray(p._syllabus.content_areas) ? p._syllabus.content_areas : [];
        return programContentAreas.some((ca) => (filters.content_areas || []).includes(ca));
      });
    }

    if ((filters.target_audiences || []).length > 0) {
      result = result.filter((p) =>
        p._syllabus && (p._syllabus.target_audience || []).some((ta) => (filters.target_audiences || []).includes(ta))
      );
    }

    if ((filters.schools || []).length > 0) {
      result = result.filter((p) => (filters.schools || []).includes(p.institution_id));
    }

    return result;
  }, [programs, filters]);

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

        {/* Status Toggle & Actions */}
        <div className="flex justify-start items-center mb-2 gap-4">
           <div className="bg-white p-1 rounded-lg border shadow-sm inline-flex gap-1" dir="rtl">
              {[
            { id: "active", label: "פעיל" },
            { id: "inactive", label: "לא פעיל" },
            { id: "all", label: "כולם" }].
            map((opt) =>
            <button
              key={opt.id}
              onClick={() => setStatusFilter(opt.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              statusFilter === opt.id ?
              "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm" :
              "text-red-600 hover:bg-red-50"}`
              }>

                  {opt.label}
                </button>
            )}
           </div>

           <Link to={createPageUrl("CreateProgram")}>
              <Button className="bg-gradient-to-r text-primary-foreground px-3 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-primary/90 h-9 from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg gap-2">
                <Plus className="w-4 h-4" />
                תוכנית חדשה
              </Button>
            </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-4">
            <ProgramsFilterBar
              allPrograms={programs}
              schools={schools}
              instPrograms={instPrograms}
              onChange={setFilters} />

          </CardContent>
        </Card>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPrograms.map((program) => {
          const syllabus = program._syllabus || {};
          const school = schools.find(s => s.id === program.institution_id);
          const title = program.name || "תוכנית ללא שם";

          // Get content areas from syllabus
          const contentAreasArray = typeof syllabus.content_areas === 'string' ?
            syllabus.content_areas.split(',').map((s) => s.trim()).filter(Boolean) :
            Array.isArray(syllabus.content_areas) ? syllabus.content_areas : [];

          const currentStatus = program.status === "active" ? "פעילה" : 
                               program.status === "inactive" ? "לא פעילה" : 
                               program.status === "shelf" ? "מדף" : 
                               program.status || "פעילה";

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

                  {school ?
                  <div className="flex items-center gap-1.5">
                      {school.logo_url ?
                    <img
                      src={school.logo_url}
                      alt={school.name}
                      className="w-5 h-5 object-contain rounded-full bg-slate-50 border border-slate-200" /> :
                    <School className="w-4 h-4 text-indigo-600" />
                    }
                      <span className="text-xs font-medium text-slate-700 truncate">
                        {school.name}
                      </span>
                    </div> :

                  <div className="flex items-center gap-1.5">
                      <School className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-400 italic">לא משוייך</span>
                    </div>
                  }
                </div>

                {syllabus.activity_type &&
                <div className="mt-2">
                  <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-0 w-fit text-xs px-2 py-0">
                        {syllabus.activity_type}
                      </Badge>
                </div>
                  }
                </CardHeader>

              <CardContent className="space-y-2 text-xs flex-1 px-4 pb-3">
                {/* Syllabus Info */}
                <div className="flex items-center gap-1.5 text-slate-600 mb-2">
                  <div className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-500 truncate max-w-full">
                     סילבוס: {syllabus.title || syllabus.course_topic || "ללא שם"}
                  </div>
                </div>

                {/* Meetings */}
                {(syllabus.meetings_count || (syllabus.sessions || []).length > 0) &&
                <div className="flex items-center gap-1.5 text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium">מפגשים:</span>
                    <span>{syllabus.meetings_count || (syllabus.sessions || []).length}</span>
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
                {(syllabus.target_audience || []).length > 0 &&
                <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-100">
                    {syllabus.target_audience.slice(0, 3).map((aud, idx) =>
                  <Badge key={idx} className="bg-cyan-100 text-cyan-800 text-[10px] border-0 px-1.5 py-0">
                        {aud}
                      </Badge>
                  )}
                    {(syllabus.target_audience || []).length > 3 &&
                  <Badge className="bg-cyan-100 text-cyan-800 text-[10px] border-0 px-1.5 py-0">
                        +{(syllabus.target_audience || []).length - 3}
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
                      onValueChange={(v) => {
                         const statusMap = { "פעילה": "active", "לא פעילה": "inactive", "מדף": "shelf" };
                         handleStatusChange(program, statusMap[v] || "active");
                      }}>

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