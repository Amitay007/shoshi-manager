import React, { useState, useEffect, useMemo, useCallback } from "react";
import { VRDevice } from "@/entities/VRDevice";
import { DeviceLinkedAccount } from "@/entities/DeviceLinkedAccount";
import { VRApp } from "@/entities/VRApp";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ArrowUp, ArrowDown, Hash, Calendar, Mail, Users, AppWindow, Orbit, Grid, List, LayoutGrid, X, Edit, Save, Clock, MapPin, Star, AlertCircle, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { DeviceApp } from "@/entities/DeviceApp";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AppFilterMultiSelect from "@/components/modals/AppFilterMultiSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import AddAppsFromCatalogModal from "@/components/modals/AddAppsFromCatalogModal";
import { ScheduleEntry } from "@/entities/ScheduleEntry";
import { Syllabus } from "@/entities/Syllabus";
import { format } from "date-fns";

export default function GeneralInfo() {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [deletingId, setDeletingId] = useState(null);
  const [selectedAccountTypes, setSelectedAccountTypes] = useState([]);
  const [allAccountTypes, setAllAccountTypes] = useState([]);
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [appsModalOpen, setAppsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState("cards");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState([]);

  // NEW: Device details modal state
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [deviceAccounts, setDeviceAccounts] = useState([]);
  const [deviceApps, setDeviceApps] = useState([]);
  const [platformOptions, setPlatformOptions] = useState([]);
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [editGeneralData, setEditGeneralData] = useState({});
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountData, setNewAccountData] = useState({ account_type: "", email: "", username: "", password: "" });
  const [showAddAppsModal, setShowAddAppsModal] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableReason, setDisableReason] = useState("");
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [programs, setPrograms] = useState([]);

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));
  const with429Retry = useCallback(async (fn, retries = 3, backoffMs = 2000) => {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err?.message || "");
      if (retries > 0 && (msg.includes("429") || msg.toLowerCase().includes("rate limit"))) {
        console.warn(`429 or rate limit detected, retrying in ${backoffMs}ms... (retries left: ${retries})`);
        await sleep(backoffMs);
        return with429Retry(fn, retries - 1, backoffMs * 2);
      }
      throw err;
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const devicesList = await with429Retry(() => VRDevice.list());
      await sleep(2000);
      
      const allDeviceAccounts = await with429Retry(() => DeviceLinkedAccount.list());
      await sleep(2000);
      
      const allDeviceApps = await with429Retry(() => DeviceApp.list());
      await sleep(2000);
      
      const allApps = await with429Retry(() => VRApp.list());

      const appCountByDeviceId = {};
      (allDeviceApps || []).forEach(rel => {
        appCountByDeviceId[rel.device_id] = (appCountByDeviceId[rel.device_id] || 0) + 1;
      });

      const appNameById = new Map((allApps || []).map(a => [a.id, a.name || ""]));
      const appNamesPerDevice = {};
      const appIdsPerDevice = {};
      (allDeviceApps || []).forEach(rel => {
        const name = appNameById.get(rel.app_id);
        if (!name) return;
        if (!appNamesPerDevice[rel.device_id]) appNamesPerDevice[rel.device_id] = [];
        if (!appIdsPerDevice[rel.device_id]) appIdsPerDevice[rel.device_id] = [];
        appNamesPerDevice[rel.device_id].push(name);
        appIdsPerDevice[rel.device_id].push(rel.app_id);
      });
      Object.keys(appNamesPerDevice).forEach(did => {
        const names = Array.from(new Set(appNamesPerDevice[did]));
        names.sort((a, b) => a.localeCompare(b));
        appNamesPerDevice[did] = names;
      });
      Object.keys(appIdsPerDevice).forEach(did => {
        appIdsPerDevice[did] = Array.from(new Set(appIdsPerDevice[did]));
      });

      const accTypesPerDevice = {};
      (allDeviceAccounts || []).forEach(acc => {
        if (!accTypesPerDevice[acc.device_id]) accTypesPerDevice[acc.device_id] = new Set();
        if (acc.account_type) accTypesPerDevice[acc.device_id].add(acc.account_type);
      });

      const allTypes = Array.from(new Set((allDeviceAccounts || []).map(a => a.account_type).filter(Boolean))).sort();
      setAllAccountTypes(allTypes);

      const devicesWithCounts = devicesList.map(device => {
        const appCount = appCountByDeviceId[device.id] || 0;
        const accountCount = (allDeviceAccounts || []).filter(acc => acc.device_id === device.id).length;
        const installedAppNames = appNamesPerDevice[device.id] || [];
        const installedAppIds = appIdsPerDevice[device.id] || [];
        const accountTypes = Array.from(accTypesPerDevice[device.id] || []);
        return { ...device, appCount, accountCount, installedAppNames, installedAppIds, accountTypes };
      });

      setDevices(devicesWithCounts);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("שגיאה בטעינת הנתונים. אנא המתן רגע ורענן את הדף.");
    }
    setIsLoading(false);
  }, [with429Retry]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // NEW: Load device details when modal opens
  const loadDeviceDetails = useCallback(async (device) => {
    try {
      const [accounts, installedDeviceApps, allApps, platforms, allSchedules, allPrograms] = await Promise.all([
        with429Retry(() => DeviceLinkedAccount.filter({ device_id: device.id })),
        with429Retry(() => DeviceApp.filter({ device_id: device.id })),
        with429Retry(() => VRApp.list()),
        with429Retry(() => VRApp.list()), // Placeholder for platform options
        with429Retry(() => ScheduleEntry.list()),
        with429Retry(() => Syllabus.list())
      ]);

      const appById = new Map((allApps || []).map(a => [a.id, a]));
      const installedAppsDetails = [];
      for (const da of installedDeviceApps) {
        const app = appById.get(da.app_id);
        if (app) {
          installedAppsDetails.push(app);
        }
      }

      setDeviceAccounts(accounts || []);
      setDeviceApps(installedAppsDetails);
      setPlatformOptions([]); // Set actual platform options if available
      setPrograms(allPrograms || []);

      // Get upcoming schedules for this device
      const now = new Date();
      const relevantSchedules = (allSchedules || [])
        .filter(s => 
          (s.device_ids || []).includes(device.id) &&
          new Date(s.end_datetime) > now &&
          s.status !== "בוטל"
        )
        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
        .slice(0, 5);

      setUpcomingSchedules(relevantSchedules);
      setEditGeneralData(device);
      setDisableReason(device.disable_reason || "");
    } catch (error) {
      console.error("Error loading device details:", error);
    }
  }, [with429Retry]);

  const openDeviceModal = useCallback(async (device) => {
    setSelectedDevice(device);
    setDeviceModalOpen(true);
    await loadDeviceDetails(device);
  }, [loadDeviceDetails]);

  const handleSaveGeneral = async () => {
    await with429Retry(() => VRDevice.update(selectedDevice.id, editGeneralData));
    setSelectedDevice(editGeneralData);
    setIsEditingGeneral(false);
    await loadData();
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    await with429Retry(() => DeviceLinkedAccount.create({
      ...newAccountData,
      device_id: selectedDevice.id
    }));
    setNewAccountData({ account_type: "", email: "", username: "", password: "" });
    setShowAddAccount(false);
    await loadDeviceDetails(selectedDevice);
  };

  const handleRemoveApp = async (appName) => {
    if (!confirm(`האם להסיר את ${appName} מהמשקפת?`)) return;
    
    const appToRemove = deviceApps.find(app => app.name === appName);
    if (appToRemove) {
      const deviceAppRecords = await with429Retry(() => DeviceApp.filter({ device_id: selectedDevice.id, app_id: appToRemove.id }));
      if (deviceAppRecords && deviceAppRecords.length > 0) {
        await with429Retry(() => DeviceApp.delete(deviceAppRecords[0].id));
      }
      const remainingInstallations = await with429Retry(() => DeviceApp.filter({ app_id: appToRemove.id }));
      if (remainingInstallations.length === 0) {
        await with429Retry(() => VRApp.update(appToRemove.id, { is_installed: false }));
      }
      await loadDeviceDetails(selectedDevice);
      await loadData();
    }
  };

  const handleDisableDevice = async () => {
    await with429Retry(() => VRDevice.update(selectedDevice.id, {
      is_disabled: true,
      disable_reason: disableReason,
      status: "מושבת"
    }));
    await loadDeviceDetails(selectedDevice);
    await loadData();
    setShowDisableDialog(false);
  };

  const handleEnableDevice = async () => {
    await with429Retry(() => VRDevice.update(selectedDevice.id, {
      is_disabled: false,
      disable_reason: "",
      status: "זמין"
    }));
    await loadDeviceDetails(selectedDevice);
    await loadData();
  };
  
  const handleDeleteHeadset = async (device) => {
    if (!confirm(`האם למחוק את משקפת מספר ${device.binocular_number}? פעולה זו בלתי הפיכה.`)) return;
    setDeletingId(device.id);

    try {
      await with429Retry(() => VRDevice.delete(device.id));
    } catch (error) {
      const msg = String(error?.message || error || "").toLowerCase();
      if (!(msg.includes("object not found") || msg.includes("404"))) {
        console.error("Error deleting headset:", error);
        alert("שגיאה במחיקת המשקפת. אנא נסה שוב.");
        setDeletingId(null);
        return;
      }
    }
    
    await loadData();
    setDeletingId(null);
  };

  const filteredAndSortedDevices = useMemo(() => {
    let filtered = (devices || []).filter(device => {
      const searchMatch = (searchTerm || "").trim() === "" || 
        device.binocular_number.toString().includes((searchTerm || "").trim()) ||
        (device.serial_number || "").toLowerCase().includes((searchTerm || "").trim().toLowerCase());
      
      const accountsMatch =
        (selectedAccountTypes || []).length === 0 ||
        (device.accountTypes || []).some(t => (selectedAccountTypes || []).includes(t));
      
      const appsMatch =
        (selectedAppIds || []).length === 0 ||
        (device.installedAppIds || []).some(id => (selectedAppIds || []).includes(id));
      
      // Tab filtering
      let tabMatch = true;
      if (activeTab === "active") {
        tabMatch = !device.is_disabled && device.status !== "בתיקון";
      } else if (activeTab === "maintenance") {
        tabMatch = device.status === "בתיקון" || device.status === "בתחזוקה";
      } else if (activeTab === "issues") {
        tabMatch = device.is_disabled || device.status === "מושבת";
      }
      
      return searchMatch && accountsMatch && appsMatch && tabMatch;
    });
    
    filtered.sort((a, b) => {
      if (sortOrder === "asc") return a.binocular_number - b.binocular_number;
      return b.binocular_number - a.binocular_number;
    });
    
    return filtered;
  }, [devices, searchTerm, sortOrder, selectedAccountTypes, selectedAppIds, activeTab]);

  const devicesGroupedByEmail = useMemo(() => {
    if (viewMode !== "columns") return {};

    const sorted = [...filteredAndSortedDevices].sort((a, b) =>
      (a.primary_email || "").localeCompare(b.primary_email || "", 'he')
    );

    const grouped = {};
    sorted.forEach((device) => {
      const email = device.primary_email || "ללא אימייל";
      const firstLetter = email.length > 0 ? email[0].toUpperCase() : "#";
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(device);
    });

    return grouped;
  }, [filteredAndSortedDevices, viewMode]);

  if (isLoading) {
    return <div className="p-8 text-center text-lg">טוען נתונים...</div>;
  }

  const InfoItem = ({ icon, label, value, editing = false, editValue, onEdit }) => (
    <div className="flex items-start gap-3">
      <div className="text-slate-400 mt-1">{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-slate-500">{label}</p>
        {editing ? (
          <Input
            value={editValue}
            onChange={onEdit}
            className="mt-1"
            placeholder={`הזן ${label.toLowerCase()}`}
          />
        ) : (
          <p className="font-medium">{value || 'לא צוין'}</p>
        )}
      </div>
    </div>
  );

  const allDevicesCount = devices.length;
  const activeCount = devices.filter(d => !d.is_disabled && d.status !== "בתיקון").length;
  const maintenanceCount = devices.filter(d => d.status === "בתיקון" || d.status === "בתחזוקה").length;
  const issuesCount = devices.filter(d => d.is_disabled || d.status === "מושבת").length;

  const toggleDeviceSelection = (deviceId) => {
    setSelectedDevices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId);
      } else {
        newSet.add(deviceId);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    const allIds = new Set(filteredAndSortedDevices.map(d => d.id));
    setSelectedDevices(allIds);
  };

  return (
    <div className="min-h-screen bg-white p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">מלאי מכשירים</h1>
            <p className="text-slate-500 text-lg">ניהול חכם של משקפות VR</p>
          </div>
          <Link to={createPageUrl("AddNewHeadset")}>
            <Button className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white gap-2 px-6 py-6 text-lg rounded-xl shadow-lg">
              <Plus className="w-5 h-5" />
              הוסף מכשיר
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-2xl relative">
              <Input 
                type="text" 
                placeholder="חיפוש לפי מספר המשקפת או S/N..." 
                className="w-full h-12 pr-12 text-base rounded-xl border-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Tabs and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 border-b border-slate-200">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-6 py-3 text-sm font-medium transition-all relative ${
                  activeTab === "all"
                    ? "text-slate-900 border-b-2 border-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                הכל ({allDevicesCount})
              </button>
              <button
                onClick={() => setActiveTab("active")}
                className={`px-6 py-3 text-sm font-medium transition-all relative ${
                  activeTab === "active"
                    ? "text-green-700 border-b-2 border-green-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                פעילים ({activeCount})
              </button>
              <button
                onClick={() => setActiveTab("maintenance")}
                className={`px-6 py-3 text-sm font-medium transition-all relative ${
                  activeTab === "maintenance"
                    ? "text-orange-700 border-b-2 border-orange-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                בתחזוקה ({maintenanceCount})
              </button>
              <button
                onClick={() => setActiveTab("issues")}
                className={`px-6 py-3 text-sm font-medium transition-all relative ${
                  activeTab === "issues"
                    ? "text-red-700 border-b-2 border-red-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                בעיות ({issuesCount})
              </button>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllVisible}
                className="text-slate-600 hover:text-slate-900"
              >
                בחר הכל
              </Button>
              <span className="text-slate-600 font-medium">
                {filteredAndSortedDevices.length} מכשירים
              </span>
            </div>
          </div>
        </div>

        {viewMode === "cards" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredAndSortedDevices.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">אין משקפות תואמות.</div>
            )}
            {filteredAndSortedDevices.map(device => {
              const isSelected = selectedDevices.has(device.id);
              const borderColor = device.is_disabled || device.status === "מושבת" 
                ? "border-t-red-500" 
                : device.status === "בתיקון" || device.status === "בתחזוקה"
                ? "border-t-orange-500"
                : "border-t-green-500";
              
              const statusText = device.is_disabled || device.status === "מושבת" 
                ? "תקול" 
                : device.status === "בתיקון" || device.status === "בתחזוקה"
                ? "בתחזוקה"
                : "פעיל";

              return (
                <div 
                  key={device.id} 
                  className={`bg-white rounded-xl shadow-sm border-2 border-slate-200 hover:shadow-md transition-all duration-200 ${borderColor} border-t-4 cursor-pointer relative ${
                    isSelected ? "ring-2 ring-cyan-500" : ""
                  }`}
                  onClick={() => openDeviceModal(device)}
                >
                  {/* Checkbox */}
                  <div 
                    className="absolute top-3 right-3 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDeviceSelection(device.id);
                    }}
                  >
                    <Checkbox checked={isSelected} />
                  </div>

                  {/* 3-dot menu */}
                  <div className="absolute top-3 left-3 z-10">
                    <Popover>
                      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="text-slate-400 hover:text-slate-600 p-1">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48" align="start" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeviceModal(device);
                            }}
                          >
                            פתח
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHeadset(device);
                            }}
                          >
                            מחק
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="p-6 pt-12">
                    {/* Large Number */}
                    <div className="text-center mb-2">
                      <div className="text-5xl font-bold text-slate-900">{device.binocular_number}</div>
                      <div className="text-sm text-slate-600 mt-1">{statusText}</div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 mt-4 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>S/N:</span>
                        <span className="font-mono text-slate-900">{device.serial_number || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>MAC:</span>
                        <span className="font-mono text-slate-900 text-[10px]">AA:BB:CC:DD:EE:{String(device.binocular_number).padStart(2, '0')}</span>
                      </div>
                      <div className="text-center mt-3 text-slate-700 font-medium">
                        {device.model || device.headset_type || 'Meta Quest 3'}
                      </div>
                      {device.primary_email && (
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "tiles" ? (
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 gap-2">
            {filteredAndSortedDevices.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">אין משקפות תואמות.</div>
            )}
            {filteredAndSortedDevices.map(device => (
              <div
                key={device.id}
                onClick={() => openDeviceModal(device)}
                className="group cursor-pointer"
              >
                <div className={`relative h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all shadow-sm hover:shadow-md ${
                  device.is_disabled 
                    ? 'bg-red-50 border-red-300 hover:bg-red-100' 
                    : 'bg-green-50 border-green-300 hover:bg-green-100'
                }`}>
                  <div className="text-2xl font-bold text-slate-800">
                    {device.binocular_number}
                  </div>
                  <div className={`absolute bottom-1 left-0 right-0 text-center text-[9px] font-semibold ${
                    device.is_disabled ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {device.is_disabled ? 'מושבת' : 'פעיל'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(devicesGroupedByEmail).length === 0 && (
              <div className="text-center py-12 text-slate-500">אין משקפות תואמות.</div>
            )}
            {Object.keys(devicesGroupedByEmail).sort((a, b) => a.localeCompare(b, 'he')).map((letter) => (
              <div key={letter}>
                <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2 rounded-t-lg font-bold text-lg shadow-md z-10">
                  {letter}
                </div>
                <div className="bg-white rounded-b-lg shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {devicesGroupedByEmail[letter].map((device) => (
                    <div
                      key={device.id}
                      onClick={() => openDeviceModal(device)}
                      className="group cursor-pointer"
                    >
                      <div className={`p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                        device.is_disabled 
                          ? 'bg-red-50 border-red-200 hover:border-red-400' 
                          : 'bg-green-50 border-green-200 hover:border-green-400'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-lg font-bold text-slate-800">
                            משקפת {device.binocular_number}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            device.is_disabled ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                          }`}>
                            {device.is_disabled ? 'מושבת' : 'פעיל'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 truncate">
                          {device.primary_email || 'ללא אימייל'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {device.appCount || 0} אפליקציות
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Device Details Modal */}
      <Dialog open={deviceModalOpen} onOpenChange={setDeviceModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
          {selectedDevice && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">פרטי משקפת: {selectedDevice.binocular_number}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Right Column */}
                <div className="lg:col-span-1 space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>מידע כללי</CardTitle>
                        {!isEditingGeneral ? (
                          <Button size="sm" variant="outline" onClick={() => setIsEditingGeneral(true)} className="gap-2">
                            <Edit className="w-4 h-4" />
                            ערוך
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveGeneral} className="bg-green-600 hover:bg-green-700 gap-2">
                              <Save className="w-4 h-4" />
                              שמור
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {setIsEditingGeneral(false); setEditGeneralData(selectedDevice);}} className="gap-2">
                              <X className="w-4 h-4" />
                              ביטול
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <InfoItem
                        icon={<Hash size={18} />}
                        label="מספר משקפת"
                        value={selectedDevice.binocular_number}
                        editing={false}
                      />
                      <InfoItem
                        icon={<Hash size={18} />}
                        label="מספר סידורי"
                        value={editGeneralData.serial_number || ''}
                        editing={isEditingGeneral}
                        editValue={editGeneralData.serial_number || ''}
                        onEdit={(e) => setEditGeneralData({...editGeneralData, serial_number: e.target.value})}
                      />
                      <InfoItem
                        icon={<Mail size={18} />}
                        label="אימייל ראשי"
                        value={editGeneralData.primary_email || ''}
                        editing={isEditingGeneral}
                        editValue={editGeneralData.primary_email || ''}
                        onEdit={(e) => setEditGeneralData({...editGeneralData, primary_email: e.target.value})}
                      />
                      <div className="flex items-start gap-3">
                        <div className="text-slate-400 mt-1"><Star size={18} /></div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-500">דגם</p>
                          <p className="font-medium">{selectedDevice.model || 'לא צוין'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>סטטוס משקפת</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedDevice.is_disabled ? (
                        <div className="space-y-3">
                          <Button
                            className="w-full bg-slate-400 hover:bg-slate-500 text-white gap-2"
                            onClick={handleEnableDevice}
                          >
                            <AlertCircle className="w-5 h-5" />
                            מושבת
                          </Button>
                          {selectedDevice.disable_reason && (
                            <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                              <p className="text-sm text-slate-600 font-medium mb-1">סיבת השבתה:</p>
                              <p className="text-sm text-slate-700">{selectedDevice.disable_reason}</p>
                            </div>
                          )}
                          <p className="text-xs text-slate-500 text-center">לחץ על הכפתור להפעלת המשקפת</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                            onClick={() => setShowDisableDialog(true)}
                          >
                            <CheckCircle className="w-5 h-5" />
                            תקין
                          </Button>
                          <p className="text-xs text-slate-500 text-center">לחץ להשבתת המשקפת</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>חשבונות מקושרים</CardTitle>
                        <Button size="sm" onClick={() => setShowAddAccount(true)} className="bg-green-600 hover:bg-green-700 gap-2">
                          <Plus className="w-4 h-4" />
                          הוסף
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {showAddAccount && (
                        <form onSubmit={handleAddAccount} className="space-y-3 mb-4 p-3 border border-green-200 rounded-lg bg-green-50">
                          <Select
                            value={newAccountData.account_type}
                            onValueChange={(value) => setNewAccountData({...newAccountData, account_type: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="סוג חשבון" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GMAIL">Gmail</SelectItem>
                              <SelectItem value="META">Meta</SelectItem>
                              <SelectItem value="Facebook">Facebook</SelectItem>
                              <SelectItem value="Remio">Remio</SelectItem>
                              <SelectItem value="Steam">Steam</SelectItem>
                              <SelectItem value="App Lab">App Lab</SelectItem>
                              <SelectItem value="Mondly">Mondly</SelectItem>
                              <SelectItem value="Immerse">Immerse</SelectItem>
                              <SelectItem value="Microsoft">Microsoft</SelectItem>
                              <SelectItem value="SideQuest">SideQuest</SelectItem>
                              <SelectItem value="אחר">אחר</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Input
                              placeholder="אימייל"
                              value={newAccountData.email}
                              onChange={(e) => setNewAccountData({...newAccountData, email: e.target.value})}
                            />
                            <Input
                              placeholder="שם משתמש"
                              value={newAccountData.username}
                              onChange={(e) => setNewAccountData({...newAccountData, username: e.target.value})}
                            />
                            <Input
                              type="password"
                              placeholder="סיסמה"
                              value={newAccountData.password}
                              onChange={(e) => setNewAccountData({...newAccountData, password: e.target.value})}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => setShowAddAccount(false)}>
                              ביטול
                            </Button>
                            <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
                              הוסף
                            </Button>
                          </div>
                        </form>
                      )}

                      {deviceAccounts.length > 0 ? (
                        <ul className="space-y-3">
                          {deviceAccounts.map(acc => (
                            <li key={acc.id} className="flex items-center gap-3 text-sm p-2 border border-slate-100 rounded">
                              <span className="font-semibold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">{acc.account_type}</span>
                              <span className="flex-1">{acc.username || acc.email}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-slate-500">אין חשבונות מקושרים.</p>}
                    </CardContent>
                  </Card>
                </div>

                {/* Middle + Right Columns */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3">
                          <AppWindow className="w-6 h-6" />
                          אפליקציות מותקנות ({deviceApps.length})
                        </CardTitle>
                        <Button 
                          className="bg-green-600 hover:bg-green-700 gap-2" 
                          onClick={() => setShowAddAppsModal(true)}
                        >
                          <Plus className="w-4 h-4" />
                          הוסף אפליקציה
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {deviceApps.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {deviceApps.map((app) => (
                            <div key={app.id} className="relative group">
                              <div
                                onClick={() => window.open(createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`), '_blank')}
                                className="px-3 py-2 text-sm rounded bg-cyan-100 text-cyan-800 border-2 border-cyan-300 hover:bg-cyan-200 hover:border-cyan-400 transition-colors inline-block font-medium cursor-pointer"
                              >
                                {app.name}
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute -top-2 -left-2 w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleRemoveApp(app.name);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">
                          אין אפליקציות מותקנות על משקפת זו.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-3">
                          <Calendar className="w-6 h-6" />
                          שיבוצים קרובים
                        </CardTitle>
                        <Link to={createPageUrl(`SchedulerPage`)}>
                          <Button variant="outline" size="sm">
                            לוח זמנים מלא
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {upcomingSchedules.length > 0 ? (
                        <div className="space-y-3">
                          {upcomingSchedules.map(schedule => {
                            const program = programs.find(p => p.id === schedule.program_id);
                            const startDate = new Date(schedule.start_datetime);
                            const endDate = new Date(schedule.end_datetime);

                            return (
                              <div key={schedule.id} className="p-3 border border-slate-200 rounded-lg hover:border-cyan-400 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="font-semibold text-slate-800">
                                    {program?.title || program?.course_topic || "תוכנית"}
                                  </div>
                                  <Badge className={
                                    schedule.status === "מתוכנן" ? "bg-blue-100 text-blue-800" :
                                    schedule.status === "פעיל" ? "bg-green-100 text-green-800" :
                                    "bg-slate-100 text-slate-600"
                                  }>
                                    {schedule.status}
                                  </Badge>
                                </div>
                                <div className="text-sm text-slate-600 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {format(startDate, 'dd/MM/yyyy')}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                                  </div>
                                  {schedule.location && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4" />
                                      {schedule.location}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 text-center py-4">אין שיבוצים קרובים</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Device Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              השבתת משקפת
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              השבתת המשקפת תמנע ממנה להיבחר בשיבוצים חדשים ובהוספת אפליקציות.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">סיבת ההשבתה</label>
              <Textarea
                placeholder="תאר את הסיבה להשבתת המשקפת (לדוגמה: תקלה טכנית, אובדן, תחזוקה וכו')"
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowDisableDialog(false);
              setDisableReason(selectedDevice?.disable_reason || "");
            }}>
              ביטול
            </Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleDisableDevice}
            >
              אשר השבתה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Apps Modal */}
      {selectedDevice && (
        <AddAppsFromCatalogModal
          open={showAddAppsModal}
          onOpenChange={setShowAddAppsModal}
          device={selectedDevice}
          installedNames={deviceApps.map(a => a.name)}
          onSaved={async () => {
            setShowAddAppsModal(false);
            await loadDeviceDetails(selectedDevice);
            await loadData();
          }}
        />
      )}

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