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
      // טעינה משולבת של תוכניות וסילבוסים כדי למצוא את הנתונים ה"נעלמים"
      const [progData, syllabiData, schoolsData] = await Promise.all([
        with429Retry(() => base44.entities.InstitutionProgram.list()).catch(() => []),
        with429Retry(() => base44.entities.Syllabus.list()).catch(() => []),
        with429Retry(() => base44.entities.EducationInstitution.list()).catch(() => [])
      ]);

      const combined = [...(progData || []), ...(syllabiData || [])];
      console.log("Raw Combined Data:", combined);
      
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

  if (loading) return <div className="p-12 text-center text-slate-500">טוען נתונים...</div>;

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
              <h1 className="text-3xl font-bold text-slate-900">מרכז