import React, { useState, useEffect, useMemo } from "react";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { InstitutionProgram } from "@/entities/InstitutionProgram";
import { Syllabus } from "@/entities/Syllabus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
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
  const { showLoader, hideLoader } = useLoading();

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
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        (school.name || "").toLowerCase().includes(term) ||
        (school.city || "").toLowerCase().includes(term) ||
        (school.type || "").toLowerCase().includes(term)
      );
    }),
    [schools, searchTerm]
  );

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
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-cyan-900">בתי ספר</h1>
              <p className="text-slate-500 text-sm">ניהול מוסדות חינוך</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("SchoolDetails?new=true")}>
              <Button className="bg-green-600 hover:bg-green-700 gap-2">
                <Plus className="w-4 h-4" />
                הוספת מוסד
              </Button>
            </Link>
            <BackHomeButtons />
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="חיפוש לפי שם, עיר או סוג..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 border-2 border-slate-200 focus:border-cyan-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Schools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchools.map((school) => {
            const schoolPrograms = instPrograms.filter(ip => ip.institution_id === school.id);
            const programDetails = schoolPrograms.map(ip => 
              programs.find(p => p.id === ip.program_id)
            ).filter(Boolean);

            return (
              <Card 
                key={school.id}
                className="bg-white hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden group"
              >
                {/* Colored Header */}
                <div className={`h-2 bg-gradient-to-r ${typeColors[school.type] || typeColors["אחר"]}`}></div>
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex-1 line-clamp-2 group-hover:text-cyan-700 transition-colors">
                      {school.name}
                    </CardTitle>
                    <Badge className={`bg-gradient-to-r ${typeColors[school.type] || typeColors["אחר"]} border-0 mr-2`}>
                      {school.type}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  {/* City */}
                  {school.city && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-rose-600" />
                      <span className="font-medium">עיר:</span>
                      <span>{school.city}</span>
                    </div>
                  )}

                  {/* Contact Person */}
                  {school.contact_person && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4 text-cyan-600" />
                      <span className="font-medium">איש קשר:</span>
                      <span>{school.contact_person}</span>
                    </div>
                  )}

                  {/* Phone */}
                  {school.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium">טלפון:</span>
                      <span dir="ltr">{school.phone}</span>
                    </div>
                  )}

                  {/* Programs */}
                  <div className="flex items-start gap-2 text-slate-600 pt-2 border-t">
                    <GraduationCap className="w-4 h-4 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-medium">תוכניות פעילות:</span>
                      <span className="mr-2 font-bold text-lg text-cyan-700">
                        {schoolPrograms.length}
                      </span>
                    </div>
                  </div>

                  {/* Address */}
                  {school.address && (
                    <div className="text-xs text-slate-500 pt-2 border-t">
                      {school.address}
                    </div>
                  )}
                </CardContent>

                {/* Footer with Action */}
                <div className="px-6 pb-4">
                  <Link to={createPageUrl(`SchoolDetails?id=${school.id}`)}>
                    <Button 
                      variant="outline" 
                      className="w-full border-2 border-indigo-200 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:border-indigo-400 transition-all"
                    >
                      צפה בפרטים
                    </Button>
                  </Link>
                </div>
              </Card>
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