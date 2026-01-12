import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLoading } from "@/components/common/LoadingContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Phone, Mail, MessageCircle, Loader2 } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { useToast } from "@/components/ui/use-toast";

// Components
import TeacherPersonalTab from "@/components/teacher/TeacherPersonalTab";
import TeacherSalaryTab from "@/components/teacher/TeacherSalaryTab";
import TeacherJournalTab from "@/components/teacher/TeacherJournalTab";

export default function TeacherProfile() {
  const { showLoader, hideLoader } = useLoading();
  const location = useLocation();
  const { toast } = useToast();

  const [teacher, setTeacher] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");

  // Extract Teacher ID
  const searchParams = new URLSearchParams(location.search);
  const teacherId = searchParams.get("id");

  // 1. Fetch ONLY Teacher Basic Info (Super Fast)
  const loadTeacher = async () => {
    if (!teacherId) return;
    showLoader();
    try {
      const teacherData = await base44.entities.Teacher.get(teacherId);
      setTeacher(teacherData);
    } catch (error) {
      console.error("Error loading teacher:", error);
      toast({ title: "שגיאה", description: "לא ניתן לטעון את נתוני המורה", variant: "destructive" });
    } finally {
      hideLoader();
    }
  };

  useEffect(() => {
    loadTeacher();
  }, [teacherId]);

  const handleStatusToggle = async (currentStatus) => {
    if (!teacher) return;
    try {
      const newStatus = !currentStatus;
      await base44.entities.Teacher.update(teacher.id, { active: newStatus });
      setTeacher({ ...teacher, active: newStatus });
      toast({ title: "סטטוס עודכן", description: "המורה כעת " + (newStatus ? "פעיל" : "לא פעיל") });
    } catch (error) {
      toast({ title: "שגיאה", description: "עדכון הסטטוס נכשל", variant: "destructive" });
    }
  };

  // Safe checks for alerts
  const hasPoliceAlert = teacher ? (!teacher.police_clearance_url || (teacher.police_clearance_expiry_date && new Date(teacher.police_clearance_expiry_date) < new Date())) : false;

  if (!teacher) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-[var(--yoya-purple)]" />
        <h2 className="text-xl font-semibold">טוען פרופיל מורה...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Sticky Header - Lightweight */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <BackHomeButtons backTo="TeachersList" backLabel="חזרה לרשימה" showHomeButton={false} />
            
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{teacher.name || "ללא שם"}</h1>
                {hasPoliceAlert && (
                  <div className="bg-red-100 text-red-600 p-1.5 rounded-full" title="חסר אישור משטרה או פג תוקף">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <Switch 
                  checked={teacher.active} 
                  onCheckedChange={() => handleStatusToggle(teacher.active)} 
                />
                <span className={`text-sm font-medium ${teacher.active ? 'text-green-600' : 'text-gray-500'}`}>
                  {teacher.active ? "פעיל" : "לא פעיל / בחופשה"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <a href={`tel:${teacher.phone}`}>
              <Button variant="outline" size="icon" className="rounded-full bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100">
                <Phone className="w-5 h-5" />
              </Button>
            </a>
            <a href={`https://wa.me/${teacher.phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="icon" className="rounded-full bg-green-50 text-green-600 border-green-200 hover:bg-green-100">
                <MessageCircle className="w-5 h-5" />
              </Button>
            </a>
            <a href={`mailto:${teacher.email}`}>
              <Button variant="outline" size="icon" className="rounded-full bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100">
                <Mail className="w-5 h-5" />
              </Button>
            </a>
          </div>

        </div>
      </div>

      {/* Main Content - Lazy Loaded Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          
          <TabsList className="w-full justify-start h-auto p-1 bg-white border rounded-lg overflow-x-auto flex-nowrap md:flex-wrap">
            <TabsTrigger value="personal" className="flex-1 min-w-[150px] py-3 text-base data-[state=active]:bg-[var(--yoya-light)] data-[state=active]:text-[var(--yoya-dark)]">
              מידע אישי ופרטי התקשרות
            </TabsTrigger>
            <TabsTrigger value="salary" className="flex-1 min-w-[150px] py-3 text-base data-[state=active]:bg-[var(--yoya-light)] data-[state=active]:text-[var(--yoya-dark)]">
              חישוב שכר
            </TabsTrigger>
            <TabsTrigger value="journal" className="flex-1 min-w-[150px] py-3 text-base data-[state=active]:bg-[var(--yoya-light)] data-[state=active]:text-[var(--yoya-dark)]">
              יומן מסע
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="focus-visible:outline-none">
            <TeacherPersonalTab teacher={teacher} onUpdate={loadTeacher} />
          </TabsContent>

          <TabsContent value="salary" className="focus-visible:outline-none">
            {/* Fetches heavy data ONLY when active */}
            <TeacherSalaryTab teacher={teacher} onUpdate={loadTeacher} />
          </TabsContent>

          <TabsContent value="journal" className="focus-visible:outline-none">
            <TeacherJournalTab teacher={teacher} onUpdate={loadTeacher} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}