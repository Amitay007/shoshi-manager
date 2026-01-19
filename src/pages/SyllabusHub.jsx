import React, { useState, useEffect } from "react";
import { Syllabus } from "@/entities/Syllabus"; // שימוש בייבוא המדויק מה-Wizard
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Plus, Search, Trash2 } from "lucide-react";
import { with429Retry } from "@/components/utils/retry";

export default function SyllabusHub() {
  const [syllabi, setSyllabi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await with429Retry(() => Syllabus.list());
      console.log("Found syllabi:", data);
      setSyllabi(data || []);
    } catch (error) {
      console.error("Error loading syllabi:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = syllabi.filter(s => 
    !searchTerm || (s.title || s.course_topic || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-20 text-center">טוען סילבוסים...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="text-purple-600" /> מרכז סילבוסים
          </h1>
          <Link to={createPageUrl("SyllabusWizard")}>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white"><Plus className="ml-2 w-4 h-4" /> סילבוס חדש</Button>
          </Link>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input placeholder="חיפוש..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map(s => (
            <Card key={s.id} className="hover:shadow-md cursor-pointer" onClick={() => window.location.href = createPageUrl(`SyllabusWizard?id=${s.id}`)}>
              <CardHeader>
                <CardTitle className="text-lg">{s.title || s.course_topic || "ללא שם"}</CardTitle>
                <Badge variant="outline">{s.status === "final" ? "מאושר" : "טיוטה"}</Badge>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">
                מורה: {s.teacher_name || "לא הוגדר"}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}