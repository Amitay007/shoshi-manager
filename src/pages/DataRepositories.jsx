import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Orbit,
  AppWindow,
  Link2,
  KeyRound,
  GraduationCap,
  Tags,
  Layers,
  Users,
  Network,
  ShoppingCart,
  ArrowRight,
  UserCircle,
  Settings,
  BookOpen
} from "lucide-react";

const repositories = [
  { key: "VRDevice", label: "משקפות (VRDevice)", desc: "ניהול כל המשקפות", icon: <Orbit className="w-6 h-6 text-cyan-700" /> },
  { key: "VRApp", label: "אפליקציות (VRApp)", desc: "ניהול אפליקציות VR", icon: <AppWindow className="w-6 h-6 text-cyan-700" /> },
  { key: "DeviceApp", label: "שיוך משקפות-אפליקציות (DeviceApp)", desc: "מי מותקן על מה", icon: <Link2 className="w-6 h-6 text-cyan-700" /> },
  { key: "DeviceLinkedAccount", label: "חשבונות מקושרים (DeviceLinkedAccount)", desc: "ניהול חשבונות לכל משקפת", icon: <KeyRound className="w-6 h-6 text-cyan-700" /> },
  { key: "EducationInstitution", label: "מוסדות חינוך (EducationInstitution)", desc: "רשימת מוסדות חינוך", icon: <GraduationCap className="w-6 h-6 text-cyan-700" /> },
  { key: "Teacher", label: "מורים (Teacher)", desc: "מאגר מידע למורים", icon: <UserCircle className="w-6 h-6 text-cyan-700" /> },
  { key: "GenreOption", label: "אפשרויות ז'אנר (GenreOption)", desc: "ניהול תיבות בחירה לז'אנרים", icon: <Tags className="w-6 h-6 text-cyan-700" /> },
  { key: "EducationFieldOption", label: "אפשרויות תחום חינוכי", desc: "ניהול תחומים חינוכיים", icon: <GraduationCap className="w-6 h-6 text-cyan-700" /> },
  { key: "PlatformOption", label: "אפשרויות פלטפורמה", desc: "ניהול פלטפורמות נתמכות", icon: <Layers className="w-6 h-6 text-cyan-700" /> },
  { key: "PlayerCountOption", label: "אפשרויות מספר שחקנים", desc: "ניהול תצוגת שחקנים", icon: <Users className="w-6 h-6 text-cyan-700" /> },
  { key: "InternetRequirementOption", label: "אפשרויות אינטרנט", desc: "דורש/לא דורש אינטרנט", icon: <Network className="w-6 h-6 text-cyan-700" /> },
  { key: "PurchaseTypeOption", label: "אפשרויות סוג רכישה", desc: "ניהול סוגי רכישה", icon: <ShoppingCart className="w-6 h-6 text-cyan-700" /> },
  { key: "Settings", label: "הגדרות מערכת", desc: "לוגו ושם אפליקציה", icon: <Settings className="w-6 h-6 text-cyan-700" /> },
  { key: "SyllabusValues", label: "ערכי סילבוס", desc: "קהל יעד, סוג פעילות, כלים טכנולוגיים", icon: <BookOpen className="w-6 h-6 text-purple-700" />, category: "syllabus" }
];

export default function DataRepositories() {
  const navigate = useNavigate();

  const handleClick = (key) => {
    if (key === "Settings") {
      navigate(createPageUrl("UploadLogo"));
    } else if (key === "SyllabusValues") {
      navigate(createPageUrl("SyllabusValuesManager"));
    } else {
      navigate(createPageUrl(`DataRepositoryList?entity=${encodeURIComponent(key)}`));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-cyan-900">מאגרי מידע</h1>
          <Link to={createPageUrl("Home")}>
            <Button variant="outline" className="gap-2 shadow-md">
              חזרה למסך הראשי <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {repositories.map((repo) => (
            <div key={repo.key} onClick={() => handleClick(repo.key)} className="cursor-pointer">
              <Card className={`hover:shadow-lg transition-all duration-300 hover:-translate-y-1 card-hover shadow-md border-0 ${repo.category === 'syllabus' ? 'border-t-4 border-t-purple-600' : ''}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">{repo.label}</CardTitle>
                  {repo.icon}
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm">{repo.desc}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}