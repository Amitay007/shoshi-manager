
import React, { useEffect, useState } from "react";
import { VRApp } from "@/entities/VRApp";
import { DeviceApp } from "@/entities/DeviceApp";
import { VRDevice } from "@/entities/VRDevice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Pencil, Users, Glasses } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AppLinkButtons from "@/components/common/AppLinkButtons";
import { with429Retry } from "@/components/utils/retry";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AppDetailsPage() {
  const [app, setApp] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Renamed from 'loading' to 'isLoading'
  const [installNumbers, setInstallNumbers] = useState([]);
  const [showInstModal, setShowInstModal] = useState(false);
  // NEW: Store device info to check disabled status
  const [deviceInfo, setDeviceInfo] = useState(new Map());
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const nameParam = urlParams.get("name") || "";

  useEffect(() => {
    const load = async () => {
      setIsLoading(true); // Renamed from 'setLoading' to 'setIsLoading'
      let found = null;
      if (nameParam) {
        const exact = await with429Retry(() => VRApp.filter({ name: nameParam }));
        if (exact && exact.length > 0) {
          found = exact[0];
        } else {
          const all = await with429Retry(() => VRApp.list());
          const n = nameParam.trim().toLowerCase();
          found = (all || []).find(a => (a.name || "").trim().toLowerCase() === n) || null;
        }
      }
      setApp(found);
      setIsLoading(false); // Renamed from 'setLoading' to 'setIsLoading'
    };
    load();
  }, [nameParam]);

  useEffect(() => {
    const loadInstallNums = async () => {
      if (!app?.id) return;
      const [rels, devices] = await Promise.all([
        with429Retry(() => DeviceApp.filter({ app_id: app.id })),
        with429Retry(() => VRDevice.list())
      ]);
      const byId = new Map((devices || []).map(d => [d.id, Number(d.binocular_number)]));
      // NEW: Create map of device number to device data (for disabled status)
      const deviceDataMap = new Map((devices || []).map(d => [Number(d.binocular_number), d]));
      
      const nums = Array.from(
        new Set((rels || []).map(r => byId.get(r.device_id)).filter((n) => Number.isFinite(n)))
      ).sort((a, b) => a - b);
      setInstallNumbers(nums);
      setDeviceInfo(deviceDataMap);
    };
    loadInstallNums();
  }, [app?.id]);

  if (isLoading) { // Renamed from 'loading' to 'isLoading'
    return <div className="p-8 text-center" dir="rtl">טוען פרטי אפליקציה...</div>;
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-800">אפליקציה לא נמצאה</h1>
          </div>
          <Link to={createPageUrl("GeneralApps")}>
            <Button variant="outline">חזרה לאפליקציות</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-cyan-900 break-words">{app.name}</h1>
            {app.description ? (
              <div className="text-slate-600 mt-1 max-h-48 overflow-y-auto pr-1">
                {app.description}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {(app.genre || []).slice(0, 4).map((g, idx) => (
                <Badge key={`g-${idx}`} variant="secondary" className="bg-slate-100 text-slate-700">{g}</Badge>
              ))}
              {(app.education_field || []).slice(0, 3).map((e, idx) => (
                <Badge key={`e-${idx}`} variant="secondary" className="bg-emerald-50 text-emerald-700">{e}</Badge>
              ))}
              {(app.supported_platforms || []).slice(0, 3).map((p, idx) => (
                <Badge key={`p-${idx}`} variant="secondary" className="bg-slate-100 text-slate-700">{p}</Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl(`AddAppPage?editId=${app.id}`))}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              ערוך
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <AppLinkButtons
              storeLink={app.store_link || ""}
              websiteLink={app.website_link || ""}
              subscriptionLink={app.subscription_store_link || ""}
              stopPropagation={false}
            />
          </CardContent>
        </Card>

        {/* Team details */}
        <Card>
          <CardContent className="p-4 text-sm">
            <div className="font-medium mb-2">פרטי צוות</div>
            {(() => {
              const TEAM = {
                "tm-amitza": "אמיצה",
                "tm-natznatzit": "נאצנאצית",
                "tm-gibor": "גיבור",
              };
              const list = (arr) =>
                (arr || [])
                  .map((id) => TEAM[id] || id)
                  .filter(Boolean)
                  .join(", ");
              const hasAny =
                (app.research_by || []).length ||
                (app.purchased_by || []).length ||
                (app.installed_by || []).length;
              return hasAny ? (
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-slate-500">מחקר</div>
                    <div className="font-medium">{list(app.research_by) || "—"}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">רכש</div>
                    <div className="font-medium">{list(app.purchased_by) || "—"}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">התקנה</div>
                    <div className="font-medium">{list(app.installed_by) || "—"}</div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500">לא הוגדר צוות עבור אפליקציה זו.</div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Extra info and installations */}
        <Card>
          <CardContent className="p-4 space-y-3 text-sm text-slate-700">
            <div>סוג רכישה: <span className="font-medium">{app.purchase_type || "—"}</span></div>
            
            {/* Updated devices display with disabled status */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Glasses className="w-4 h-4 text-slate-500" />
                <span className="font-medium">משקפות שעליהן מותקנת האפליקציה:</span>
                <button
                  type="button"
                  className="text-cyan-700 hover:underline inline-flex items-center gap-1"
                  onClick={() => setShowInstModal(true)}
                  title="צפה במשקפות עליהן מותקנת האפליקציה"
                >
                  <Users className="w-4 h-4" />
                  {installNumbers.length > 0 ? `${installNumbers.length} משקפות` : "לא מותקן"}
                </button>
              </div>
              {installNumbers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {installNumbers.map((n) => {
                    const device = deviceInfo.get(n);
                    const isDisabled = device?.is_disabled || false;
                    
                    return (
                      <Link
                        key={n}
                        to={createPageUrl(`DeviceInfo?id=${n}`)}
                        className="inline-block"
                      >
                        <Badge 
                          className={`${
                            isDisabled 
                              ? "bg-slate-300 text-slate-600 hover:bg-slate-400" 
                              : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          } transition-colors cursor-pointer gap-1 px-3 py-1`}
                          title={isDisabled ? `משקפת ${n} - מושבת${device?.disable_reason ? `: ${device.disable_reason}` : ''}` : `משקפת ${n}`}
                        >
                          <Glasses className="w-3 h-3" />
                          משקפת #{String(n).padStart(3, "0")}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {app.subscription_type && (
              <div>סוג מנוי: <span className="font-medium">{app.subscription_type}</span></div>
            )}
            {app.purchase_price ? (
              <div>מחיר רכישה: <span className="font-medium">{app.purchase_price} {app.purchase_currency || ""}</span></div>
            ) : null}
            {app.subscription_price ? (
              <div>מחיר מנוי: <span className="font-medium">{app.subscription_price} {app.subscription_currency || ""}</span></div>
            ) : null}
          </CardContent>
        </Card>

        {/* Installations Modal - with disabled status */}
        <Dialog open={showInstModal} onOpenChange={setShowInstModal}>
          <DialogContent dir="rtl" className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Glasses className="w-5 h-5" />
                משקפות עם האפליקציה: {app.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {installNumbers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {installNumbers.map((n) => {
                    const device = deviceInfo.get(n);
                    const isDisabled = device?.is_disabled || false;
                    
                    return (
                      <Link
                        key={n}
                        to={createPageUrl(`DeviceInfo?id=${n}`)}
                        className="inline-block"
                        onClick={() => setShowInstModal(false)}
                      >
                        <Badge 
                          className={`${
                            isDisabled 
                              ? "bg-slate-300 text-slate-600 hover:bg-slate-400" 
                              : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          } transition-colors cursor-pointer gap-1 px-3 py-1.5`}
                          title={isDisabled ? `משקפת ${n} - מושבת${device?.disable_reason ? `: ${device.disable_reason}` : ''}` : `משקפת ${n}`}
                        >
                          <Glasses className="w-3 h-3" />
                          משקפת #{String(n).padStart(3, "0")}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-slate-500 text-center py-8">אין התקנות.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
