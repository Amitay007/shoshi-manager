import React, { useState, useEffect, useMemo } from "react";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { InstitutionProgram } from "@/entities/InstitutionProgram";
import { Syllabus } from "@/entities/Syllabus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Plus, Search, MapPin, Phone, Mail, GraduationCap } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { with429Retry } from "@/components/utils/retry";
import { useLoading } from "@/components/common/LoadingContext";

export default function Schools() {
  const [schools, setSchools] = useState([]);
  const [instPrograms, setInstPrograms] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const { showLoader, hideLoader } = useLoading();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'manager';
  const isManager = mode === 'manager';

  useEffect(() => {
    const init = async () => {
      showLoader();
      try {
        const [allSchools, allInstPrograms, allPrograms] = await Promise.all([
          with429Retry(() => EducationInstitution.list()),
          with429Retry(() => InstitutionProgram.list()),
          with429Retry(() => Syllabus.list())
        ]);
        setSchools(allSchools || []);
        setInstPrograms(allInstPrograms || []);
        setPrograms(allPrograms || []);
      } catch (error) {
        console.error("Error loading schools:", error);
      } finally {
        hideLoader();
      }
    };
    init();
  }, []);

  const filteredSchools = useMemo(() => 
    schools.filter(school => {
      // Text Filter
      const term = searchTerm.toLowerCase().trim();
      const matchesText = !term || (
        (school.name || "").toLowerCase().includes(term) ||
        (school.city || "").toLowerCase().includes(term) ||
        (school.type || "").toLowerCase().includes(term)
      );

      // Pill Filter
      let matchesTab = true;
      if (activeTab === "primary") matchesTab = school.type === "יסודי";
      if (activeTab === "middle") matchesTab = school.type === "חטיבת ביניים";
      if (activeTab === "high") matchesTab = school.type === "תיכון";
      if (activeTab === "special") matchesTab = school.type === "חינוך מיוחד";
      if (activeTab === "eilat") matchesTab = school.city === "אילת";
      if (activeTab === "israel") matchesTab = school.city !== "אילת";

      return matchesText && matchesTab;
    }),
    [schools, searchTerm, activeTab]
  );

  const counts = useMemo(() => ({
    all: schools.length,
    primary: schools.filter(s => s.type === "יסודי").length,
    middle: schools.filter(s => s.type === "חטיבת ביניים").length,
    high: schools.filter(s => s.type === "תיכון").length,
    special: schools.filter(s => s.type === "חינוך מיוחד").length,
    eilat: schools.filter(s => s.city === "אילת").length,
    israel: schools.filter(s => s.city !== "אילת").length,
  }), [schools]);

  const filterPills = [
    { key: "all", label: "הכל", count: counts.all, color: "bg-slate-100 text-slate-700 border-slate-200", activeColor: "bg-slate-800 text-white border-slate-800" },
    { key: "primary", label: "יסודי", count: counts.primary, color: "bg-blue-50 text-blue-700 border-blue-200", activeColor: "bg-blue-600 text-white border-blue-600" },
    { key: "special", label: "חנ\"מ", count: counts.special, color: "bg-amber-50 text-amber-700 border-amber-200", activeColor: "bg-amber-600 text-white border-amber-600" },
    { key: "high", label: "תיכון", count: counts.high, color: "bg-emerald-50 text-emerald-700 border-emerald-200", activeColor: "bg-emerald-600 text-white border-emerald-600" },
    { key: "middle", label: "חט\"ב", count: counts.middle, color: "bg-purple-50 text-purple-700 border-purple-200", activeColor: "bg-purple-600 text-white border-purple-600" },
    { key: "eilat", label: "אילת", count: counts.eilat, color: "bg-cyan-50 text-cyan-700 border-cyan-200", activeColor: "bg-cyan-600 text-white border-cyan-600" },
    { key: "israel", label: "ישראל", count: counts.israel, color: "bg-indigo-50 text-indigo-700 border-indigo-200", activeColor: "bg-indigo-600 text-white border-indigo-600" },
  ];

  const typeColors = {
    "יסודי": "from-blue-100 to-cyan-100 text-blue-800",
    "חטיבת ביניים": "from-purple-100 to-pink-100 text-purple-800",
    "תיכון": "from-emerald-100 to-teal-100 text-emerald-800",
    "חינוך מיוחד": "from-amber-100 to-orange-100 text-amber-800",
    "אחר": "from-slate-100 to-gray-100 text-slate-800"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-cyan-900">בתי ספר</h1>
              <p className="text-slate-500 text-xs sm:text-sm">ניהול מוסדות חינוך</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isManager ? (
              <Link to={createPageUrl("SchoolDetails?new=true&mode=manager")} className="flex-1 sm:flex-none">
                <Button className="bg-green-600 hover:bg-green-700 gap-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                  הוספת מוסד
                </Button>
              </Link>
            ) : (
              <Button disabled className="bg-slate-200 text-slate-400 gap-2 w-full sm:w-auto cursor-not-allowed hover:bg-slate-200">
                <Plus className="w-4 h-4" />
                הוספת מוסד
              </Button>
            )}
            <div className="hidden lg:block">
              <BackHomeButtons />
            </div>
          </div>
        </div>

        {/* Search & Filter Pills */}
        <div className="flex flex-col gap-4 mb-6">
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

          <div className="relative">
             <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <Input
               type="text"
               placeholder="חיפוש מהיר..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pr-10 bg-white shadow-sm border-slate-200 focus:border-cyan-500 rounded-full"
             />
          </div>
        </div>

        {/* Schools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchools.map((school) => {
            const schoolPrograms = instPrograms.filter(ip => ip.institution_id === school.id);
            const programDetails = schoolPrograms.map(ip => 
              programs.find(p => p.id === ip.program_id)
            ).filter(Boolean);

            return (
              <Link key={school.id} to={createPageUrl(`SchoolDetails?id=${school.id}&mode=${mode}`)}>
                <Card 
                  className="bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 overflow-hidden group cursor-pointer h-full flex flex-col"
                >
                  {/* Colored Header */}
                  <div className={`h-2 bg-gradient-to-r ${typeColors[school.type] || typeColors["אחר"]}`}></div>
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg flex-1 line-clamp-2 group-hover:text-cyan-700 transition-colors">
                        {school.name}
                      </CardTitle>
                      <Badge className={`bg-gradient-to-r ${typeColors[school.type] || typeColors["אחר"]} border-0 mr-2 shadow-sm`}>
                        {school.type}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm flex-1">
                    {/* City */}
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      <span className="font-medium text-slate-700">{school.city || "לא צוין"}</span>
                    </div>

                    {/* Contact Person */}
                    {school.contact_person && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4 text-cyan-600" />
                        <span className="truncate">{school.contact_person}</span>
                      </div>
                    )}

                    {/* Phone */}
                    {school.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4 text-emerald-600" />
                        <span dir="ltr">{school.phone}</span>
                      </div>
                    )}

                    {/* Programs Count */}
                    <div className="flex items-center gap-2 pt-3 border-t mt-auto">
                      <GraduationCap className="w-4 h-4 text-purple-600" />
                      <span className="text-slate-600">תוכניות פעילות:</span>
                      <span className="font-bold text-purple-700">{schoolPrograms.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {filteredSchools.length === 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">לא נמצאו בתי ספר התואמים לחיפוש</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}