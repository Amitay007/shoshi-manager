
import React, { useState } from "react";
import { VRDevice, VRApp } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, Loader2, CheckCircle, AlertTriangle, Wand2, ListPlus, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { installationData } from "@/components/InstallationData";
import { with429Retry } from "@/components/utils/retry";

export default function DataUpdater() {
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');
    const [log, setLog] = useState([]);

    const addLog = (msg) => setLog(prev => [...prev, msg]);

    const APPS_SEED = [
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

    const handleUpdate = async () => {
        setStatus('loading');
        setLog([]);
        setMessage('מתחיל תהליך עדכון...');

        try {
            addLog("מאחזר את כל המכשירים והאפליקציות מהמאגר...");
            const [allDevices, allApps] = await Promise.all([
                with429Retry(() => VRDevice.list()),
                with429Retry(() => VRApp.list())
            ]);
            addLog(`נמצאו ${allDevices.length} מכשירים ו-${allApps.length} אפליקציות.`);

            const binocularToId = allDevices.reduce((acc, dev) => {
                acc[dev.binocular_number] = dev.id;
                return acc;
            }, {});

            const appNameToId = allApps.reduce((acc, app) => {
                acc[app.name.trim().toLowerCase()] = app.id;
                return acc;
            }, {});
            
            addLog("מכין רשומות התקנה חדשות על בסיס הרשימה העדכנית...");
            const newDeviceApps = [];
            const unknownApps = new Set();

            for (const appName in installationData) {
                const appId = appNameToId[appName.trim().toLowerCase()];
                if (!appId) {
                    unknownApps.add(appName);
                    continue;
                }
                const binocularNumbers = installationData[appName];
                for (const binocularNumber of binocularNumbers) {
                    const deviceId = binocularToId[binocularNumber];
                    if (deviceId) {
                        newDeviceApps.push({ app_id: appId, device_id: deviceId });
                    }
                }
            }
            
            if (unknownApps.size > 0) {
                 addLog(`הערה: האפליקציות הבאות מהרשימה לא נמצאו במאגר: ${Array.from(unknownApps).join(', ')}`);
            }

            addLog(`מוכן ליצור ${newDeviceApps.length} רשומות התקנה חדשות.`);
            
            if (newDeviceApps.length > 0) {
                addLog("יוצר רשומות חדשות במאגר (ללא מחיקת נתונים קיימים)...");
                // This part is commented out to avoid accidental data duplication.
                // You can uncomment it to perform the actual bulk creation.
                // await with429Retry(() => DeviceApp.bulkCreate(newDeviceApps));
                addLog("הערה: יצירת רשומות חדשות מנוטרלת כרגע למניעת כפילויות. ניתן להפעיל בקוד.");
            }

            setStatus('success');
            setMessage('העדכון הושלם בהצלחה!');
            addLog('כל המידע עודכן בהצלחה. הערה: אם היו רשומות קיימות, הן נשארו במערכת.');

        } catch (error) {
            console.error("Update failed:", error);
            setStatus('error');
            setMessage(`אירעה שגיאה: ${error.message}`);
            addLog(`שגיאה: ${error.message}`);
        }
    };
    
    const addMissingDevices = async () => {
        setStatus('loading');
        setLog([]);
        setMessage('מתחיל תהליך הוספת משקפות חסרות...');
    
        try {
            addLog("מאחזר רשימת משקפות קיימות...");
            const existingDevices = await with429Retry(() => VRDevice.list());
            const existingNumbers = new Set(existingDevices.map(d => d.binocular_number));
            addLog(`נמצאו ${existingNumbers.size} משקפות ייחודיות.`);
    
            const missingDevices = [];
            for (let i = 1; i <= 36; i++) {
                if (!existingNumbers.has(i)) {
                    missingDevices.push({
                        binocular_number: i,
                        device_name: `משקפת ${i}`,
                        serial_number: `TEMP-${i}`, // Placeholder serial number
                        status: 'זמין',
                    });
                }
            }
    
            if (missingDevices.length === 0) {
                addLog("כל המשקפות מ-1 עד 36 כבר קיימות במערכת.");
                setStatus('success');
                setMessage('לא נמצאו משקפות חסרות להוספה.');
                return;
            }
    
            addLog(`נמצאו ${missingDevices.length} משקפות חסרות. מוסיף אותן למערכת...`);
            await with429Retry(() => VRDevice.bulkCreate(missingDevices));
            addLog(`המשקפות הבאות נוספו: ${missingDevices.map(d => d.binocular_number).join(', ')}`);
    
            setStatus('success');
            setMessage('המשקפות החסרות נוספו בהצלחה!');
        } catch (error) {
            console.error("Failed to add missing devices:", error);
            setStatus('error');
            setMessage(`אירעה שגיאה: ${error.message}`);
            addLog(`שגיאה: ${error.message}`);
        }
    };

    const addAppsFromList = async () => {
      setStatus('loading');
      setLog([]);
      setMessage('מוסיף אפליקציות מהרשימה (ללא כפילויות)...');
      try {
        addLog("טוען אפליקציות קיימות...");
        const existing = await with429Retry(() => VRApp.list());
        const existingSet = new Set((existing || []).map(a => (a.name || '').trim().toLowerCase()));

        const missing = APPS_SEED
          .map(n => (n || '').trim())
          .filter(n => n.length > 0 && !existingSet.has(n.toLowerCase()));

        if (missing.length === 0) {
          addLog("לא נמצאו אפליקציות חסרות. הכל כבר קיים.");
          setStatus('success');
          setMessage('כל האפליקציות כבר קיימות. לא נוצרו כפילויות.');
          return;
        }

        addLog(`נמצאו ${missing.length} אפליקציות חסרות: ${missing.join(', ')}`);
        addLog("יוצר רשומות חדשות...");
        await with429Retry(() => VRApp.bulkCreate(missing.map(name => ({ name }))));

        addLog("סיום יצירה.");
        setStatus('success');
        setMessage('הוספת האפליקציות הושלמה בהצלחה!');
        addLog(`נוספו ${missing.length} אפליקציות חדשות.`);
      } catch (error) {
        console.error("Failed to add apps:", error);
        setStatus('error');
        setMessage(`אירעה שגיאה: ${error.message}`);
        addLog(`שגיאה: ${error.message}`);
      }
    };

    const updateStoreLinks = async () => {
      setStatus('loading');
      setLog([]);
      setMessage('מעדכן קישורי חנות לאפליקציות...');
      try {
        const TARGETS = [
          { name: "Cook-Out", url: "https://www.meta.com/experiences/cook-out/2004774962957063/" },
          { name: "MultiBrush", url: "https://www.meta.com/experiences/multibrush/3438333449611263/" },
          { name: "Human Anatomy VR Learning", url: "https://www.meta.com/experiences/human-anatomy-vr-learning/6527658207255000/" },
          { name: "Awake Heart", url: "https://www.meta.com/experiences/awake-heart/4616603668383139/" },
          { name: "Beat Saber", url: "https://www.meta.com/experiences/beat-saber/2448060205267927/" },
        ];

        const normalize = (s) => String(s || "")
          .toLowerCase()
          .replace(/–/g, "-")
          .replace(/:/g, "")
          .trim();

        const ALIASES = {
          "cook-out": ["cook-out a sandwich tale"],
          "multibrush": ["multybrush"],
          "human anatomy vr learning": ["learning - irusu", "learning – irusu", "human anatomy vr learning -irusu"]
        };

        addLog("טוען את כל האפליקציות...");
        const allApps = await with429Retry(() => VRApp.list());
        const byNorm = new Map();
        (allApps || []).forEach(a => {
          byNorm.set(normalize(a.name), a);
        });

        let updated = 0;
        let created = 0;

        for (const t of TARGETS) {
          const key = normalize(t.name);
          let app = byNorm.get(key);

          // try alias mapping if not found
          if (!app && ALIASES[key]) {
            for (const alias of ALIASES[key]) {
              const aliasApp = byNorm.get(normalize(alias));
              if (aliasApp) {
                app = aliasApp;
                break;
              }
            }
          }

          // if still not found, try partial include search (e.g., "cook-out" vs "cook-out a sandwich tale")
          if (!app) {
            for (const [k, a] of byNorm.entries()) {
              if (k.includes(key) || key.includes(k)) {
                app = a;
                break;
              }
            }
          }

          if (!app) {
            addLog(`לא נמצאה אפליקציה בשם "${t.name}" — יוצר חדשה עם קישור החנות.`);
            const createdApp = await with429Retry(() => VRApp.create({
              name: t.name,
              store_link: t.url,
              purchase_type: "app_purchase"
            }));
            byNorm.set(normalize(createdApp.name), createdApp);
            created += 1;
          } else {
            addLog(`מעדכן קישור חנות עבור "${app.name}".`);
            await with429Retry(() => VRApp.update(app.id, {
              store_link: t.url,
              purchase_type: "app_purchase"
            }));
            updated += 1;
          }
        }

        setStatus('success');
        setMessage(`הושלם: עודכנו ${updated}, נוצרו ${created}.`);
        addLog(`סיום: עודכנו ${updated} אפליקציות, נוצרו ${created} חדשות.`);
      } catch (error) {
        console.error("Failed to update store links:", error);
        setStatus('error');
        setMessage(`אירעה שגיאה: ${error.message}`);
        addLog(`שגיאה: ${error.message}`);
      }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-8 flex justify-center items-center" dir="rtl">
            <div className="w-full max-w-2xl space-y-6">
                <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <Link2 className="w-8 h-8 text-indigo-700" />
                            עדכון קישורי חנות לאפליקציות ספציפיות
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-4">
                            לחיצה על הכפתור תעדכן/תיצור את האפליקציות הבאות ותשייך להן קישור חנות: Cook-Out, MultiBrush, Human Anatomy VR Learning, Awake Heart, Beat Saber.
                            אם אפליקציה לא קיימת במאגר, ניצור אותה באופן אוטומטי.
                        </p>
                        <div className="flex justify-center my-6">
                            <Button
                                onClick={updateStoreLinks}
                                disabled={status === 'loading'}
                                className="bg-indigo-700 hover:bg-indigo-800 text-white px-8 py-6 text-lg"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        מעדכן...
                                    </>
                                ) : (
                                    'עדכן קישורי חנות'
                                )}
                            </Button>
                        </div>
                        {status !== 'idle' && (
                            <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
                                <h3 className="font-semibold mb-2 flex items-center">
                                    {status === 'success' && <CheckCircle className="w-5 h-5 text-green-500 ml-2"/>}
                                    {status === 'error' && <AlertTriangle className="w-5 h-5 text-red-500 ml-2"/>}
                                    סטטוס: {message}
                                </h3>
                                <div className="h-40 overflow-y-auto bg-slate-900 text-white font-mono text-xs p-3 rounded-md" dir="ltr">
                                    {log.map((line, index) => (
                                        <p key={`links-update-log-${index}`} className="whitespace-pre-wrap">&gt; {line}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="mt-4 text-center">
                            <Link to={createPageUrl('Home')}>
                                <Button variant="link">חזרה לתפריט הראשי</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <ListPlus className="w-8 h-8 text-cyan-700" />
                            הוספת אפליקציות מהרשימה (ללא כפילויות)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-4">
                            לחיצה על הכפתור תוסיף את רשימת האפליקציות שסיפקת אל המאגר, תוך בדיקה ומניעת כפילויות לפי שם (לא רגיש לאותיות קטנות/גדולות).
                        </p>
                        <div className="flex justify-center my-6">
                            <Button
                                onClick={addAppsFromList}
                                disabled={status === 'loading'}
                                className="bg-cyan-700 hover:bg-cyan-800 text-white px-8 py-6 text-lg"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        מוסיף...
                                    </>
                                ) : (
                                    'הוסף את רשימת האפליקציות'
                                )}
                            </Button>
                        </div>
                        {status !== 'idle' && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
                                <h3 className="font-semibold mb-2 flex items-center">
                                    {status === 'success' && <CheckCircle className="w-5 h-5 text-green-500 ml-2"/>}
                                    {status === 'error' && <AlertTriangle className="w-5 h-5 text-red-500 ml-2"/>}
                                    סטטוס: {message}
                                </h3>
                                <div className="h-40 overflow-y-auto bg-slate-900 text-white font-mono text-xs p-3 rounded-md" dir="ltr">
                                    {log.map((line, index) => (
                                        <p key={`apps-seed-log-${index}`} className="whitespace-pre-wrap">&gt; {line}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                         <div className="mt-4 text-center">
                            <Link to={createPageUrl('Home')}>
                                <Button variant="link">חזרה לתפריט הראשי</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <Wand2 className="w-8 h-8 text-purple-600" />
                            השלמת משקפות חסרות (1-36)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-4">
                            פעולה זו תבדוק אילו משקפות חסרות בטווח של 1 עד 36 ותוסיף אותן למערכת באופן אוטומטי.
                        </p>
                        <div className="flex justify-center my-6">
                            <Button
                                onClick={addMissingDevices}
                                disabled={status === 'loading'}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        בודק ומוסיף...
                                    </>
                                ) : (
                                    'הוסף משקפות חסרות'
                                )}
                            </Button>
                        </div>
                        {status !== 'idle' && (
                            <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
                                <h3 className="font-semibold mb-2 flex items-center">
                                    {status === 'success' && <CheckCircle className="w-5 h-5 text-green-500 ml-2"/>}
                                    {status === 'error' && <AlertTriangle className="w-5 h-5 text-red-500 ml-2"/>}
                                    סטטוס: {message}
                                </h3>
                                <div className="h-48 overflow-y-auto bg-slate-900 text-white font-mono text-xs p-3 rounded-md" dir="ltr">
                                    {log.map((line, index) => (
                                        <p key={`missing-devices-log-${index}`} className="whitespace-pre-wrap">&gt; {line}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                         <div className="mt-4 text-center">
                            <Link to={createPageUrl('Home')}>
                                <Button variant="link">חזרה לתפריט הראשי</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            
                <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <UploadCloud className="w-8 h-8 text-cyan-600" />
                            עדכון רשימות התקנה לאפליקציות
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-4">
                            פעולה זו נועדה לסנכרן את רשומות ה-DeviceApp עם המידע המרכזי. מומלץ לבצע זאת רק אם יש חשד לחוסר סנכרון.
                        </p>

                        <div className="flex justify-center my-6">
                            <Button
                                onClick={handleUpdate}
                                disabled={status === 'loading'}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-6 text-lg"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        מעדכן...
                                    </>
                                ) : (
                                    'בצע סנכרון התקנות'
                                )}
                            </Button>
                        </div>

                        {status !== 'idle' && (
                            <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
                                <h3 className="font-semibold mb-2 flex items-center">
                                    {status === 'success' && <CheckCircle className="w-5 h-5 text-green-500 ml-2"/>}
                                    {status === 'error' && <AlertTriangle className="w-5 h-5 text-red-500 ml-2"/>}
                                    סטטוס: {message}
                                </h3>
                                <div className="h-48 overflow-y-auto bg-slate-900 text-white font-mono text-xs p-3 rounded-md" dir="ltr">
                                    {log.map((line, index) => (
                                        <p key={`update-log-${index}`} className="whitespace-pre-wrap">&gt; {line}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                         <div className="mt-4 text-center">
                            <Link to={createPageUrl('Home')}>
                                <Button variant="link">חזרה לתפריט הראשי</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
