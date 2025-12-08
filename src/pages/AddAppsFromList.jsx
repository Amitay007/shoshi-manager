import React from "react";
import { VRApp } from "@/entities/VRApp";
import { with429Retry } from "@/components/utils/retry";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ListPlus, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const DEFAULT_APPS = [
  "Cook-Out: A Sandwich Tale",
  "MultyBrush",
  "Learning – Irusu",
  "Awake Heart",
  "Among Us (VR גרסה)",
  "Hand Physics Lab",
  "Spatial",
  "Paint",
  "Music",
  "Sep’s Diner",
  "Sugar Mess",
  "Dance Loop",
  "Hand Tool Parts",
  "Wander",
  "Keep Talking and Nobody Dies",
  "Color Space",
  "Pets VR",
  "Rooms of Realities",
  "Onward",
  "Loco Dojo Unleashed",
  "Rube Goldberg Workshop",
  "Untangled",
  "Escape Simulator",
  "SPHERES",
  "Remio",
  "Language Lab",
  "Rage Room VR",
  "Sports Scrambl",
  "I Expect You To Die",
  "Home Sweet Home VR",
  "POPULATION: ONE",
  "Meteoric VR",
  "Multiverse",
  "Enhance",
  "Mission: ISS",
  "Anne Frank House VR",
  "Bogo",
  "Immerse",
  "Liminal",
  "Roblox VR",
  "Mondly VR"
];

export default function AddAppsFromList() {
  const [text, setText] = React.useState(DEFAULT_APPS.join("\n"));
  const [loading, setLoading] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [existingCount, setExistingCount] = React.useState(0);
  const [missing, setMissing] = React.useState([]);
  const [addedCount, setAddedCount] = React.useState(0);
  const [error, setError] = React.useState("");

  const parseNames = React.useCallback(() => {
    const raw = (text || "").split("\n").map(s => s.trim()).filter(Boolean);
    // Deduplicate case-insensitively
    const seen = new Set();
    const out = [];
    for (const name of raw) {
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(name);
      }
    }
    return out;
  }, [text]);

  const checkMissing = React.useCallback(async () => {
    setChecking(true);
    setError("");
    try {
      const all = await with429Retry(() => VRApp.list());
      const existingSet = new Set((all || []).map(a => (a.name || "").trim().toLowerCase()));
      setExistingCount(existingSet.size);
      const parsed = parseNames();
      const notExisting = parsed.filter(n => !existingSet.has(n.toLowerCase()));
      setMissing(notExisting);
    } catch (e) {
      setError(e?.message || "בדיקה נכשלה");
    } finally {
      setChecking(false);
    }
  }, [parseNames]);

  React.useEffect(() => {
    // initial check on mount
    checkMissing();
  }, [checkMissing]);

  const addMissing = async () => {
    setLoading(true);
    setError("");
    setAddedCount(0);
    try {
      if (missing.length === 0) {
        return;
      }
      await with429Retry(() => VRApp.bulkCreate(missing.map(name => ({ name }))));
      setAddedCount(missing.length);
      // Refresh the missing list after adding
      await checkMissing();
    } catch (e) {
      setError(e?.message || "יצירה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-md">
          <CardHeader className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <ListPlus className="w-7 h-7 text-cyan-700" />
              הוספת אפליקציות מהרשימה (מניעת כפילויות)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              הדביקו/ערכו את רשימת השמות למטה. המערכת תבדוק את הקיימות ותוסיף רק את החסרות, ללא כפילויות (בדיקה לפי שם לא תלוי רישיות).
            </p>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[220px] font-mono"
              placeholder="שם אפליקציה בכל שורה..."
            />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={checkMissing} disabled={checking || loading}>
                {checking ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> בודק...</> : "בדוק אילו חסרות"}
              </Button>
              <Button onClick={addMissing} disabled={loading || missing.length === 0} className="bg-cyan-700 hover:bg-cyan-800">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> מוסיף...</> : "הוסף את החסרות בלבד"}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-md bg-slate-100">
                סה״כ קיימות במערכת:
                <div className="font-bold text-slate-800">{existingCount}</div>
              </div>
              <div className="p-3 rounded-md bg-slate-100">
                חסרות להוספה כעת:
                <div className="font-bold text-slate-800">{missing.length}</div>
              </div>
              <div className="p-3 rounded-md bg-slate-100">
                נוספו עכשיו:
                <div className="font-bold text-slate-800">{addedCount}</div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 p-3 rounded-md">
                <AlertTriangle className="w-5 h-5" />
                <span>שגיאה: {error}</span>
              </div>
            )}

            {!error && addedCount > 0 && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 p-3 rounded-md">
                <CheckCircle2 className="w-5 h-5" />
                <span>ההוספה הושלמה בהצלחה.</span>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">אפליקציות חסרות (תתווספנה):</h4>
              {missing.length === 0 ? (
                <div className="text-slate-500 text-sm">אין אפליקציות חסרות כרגע.</div>
              ) : (
                <ul className="list-disc pr-5 space-y-1 text-slate-700">
                  {missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}