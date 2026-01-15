import React, { useEffect, useState, useMemo, useRef } from "react";
import { VRApp } from "@/entities/VRApp";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { Trash2, Users, Wifi, WifiOff, Pencil, MoreVertical, Tags, X, Plus, Filter, AppWindow, Grid, List, Search } from "lucide-react";
import { format } from "date-fns";
import { DeviceApp } from "@/entities/DeviceApp";
import AppFilterBar from "@/components/filters/AppFilterBar";
import AppLinkButtons from "@/components/common/AppLinkButtons";
import { with429Retry } from "@/components/utils/retry";
import { Checkbox } from "@/components/ui/checkbox";
import { VRDevice } from "@/entities/VRDevice";
import DeviceSelector from "@/components/DeviceSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function GeneralApps() {
  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    genres: [],
    education_fields: [],
    platforms: [],
    purchase_types: [],
    internet_required: null,
    hand_tracking: null,
    players_count: null
  });
  const [tagFilters, setTagFilters] = useState({
    free: false,
    installed: false,
    research: false,
    not_installed: false,
    in_onboarding: false,
    customTags: []
  });
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [selectedAppForModal, setSelectedAppForModal] = useState(null);
  const [allDevices, setAllDevices] = useState([]);
  const [currentDeviceApps, setCurrentDeviceApps] = useState([]);
  const [appDeviceNumbers, setAppDeviceNumbers] = useState({});
  const [showInstallationsFor, setShowInstallationsFor] = useState(null);

  const [smartTagMode, setSmartTagMode] = useState(false);
  const [selectedApps, setSelectedApps] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("add");
  const [selectedTags, setSelectedTags] = useState({
    free: false,
    research: false,
    in_onboarding: false,
    remove_all: false
  });
  const [newCustomTag, setNewCustomTag] = useState("");
  const [customTagsToApply, setCustomTagsToApply] = useState([]);

  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState(new Set());

  // NEW: View mode state
  const [viewMode, setViewMode] = useState("cards"); // "cards" or "columns"

  const navigate = useNavigate();

  // --- NEW SEARCH LOGIC START ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // 1. Calculate results BEFORE rendering to prevent ReferenceError
  const searchOptions = useMemo(() => {
    if (!filters.search || filters.search.length < 1) return [];
    return apps
      .filter(app => (app.name || "").toLowerCase().includes(filters.search.toLowerCase()))
      .slice(0, 5); // Limit to 5 results
  }, [apps, filters.search]);

  // 2. Click Outside Listener (Fixes the "Ghost Click" / Locking issue)
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // --- NEW SEARCH LOGIC END ---

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    const [all, deviceApps, devices] = await Promise.all([
      with429Retry(() => VRApp.list()),
      with429Retry(() => DeviceApp.list()),
      with429Retry(() => VRDevice.list())
    ]);
    const counts = {};
    (deviceApps || []).forEach((rel) => {
      counts[rel.app_id] = (counts[rel.app_id] || 0) + 1;
    });
    const withCounts = (all || []).map((a) => ({
      ...a,
      __installCount: counts[a.id] || 0,
      __installedBadge: Boolean(a.is_installed) || (counts[a.id] || 0) > 0
    }));
    setApps(withCounts);
    setAllDevices(devices || []);
    setCurrentDeviceApps(deviceApps || []);
    const deviceIdToNumber = new Map((devices || []).map((d) => [d.id, Number(d.binocular_number)]));
    const mapAppToNumbers = {};
    (deviceApps || []).forEach((rel) => {
      const num = deviceIdToNumber.get(rel.device_id);
      if (!Number.isFinite(num)) return;
      if (!mapAppToNumbers[rel.app_id]) mapAppToNumbers[rel.app_id] = [];
      mapAppToNumbers[rel.app_id].push(num);
    });
    Object.keys(mapAppToNumbers).forEach((appId) => {
      mapAppToNumbers[appId] = Array.from(new Set(mapAppToNumbers[appId])).sort((a, b) => a - b);
    });
    setAppDeviceNumbers(mapAppToNumbers);
    setIsLoading(false);
  };

  const handleDeleteApp = async (id, name) => {
    if (confirm(`האם למחוק את "${name}"? פעולה זו בלתי הפיכה.`)) {
      await VRApp.delete(id);
      load();
    }
  };

  const handleUpdateTag = async (app, tagType) => {
    try {
      let updateData = {};

      if (tagType === "free") {
        updateData = { purchase_type: "free" };
      } else if (tagType === "research") {
        updateData = { is_research: true };
      } else if (tagType === "in_onboarding") {
        updateData = { in_onboarding: true };
      } else if (tagType === "clear_research") {
        updateData = { is_research: false };
      } else if (tagType === "clear_in_onboarding") {
        updateData = { in_onboarding: false };
      }

      if (tagType === "free" && app.is_research) {
        updateData.is_research = false;
      }
      if (tagType === "research" && app.purchase_type === "free") {
        updateData.purchase_type = "app_purchase";
      }

      await with429Retry(() => VRApp.update(app.id, updateData));
      await load();
    } catch (error) {
      console.error("Error updating tag:", error);
      alert("שגיאה בעדכון התג");
    }
  };

  const toggleSmartTagMode = () => {
    setSmartTagMode(!smartTagMode);
    setSelectedApps(new Set());
    setDeleteMode(false);
    setSelectedForDeletion(new Set());
  };

  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
    setSelectedForDeletion(new Set());
    setSmartTagMode(false);
    setSelectedApps(new Set());
  };

  const toggleAppSelection = (appId) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const toggleAppForDeletion = (appId) => {
    setSelectedForDeletion((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const handleBulkTagAction = async () => {
    if (selectedApps.size === 0) return;

    try {
      const appsToUpdateIds = Array.from(selectedApps);
      const selectedAppObjects = apps.filter((app) => appsToUpdateIds.includes(app.id));

      for (const app of selectedAppObjects) {
        let updateData = {};

        if (bulkAction === "add") {
          if (selectedTags.free) updateData.purchase_type = "free";
          if (selectedTags.research) updateData.is_research = true;
          if (selectedTags.in_onboarding) updateData.in_onboarding = true;

          if (customTagsToApply.length > 0) {
            const existingTags = app.custom_tags || [];
            const newTags = [...new Set([...existingTags, ...customTagsToApply])];
            updateData.custom_tags = newTags;
          }
        } else {
          if (selectedTags.remove_all) {
            updateData.purchase_type = "app_purchase";
            updateData.is_research = false;
            updateData.in_onboarding = false;
            updateData.custom_tags = [];
          } else {
            if (selectedTags.free && app.purchase_type === "free") {
              updateData.purchase_type = "app_purchase";
            }
            if (selectedTags.research) {
              updateData.is_research = false;
            }
            if (selectedTags.in_onboarding) {
              updateData.in_onboarding = false;
            }

            if (customTagsToApply.length > 0) {
              const existingTags = app.custom_tags || [];
              const newTags = existingTags.filter((t) => !customTagsToApply.includes(t));
              updateData.custom_tags = newTags;
            }
          }
        }

        if (Object.keys(updateData).length > 0) {
          await with429Retry(() => VRApp.update(app.id, updateData));
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      await load();
      setSelectedApps(new Set());
      setSmartTagMode(false);
      setSelectedTags({ free: false, research: false, in_onboarding: false, remove_all: false });
      setCustomTagsToApply([]);
      alert(`עודכנו ${appsToUpdateIds.length} אפליקציות בהצלחה!`);
    } catch (error) {
      console.error("Error in bulk tag action:", error);
      alert("שגיאה בעדכון התגים");
    }
  };

  const addCustomTag = () => {
    if (!newCustomTag.trim()) return;
    const tagToAdd = newCustomTag.trim();
    if (customTagsToApply.includes(tagToAdd)) return;

    setCustomTagsToApply([...customTagsToApply, tagToAdd]);
    setNewCustomTag("");
  };

  const removeCustomTagFromList = (tag) => {
    setCustomTagsToApply(customTagsToApply.filter((t) => t !== tag));
  };

  const openDeviceSelector = (app) => {
    setSelectedAppForModal(app);
    setShowDeviceSelector(true);
  };

  const handleDeviceUpdate = async (selectedDeviceNumbers) => {
    if (!selectedAppForModal) return;
    const appId = selectedAppForModal.id;
    const numToDeviceId = new Map((allDevices || []).map((d) => [d.id, Number(d.binocular_number)]));
    const existingRelsForApp = (currentDeviceApps || []).filter((rel) => rel.app_id === appId);
    const selectedIds = selectedDeviceNumbers.map((n) => numToDeviceId.get(n)).filter(Boolean);
    const existingDeviceIds = new Set(existingRelsForApp.map((r) => r.device_id));
    const toCreate = selectedIds.filter((id) => !existingDeviceIds.has(id)).map((device_id) => ({ device_id, app_id: appId }));
    if (toCreate.length > 0) {
      await with429Retry(() => DeviceApp.bulkCreate(toCreate));
    }
    if (selectedIds.length > 0) {
      await with429Retry(() => VRApp.update(appId, { is_installed: true, is_research: false }));
    } else {
      await with429Retry(() => VRApp.update(appId, { is_installed: false, is_research: false }));
    }
    await load();
    setShowDeviceSelector(false);
    setSelectedAppForModal(null);
  };

  const handleBulkDelete = async () => {
    if (selectedForDeletion.size === 0) return;

    const count = selectedForDeletion.size;
    if (!confirm(`האם אתה בטוח שברצונך למחוק ${count} אפליקציות? פעולה זו בלתי הפיכה!`)) {
      return;
    }

    try {
      const appsToDelete = Array.from(selectedForDeletion);
      let successCount = 0;
      let errorCount = 0;

      for (const appId of appsToDelete) {
        try {
          await with429Retry(() => VRApp.delete(appId));
          successCount++;
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`Error deleting app ${appId}:`, err);
          errorCount++;
        }
      }

      await load();
      setSelectedForDeletion(new Set());
      setDeleteMode(false);

      if (errorCount === 0) {
        alert(`${successCount} אפליקציות נמחקו בהצלחה!`);
      } else {
        alert(`נמחקו ${successCount} אפליקציות, ${errorCount} כשלו.`);
      }
    } catch (error) {
      console.error("Error in bulk delete:", error);
      alert("שגיאה במחיקת אפליקציות");
    }
  };

  // FIXED: Helper function that checks if at least one value from chosen exists in source
  const hasAny = (chosen, source) => {
    if (!chosen || chosen.length === 0) return true; // If no filter items are selected, it matches all.
    if (!source || source.length === 0) return false; // If the app has no items in the category, it matches none if filter is active.
    return chosen.some((v) => source.includes(v));
  };

  const matchesPlayers = (meta, playersFilter) => {
    if (!playersFilter) return true;
    const details = meta?.player_count_details || [];
    if (playersFilter === "∞") {
      return details.some((d) => String(d.count).includes("∞"));
    }
    const n = playersFilter === "5" ? 5 : Number(playersFilter);
    if (!Number.isFinite(n)) return false;
    if (playersFilter === "5") {
      return details.some((d) => {
        const c = parseInt(String(d.count).replace(/\D/g, ""), 10);
        return Number.isFinite(c) && c >= 5;
      });
    }
    return details.some((d) => String(d.count) === String(n));
  };

  const filteredApps = useMemo(() => {
    let list = [...(apps || [])];
    const term = (filters.search || "").trim().toLowerCase();
    list = list.filter((meta) => {
      if (term) {
        const hay = [
          meta?.name || "",
          meta?.description || "",
          ...(meta?.genre || []),
          ...(meta?.education_field || []),
          ...(meta?.supported_platforms || []),
          ...(meta?.custom_tags || [])
        ].join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }

      // FIXED: Changed to hasAny for genres, education_fields, and platforms
      if ((filters.genres || []).length && !hasAny(filters.genres, meta?.genre)) return false;
      if ((filters.education_fields || []).length && !hasAny(filters.education_fields, meta?.education_field)) return false;
      if ((filters.platforms || []).length && !hasAny(filters.platforms, meta?.supported_platforms)) return false;
      if ((filters.purchase_types || []).length && !(filters.purchase_types || []).includes(meta?.purchase_type)) return false;

      if (filters.internet_required !== null) {
        if ((meta?.internet_required || false) !== filters.internet_required) return false;
      }

      if (filters.hand_tracking !== null) {
        if ((meta?.hand_tracking || false) !== filters.hand_tracking) return false;
      }

      if (filters.players_count && !matchesPlayers(meta, filters.players_count)) return false;

      const isInstalled = Boolean(meta.__installedBadge);
      const isResearch = Boolean(meta?.is_research || (meta?.research_by || []).length > 0);
      const isNotInstalled = !isInstalled && !isResearch;
      const isFree = meta.purchase_type === "free";
      const isInOnboarding = Boolean(meta?.in_onboarding);
      const appCustomTags = meta?.custom_tags || [];

      const hasActiveTagFilters =
        tagFilters.free ||
        tagFilters.installed ||
        tagFilters.research ||
        tagFilters.not_installed ||
        tagFilters.in_onboarding ||
        (tagFilters.customTags || []).length > 0;

      if (!hasActiveTagFilters) return true;

      let matchesTagFilter = false;

      if (tagFilters.free && isFree) matchesTagFilter = true;
      if (tagFilters.installed && isInstalled) matchesTagFilter = true;
      if (tagFilters.research && isResearch) matchesTagFilter = true;
      if (tagFilters.not_installed && isNotInstalled) matchesTagFilter = true;
      if (tagFilters.in_onboarding && isInOnboarding) matchesTagFilter = true;

      if ((tagFilters.customTags || []).length > 0) {
        const hasMatchingCustomTag = (tagFilters.customTags || []).some((tag) =>
          appCustomTags.includes(tag)
        );
        if (hasMatchingCustomTag) matchesTagFilter = true;
      }

      return matchesTagFilter;
    });
    return list;
  }, [apps, filters, tagFilters]);

  const allCustomTags = useMemo(() => {
    const tagsSet = new Set();
    (apps || []).forEach((app) => {
      (app.custom_tags || []).forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [apps]);

  const appsGroupedByLetter = useMemo(() => {
    if (viewMode !== "columns") return {};

    const sorted = [...filteredApps].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", 'he')
    );

    const grouped = {};
    sorted.forEach((app) => {
      const firstLetter = (app.name || "?")[0].toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(app);
    });

    return grouped;
  }, [filteredApps, viewMode]);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 p-6" dir="rtl">טוען...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Updated Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <AppWindow className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-cyan-900">אפליקציות</h1>
              <p className="text-slate-500 text-xs sm:text-sm">ניהול אפליקציות VR</p>
            </div>
          </div>
          <div className="hidden lg:block">
            <BackHomeButtons />
          </div>
        </div>

        {smartTagMode &&
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tags className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-purple-900">מצב תיוג חכם</h3>
                  <p className="text-sm text-purple-700">בחר אפליקציות ולחץ על "פעולות" לתיוג קבוצתי</p>
                </div>
              </div>
              <div className="text-sm font-medium text-purple-700">
                נבחרו: {selectedApps.size} אפליקציות
              </div>
            </div>
          </div>
        }

        {deleteMode &&
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">מצב מחיקה</h3>
                  <p className="text-sm text-red-700">בחר אפליקציות למחיקה קבוצתית</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-red-700">
                  נבחרו: {selectedForDeletion.size} אפליקציות
                </div>
                {selectedForDeletion.size > 0 &&
                  <Button
                    onClick={handleBulkDelete}
                    className="bg-red-600 hover:bg-red-700 text-white">

                    מחק {selectedForDeletion.size} אפליקציות
                  </Button>
                }
              </div>
            </div>
          </div>
        }

        {smartTagMode && selectedApps.size > 0 &&
          <div className="bg-white border-2 border-purple-300 rounded-lg p-4 mb-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">פעולות על {selectedApps.size} אפליקציות</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedApps(new Set())}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">סוג פעולה:</label>
                <Select value={bulkAction} onValueChange={(v) => {
                  setBulkAction(v);
                  setSelectedTags({ free: false, research: false, in_onboarding: false, remove_all: false });
                  setCustomTagsToApply([]);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">הוסף תגים</SelectItem>
                    <SelectItem value="remove">הסר תגים</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">תגים מובנים:</label>

                {bulkAction === "remove" &&
                  <div className="mb-3 p-3 bg-red-50 border-2 border-red-200 rounded-md">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedTags.remove_all}
                        onCheckedChange={(v) => {
                          const newVal = Boolean(v);
                          if (newVal) {
                            setSelectedTags({
                              free: false,
                              research: false,
                              in_onboarding: false,
                              remove_all: true
                            });
                            setCustomTagsToApply([]);
                          } else {
                            setSelectedTags({ ...selectedTags, remove_all: false });
                          }
                        }} />

                      <span className="text-sm font-bold text-red-800">הסר את כל התגים (חינם, מחקר, בתהליך קליטה, תגים מותאמים)</span>
                    </label>
                    <p className="text-xs text-red-600 mt-1 pr-6">
                      שים לב: התג "מותקן" מבוסס על התקנות ממשיות ולא ניתן להסירו דרך כלי התיוג החכם.
                    </p>
                  </div>
                }

                <div className="flex flex-wrap gap-2">
                  <label className={`flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-md cursor-pointer hover:bg-slate-200 ${selectedTags.remove_all && bulkAction === "remove" ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Checkbox
                      checked={selectedTags.free}
                      onCheckedChange={(v) => setSelectedTags({ ...selectedTags, free: Boolean(v) })}
                      disabled={selectedTags.remove_all && bulkAction === "remove"} />

                    <span className="text-sm">חינם</span>
                  </label>
                  <label className={`flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-md cursor-pointer hover:bg-slate-200 ${selectedTags.remove_all && bulkAction === "remove" ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Checkbox
                      checked={selectedTags.research}
                      onCheckedChange={(v) => setSelectedTags({ ...selectedTags, research: Boolean(v) })}
                      disabled={selectedTags.remove_all && bulkAction === "remove"} />

                    <span className="text-sm">מחקר</span>
                  </label>
                  <label className={`flex items-center gap-2 bg-red-100 px-3 py-2 rounded-md cursor-pointer hover:bg-red-200 ${selectedTags.remove_all && bulkAction === "remove" ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Checkbox
                      checked={selectedTags.in_onboarding}
                      onCheckedChange={(v) => setSelectedTags({ ...selectedTags, in_onboarding: Boolean(v) })}
                      disabled={selectedTags.remove_all && bulkAction === "remove"} />

                    <span className="text-sm font-medium text-red-800">בתהליך קליטה</span>
                  </label>
                </div>
              </div>

              <div className={selectedTags.remove_all && bulkAction === "remove" ? 'opacity-50 pointer-events-none' : ''}>
                <label className="text-sm font-medium mb-2 block">תגים מותאמים אישית:</label>
                {bulkAction === "add" ? (
                  <>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="הוסף תג מותאם..."
                        value={newCustomTag}
                        onChange={(e) => setNewCustomTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                        disabled={selectedTags.remove_all && bulkAction === "remove"} />

                      <Button onClick={addCustomTag} variant="outline" disabled={selectedTags.remove_all && bulkAction === "remove"}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {customTagsToApply.map((tag) =>
                        <Badge key={tag} className="bg-indigo-100 text-indigo-800 gap-1 text-sm">
                          {tag}
                          <button type="button" onClick={() => removeCustomTagFromList(tag)} className="p-0.5 rounded-full hover:bg-indigo-200 ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-600 mb-2">בחר תגים מותאמים להסרה:</p>
                    <div className="flex flex-wrap gap-2">
                      {allCustomTags.map((tag) => (
                        <label key={tag} className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-md cursor-pointer hover:bg-indigo-100">
                          <Checkbox
                            checked={customTagsToApply.includes(tag)}
                            onCheckedChange={(v) => {
                              if (v) {
                                setCustomTagsToApply([...customTagsToApply, tag]);
                              } else {
                                setCustomTagsToApply(customTagsToApply.filter(t => t !== tag));
                              }
                            }}
                            disabled={selectedTags.remove_all} />
                          <span className="text-sm text-indigo-800">{tag}</span>
                        </label>
                      ))}
                      {allCustomTags.length === 0 && (
                        <p className="text-xs text-slate-500">אין תגים מותאמים במערכת</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <Button
                onClick={handleBulkTagAction}
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={bulkAction === "remove" ?
                  !selectedTags.remove_all && !Object.values(selectedTags).slice(0, 3).some(Boolean) && customTagsToApply.length === 0 :
                  !Object.values(selectedTags).slice(0, 3).some(Boolean) && customTagsToApply.length === 0
                }>

                {bulkAction === "add" ? "הוסף תגים" : selectedTags.remove_all ? "הסר את כל התגים" : "הסר תגים"} ל-{selectedApps.size} אפליקציות
              </Button>
            </div>
          </div>
        }

        {/* Updated tag filter box with action buttons AND view mode buttons */}
        <div className="bg-white border rounded-lg p-4 mb-4 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-600" />
            <h3 className="font-medium text-slate-700">סינון ופעולות</h3>
          </div>

          {/* Action buttons row + View mode buttons */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-slate-200">
            <Button
              onClick={toggleSmartTagMode}
              variant={smartTagMode ? "default" : "outline"}
              className={smartTagMode ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
              size="sm">

              <Tags className="w-4 h-4 mr-2" />
              {smartTagMode ? "ביטול תיוג חכם" : "תיוג חכם"}
            </Button>

            <Link to={createPageUrl('AddAppPage')}>
              <Button className="bg-green-600 hover:bg-green-700" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                הוסף אפליקציה
              </Button>
            </Link>

            <Button
              onClick={toggleDeleteMode}
              variant={deleteMode ? "default" : "outline"}
              className={deleteMode ? "bg-red-600 hover:bg-red-700 text-white" : "border-red-300 text-red-700 hover:bg-red-50"}
              size="sm">

              <Trash2 className="w-4 h-4 mr-2" />
              {deleteMode ? "ביטול מחיקה" : "מחיקת אפליקציות"}
            </Button>

            {/* NEW: View mode toggle buttons */}
            <div className="px-1 py-1 rounded-md flex gap-1 border">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="h-8 px-3">

                <Grid className="w-4 h-4 mr-1" />
                כרטיסיות
              </Button>
              <Button
                variant={viewMode === "columns" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("columns")}
                className="h-8 px-3">

                <List className="w-4 h-4 mr-1" />
                עמודות
              </Button>
            </div>
          </div>

          {/* Tag filters */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
              <Checkbox
                checked={tagFilters.free}
                onCheckedChange={(v) => setTagFilters((prev) => ({ ...prev, free: Boolean(v) }))} />

              <Badge className="bg-blue-100 text-blue-800 text-xs">חינם</Badge>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
              <Checkbox
                checked={tagFilters.installed}
                onCheckedChange={(v) => setTagFilters((prev) => ({ ...prev, installed: Boolean(v) }))} />

              <Badge className="bg-green-100 text-green-800 text-xs">מותקן</Badge>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
              <Checkbox
                checked={tagFilters.research}
                onCheckedChange={(v) => setTagFilters((prev) => ({ ...prev, research: Boolean(v) }))} />

              <Badge className="bg-purple-100 text-purple-800 text-xs">מחקר</Badge>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
              <Checkbox
                checked={tagFilters.not_installed}
                onCheckedChange={(v) => setTagFilters((prev) => ({ ...prev, not_installed: Boolean(v) }))} />

              <Badge className="bg-amber-100 text-amber-800 text-xs">לא מותקן</Badge>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
              <Checkbox
                checked={tagFilters.in_onboarding}
                onCheckedChange={(v) => setTagFilters((prev) => ({ ...prev, in_onboarding: Boolean(v) }))} />

              <Badge className="bg-red-100 text-red-800 text-xs font-medium">בתהליך קליטה</Badge>
            </label>

            {allCustomTags.length > 0 &&
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Tags className="w-4 h-4" />
                    תגים מותאמים ({(tagFilters.customTags || []).length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 max-h-80 overflow-y-auto" align="start">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm mb-3">בחר תגים מותאמים:</h4>
                    {allCustomTags.map((tag) =>
                      <label key={tag} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                        <Checkbox
                          checked={(tagFilters.customTags || []).includes(tag)}
                          onCheckedChange={(v) => {
                            setTagFilters((prev) => {
                              const currentCustomTags = prev.customTags || [];
                              if (v) {
                                return { ...prev, customTags: [...currentCustomTags, tag] };
                              } else {
                                return { ...prev, customTags: currentCustomTags.filter((t) => t !== tag) };
                              }
                            });
                          }} />

                        <Badge className="bg-indigo-100 text-indigo-800 text-xs">{tag}</Badge>
                      </label>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            }

            {(tagFilters.free || tagFilters.installed || tagFilters.research || tagFilters.not_installed || tagFilters.in_onboarding || (tagFilters.customTags || []).length > 0) &&
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTagFilters({
                  free: false,
                  installed: false,
                  research: false,
                  not_installed: false,
                  in_onboarding: false,
                  customTags: []
                })}>

                נקה סינון תגים
              </Button>
            }
          </div>

          {(tagFilters.customTags || []).length > 0 &&
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              <span className="text-xs text-slate-600">תגים נבחרים:</span>
              {(tagFilters.customTags || []).map((tag) =>
                <Badge key={tag} className="bg-indigo-100 text-indigo-800 text-xs gap-1">
                  {tag}
                  <button
                    onClick={() => {
                      setTagFilters((prev) => ({
                        ...prev,
                        customTags: (prev.customTags || []).filter((t) => t !== tag)
                      }));
                    }}
                    className="hover:bg-indigo-200 rounded-full p-0.5">

                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          }
        </div>

        {/* --- ROBUST SEARCH BAR --- */}
        <div className="relative mb-4 w-full max-w-md" ref={searchRef}>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="חפש אפליקציה..."
              className="pr-10 bg-white shadow-sm border-slate-200 focus:ring-2 focus:ring-cyan-500"
              value={filters.search}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, search: e.target.value }));
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
            />
          </div>

          {/* DROPDOWN RESULTS */}
          {isSearchOpen && searchOptions.length > 0 && (
            <div className="absolute top-full right-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
              {searchOptions.map((app) => (
                <div
                  key={app.id}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-0"
                  onMouseDown={() => {
                     // CRITICAL FIX: onMouseDown guarantees the click registers before focus is lost
                     navigate(createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`));
                     setIsSearchOpen(false);
                  }}
                >
                   <AppWindow className="w-4 h-4 text-slate-400" />
                   <span className="text-sm font-medium text-slate-700">{app.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* ------------------------- */}

        <div className="mb-4">
          <AppFilterBar allApps={apps} onChange={(f) => setFilters((prev) => ({ ...prev, ...f }))} />
        </div>

        {/* Conditional rendering based on view mode */}
        {viewMode === "cards" ?
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredApps.map((app) => {
              const isInstalledGlobally = Boolean(app.__installedBadge);
              const isResearch = Boolean(app.is_research || (app?.research_by || []).length > 0);
              const isNotInstalledAndNotResearch = !isInstalledGlobally && !isResearch;
              const isFree = app.purchase_type === "free";
              const isInOnboarding = Boolean(app?.in_onboarding);
              const customTags = app.custom_tags || [];
              const isSelected = selectedApps.has(app.id);
              const isSelectedForDeletion = selectedForDeletion.has(app.id);

              const allTags = [];
              if (isFree) allTags.push({ type: "free", label: "חינם" });
              if (isResearch) allTags.push({ type: "research", label: "מחקר" });
              if (isInstalledGlobally) allTags.push({ type: "installed", label: "מותקן" });
              if (isNotInstalledAndNotResearch) allTags.push({ type: "not_installed", label: "לא מותקן" });
              if (isInOnboarding) allTags.push({ type: "in_onboarding", label: "בתהליך קליטה" });
              customTags.forEach((tag) => allTags.push({ type: "custom", label: tag }));
              const displayTags = allTags.slice(0, 6);

              const playerCountDisplay = (app.player_count_details || []).map((d) => d.count).join(", ");

              return (
                <Card
                  key={app.id}
                  className={`bg-white hover:shadow-lg transition-shadow flex flex-col rounded-xl relative cursor-pointer
                    ${isSelected ? 'ring-2 ring-purple-500' : ''} 
                    ${isSelectedForDeletion ? 'ring-2 ring-red-500' : ''}`
                  }
                  onClick={(e) => {
                    if (smartTagMode) {
                      toggleAppSelection(app.id);
                    } else if (deleteMode) {
                      toggleAppForDeletion(app.id);
                    } else {
                      navigate(createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`));
                    }
                  }}>

                  {smartTagMode &&
                    <div className="absolute top-2 right-2 z-10 p-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleAppSelection(app.id)}
                        className="bg-white border-slate-300" />
                    </div>
                  }

                  {!smartTagMode && !deleteMode &&
                    <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-slate-100">
                            <MoreVertical className="w-4 h-4 text-slate-600" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2" align="start">
                          <div className="space-y-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateTag(app, "free");
                              }}>
                              <span className={isFree ? "font-bold" : ""}>חינם</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateTag(app, "research");
                              }}>
                              <span className={isResearch ? "font-bold" : ""}>מחקר</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateTag(app, "clear_research");
                              }}>
                              <span className={!isResearch ? "font-bold" : ""}>נקה מחקר</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-8 text-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateTag(app, "in_onboarding");
                              }}>
                              <span className={isInOnboarding ? "font-bold" : ""}>בתהליך קליטה</span>
                            </Button>
                            {isInOnboarding &&
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateTag(app, "clear_in_onboarding");
                                }}>
                                נקה בתהליך קליטה
                              </Button>
                            }
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  }

                  <CardContent className="p-3 flex flex-col h-full text-xs">
                    <div className="space-y-2 mb-2">
                      <h3 className="font-semibold text-sm text-slate-800 line-clamp-2 min-h-[2.5rem]" title={app.name}>{app.name}</h3>

                      <div className="flex gap-1 flex-wrap min-h-[1.5rem]">
                        {displayTags.map((tag, idx) =>
                          <Badge
                            key={`${tag.type}-${idx}`}
                            className={`text-[10px] px-1 py-0 ${
                              tag.type === "free" ? "bg-blue-100 text-blue-800" :
                                tag.type === "research" ? "bg-purple-100 text-purple-800" :
                                  tag.type === "installed" ? "bg-green-100 text-green-800" :
                                    tag.type === "not_installed" ? "bg-amber-100 text-amber-800" :
                                      tag.type === "in_onboarding" ? "bg-red-100 text-red-800 font-medium" :
                                        "bg-indigo-100 text-indigo-800"
                            }`}>
                            {tag.label}
                          </Badge>
                        )}
                        {allTags.length > 6 &&
                          <Badge className="bg-slate-200 text-slate-700 text-[10px] px-1 py-0">
                            +{allTags.length - 6}
                          </Badge>
                        }
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      {app.education_field && app.education_field.length > 0 &&
                        <div>
                          <div className="text-slate-500 text-[10px] mb-0.5">תחום חינוכי:</div>
                          <div className="flex flex-wrap gap-0.5">
                            {app.education_field.slice(0, 4).map((e, idx) =>
                              <Badge key={`e-${app.id}-${idx}`} variant="secondary" className="bg-emerald-50 text-emerald-700 text-[9px] px-1 py-0">{e}</Badge>
                            )}
                            {app.education_field.length > 4 && <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[9px] px-1 py-0">+{app.education_field.length - 4}</Badge>}
                          </div>
                        </div>
                      }

                      {app.genre && app.genre.length > 0 &&
                        <div>
                          <div className="text-slate-500 text-[10px] mb-0.5">ז'אנר:</div>
                          <div className="flex flex-wrap gap-0.5">
                            {app.genre.slice(0, 3).map((g, idx) =>
                              <Badge key={`g-${app.id}-${idx}`} variant="secondary" className="bg-slate-100 text-slate-700 text-[9px] px-1 py-0">{g}</Badge>
                            )}
                            {app.genre.length > 3 && <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[9px] px-1 py-0">+{app.genre.length - 3}</Badge>}
                          </div>
                        </div>
                      }

                      {playerCountDisplay &&
                        <div>
                          <div className="text-slate-500 text-[10px] mb-0.5">מספר שחקנים:</div>
                          <div className="flex flex-wrap gap-0.5">
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[9px] px-1 py-0">{playerCountDisplay}</Badge>
                          </div>
                        </div>
                      }
                    </div>

                    <div className="pt-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                      <AppLinkButtons
                        storeLink={app.store_link || ""}
                        websiteLink={app.website_link || ""}
                        subscriptionLink={app.purchase_type === "subscription" ? app.subscription_store_link || "" : ""}
                        compact
                        stopPropagation />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t mt-2 text-[10px]">
                      <span className="inline-flex items-center gap-0.5">
                        {app.internet_required ?
                          <span className="text-cyan-700 inline-flex items-center gap-0.5">
                            <Wifi className="w-3 h-3" /> אינטרנט
                          </span> :
                          <span className="text-slate-500 inline-flex items-center gap-0.5">
                            <WifiOff className="w-3 h-3" /> לא דורש
                          </span>
                        }
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 text-cyan-700 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowInstallationsFor(app);
                        }}
                        title="צפה במשקפות">
                        <Users className="w-3 h-3" />
                        {app.__installCount || 0}
                      </button>
                    </div>
                  </CardContent>

                  {!smartTagMode && !deleteMode &&
                    <div className="border-t p-2 flex justify-between items-center gap-1 bg-slate-50" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[9px] text-slate-400">
                        {app.updated_date && (
                          <>
                            <div>עודכן לאחרונה בתאריך</div>
                            <div>{format(new Date(app.updated_date), 'dd.MM.yyyy')}</div>
                          </>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 h-7 text-[10px] px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(createPageUrl(`AddAppPage?editId=${app.id}`));
                          }}
                          title="ערוך אפליקציה">
                          <Pencil className="w-3 h-3" />
                          ערוך
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 gap-1 h-7 text-[10px] px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeviceSelector(app);
                          }}>
                          הוסף
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1 h-7 text-[10px] px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteApp(app.id, app.name);
                          }}
                          title="מחק אפליקציה">
                          <Trash2 className="w-3 h-3" />
                          מחק
                        </Button>
                      </div>
                    </div>
                  }
                </Card>);

            })}
            {filteredApps.length === 0 &&
              <div className="col-span-full text-center py-12 text-slate-500">אין אפליקציות תואמות.</div>
            }
          </div> : (

          /* Columns view with delete support */
          <div className="space-y-6">
            {Object.keys(appsGroupedByLetter).sort((a, b) => a.localeCompare(b, 'he')).map((letter) =>
              <div key={letter}>
                <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2 rounded-t-lg font-bold text-lg shadow-md z-10">
                  {letter}
                </div>
                <div className="bg-white rounded-b-lg shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {appsGroupedByLetter[letter].map((app) => {
                    const isSelectedForDeletion = selectedForDeletion.has(app.id);
                    return (
                      <div
                        key={app.id}
                        className={`text-slate-800 hover:bg-slate-50 p-2 rounded transition-all text-sm
                          ${deleteMode ? 'cursor-pointer' : 'hover:text-cyan-700 cursor-pointer'}
                          ${isSelectedForDeletion ? 'bg-red-100 border-2 border-red-500 font-semibold' : 'border border-transparent'}
                        `}
                        onClick={() => {
                          if (deleteMode) {
                            toggleAppForDeletion(app.id);
                          } else {
                            navigate(createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`));
                          }
                        }}>
                        {app.name}
                      </div>);

                  })}
                </div>
              </div>
            )}
            {Object.keys(appsGroupedByLetter).length === 0 &&
              <div className="text-center py-12 text-slate-500">אין אפליקציות תואמות.</div>
            }
          </div>)
        }

        <Dialog open={!!showInstallationsFor} onOpenChange={(o) => !o && setShowInstallationsFor(null)}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>משקפות עם האפליקציה: {showInstallationsFor?.name || ""}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {showInstallationsFor ?
                (() => {
                  const nums = appDeviceNumbers[showInstallationsFor.id] || [];
                  return nums.length > 0 ?
                    <div className="flex flex-wrap gap-2">
                      {nums.map((n) =>
                        <span key={n} className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-sm">
                          #{String(n).padStart(3, "0")}
                        </span>
                      )}
                    </div> :

                    <div className="text-slate-500">אין התקנות.</div>;

                })() :
                null}
            </div>
          </DialogContent>
        </Dialog>
        {showDeviceSelector && selectedAppForModal &&
          <DeviceSelector
            mode="add"
            appName={selectedAppForModal.name}
            currentDevices={appDeviceNumbers[selectedAppForModal.id] || []}
            onConfirm={handleDeviceUpdate}
            onCancel={() => {
              setShowDeviceSelector(false);
              setSelectedAppForModal(null);
            }} />
        }
      </div>
    </div>);

}