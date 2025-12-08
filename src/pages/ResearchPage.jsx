
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FlaskConical, Trash2, Pencil } from 'lucide-react';
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { VRApp } from '@/entities/VRApp';
import AppFilterBar from "@/components/filters/AppFilterBar";
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DeviceApp } from "@/entities/DeviceApp";
import { Wifi, WifiOff, Users } from "lucide-react";
import AppLinkButtons from "@/components/common/AppLinkButtons";
import { with429Retry } from "@/components/utils/retry";
import { VRDevice } from "@/entities/VRDevice";
import DeviceSelector from "@/components/DeviceSelector";

export default function ResearchPage() {
    const [apps, setApps] = useState([]);
    const [allDevices, setAllDevices] = useState([]);
    const [currentDeviceApps, setCurrentDeviceApps] = useState([]);
    const [appDeviceNumbers, setAppDeviceNumbers] = useState({});
    const [showDeviceSelector, setShowDeviceSelector] = useState(false);
    const [selectedAppForModal, setSelectedAppForModal] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: "",
        genres: [],
        education_fields: [],
        platforms: [],
        research_by: [],
        purchased_by: [],
        installed_by: [],
        purchase_types: [],
        internet_required: null,
        subscription_required: null,
        players_count: null
    });

    const navigate = useNavigate();

    // Robust detector for 404/ObjectNotFound errors coming in different shapes
    const isNotFoundError = (err) => {
        const parts = [
            String(err?.message || "").toLowerCase(),
            String(err?.response?.data?.message || "").toLowerCase(),
            String(err?.response?.data?.detail || "").toLowerCase(),
            String(err || "").toLowerCase(),
        ].join(" | ");
        return parts.includes("object not found") || parts.includes("not found") || parts.includes("404");
    };

    useEffect(() => {
        loadApps();
    }, []);

    const loadApps = async () => {
        setIsLoading(true);
        try {
            const [all, deviceApps, devices] = await Promise.all([
              with429Retry(() => VRApp.list()),
              with429Retry(() => DeviceApp.list()),
              with429Retry(() => VRDevice.list())
            ]);
            const researched = all.filter(a => a.is_research || (a.research_by || []).length > 0);
            const counts = {};
            (deviceApps || []).forEach(rel => {
                counts[rel.app_id] = (counts[rel.app_id] || 0) + 1;
            });
            const withCounts = researched.map(a => ({ ...a, __installCount: counts[a.id] || 0 }));
            setApps(withCounts);
           // cache for modal usage
           setAllDevices(devices || []);
           setCurrentDeviceApps(deviceApps || []);
           const deviceIdToNumber = new Map((devices || []).map(d => [d.id, Number(d.binocular_number)]));
           const mapAppToNumbers = {};
           (deviceApps || []).forEach(rel => {
             const num = deviceIdToNumber.get(rel.device_id);
             if (!Number.isFinite(num)) return;
             if (!mapAppToNumbers[rel.app_id]) mapAppToNumbers[rel.app_id] = [];
             mapAppToNumbers[rel.app_id].push(num);
           });
           Object.keys(mapAppToNumbers).forEach(appId => {
             mapAppToNumbers[appId] = Array.from(new Set(mapAppToNumbers[appId])).sort((a,b)=>a-b);
           });
           setAppDeviceNumbers(mapAppToNumbers);
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    };

    const openDeviceSelector = (app) => {
        setSelectedAppForModal(app);
        setShowDeviceSelector(true);
    };

    const handleDeviceUpdate = async (selectedDeviceNumbers) => {
        if (!selectedAppForModal) return;
        const appId = selectedAppForModal.id;
        const numToDeviceId = new Map((allDevices || []).map(d => [Number(d.binocular_number), d.id]));
        const existingRelsForApp = (currentDeviceApps || []).filter(rel => rel.app_id === appId);
        const selectedIds = selectedDeviceNumbers.map(n => numToDeviceId.get(n)).filter(Boolean);
        const existingDeviceIds = new Set(existingRelsForApp.map(r => r.device_id));
        const toCreate = selectedIds.filter(id => !existingDeviceIds.has(id)).map(device_id => ({ device_id, app_id: appId }));
        
        // Logic for deleting relationships:
        // Identify relationships that exist but are no longer in selectedDeviceNumbers
        const deviceIdsToDelete = Array.from(existingDeviceIds).filter(id => !selectedIds.includes(id));
        
        // Execute creations and deletions
        if (toCreate.length > 0) {
            await with429Retry(() => DeviceApp.bulkCreate(toCreate));
        }
        if (deviceIdsToDelete.length > 0) {
            await with429Retry(() => DeviceApp.bulkDelete(appId, deviceIdsToDelete));
        }
        
        // Update VRApp's is_installed status based on whether it's installed on *any* device
        const finalInstalledDevicesCount = (Array.from(existingDeviceIds).filter(id => !deviceIdsToDelete.includes(id)).length) + toCreate.length;
        await with429Retry(() => VRApp.update(appId, { is_installed: finalInstalledDevicesCount > 0 }));
        
        await loadApps();
        setShowDeviceSelector(false);
        setSelectedAppForModal(null);
    };

    const hasAll = (chosen, source) => (chosen || []).every(v => (source || []).includes(v));

    const matchesPlayers = (meta, playersFilter) => {
        if (!playersFilter) return true;
        const details = meta?.player_count_details || [];
        if (playersFilter === "∞") {
            return details.some(d => String(d.count).includes("∞"));
        }
        const n = playersFilter === "5" ? 5 : Number(playersFilter);
        if (!Number.isFinite(n)) return false;
        if (playersFilter === "5") {
            return details.some(d => {
                const c = parseInt(String(d.count).replace(/\D/g, ""), 10);
                return Number.isFinite(c) && c >= 5;
            });
        }
        return details.some(d => String(d.count) === String(n));
    };

    const filteredApps = useMemo(() => {
        let list = [...apps];

        list = list.filter(meta => {
            const term = (filters.search || "").trim().toLowerCase();
            if (term) {
                const hay = [
                    meta?.name || "",
                    meta?.description || "",
                    ...(meta?.genre || []),
                    ...(meta?.education_field || []),
                    ...(meta?.supported_platforms || []),
                    ...(meta?.research_by || []),
                    ...(meta?.purchased_by || []),
                    ...(meta?.installed_by || []),
                ].join(" ").toLowerCase();
                if (!hay.includes(term)) return false;
            }

            if ((filters.genres || []).length && !hasAll(filters.genres, meta?.genre)) return false;
            if ((filters.education_fields || []).length && !hasAll(filters.education_fields, meta?.education_field)) return false;
            if ((filters.platforms || []).length && !hasAll(filters.platforms, meta?.supported_platforms)) return false;

            if ((filters.research_by || []).length && !hasAll(filters.research_by, meta?.research_by)) return false;
            if ((filters.purchased_by || []).length && !hasAll(filters.purchased_by, meta?.purchased_by)) return false;
            if ((filters.installed_by || []).length && !hasAll(filters.installed_by, meta?.installed_by)) return false;

            if ((filters.purchase_types || []).length && !filters.purchase_types.includes(meta?.purchase_type)) return false;

            if (filters.internet_required !== null) {
                if ((meta?.internet_required || false) !== filters.internet_required) return false;
            }
            if (filters.subscription_required !== null) {
                if ((meta?.subscription_required || false) !== filters.subscription_required) return false;
            }

            if (filters.players_count && !matchesPlayers(meta, filters.players_count)) return false;

            return true;
        });

        return list;
    }, [apps, filters]);

    const handleDeleteApp = async (app) => {
        if (confirm(`האם למחוק את "${app.name}"? פעולה זו בלתי הפיכה.`)) {
            try {
                await VRApp.delete(app.id);
            } catch (err) {
                if (!isNotFoundError(err)) {
                    throw err;
                }
                // else ignore already-missing app
            }
            loadApps();
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 sm:p-8" dir="rtl">
                <div className="max-w-4xl mx-auto text-center">טוען...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8" dir="rtl">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-cyan-900 flex items-center gap-3">
                        <FlaskConical className="w-8 h-8" />
                        אפליקציות מחקר
                    </h1>
                    <div className="flex items-center gap-2">
                        <Link to={createPageUrl('AddAppPage')}>
                            <Button className="bg-cyan-600 hover:bg-cyan-700">הוסף אפליקציה</Button>
                        </Link>
                        <BackHomeButtons />
                    </div>
                </div>

                <div className="mb-6">
                    <AppFilterBar allApps={apps} onChange={(f) => setFilters(prev => ({ ...prev, ...f }))} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredApps.map(app => (
                        <Card key={app.id} className="bg-white hover:shadow-lg transition-shadow flex flex-col">
                            <CardContent
                                className="p-4 flex flex-col h-80 cursor-pointer text-sm"
                                onClick={() => navigate(createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`))}
                            >
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-base text-slate-800 truncate" title={app.name}>{app.name}</h3>
                                   <div className="flex gap-1 flex-wrap">
                                     <Badge className="bg-purple-100 text-purple-800">מחקר</Badge>
                                     {(app.__installCount || 0) > 0 && (
                                       <Badge className="bg-green-100 text-green-800">מותקן</Badge>
                                     )}
                                   </div>
                                </div>
                                <div className="mt-2 space-y-2 flex-1 overflow-auto pr-1">
                                    {(app.genre || []).length > 0 && (
                                        <div>
                                            <div className="text-slate-500 mb-1">ז'אנר:</div>
                                            <div className="flex flex-wrap gap-1">
                                                {(app.genre || []).slice(0,2).map((g, idx) => (
                                                    <Badge key={`g-${app.id}-${idx}`} variant="secondary" className="bg-slate-100 text-slate-700">{g}</Badge>
                                                ))}
                                                {(app.genre || []).length > 2 && (
                                                  <Badge variant="secondary" className="bg-slate-100 text-slate-700">+{(app.genre || []).length - 2}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {(app.education_field || []).length > 0 && (
                                        <div>
                                            <div className="text-slate-500 mb-1">תחום חינוכי:</div>
                                            <div className="flex flex-wrap gap-1">
                                                {(app.education_field || []).slice(0,2).map((e, idx) => (
                                                    <Badge key={`e-${app.id}-${idx}`} variant="secondary" className="bg-emerald-50 text-emerald-700">{e}</Badge>
                                                ))}
                                                {(app.education_field || []).length > 2 && (
                                                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">+{(app.education_field || []).length - 2}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {(app.supported_platforms || []).length > 0 && (
                                        <div>
                                            <div className="text-slate-500 mb-1">פלטפורמות:</div>
                                            <div className="flex flex-wrap gap-1">
                                                {(app.supported_platforms || []).slice(0,2).map((p, idx) => (
                                                    <Badge key={`p-${app.id}-${idx}`} variant="secondary" className="bg-slate-100 text-slate-700">{p}</Badge>
                                                ))}
                                                {(app.supported_platforms || []).length > 2 && (
                                                  <Badge variant="secondary" className="bg-slate-100 text-slate-700">+{(app.supported_platforms || []).length - 2}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {(app.player_count_details || []).length > 0 && (
                                        <div>
                                            <div className="text-slate-500 mb-1">מספר שחקנים:</div>
                                            <div className="flex flex-wrap gap-1">
                                                {(app.player_count_details || []).slice(0,2).map((p, idx) => (
                                                    <Badge key={`pc-${app.id}-${idx}`} className="bg-blue-100 text-blue-800">
                                                        {p.mode}{p.count ? `: ${p.count}` : ""}
                                                    </Badge>
                                                ))}
                                                {(app.player_count_details || []).length > 2 && (
                                                  <Badge className="bg-blue-100 text-blue-800">+{(app.player_count_details || []).length - 2}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1 text-xs">
                                            {app.internet_required ? (
                                                <span className="inline-flex items-center gap-1 text-cyan-700">
                                                    <Wifi className="w-3 h-3" /> דורש אינטרנט
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-slate-500">
                                                    <WifiOff className="w-3 h-3" /> לא דורש אינטרנט
                                                </span>
                                            )}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-cyan-700 text-xs">
                                            <Users className="w-4 h-4" />
                                            התקנות: {app.__installCount || 0}
                                        </span>
                                    </div>
                                   <div>
                                     <AppLinkButtons
                                       storeLink={app.purchase_type === "subscription" ? "" : (app.store_link || "")}
                                       websiteLink={app.website_link || ""}
                                       subscriptionLink={app.purchase_type === "subscription" ? (app.store_link || "") : ""}
                                       compact
                                     />
                                   </div>
                                </div>
                            </CardContent>

                            <div className="border-t p-2 flex justify-end gap-2 bg-slate-50">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(createPageUrl(`AddAppPage?editId=${app.id}`));
                                    }}
                                    title="ערוך אפליקציה"
                                >
                                    <Pencil className="w-4 h-4" />
                                    ערוך
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 gap-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openDeviceSelector(app);
                                    }}
                                >
                                    הוסף למשקפת
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="gap-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteApp(app);
                                    }}
                                    title="מחק אפליקציה"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    מחק
                                </Button>
                            </div>
                        </Card>
                    ))}
                    {filteredApps.length === 0 && (
                        <div className="col-span-full text-center py-12 text-slate-500">לא נמצאו אפליקציות התואמות לסינון.</div>
                    )}
                </div>
                {showDeviceSelector && selectedAppForModal && (
                    <DeviceSelector
                        mode="add"
                        appName={selectedAppForModal.name}
                        currentDevices={appDeviceNumbers[selectedAppForModal.id] || []}
                        onConfirm={handleDeviceUpdate}
                        onCancel={() => {
                            setShowDeviceSelector(false);
                            setSelectedAppForModal(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
