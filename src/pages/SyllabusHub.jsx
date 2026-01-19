import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Plus, Search, Trash2, FileText } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { with429Retry } from "@/components/utils/retry";

export default function SyllabusHub() {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // ניסיון טעינה מישות Program במקום Syllabus
      const res = await with429Retry(() => base44.entities.Program.list());
      console.log("Data from Program entity:", res);
      
      const dataArray = Array.isArray(res) ? res : (res?.results || []);
      setDataList(dataArray);
    } catch (error) {
      console.error("Load Error:", error);
      // אם Program לא קיים, ננסה Syllabus כגיבוי
      const backup = await with429Retry(() => base44.entities.Syllabus.list()).catch(() => []);
      setDataList(backup || []);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return dataList.filter(item => {
      const title = (item.title || item.subject || item.name || "").toLowerCase();
      return !searchTerm || title.includes(searchTerm.toLowerCase());
    });
  }, [dataList, searchTerm]);

  if (loading) return <div className="p-12 text-center">טוען נתונים מהמערכת...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">מרכז סילבוסים</h1>
              <p className="text-slate-500">נמצאו {filteredItems.length} סילבוסים פעילים</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("SyllabusWizard")}>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-md">
                <Plus className="w-4 h-4" /> סילבוס חדש
              </Button>
            </Link>
            <BackHomeButtons backTo="CRMHub" backLabel="אנשי קשר" />
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input 
            placeholder="חיפוש לפי שם או נושא..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pr-10 bg-white"
          />
        </div>

        {/* Grid */}
        {filteredItems.length === 0 ? (
          <Card className="p-20 text-center border-2 border-dashed">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">לא נמצאו סילבוסים במערכת</p>
            <p className="text-slate-400 text-sm mt-1">השתמש בכפתור למעלה כדי ליצור סילבוס חדש</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <Card 
                key={item.id} 
                className="hover:shadow-xl transition-all cursor-pointer bg-white group border-none shadow-md"
                onClick={() => window.location.href = createPageUrl(`SyllabusWizard?id=${item.id}`)}
              >
                <div className="h-1.5 bg-purple-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">
                    {item.title || item.subject || item.name || "סילבוס ללא שם"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-slate-500 mb-4 line-clamp-2">
                    {item.description || "אין תיאור זמין לסילבוס זה."}
                  </div>
                  <div className="flex gap-2 pt-4 border-t mt-4">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200">
                      עריכה ופרטים
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}