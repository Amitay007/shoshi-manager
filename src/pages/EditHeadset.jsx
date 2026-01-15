import React, { useEffect, useMemo, useState, useCallback } from "react";
import { VRDevice } from "@/entities/VRDevice";
import { VRApp } from "@/entities/VRApp";
import { DeviceApp } from "@/entities/DeviceApp"; // הוספנו את הישות הזו
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Orbit, Mail, AppWindow, FileText, X, Plus } from "lucide-react";
import { with429Retry } from "@/components/utils/retry";

export default function EditHeadset() {
  const urlParams = new URLSearchParams(window.location.search);
  const deviceId = urlParams.get("id");
  
  const [device, setDevice] = useState(null);
  const [form, setForm] = useState({
    binocular_number: "",
    serial_number: "",
    headset_type: "",
    other_type: "",
    model: "",
    primary_email: "",
    nickname: "",
    purchase_date: null,
    notes: "",
  });
  
  const [errors, setErrors] = useState({ id: "", email: "" });
  const [appsDialogOpen, setAppsDialogOpen] = useState(false);
  const [appsSearch, setAppsSearch] = useState("");
  
  const [allApps, setAllApps] = useState([]);
  const [selectedApps, setSelectedApps] = useState([]); // רשימת האפליקציות שנבחרו (אובייקטים)
  const [originalAppIds, setOriginalAppIds] = useState(new Set()); // כדי לדעת מה לשמור/למחוק
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!deviceId) {
      navigate(createPageUrl("GeneralInfo"));
      return;
    }
    
    try {
      // 1. טעינת המכשיר, האפליקציות וטבלת הקשר (DeviceApp)
      const [d, apps, deviceAppsRel] = await Promise.all([
        with429Retry(() => VRDevice.get(deviceId)),
        with429Retry(() => VRApp.list()),
        with429Retry(() => DeviceApp.filter({ device_id: deviceId }))
      ]);

      setAllApps(apps || []);

      if (d) {
        setDevice(d);
        setForm({
          binocular_number: String(d.binocular_number || ""),
          serial_number: d.serial_number || "",
          headset_type: d.headset_type || "",
          other_type: d.headset_type === "אחר" ? (d.model || "") : "",
          model: d.model || "",
          primary_email: d.primary_email || "",
          nickname: d.device_name || "",
          purchase_date: d.purchase_date ? new Date(d.purchase_date) : null,
          notes: d.notes || "",
        });

        // 2. זיהוי האפליקציות המותקנות בפועל לפי ה-DB
        const installedAppIds = new Set((deviceAppsRel || []).map(r => r.app_id));
        setOriginalAppIds(installedAppIds);

        const installedAppsList = (apps || []).filter(app => installedAppIds.has(app.id));
        setSelectedApps(installedAppsList);

      } else {
        navigate(createPageUrl("GeneralInfo"));
      }
    } catch (error) {
      console.error("Error loading headset details:", error);
      toast({ title: "שגיאה בטעינת הנתונים", variant: "destructive" });
    }
  }, [deviceId, navigate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredApps = useMemo(() => {
    const q = (appsSearch || "").toLowerCase();
    return allApps.filter(a => [a.name, a.description].join(" ").toLowerCase().includes(q));
  }, [allApps, appsSearch]);

  const handleNumericChange = (e) => {
    const onlyDigits = (e.target.value || "").replace(/\D/g, "");
    setForm((prev) => ({ ...prev, binocular_number: onlyDigits }));
    if (!onlyDigits) setErrors((p) => ({ ...p, id: "יש להזין מזהה משקפת" }));
    else setErrors((p) => ({ ...p, id: "" }));
  };

  const validate = () => {
    const newErr = { id: "", email: "" };
    if (!form.binocular_number) newErr.id = "יש להזין מזהה משקפת";
    // הסרנו את חובת האימייל אם זה לא קריטי, אבל נשאיר אם תרצה
    // if (!form.primary_email) newErr.email = "יש להזין כתובת Gmail"; 
    setErrors(newErr);
    return !newErr.id;
  };

  // הוספה/הסרה של אפליקציה מהרשימה המקומית (לפני שמירה)
  const toggleApp = (app) => {
    const exists = selectedApps.find(a => a.id === app.id);
    if (exists) {
      setSelectedApps(prev => prev.filter(a => a.id !== app.id));
    } else {
      setSelectedApps(prev => [...prev, app]);
    }
  };

  const save = async () => {
    if (!validate()) return;

    try {
      const newNumber = Number(form.binocular_number);

      // 1. עדכון פרטי המכשיר (VRDevice)
      await with429Retry(() => VRDevice.update(device.id, {
        device_name: form.nickname || `משקפת ${newNumber}`,
        binocular_number: newNumber,
        serial_number: form.serial_number || undefined,
        headset_type: form.headset_type || undefined,
        model: form.headset_type === "אחר" ? (form.other_type || form.model || "אחר") : form.model || undefined,
        primary_email: form.primary_email,
        purchase_date: form.purchase_date || undefined,
        notes: form.notes || undefined,
      }));

      // 2. סנכרון אפליקציות (DeviceApp)
      // אילו אפליקציות נבחרו כעת?
      const currentSelectedIds = new Set(selectedApps.map(a => a.id));

      // א. מה צריך להוסיף? (נבחר כעת, אבל לא היה במקור)
      const toAdd = [...currentSelectedIds].filter(id => !originalAppIds.has(id));
      
      // ב. מה צריך למחוק? (היה במקור, אבל לא נבחר כעת)
      const toRemove = [...originalAppIds].filter(id => !currentSelectedIds.has(id));

      // ביצוע הוספות
      if (toAdd.length > 0) {
        const createPayload = toAdd.map(appId => ({
          device_id: device.id,
          app_id: appId,
          installation_date: new Date().toISOString().split('T')[0]
        }));
        await with429Retry(() => DeviceApp.bulkCreate(createPayload));
      }

      // ביצוע מחיקות (דורש למצוא את ה-ID של הקשר ב-DeviceApp)
      if (toRemove.length > 0) {
        // צריך לשלוף את ה-ID הספציפי של השורה בטבלת DeviceApp כדי למחוק
        const relationsToDelete = await with429Retry(() => DeviceApp.filter({ 
          device_id: device.id,
          app_id: { $in: toRemove } // (בהנחה שה-SDK תומך ב-$in, אחרת נמחק בלולאה)
        }));
        
        // אם הסינון המורכב לא נתמך, נשלוף שוב הכל ונסנן ידנית (בטוח יותר)
        // אבל לצורך היעילות ננסה מחיקה בלולאה אם ה-API פשוט
        
        // גיבוי: מחיקה בלולאה
        for (const appId of toRemove) {
           const rels = await with429Retry(() => DeviceApp.filter({ device_id: device.id, app_id: appId }));
           for (const rel of rels) {
             await with429Retry(() => DeviceApp.delete(rel.id));
           }
        }
      }

      // 3. עדכון סטטוס is_installed באפליקציות (אופציונלי, לצורך תצוגה)
      // זה קצת כבד לעשות על כל האפליקציות כל הזמן, אז נעשה רק למה שהשתנה
      const changedAppIds = [...toAdd, ...toRemove];
      for (const appId of changedAppIds) {
         // בדיקה האם האפליקציה עדיין מותקנת איפשהו
         const installations = await with429Retry(() => DeviceApp.filter({ app_id: appId }));
         await with429Retry(() => VRApp.update(appId, { is_installed: installations.length > 0 }));
      }

      toast({ title: "המשקפת נשמרה בהצלחה!" });
      navigate(createPageUrl("GeneralInfo"));

    } catch (error) {
      console.error("Error saving headset:", error);
      toast({ 
        title: "שגיאה בשמירה", 
        description: error.message || "נסה שוב מאוחר יותר",
        variant: "destructive" 
      });
    }
  };

  if (!device) {
    return <div className="p-8 text-center">טוען...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-cyan-900">עריכת משקפת #{device.binocular_number}</h1>
          <Button variant="outline" onClick={() => window.history.length > 1 ? history.back() : navigate(createPageUrl("GeneralInfo"))}>
            חזור
          </Button>
        </div>

        {/* פרטי המשקפת */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Orbit className="w-5 h-5" />
              פרטי המשקפת
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="מזהה משקפת (מספרי)"
                  value={form.binocular_number}
                  onChange={handleNumericChange}
                />
                {errors.id && <p className="text-red-600 text-sm mt-1">{errors.id}</p>}
              </div>
              <Input
                placeholder="מספר סידורי"
                value={form.serial_number}
                onChange={(e) => setForm((p) => ({ ...p, serial_number: e.target.value }))}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                value={form.headset_type}
                onValueChange={(v) => setForm((p) => ({ ...p, headset_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="סוג משקפת" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meta Quest 2">Meta Quest 2</SelectItem>
                  <SelectItem value="Meta Quest 3">Meta Quest 3</SelectItem>
                  <SelectItem value="Meta Quest 3s">Meta Quest 3s</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
              {form.headset_type === "אחר" && (
                <Input
                  placeholder="סוג/דגם (כתיבה חופשית)"
                  value={form.other_type}
                  onChange={(e) => setForm((p) => ({ ...p, other_type: e.target.value }))}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* חשבון משויך */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              חשבון משויך
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Input
                  placeholder="כתובת Gmail"
                  value={form.primary_email}
                  onChange={(e) => setForm((p) => ({ ...p, primary_email: e.target.value }))}
                />
                {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
              </div>
              <Input
                placeholder="שם משתמש משויך (כינוי)"
                value={form.nickname}
                onChange={(e) => setForm((p) => ({ ...p, nickname: e.target.value }))}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  {form.purchase_date ? format(form.purchase_date, "dd/MM/yyyy") : "תאריך רכישה (לא חובה)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  selected={form.purchase_date}
                  onSelect={(d) => setForm((p) => ({ ...p, purchase_date: d }))}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* אפליקציות מותקנות */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AppWindow className="w-5 h-5" />
              אפליקציות מותקנות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setAppsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              הוסף/הסר אפליקציה
            </Button>

            {selectedApps.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedApps.map((app) => (
                  <Badge key={app.id} variant="secondary" className="flex items-center gap-1 pl-1">
                    {app.name}
                    <button className="p-1 hover:bg-slate-200 rounded-full" onClick={() => toggleApp(app)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 text-sm">אין אפליקציות מוצמדות למשקפת זו.</div>
            )}
          </CardContent>
        </Card>

        {/* הערות */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              הערות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="רשום הערות..."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="min-h-28"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(createPageUrl("GeneralInfo"))}>ביטול</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={save}>שמור שינויים</Button>
        </div>
      </div>

      {/* דיאלוג בחירת אפליקציות */}
      <Dialog open={appsDialogOpen} onOpenChange={setAppsDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>בחר אפליקציות</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="חיפוש אפליקציה..."
              value={appsSearch}
              onChange={(e) => setAppsSearch(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto space-y-2 border rounded p-2">
              {filteredApps.map((app) => {
                const checked = !!selectedApps.find(a => a.id === app.id);
                return (
                  <label key={app.id} className="flex items-center gap-3 p-2 border-b last:border-0 hover:bg-slate-50 cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={() => toggleApp(app)} />
                    <div className="flex-1">
                      <div className="font-medium">{app.name}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{app.description || "—"}</div>
                    </div>
                  </label>
                );
              })}
              {filteredApps.length === 0 && <div className="text-center text-gray-500">לא נמצאו אפליקציות</div>}
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setAppsDialogOpen(false)}>סגור</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}