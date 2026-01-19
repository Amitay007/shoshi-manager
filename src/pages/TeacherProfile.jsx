import React, { useState, useEffect } from "react";

import { useLocation } from "react-router-dom";

import { base44 } from "@/api/base44Client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";

import { Briefcase, Phone, Mail, Calendar, BookOpen, User } from "lucide-react";

import BackHomeButtons from "@/components/common/BackHomeButtons";

import { useLoading } from "@/components/common/LoadingContext";

import { with429Retry } from "@/components/utils/retry";

import { useToast } from "@/components/ui/use-toast";

import { format } from "date-fns";



export default function TeacherProfile() {

  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);

  const teacherId = searchParams.get("teacherId");



  const [teacher, setTeacher] = useState(null);

  const [assignedPrograms, setAssignedPrograms] = useState([]);

  const [loading, setLoading] = useState(true);



  const { toast } = useToast();

  const { showLoader, hideLoader } = useLoading();



  useEffect(() => {

    loadData();

  }, [teacherId]);



  const loadData = async () => {

    if (!teacherId) return;



    showLoader();

    setLoading(true);

    try {

      // Fetch Teacher

      const teacherData = await with429Retry(() => base44.entities.Teacher.get(teacherId));

      if (!teacherData) {

        toast({ title: "שגיאה", description: "מורה לא נמצא", variant: "destructive" });

        return;

      }

      setTeacher(teacherData);



      // Fetch Assigned Programs via ScheduleEntry

      // We look for schedule entries assigned to this teacher to deduce programs

      const entries = await with429Retry(() => base44.entities.ScheduleEntry.filter({ assigned_teacher_id: teacherId }));

     

      // Extract unique program IDs

      const uniqueProgramIds = [...new Set(entries.map(e => e.program_id))];

     

      // Fetch Syllabus details for these programs

      if (uniqueProgramIds.length > 0) {

        const programsData = await Promise.all(

          uniqueProgramIds.map(id => with429Retry(() => base44.entities.Syllabus.get(id)).catch(() => null))

        );

        setAssignedPrograms(programsData.filter(Boolean));

      } else {

        setAssignedPrograms([]);

      }



    } catch (error) {

      console.error("Error loading profile:", error);

      toast({ title: "שגיאה", description: "לא הצלחנו לטעון את הנתונים", variant: "destructive" });

    } finally {

      setLoading(false);

      hideLoader();

    }

  };



  const getInitials = (name) => {

    if (!name) return "?";

    const parts = name.split(" ");

    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name[0];

  };



  if (loading) {

    return <div className="p-8 text-center">טוען נתונים...</div>;

  }



  if (!teacher) {

    return (

        <div className="p-8 text-center bg-slate-50 min-h-screen flex flex-col items-center justify-center">

            <h2 className="text-xl font-bold text-slate-800 mb-2">מורה לא נמצא</h2>

            <BackHomeButtons backTo="TeachersList" backLabel="חזור לרשימה" />

        </div>

    );

  }



  return (

    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">

      <div className="max-w-3xl mx-auto space-y-6">

       

        {/* Header */}

        <div className="flex justify-between items-