
import React, { useEffect, useMemo, useState } from "react";
import { VRDevice } from "@/entities/VRDevice";
import { DeviceLinkedAccount } from "@/entities/DeviceLinkedAccount";
import { DeviceApp } from "@/entities/DeviceApp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, X } from "lucide-react";
import AppFilterMultiSelect from "@/components/modals/AppFilterMultiSelect";

export default function DeviceSelector({
  mode = "add",
  appName = "",
  currentDevices = [],   // binocular_number array already having the app
  onConfirm,
  onCancel
}) {
  const [devices, setDevices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [deviceApps, setDeviceApps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [numberQuery, setNumberQuery] = useState("");
  const [accountTypes, setAccountTypes] = useState([]);            // all available types
  const [selectedAccountTypes, setSelectedAccountTypes] = useState([]); // chosen filters
  const [appsModalOpen, setAppsModalOpen] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState([]);        // chosen app filters

  // Selection
  const [selectedNumbers, setSelectedNumbers] = useState(new Set());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [devs, accs, rels] = await Promise.all([
        VRDevice.list(),
        DeviceLinkedAccount.list(),
        DeviceApp.list()
      ]);
      setDevices(devs || []);
      setAccounts(accs || []);
      setDeviceApps(rels || []);

      // derive existing account types
      const uniq = Array.from(new Set((accs || []).map(a => a.account_type).filter(Boolean)));
      setAccountTypes(uniq.sort());
      setLoading(false);
    })();
  }, []);

  const deviceIdByNumber = useMemo(() => {
    const map = new Map();
    (devices || []).forEach(d => map.set(Number(d.binocular_number), d.id));
    return map;
  }, [devices]);

  // NEW: Map device number to device object for checking disabled status
  const deviceByNumber = useMemo(() => {
    const map = new Map();
    (devices || []).forEach(d => map.set(Number(d.binocular_number), d));
    return map;
  }, [devices]);

  const accountTypesByDeviceId = useMemo(() => {
    const map = new Map();
    (accounts || []).forEach(a => {
      if (!map.has(a.device_id)) map.set(a.device_id, new Set());
      map.get(a.device_id).add(a.account_type);
    });
    return map;
  }, [accounts]);

  const appIdsByDeviceId = useMemo(() => {
    const map = new Map();
    (deviceApps || []).forEach(r => {
      if (!map.has(r.device_id)) map.set(r.device_id, new Set());
      map.get(r.device_id).add(r.app_id);
    });
    return map;
  }, [deviceApps]);

  // Available numbers are devices that do NOT already have the app (currentDevices)
  const availableNumbers = useMemo(() => {
    const allNumbers = (devices || []).map(d => Number(d.binocular_number)).filter(n => Number.isFinite(n));
    const currentSet = new Set((currentDevices || []).map(n => Number(n)));
    let nums = allNumbers.filter(n => !currentSet.has(n));

    // Apply number query
    if ((numberQuery || "").trim() !== "") {
      nums = nums.filter(n => String(n).includes(String(numberQuery).trim()));
    }

    // Apply account-type filter
    if ((selectedAccountTypes || []).length > 0) {
      nums = nums.filter(n => {
        const id = deviceIdByNumber.get(n);
        const types = accountTypesByDeviceId.get(id);
        if (!types) return false;
        // match if device has at least one of the selected types
        return (selectedAccountTypes || []).some(t => types.has(t));
      });
    }

    // Apply apps filter
    if ((selectedAppIds || []).length > 0) {
      const wanted = new Set(selectedAppIds);
      nums = nums.filter(n => {
        const id = deviceIdByNumber.get(n);
        const appSet = appIdsByDeviceId.get(id);
        if (!appSet) return false;
        for (const appId of appSet) {
          if (wanted.has(appId)) return true; // has at least one
        }
        return false;
      });
    }

    nums.sort((a, b) => a - b);
    return nums;
  }, [
    devices,
    currentDevices,
    numberQuery,
    selectedAccountTypes,
    selectedAppIds,
    deviceIdByNumber,
    accountTypesByDeviceId,
    appIdsByDeviceId
  ]);

  const toggleNumber = (n) => {
    // NEW: Check if device is disabled
    const dev = deviceByNumber.get(n);
    if (dev?.is_disabled) return; // Don't allow selection of disabled devices

    setSelectedNumbers(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const clearFilters = () => {
    setNumberQuery("");
    setSelectedAccountTypes([]);
    setSelectedAppIds([]);
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-3xl">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="w-full text-center">
            הוספת אפליקציה {appName} למשקפת
          </CardTitle>
          <Button variant="ghost" size="icon" className="absolute left-3 top-3" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-slate-600">
            משקפות זמינות להוספה: <span className="font-medium">{availableNumbers.length}</span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חיפוש לפי מספר משקפת"
                className="pl-10 w-56"
                value={numberQuery}
                onChange={(e) => setNumberQuery(e.target.value)}
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  סוגי חשבון ({selectedAccountTypes.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="space-y-2 max-h-64 overflow-auto">
                  {accountTypes.length === 0 && (
                    <div className="text-sm text-slate-500">אין סוגי חשבונות זמינים</div>
                  )}
                  {accountTypes.map(t => {
                    const checked = selectedAccountTypes.includes(t);
                    return (
                      <label key={t} className="flex items-center gap-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => {
                            setSelectedAccountTypes(prev => {
                              if (prev.includes(t)) return prev.filter(x => x !== t);
                              return [...prev, t];
                            });
                          }}
                        />
                        <span className="text-sm">{t}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setSelectedAccountTypes([])}>נקה</Button>
                  <Button size="sm">סגור</Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={() => setAppsModalOpen(true)}>
              סינון לפי אפליקציות ({selectedAppIds.length})
            </Button>

            {(numberQuery || selectedAccountTypes.length > 0 || selectedAppIds.length > 0) && (
              <Button variant="ghost" onClick={clearFilters}>נקה סינונים</Button>
            )}
          </div>

          {/* Number tiles - NEW: Show disabled devices in gray */}
          {availableNumbers.length > 0 ? (
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
              {availableNumbers.map(n => {
                const dev = deviceByNumber.get(n);
                const isDisabled = dev?.is_disabled || false;
                const active = selectedNumbers.has(n);
                
                return (
                  <button
                    key={n}
                    onClick={() => toggleNumber(n)}
                    disabled={isDisabled}
                    className={`h-10 rounded-md border text-sm font-semibold transition
                      ${isDisabled 
                        ? "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed" 
                        : active 
                          ? "bg-cyan-600 text-white border-cyan-700" 
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    title={isDisabled ? `משקפת ${n} - מושבת${dev?.disable_reason ? `: ${dev.disable_reason}` : ''}` : `משקפת ${n}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-slate-500 py-8">לא נמצאו משקפות בהתאם לסינון.</div>
          )}

          {/* Footer section */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-slate-600">
              נבחרו: <span className="font-medium">{selectedNumbers.size}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>ביטול</Button>
              <Button
                className="bg-cyan-600 hover:bg-cyan-700"
                onClick={() => onConfirm(Array.from(selectedNumbers).sort((a,b)=>a-b))}
                disabled={selectedNumbers.size === 0}
              >
                אשר
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AppFilterMultiSelect
        open={appsModalOpen}
        onClose={() => setAppsModalOpen(false)}
        initialSelected={selectedAppIds}
        onConfirm={(ids) => {
          setSelectedAppIds(ids || []);
          setAppsModalOpen(false);
        }}
      />
    </div>
  );
}
