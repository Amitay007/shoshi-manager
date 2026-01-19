import React, { useState, useEffect } from "react";

import { base44 } from "@/api/base44Client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Users, Mail, Phone, Search, Plus } from "lucide-react";

import { Link } from "react-router-dom";

import { createPageUrl } from "@/utils";

import BackHomeButtons from "@/components/common/BackHomeButtons";

import { useLoading } from "@/components/common/LoadingContext";

import { with429Retry } from "@/components/utils/retry";

import { Button } from "@/components/ui/button";



export default function TeachersList() {

  const [teachers, setTeachers] = useState([]);

  const [schools, setSchools] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);



  const { showLoader, hideLoader } = useLoading();



  useEffect(() => {

    loadData();

  }, []);



  const loadData = async () => {

    showLoader();

    setLoading(true);

    try {

      const [teachersData, schoolsData] = await Promise.all([

        with429Retry(() => base44.entities.Teacher.list()),

        with429Retry(() => base44.entities.EducationInstitution.list())

      ]);

     

      setTeachers(teachersData || []);

      setSchools(schoolsData || []);

    } catch (error) {

      console.error("Error loading teachers:", error);

    } finally {

      setLoading(false);

      hideLoader();

    }

  };



  const filteredTeachers = teachers.filter(t =>

    !searchTerm ||

    (t.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||

    (t.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||

    (t.role || "").toLowerCase().includes(searchTerm.toLowerCase())

  );



  const getInitials = (name) => {

    if (!name) return "?";

    const parts = name.split(" ");

    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name[0];

  };



  if (loading) {

    return <div className="p-8 text-center">טוען נתונים...</div>;

  }



  return (

    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">

      <div className="max-w-7xl mx-auto space-y-6">

       

        {/* Header */}

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">

          <div className="flex items-center gap-4">

            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">

              <Users className="w-9 h-9 text-white" />

            </div>

            <div>

              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">צוות יויה</h1>

              <p className="text-slate-600">ניהול עובדים ומדריכים</p>

            </div>

          </div>

          <div className="flex gap-2">

            <Link to={createPageUrl("CreateTeacher")}>

              <Button className="bg-cyan-600 hover:bg-cyan-700 gap-2 text-white">

                <Plus className="w-4 h-4" />

                הוספת עובד חדש

              </Button>

            </Link>

            <BackHomeButtons backTo="CRMHub" backLabel="חזור למרכז ניהול" />

          </div>

        </div>



        {/* Search Bar */}

        <Card>

          <CardContent className="p-4">

            <div className="relative">

              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />

              <Input

                placeholder="חיפוש לפי שם, תפקיד או אימייל..."

                value={searchTerm}

                onChange={(e) => setSearchTerm(e.target.value)}

                className="pr-10"

              />

            </div>

          </CardContent>

        </Card>



        {/* Grid */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {filteredTeachers.map((teacher) => {

            const school = schools.find(s => s.id === teacher.institution_id);

           

            return (

              <Link key={teacher.id} to={createPageUrl(`TeacherProfile?teacherId=${teacher.id}`)}>

                <Card className="hover:shadow-md transition-shadow cursor-pointer bg-white">

                  <CardHeader className="pb-3">

                    <div className="flex items-center gap-4">

                      <Avatar className="w-12 h-12 bg-cyan-100">

                        <AvatarFallback className="text-cyan-700 font-bold">

                          {getInitials(teacher.name)}

                        </AvatarFallback>

                      </Avatar>

                      <div className="flex-1">

                        <CardTitle className="text-lg">{teacher.name}</CardTitle>

                        {teacher.job_title && (

                          <p className="text-sm text-cyan-600 font-medium">{teacher.job_title}</p>

                        )}

                      </div>

                    </div>

                  </CardHeader>

                  <CardContent className="space-y-2">

                    {teacher.email && (

                      <div className="flex items-center gap-2 text-sm text-slate-600">

                        <Mail className="w-4 h-4 text-slate-400" />

                        <span className="truncate">{teacher.email}</span>

                      </div>

                    )}

                    {teacher.phone && (

                      <div className="flex items-center gap-2 text-sm text-slate-600">

                        <Phone className="w-4 h-4 text-slate-400" />

                        <span>{teacher.phone}</span>

                      </div>

                    )}

                  </CardContent>

                </Card>

              </Link>

            );

          })}

        </div>

      </div>

    </div>

  );

}