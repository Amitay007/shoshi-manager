import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, Target, Briefcase, Wrench } from "lucide-react";
import BackHomeButtons from "@/components/common/BackHomeButtons";

const syllabusValueTypes = [
  {
    key: "TargetAudienceOption",
    label: "קהל יעד",
    desc: "ניהול אפשרויות קהל יעד (יסודי, חטיבת ביניים, תיכון וכו')",
    icon: <Target className="w-6 h-6 text-purple-700" />
  },
  {
    key: "ActivityTypeOption",
    label: "סוג פעילות",
    desc: "ניהול סוגי פעילות (קורס שנתי, חצי שנתי, יום שיא וכו')",
    icon: <Briefcase className="w-6 h-6 text-purple-700" />
  },
  {
    key: "TechnologyToolOption",
    label: "כלים טכנולוגיים",
    desc: "ניהול כלים טכנולוגיים (VR, AR, AI וכו')",
    icon: <Wrench className="w-6 h-6 text-purple-700" />
  }
];

export default function SyllabusValuesManager() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-purple-900">ערכי סילבוס</h1>
            <p className="text-slate-600 mt-1">ניהול כל הערכים והאפשרויות ליצירת סילבוסים</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("DataRepositories")}>
              <Button variant="outline" className="gap-2 shadow-md">
                חזרה <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <BackHomeButtons />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {syllabusValueTypes.map((type) => (
            <Link key={type.key} to={createPageUrl(`DataRepositoryList?entity=${encodeURIComponent(type.key)}`)}>
              <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer shadow-md border-0 border-t-4 border-t-purple-600">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">{type.label}</CardTitle>
                  {type.icon}
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm">{type.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}