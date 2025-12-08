import React, { useEffect, useMemo, useState } from "react";
import { VRApp } from "@/entities/VRApp";
import { DeviceApp } from "@/entities/DeviceApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { installationData } from "@/components/InstallationData";
import { with429Retry } from "@/components/utils/retry";

export default function AddAppsFromCatalogModal({ open, onOpenChange, device, installedNames = [], onSaved }) {
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // NEW: Check if device is disabled
  const isDeviceDisabled = device?.is_disabled || false;

  useEffect(() => {
    if (open) {
      (async () => {
        const list = await with429Retry(() => VRApp.list());
        setApps(list);
      })();
      setSelectedIds([]);
      setQuery("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = (query || "").toLowerCase();
    return apps
      .filter(a => !installedNames.map(n => (n || "").trim().toLowerCase()).includes((a.name || "").trim().toLowerCase()))
      .filter(a => [a.name || "", a.description || ""].join(" ").toLowerCase().includes(q));
  }, [apps, installedNames, query]);

  const toggle = (id) => {
    if (isDeviceDisabled) return; // Don't allow selection if device is disabled
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!device || selectedIds.length === 0 || isDeviceDisabled) { 
      onOpenChange(false); 
      return; 
    }
    await with429Retry(() => DeviceApp.bulkCreate(selectedIds.map(app_id => ({ device_id: device.id, app_id }))));

    const selectedApps = apps.filter(a => selectedIds.includes(a.id));
    await Promise.all(selectedApps.map(a => with429Retry(() => VRApp.update(a.id, { is_installed: true }))));

    const num = Number(device.binocular_number);
    selectedApps.forEach(a => {
      const name = a.name;
      if (!installationData[name]) installationData[name] = [];
      if (!installationData[name].includes(num)) {
        installationData[name].push(num);
        installationData[name].sort((x, y) => x - y);
      }
    });

    onOpenChange(false);
    if (onSaved) onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            הוספת אפליקציות
            {isDeviceDisabled && (
              <span className="text-sm font-normal text-orange-600 mr-2">
                (משקפת מושבתת - לא ניתן להוסיף אפליקציות)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        {isDeviceDisabled ? (
          <div className="py-8 text-center">
            <p className="text-slate-600 mb-2">משקפת זו מושבתת ולא ניתן להוסיף לה אפליקציות</p>
            {device.disable_reason && (
              <p className="text-sm text-slate-500">סיבה: {device.disable_reason}</p>
            )}
            <Button className="mt-4" onClick={() => onOpenChange(false)}>
              סגור
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חיפוש אפליקציה..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {filtered.map(app => (
                <Card key={app.id} className="p-3 flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.includes(app.id)}
                    onCheckedChange={() => toggle(app.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{app.name}</div>
                    <div className="text-xs text-slate-500 line-clamp-2">{app.description || "—"}</div>
                  </div>
                </Card>
              ))}
              {filtered.length === 0 && (
                <div className="text-center text-slate-500 py-8">לא נמצאו אפליקציות תואמות.</div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
              <Button onClick={handleSave} disabled={selectedIds.length === 0}>שמור</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}