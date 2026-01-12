import React, { useEffect, useMemo, useState } from "react";
import { VRDevice } from "@/entities/VRDevice";
import { VRApp } from "@/entities/VRApp";
import { DeviceLinkedAccount } from "@/entities/DeviceLinkedAccount";
import { DeviceApp } from "@/entities/DeviceApp";
import { with429Retry } from "@/components/utils/retry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Orbit, Mail, Calendar as CalendarIcon, AppWindow, FileText, Plus, X } from "lucide-react";
import { installationData } from "@/components/InstallationData";

export default function AddNewHeadset() {
  const [form, setForm] = useState({
    binocular_number: "",
    serial_number: "",
    headset_type: "",
    other_type: "",
    model: "",
    primary_email: "",
    nickname: "",
    purchase_date: null,
    gmail_password: "",
    remio_email: "",
    remio_password: "",
    notes: "",
  });
  const [extraAccounts, setExtraAccounts] = useState([]);
  const [errors, setErrors] = useState({ id: "", email: "" });
  const [allApps, setAllApps] = useState([]);
  const [appsDialogOpen, setAppsDialogOpen] = useState(false);
  const [appsSearch, setAppsSearch] = useState("");
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [selectedApps, setSelectedApps] = useState([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    const list = await with429Retry(() => VRApp.list());
    setAllApps(list);
  };

  const handleNumericChange = (e) => {
    const onlyDigits = (e.target.value || "").replace(/\D/g, "");
    setForm((prev) => ({ ...prev, binocular_number: onlyDigits }));
    if (!onlyDigits) setErrors((p) => ({ ...p, id: "יש להזין מזהה משקפת" }));
    else setErrors((p) => ({ ...p, id: "" }));
  };

  const validate = () => {
    const newErr = { id: "", email: "" };
    if (!form.binocular_number || form.binocular_number.trim() === "") {
      newErr.id = "יש להזין מזהה משקפת";
    }
    if (!form.primary_email || form.primary_email.trim() === "") {
      newErr.email = "יש להזין כתובת Gmail";
    }
    setErrors(newErr);
    return !newErr.id && !newErr.email;
  };

  const filteredApps = useMemo(() => {
    const q = (appsSearch || "").toLowerCase();
    return allApps.filter((a) => [a.name, a.description].join(" ").toLowerCase().includes(q));
  }, [allApps, appsSearch]);

  const toggleSelectApp = (app) => {
    const checked = selectedAppIds.includes(app.id);
    if (checked) {
      setSelectedAppIds((prev) => prev.filter((id) => id !== app.id));
      setSelectedApps((prev) => prev.filter((x) => x.id !== app.id));
    } else {
      setSelectedAppIds((prev) => [...prev, app.id]);
      setSelectedApps((prev) => [...prev, app]);
    }
  };

  const saveHeadset = async () => {
    if (!validate()) return;

    // Ensure binocular_number is a valid number
    const binocularNum = Number(form.binocular_number);
    if (isNaN(binocularNum)) {
      setErrors(prev => ({ ...prev, id: "מזהה משקפת חייב להיות מספר תקין" }));
      return;
    }

    // Ensure device_name exists
    const deviceName = (form.nickname || "").trim() || `משקפת ${binocularNum}`;

    const payload = {
      device_name: deviceName,
      binocular_number: binocularNum,
      serial_number: form.serial_number || undefined,
      headset_type: form.headset_type || undefined,
      model: form.headset_type === "אחר" ? (form.other_type || form.model || "אחר") : form.model || undefined,
      primary_email: form.primary_email,
      purchase_date: form.purchase_date || undefined,
      notes: form.notes || undefined,
      installedApps: selectedAppIds,
    };

    try {
      const device = await with429Retry(() => VRDevice.create(payload));

      // Create linked accounts (GMAIL + optional Remio)
      // GMAIL
      if (form.primary_email) {
        await with429Retry(() => DeviceLinkedAccount.create({
          device_id: device.id,
          account_type: "GMAIL",
          email: form.primary_email,
          password: form.gmail_password,
          username: form.nickname || "",
        }));
      }
      // Remio
      if (form.remio_email) {
        await with429Retry(() => DeviceLinkedAccount.create({
          device_id: device.id,
          account_type: "Remio",
          email: form.remio_email,
          password: form.remio_password,
        }));
      }
      // Extra Accounts
      for (const acc of extraAccounts) {
        if (acc.email || acc.password) {
          await with429Retry(() => DeviceLinkedAccount.create({
            device_id: device.id,
            account_type: acc.type || "Other",
            email: acc.email,
            password: acc.password,
          }));
        }
      }

      // NEW: persist installations in DeviceApp
      if ((selectedAppIds || []).length > 0) {
        const relations = selectedAppIds.map(app_id => ({ device_id: device.id, app_id }));
        await with429Retry(() => DeviceApp.bulkCreate(relations));
      }

      // Update installationData mapping counters
      const number = binocularNum;
      selectedApps.forEach((app) => {
        const name = app.name;
        if (!installationData[name]) installationData[name] = [];
        if (!installationData[name].includes(number)) {
          installationData[name].push(number);
          installationData[name].sort((a, b) => a - b);
        }
      });

      // NEW: mark selected apps as installed in VRApp entity
      await Promise.all(
        selectedApps.map((app) => with429Retry(() => VRApp.update(app.id, { is_installed: true })))
      );

      toast({ title: "המשקפת נוספה בהצלחה!" });
      navigate(createPageUrl("GeneralInfo"));
    } catch (error) {
      console.error("Error creating headset:", error);
      toast({
        title: "שגיאה ביצירת המשקפת",
        description: error.message || "אנא בדקו את הנתונים ונסו שוב",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-cyan-900">הוספת משקפת</h1>
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

        {/* חשבונות מקושרים */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              חשבונות מקושרים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Gmail Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">Gmail</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Input
                    placeholder="כתובת אימייל"
                    value={form.primary_email}
                    onChange={(e) => setForm((p) => ({ ...p, primary_email: e.target.value }))}
                  />
                  {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                </div>
                <Input
                  type="password"
                  placeholder="סיסמה"
                  value={form.gmail_password}
                  onChange={(e) => setForm((p) => ({ ...p, gmail_password: e.target.value }))}
                />
              </div>
            </div>

            {/* Romio Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">Romio Account</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="כתובת אימייל"
                  value={form.remio_email}
                  onChange={(e) => setForm((p) => ({ ...p, remio_email: e.target.value }))}
                />
                <Input
                  type="password"
                  placeholder="סיסמה"
                  value={form.remio_password}
                  onChange={(e) => setForm((p) => ({ ...p, remio_password: e.target.value }))}
                />
              </div>
            </div>

            {/* Dynamic Extra Accounts */}
            {extraAccounts.map((acc, index) => (
              <div key={index} className="space-y-2 relative pt-2">
                <div className="flex justify-between items-center">
                   <h3 className="text-sm font-semibold text-slate-700">חשבון נוסף #{index + 1}</h3>
                   <button 
                     onClick={() => setExtraAccounts(prev => prev.filter((_, i) => i !== index))}
                     className="text-red-500 hover:text-red-700"
                   >
                     <X className="w-4 h-4" />
                   </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                   <Select
                    value={acc.type}
                    onValueChange={(val) => {
                      const newAccs = [...extraAccounts];
                      newAccs[index].type = val;
                      setExtraAccounts(newAccs);
                    }}
                   >
                    <SelectTrigger><SelectValue placeholder="סוג חשבון" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="Steam">Steam</SelectItem>
                      <SelectItem value="Other">אחר</SelectItem>
                    </SelectContent>
                   </Select>
                   <Input
                      placeholder="אימייל / שם משתמש"
                      value={acc.email}
                      onChange={(e) => {
                        const newAccs = [...extraAccounts];
                        newAccs[index].email = e.target.value;
                        setExtraAccounts(newAccs);
                      }}
                   />
                   <Input
                      type="password"
                      placeholder="סיסמה"
                      value={acc.password}
                      onChange={(e) => {
                        const newAccs = [...extraAccounts];
                        newAccs[index].password = e.target.value;
                        setExtraAccounts(newAccs);
                      }}
                   />
                </div>
              </div>
            ))}

            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => setExtraAccounts([...extraAccounts, { type: "Other", email: "", password: "" }])}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>

          </CardContent>
        </Card>

        {/* תאריך ופרטים טכניים */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Purchase Date
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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

            {/* tags */}
            {selectedApps.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedApps.map((app) => (
                  <Badge key={app.id} variant="secondary" className="flex items-center gap-1">
                    {app.name}
                    <button className="ml-1 text-slate-600 hover:text-slate-900" onClick={() => toggleSelectApp(app)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* הערות */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              הערות נוספות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="רשום הערות חופשיות..."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="min-h-28"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(createPageUrl("GeneralInfo"))}>ביטול</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={saveHeadset}>שמור</Button>
        </div>
      </div>

      {/* Apps dialog: existing or new */}
      <Dialog open={appsDialogOpen} onOpenChange={setAppsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>הוספת אפליקציות</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Input
                placeholder="חיפוש אפליקציה..."
                value={appsSearch}
                onChange={(e) => setAppsSearch(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {filteredApps.map((app) => {
                const checked = selectedAppIds.includes(app.id);
                return (
                  <label key={app.id} className="flex items-center gap-3 p-2 border rounded-md">
                    <Checkbox checked={checked} onCheckedChange={() => toggleSelectApp(app)} />
                    <div className="flex-1">
                      <div className="font-medium">{app.name}</div>
                      <div className="text-xs text-slate-500 line-clamp-2">{app.description || "—"}</div>
                    </div>
                  </label>
                );
              })}
              {filteredApps.length === 0 && <div className="text-center text-slate-500 py-8">לא נמצאו אפליקציות.</div>}
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