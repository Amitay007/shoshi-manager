import React, { useState, useEffect, useMemo } from "react";
import { Syllabus } from "@/entities/Syllabus";
import { InstitutionProgram } from "@/entities/InstitutionProgram";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { GraduationCap, Plus, School, Users, BookOpen, Calendar, Calculator } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import ProgramsFilterBar from "@/components/filters/ProgramsFilterBar";
import { with429Retry } from "@/components/utils/retry";

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [instPrograms, setInstPrograms] = useState([]);
  const [schools, setSchools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
      // Load data in parallel for better performance
      const [allPrograms, allInstPrograms, allSchools] = await Promise.all([
        with429Retry(() => Syllabus.list()),
        with429Retry(() => InstitutionProgram.list()),
        with429Retry(() => EducationInstitution.list())
      ]);
      
      setPrograms(allPrograms || []);
      setInstPrograms(allInstPrograms || []);
      setSchools(allSchools || []);
    } catch (error) {
      console.error("Error loading programs:", error);
      alert("שגיאה בטעינת התוכניות. אנא המתן רגע ורענן את הדף.");
    }
    setIsLoading(false);
  };

  const handleDuplicate = async (program, e) => {
    e.stopPropagation();
    
    if (!confirm(`האם לשכפל את "${program.title || program.course_topic || program.subject}"?`)) return;
    
    try {
      // Create a copy without system fields
      const { id, created_date, updated_date, created_by_id, created_by, is_sample, ...programData } = program;
      
      const duplicateData = {
        ...programData,
        title: `${program.title || program.course_topic || program.subject || "תוכנית"} - עותק`,
        status: "draft"
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

  const filteredPrograms = useMemo(() => {
    let result = [...(programs || [])]; // Fix: ensure programs is array
    const term = (filters.search || "").toLowerCase().trim();

    if (term) {
      result = result.filter(p => {
        const title = p.title || p.course_topic || p.subject || "";
        const notes = p.notes || "";
        return title.toLowerCase().includes(term) || notes.toLowerCase().includes(term);
      });
    }

    if ((filters.activity_types || []).length > 0) {
      result = result.filter(p => (filters.activity_types || []).includes(p.activity_type));
    }

    if ((filters.content_areas || []).length > 0) {
      result = result.filter(p => {
        const programContentAreas = typeof p.content_areas === 'string'
          ? p.content_areas.split(',').map(s => s.trim()).filter(Boolean)
          : (Array.isArray(p.content_areas) ? p.content_areas : []);
        return programContentAreas.some(ca => (filters.content_areas || []).includes(ca));
      });
    }

    if ((filters.target_audiences || []).length > 0) {
      result = result.filter(p => 
        (p.target_audience || []).some(ta => (filters.target_audiences || []).includes(ta))
      );
    }

    if ((filters.schools || []).length > 0) {
      const programIdsInSchools = new Set(
        (instPrograms || [])
          .filter(ip => (filters.schools || []).includes(ip.institution_id))
          .map(ip => ip.program_id)
      );
      result = result.filter(p => programIdsInSchools.has(p.id));
    }

    return result;
  }, [programs, filters, instPrograms]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-6" dir="rtl">
        <div className="text-center py-12 text-lg">טוען תוכניות...</div>
      </div>
    );
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
          <div className="flex gap-2">
            <Link to={createPageUrl("BinocularCalculator")}>
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg gap-2">
                <Calculator className="w-4 h-4" />
                מחשבון משקפות
              </Button>
            </Link>
            <Link to={createPageUrl("SyllabusWizard")}>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg gap-2">
                <Plus className="w-4 h-4" />
                תוכנית חדשה
              </Button>
            </Link>
            <BackHomeButtons />
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-4">
            <ProgramsFilterBar
              allPrograms={programs}
              schools={schools}
              instPrograms={instPrograms}
              onChange={setFilters}
            />
          </CardContent>
        </Card>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPrograms.map((program) => {
            const title = program.title || program.course_topic || program.subject || "תוכנית ללא שם";
            const schoolsForProgram = instPrograms
              .filter(ip => ip.program_id === program.id)
              .map(ip => schools.find(s => s.id === ip.institution_id))
              .filter(Boolean);

            // FIX: Handle content_areas as string
            const contentAreasArray = typeof program.content_areas === 'string' 
              ? program.content_areas.split(',').map(s => s.trim()).filter(Boolean)
              : (Array.isArray(program.content_areas) ? program.content_areas : []);

            return (
              <Card 
                key={program.id} 
                className="bg-white hover:shadow-xl transition-all duration-300 border-0 overflow-hidden group cursor-pointer flex flex-col"
                onClick={() => window.location.href = createPageUrl(`ProgramView?id=${program.id}`)}
              >
                {/* Colored Header */}
                <div className="h-1.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600"></div>
                
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="h-12 flex items-start mb-1">
                    <CardTitle className="text-base leading-tight line-clamp-2 group-hover:text-cyan-700 transition-colors">
                      {title}
                    </CardTitle>
                  </div>
                  {program.activity_type && (
                    <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-0 w-fit text-xs px-2 py-0">
                      {program.activity_type}
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-2 text-xs flex-1 px-4 pb-3">
                  {/* Teacher */}
                  {program.teacher_name && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Users className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                      <span className="font-medium">מורה:</span>
                      <span className="truncate">{program.teacher_name}</span>
                    </div>
                  )}

                  {/* Meetings */}
                  {(program.meetings_count || (program.sessions || []).length > 0) && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium">מפגשים:</span>
                      <span>{program.meetings_count || (program.sessions || []).length}</span>
                    </div>
                  )}

                  {/* Content Areas */}
                  {contentAreasArray.length > 0 && (
                    <div className="flex items-start gap-1.5 text-slate-600">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">תחומי דעת:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {contentAreasArray.slice(0, 2).map((area, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] bg-slate-100 px-1.5 py-0">
                              {area}
                            </Badge>
                          ))}
                          {contentAreasArray.length > 2 && (
                            <Badge variant="secondary" className="text-[10px] bg-slate-100 px-1.5 py-0">
                              +{contentAreasArray.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Schools */}
                  {schoolsForProgram.length > 0 && (
                    <div className="flex items-start gap-1.5 text-slate-600 pt-1.5 border-t border-slate-100">
                      <School className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">בתי ספר:</span>
                        <div className="mt-0.5 text-[10px] text-slate-500 line-clamp-1">
                          {schoolsForProgram.map(s => s.name).join(", ")}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Target Audience */}
                  {(program.target_audience || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-100">
                      {program.target_audience.slice(0, 3).map((aud, idx) => (
                        <Badge key={idx} className="bg-cyan-100 text-cyan-800 text-[10px] border-0 px-1.5 py-0">
                          {aud}
                        </Badge>
                      ))}
                      {(program.target_audience || []).length > 3 && (
                        <Badge className="bg-cyan-100 text-cyan-800 text-[10px] border-0 px-1.5 py-0">
                          +{(program.target_audience || []).length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>

                {/* Footer with Actions */}
                <div className="px-4 pb-3 mt-auto border-t border-slate-100 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full border border-cyan-200 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 hover:border-cyan-400 transition-all text-xs h-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = createPageUrl(`ProgramView?id=${program.id}`);
                      }}
                    >
                      צפה בפרטים
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full border border-blue-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-400 transition-all text-xs h-7 gap-1"
                      onClick={(e) => handleDuplicate(program, e)}
                    >
                      <Plus className="w-3 h-3" />
                      שכפל
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredPrograms.length === 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="text-center py-12">
              <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">לא נמצאו תוכניות התואמות לחיפוש</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}