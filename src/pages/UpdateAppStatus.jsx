import React, { useState, useEffect } from "react";
import { VRApp } from "@/entities/VRApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { with429Retry } from "@/components/utils/retry";
import BackHomeButtons from "@/components/common/BackHomeButtons";

const APPS_TO_UPDATE = [
  "Hand Physics Lab",
  "Spatial",
  "Sep's Diner",
  "Wander",
  "Rooms of Realities",
  "Pets VR",
  "Keep Talking and Nobody Dies",
  "Keep Talking And Nobody Dies",
  "Color Space",
  "Loco Dojo Unleashed",
  "Loco Dojo",
  "Escape Simulator",
  "SPHERES",
  "Remio",
  "Language Lab",
  "I Expect You To Die",
  "Home Sweet Home",
  "Home Sweet Home VR",
  "POPULATION: ONE",
  "Meteoric VR",
  "Onward",
  "Rube Goldberg Workshop"
];

export default function UpdateAppStatus() {
  const [status, setStatus] = useState("updating");
  const [log, setLog] = useState([]);
  const [updatedCount, setUpdatedCount] = useState(0);

  const addLog = (message) => {
    setLog((prev) => [...prev, message]);
  };

  const normalizeAppName = (name) => {
    return (name || "").toLowerCase().trim().replace(/[^\w\s]/g, "");
  };

  useEffect(() => {
    const handleUpdate = async () => {
      addLog("מתחיל עדכון אוטומטי...");
      
      try {
        const allApps = await with429Retry(() => VRApp.list());
        addLog(`נמצאו ${allApps.length} אפליקציות במערכת`);
        
        // Create a map of normalized names to apps
        const appsByNormalizedName = new Map();
        allApps.forEach(app => {
          const normalized = normalizeAppName(app.name);
          if (!appsByNormalizedName.has(normalized)) {
            appsByNormalizedName.set(normalized, app);
          }
        });

        // Show all app names for debugging
        addLog("\nאפליקציות במערכת:");
        allApps.slice(0, 10).forEach(app => addLog(`  - ${app.name}`));
        addLog("...\n");
        
        let count = 0;
        const processed = new Set();
        
        for (const appName of APPS_TO_UPDATE) {
          const normalizedSearch = normalizeAppName(appName);
          
          // Skip if already processed this normalized name
          if (processed.has(normalizedSearch)) {
            continue;
          }
          processed.add(normalizedSearch);
          
          const app = appsByNormalizedName.get(normalizedSearch);
          
          if (!app) {
            addLog(`⚠️ לא נמצא: "${appName}"`);
            continue;
          }
          
          if (!app.is_installed) {
            addLog(`⏭️ כבר לא מותקן: ${app.name}`);
            continue;
          }
          
          try {
            await with429Retry(() => VRApp.update(app.id, { is_installed: false }));
            addLog(`✅ עודכן: ${app.name}`);
            count++;
            setUpdatedCount(count);
          } catch (err) {
            addLog(`❌ שגיאה בעדכון ${app.name}: ${err.message}`);
          }
        }
        
        addLog(`\n✅ הושלם! עודכנו ${count} אפליקציות`);
        setStatus("success");
        
      } catch (err) {
        addLog(`❌ שגיאה כללית: ${err.message}`);
        setStatus("error");
      }
    };

    handleUpdate();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>עדכון סטטוס אפליקציות</CardTitle>
              <BackHomeButtons />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-600">
              מעדכן אוטומטית את האפליקציות מ"מותקן" ל"לא מעודכן"
            </div>
            
            {status === "updating" && (
              <div className="flex items-center gap-2 text-blue-700 bg-blue-50 p-3 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>מעדכן... ({updatedCount} הושלמו)</span>
              </div>
            )}
            
            {status === "success" && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span>עודכנו {updatedCount} אפליקציות בהצלחה!</span>
              </div>
            )}
            
            {status === "error" && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>אירעה שגיאה בעדכון</span>
              </div>
            )}
            
            {log.length > 0 && (
              <div className="bg-slate-50 border rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="text-xs font-mono space-y-1">
                  {log.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}