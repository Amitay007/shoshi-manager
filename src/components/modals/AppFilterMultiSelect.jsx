
import React, { useEffect, useState } from "react";
import { VRApp } from "@/entities/VRApp";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { with429Retry } from "@/components/utils/retry";

export default function AppFilterMultiSelect({ open, onClose, onConfirm, initialSelected = [] }) {
  const [apps, setApps] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set(initialSelected));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const all = await with429Retry(() => VRApp.list());
      setApps(all || []);
      setLoading(false);
    })();
  }, [open]);

  useEffect(() => {
    setSelected(new Set(initialSelected));
  }, [initialSelected, open]);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = apps.filter(a => (a.name || "").toLowerCase().includes((search || "").toLowerCase()));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>בחר אפליקציות לסינון</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="חפש אפליקציה..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="max-h-80 overflow-auto border rounded-md p-3">
            {loading ? (
              <div className="text-center text-slate-500 py-8">טוען אפליקציות...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filtered.map(app => (
                  <label key={app.id} className="flex items-center gap-2 p-2 border rounded-md hover:bg-slate-50 cursor-pointer">
                    <Checkbox checked={selected.has(app.id)} onCheckedChange={() => toggle(app.id)} />
                    <span className="truncate">{app.name}</span>
                  </label>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center text-slate-500 py-8">לא נמצאו אפליקציות.</div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>ביטול</Button>
            <Button
              onClick={() => onConfirm(Array.from(selected))}
              className="bg-cyan-600 hover:bg-cyan-700"
              disabled={loading}
            >
              אשר
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
