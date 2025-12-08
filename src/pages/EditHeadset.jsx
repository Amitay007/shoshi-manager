
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { VRDevice } from "@/entities/VRDevice";
import { VRApp } from "@/entities/VRApp";
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
import { installationData } from "@/components/InstallationData";

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
  const [selectedApps, setSelectedApps] = useState([]); // objects
  const navigate = useNavigate();
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!deviceId) {
      navigate(createPageUrl("GeneralInfo"));
      return;
    }
    const d = await VRDevice.get(deviceId);
    const apps = await VRApp.list();
    setAllApps(apps);

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

      // Build selected apps by installationData mapping (by binocular number)
      const currentNumber = d.binocular_number;
      const installed = [];
      for (const [name, nums] of Object.entries(installationData)) {
        if ((nums || []).includes(currentNumber)) {
          const found = apps.find(a => a.name === name);
          if (found) installed.push(found);
        }
      }
      setSelectedApps(installed);
    } else {
      navigate(createPageUrl("GeneralInfo"));
    }
  }, [deviceId, navigate, setAllApps, setDevice, setForm, setSelectedApps]); // Add all dependencies required by the load function

  useEffect(() => {
    load();
  }, [load]); // Now 'load' is a stable function thanks to useCallback, so it can be a dependency

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
    if (!form.primary_email) newErr.email = "יש להזין כתובת Gmail";
    setErrors(newErr);
    return !newErr.id && !newErr.email;
  };

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

    const originalNumber = device.binocular_number;
    const newNumber = Number(form.binocular_number);

    // Update VRDevice
    await VRDevice.update(device.id, {
      device_name: form.nickname || `משקפת ${newNumber}`,
      binocular_number: newNumber,
      serial_number: form.serial_number || undefined,
      headset_type: form.headset_type || undefined,
      model: form.headset_type === "אחר" ? (form.other_type || form.model || "אחר") : form.model || undefined,
      primary_email: form.primary_email,
      purchase_date: form.purchase_date || undefined,
      notes: form.notes || undefined,
    });

    // Sync installationData with selected apps and number changes
    // 1) Ensure all selected apps include the (possibly new) number
    const selectedNames = selectedApps.map(a => a.name);
    selectedNames.forEach((name) => {
      if (!installationData[name]) installationData[name] = [];
      if (!installationData[name].includes(newNumber)) {
        installationData[name].push(newNumber);
        installationData[name].sort((a, b) => a - b);
      }
    });
    // 2) Remove number from apps that were previously installed but now unselected
    for (const [name, nums] of Object.entries(installationData)) {
      const had = (nums || []).includes(originalNumber);
      const shouldKeep = selectedNames.includes(name);
      if (had && !shouldKeep) {
        installationData[name] = nums.filter(n => n !== originalNumber && n !== newNumber);
      }
    }
    // 3) If number changed, move mapping from originalNumber to newNumber for all remaining apps
    if (originalNumber !== newNumber) {
      for (const key of Object.keys(installationData)) {
        const arr = installationData[key] || [];
        if (arr.includes(originalNumber)) {
          installationData[key] = Array.from(new Set(arr.map(n => (n === originalNumber ? newNumber : n)))).sort((a, b) => a - b);
        }
      }
    }

    // NEW: toggle VRApp.is_installed for all apps based on current installationData mapping
    await Promise.all(
      allApps.map((app) =>
        VRApp.update(app.id, { is_installed: (installationData[app.name] || []).length > 0 })
      )
    );

    toast({ title: "המשקפת נשמרה בהצלחה!" });
    navigate(createPageUrl("GeneralInfo"));
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
                  placeholder="כתובת Gmail (חובה)"
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
              הוסף אפליקציה
            </Button>

            {selectedApps.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedApps.map((app) => (
                  <Badge key={app.id} variant="secondary" className="flex items-center gap-1">
                    {app.name}
                    <button className="ml-1 text-slate-600 hover:text-slate-900" onClick={() => toggleApp(app)}>
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
          <Button className="bg-green-600 hover:bg-green-700" onClick={save}>שמור</Button>
        </div>
      </div>

      <Dialog open={appsDialogOpen} onOpenChange={setAppsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>בחר אפליקציות</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="חיפוש אפליקציה..."
              value={appsSearch}
              onChange={(e) => setAppsSearch(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto space-y-2">
              {filteredApps.map((app) => {
                const checked = !!selectedApps.find(a => a.id === app.id);
                return (
                  <label key={app.id} className="flex items-center gap-3 p-2 border rounded-md">
                    <Checkbox checked={checked} onCheckedChange={() => toggleApp(app)} />
                    <div className="flex-1">
                      <div className="font-medium">{app.name}</div>
                      <div className="text-xs text-slate-500 line-clamp-2">{app.description || "—"}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAppsDialogOpen(false)}>ביטול</Button>
              <Button onClick={() => setAppsDialogOpen(false)}>שמור</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
