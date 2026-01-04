import React, { useState, useEffect, useMemo, useCallback } from "react";
import { VRDevice } from "@/entities/VRDevice";
import { DeviceLinkedAccount } from "@/entities/DeviceLinkedAccount";
import { VRApp } from "@/entities/VRApp";
import { DeviceApp } from "@/entities/DeviceApp";
import { ScheduleEntry } from "@/entities/ScheduleEntry";
import { Syllabus } from "@/entities/Syllabus";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUp, ArrowDown, Orbit, Grid, List, LayoutGrid, RotateCw, Plus, X, Edit, Save, Trash2, AlertCircle, CheckCircle, MapPin, Calendar, Clock, Mail, Hash, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AppFilterMultiSelect from "@/components/modals/AppFilterMultiSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import AddAppsFromCatalogModal from "@/components/modals/AddAppsFromCatalogModal";
import { format } from "date-fns";

// --- Helper Functions ---
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const with429Retry = async (fn, retries = 3, backoffMs = 1000) => {
  try {
    return await fn();
  } catch (err) {
    const msg = String(err?.message || "");
    if (retries > 0 && (msg.includes("429") || msg.toLowerCase().includes("rate limit"))) {
      console.warn(`Rate limit detected, retrying in ${backoffMs}ms...`);
      await sleep(backoffMs);
      return with429Retry(fn, retries - 1, backoffMs * 2);
    }
    throw err;
  }
};

// --- Sub-Component: HeadsetDetailsModal ---
function HeadsetDetailsModal({ isOpen, onClose, device, onDeviceUpdated, onDeviceDeleted }) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState({ accounts: [], apps: [], schedules: [], programs: [] });
  
  // Edit States
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editData, setEditData] = useState({});
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ type: "", email: "", user: "", pass: "" });
  const [showAppCatalog, setShowAppCatalog] = useState(false);
  const [disableReason, setDisableReason] = useState("");
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!device) return;
    setLoading(true);
    try {
      const [accounts, devApps, allApps, allSchedules, allPrograms] = await Promise.all([
        DeviceLinkedAccount.filter({ device_id: device.id }),
        DeviceApp.filter({ device_id: device.id }),
        VRApp.list(),
        ScheduleEntry.list(),
        Syllabus.list()
      ]);

      const appMap = new Map((allApps || []).map(a => [a.id, a]));
      const enrichedApps = devApps.map(da => appMap.get(da.app_id)).filter(Boolean);

      const now = new Date();
      const relevantSchedules = (allSchedules || [])
        .filter(s => (s.device_ids || []).includes(device.id) && new Date(s.end_datetime) > now && s.status !== "בוטל")
        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
        .slice(0, 5);

      setDetails({ accounts, apps: enrichedApps, schedules: relevantSchedules, programs: allPrograms });
      setEditData(device);
      setDisableReason(device.disable_reason || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [device]);

  useEffect(() => {
    if (isOpen && device) {
      fetchDetails();
      setIsEditingInfo(false);
      setShowAddAccount(false);
      setShowDisableConfirm(false);
    }
  }, [isOpen, device, fetchDetails]);

  const handleSaveInfo = async () => {
    await with429Retry(() => VRDevice.update(device.id, editData));
    setIsEditingInfo(false);
    onDeviceUpdated();
  };

  const handleAddAccountSubmit = async (e) => {
    e.preventDefault();
    await with429Retry(() => DeviceLinkedAccount.create({ 
        device_id: device.id, account_type: newAccount.type, email: newAccount.email, username: newAccount.user, password: newAccount.pass 
    }));
    setNewAccount({ type: "", email: "", user: "", pass: "" });
    setShowAddAccount(false);
    fetchDetails(); 
    onDeviceUpdated();
  };

  const handleToggleDisable = async (shouldDisable) => {
    await with429Retry(() => VRDevice.update(device.id, { 
        is_disabled: shouldDisable, 
        disable_reason: shouldDisable ? disableReason : "", 
        status: shouldDisable ? "מושבת" : "זמין" 
    }));
    setShowDisableConfirm(false);
    onDeviceUpdated();
  };

  const handleRemoveApp = async (appName) => {
      if(!confirm(`להסיר את ${appName}?`)) return;
      const appObj = details.apps.find(a => a.name === appName);
      if(appObj) {
          const rels = await DeviceApp.filter({ device_id: device.id, app_id: appObj.id });
          if(rels?.[0]) await DeviceApp.delete(rels[0].id);
          fetchDetails();
          onDeviceUpdated();
      }
  };

  // --- התיקון הקריטי כאן ---
  const handleAppClick = (appName) => {
      // אנחנו מייצרים את הכתובת הבסיסית נקי
      const baseUrl = createPageUrl("AppDetailsPage");
      // ומוסיפים את הפרמטרים ידנית כדי למנוע קידוד כפול של סימן השאלה
      const fullUrl = `${baseUrl}?name=${encodeURIComponent(appName)}`;
      // פותחים בטאב חדש
      window.open(fullUrl, '_blank');
  };

  if (!device) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] overflow-y-auto bg-slate-50" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
             משקפת <span className="text-cyan-600 font-mono">#{device.binocular_number}</span>
             {device.is_disabled && <Badge variant="destructive">מושבת</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">פרטים טכניים</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditingInfo(!isEditingInfo)}>
                        {isEditingInfo ? <X className="h-4 w-4"/> : <Edit className="h-4 w-4"/>}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    {isEditingInfo ? (
                        <div className="space-y-3">
                            <Input placeholder="מספר סידורי" value={editData.serial_number} onChange={e => setEditData({...editData, serial_number: e.target.value})} />
                            <Input placeholder="אימייל ראשי" value={editData.primary_email} onChange={e => setEditData({...editData, primary_email: e.target.value})} />
                            <Button className="w-full bg-green-600" onClick={handleSaveInfo}><Save className="w-4 h-4 ml-2"/> שמור שינויים</Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500 flex items-center gap-2"><Hash size={14}/> סידורי</span>
                                <span className="font-mono">{device.serial_number || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500 flex items-center gap-2"><Mail size={14}/> אימייל</span>
                                <span className="truncate max-w-[150px]" title={device.primary_email}>{device.primary_email || '-'}</span>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-lg">ניהול סטטוס</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {device.is_disabled ? (
                        <div className="bg-red-50 p-3 rounded text-red-800 text-sm mb-2">
                            <strong>סיבת השבתה:</strong> {device.disable_reason}
                        </div>
                    ) : null}
                    
                    {showDisableConfirm ? (
                        <div className="space-y-2 bg-slate-100 p-3 rounded">
                            <Textarea placeholder="סיבת השבתה..." value={disableReason} onChange={e => setDisableReason(e.target.value)} />
                            <div className="flex gap-2">
                                <Button variant="destructive" size="sm" onClick={() => handleToggleDisable(true)}>אשר השבתה</Button>
                                <Button variant="ghost" size="sm" onClick={() => setShowDisableConfirm(false)}>ביטול</Button>
                            </div>
                        </div>
                    ) : (
                        <Button 
                            className={`w-full ${device.is_disabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            onClick={() => device.is_disabled ? handleToggleDisable(false) : setShowDisableConfirm(true)}
                        >
                            {device.is_disabled ? <><CheckCircle className="ml-2 w-4 h-4"/> הפעל מחדש</> : <><AlertCircle className="ml-2 w-4 h-4"/> השבת משקפת</>}
                        </Button>
                    )}

                    <Button variant="outline" className="w-full text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { if(confirm('למחוק לצמיתות?')) onDeviceDeleted(device.id); }}>
                        <Trash2 className="ml-2 w-4 h-4"/> מחיקת משקפת
                    </Button>
                </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row justify-between items-center pb-2">
                      <CardTitle className="text-lg">חשבונות מקושרים</CardTitle>
                      <Button size="sm" variant="outline" onClick={() => setShowAddAccount(!showAddAccount)}><Plus className="w-4 h-4"/></Button>
                  </CardHeader>
                  <CardContent>
                      {showAddAccount && (
                          <form onSubmit={handleAddAccountSubmit} className="bg-slate-100 p-3 rounded mb-4 grid grid-cols-2 gap-2">
                              <Select onValueChange={v => setNewAccount({...newAccount, type: v})}>
                                  <SelectTrigger><SelectValue placeholder="סוג" /></SelectTrigger>
                                  <SelectContent>
                                      {['Meta', 'Gmail', 'Steam', 'SideQuest'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                              <Input placeholder="User/Email" value={newAccount.user} onChange={e => setNewAccount({...newAccount, user: e.target.value})} />
                              <div className="col-span-2 flex justify-end"><Button size="sm" type="submit">שמור</Button></div>
                          </form>
                      )}
                      <div className="space-y-2">
                          {details.accounts.length === 0 && <span className="text-slate-400 text-sm">אין חשבונות מקושרים</span>}
                          {details.accounts.map(acc => (
                              <div key={acc.id} className="flex items-center justify-between bg-white border p-2 rounded text-sm">
                                  <div className="flex items-center gap-2">
                                      <Badge variant="secondary">{acc.account_type}</Badge>
                                      <span>{acc.username || acc.email}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader className="flex flex-row justify-between items-center pb-2">
                      <CardTitle className="text-lg">אפליקציות ({details.apps.length})</CardTitle>
                      <Button size="sm" onClick={() => setShowAppCatalog(true)} className="bg-cyan-600 hover:bg-cyan-700">התקן אפליקציה</Button>
                  </CardHeader>
                  <CardContent>
                      <div className="flex flex-wrap gap-2">
                          {details.apps.map(app => (
                              <Badge key={app.id} variant="outline" className="pl-1 pr-1 py-1 bg-cyan-50 border-cyan-200 text-cyan-800 flex gap-2 items-center group">
                                  {/* שם האפליקציה לחיץ כעת */}
                                  <span 
                                    className="cursor-pointer hover:underline flex items-center gap-1"
                                    onClick={() => handleAppClick(app.name)}
                                    title="פתח דף אפליקציה"
                                  >
                                    {app.name}
                                    <ExternalLink className="w-3 h-3 opacity-50"/>
                                  </span>
                                  
                                  {/* כפתור מחיקה נפרד */}
                                  <div className="border-r border-cyan-300 h-4 mx-1"></div>
                                  <X 
                                    className="w-4 h-4 cursor-pointer hover:text-red-600 hover:bg-red-50 rounded-full p-0.5 transition-colors" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveApp(app.name);
                                    }} 
                                  />
                              </Badge>
                          ))}
                          {details.apps.length === 0 && <span className="text-slate-400 text-sm">אין אפליקציות מותקנות</span>}
                      </div>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader><CardTitle className="text-lg">לו"ז קרוב</CardTitle></CardHeader>
                  <CardContent>
                      <div className="space-y-2">
                          {details.schedules.length === 0 && <span className="text-slate-400 text-sm">אין שיבוצים עתידיים</span>}
                          {details.schedules.map(sch => {
                              const prog = details.programs.find(p => p.id === sch.program_id);
                              return (
                                  <div key={sch.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                      <div>
                                          <div className="font-semibold">{prog?.title || 'תוכנית'}</div>
                                          <div className="text-xs text-slate-500 flex gap-2">
                                              <span className="flex items-center gap-1"><Calendar size={10}/> {format(new Date(sch.start_datetime), 'dd/MM')}</span>
                                              <span className="flex items-center gap-1"><Clock size={10}/> {format(new Date(sch.start_datetime), 'HH:mm')}</span>
                                          </div>
                                      </div>
                                      <Badge variant={sch.status === 'פעיל' ? 'success' : 'outline'}>{sch.status}</Badge>
                                  </div>
                              );
                          })}
                      </div>
                  </CardContent>
              </Card>
          </div>
        </div>
      </DialogContent>
      
      <AddAppsFromCatalogModal 
        open={showAppCatalog} 
        onOpenChange={setShowAppCatalog} 
        device={device}
        installedNames={details.apps.map(a => a.name)}
        onSaved={() => { setShowAppCatalog(false); fetchDetails(); onDeviceUpdated(); }}
      />
    </Dialog>
  );
}

// --- Main Component ---
export default function GeneralInfo() {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  
  // Filtering State
  const [selectedAccountTypes, setSelectedAccountTypes] = useState([]);
  const [allAccountTypes, setAllAccountTypes] = useState([]);
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [appsModalOpen, setAppsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState("cards");

  // Modal State
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Parallel loading for performance
      const [devicesList, allDeviceAccounts, allDeviceApps, allApps] = await Promise.all([
        with429Retry(() => VRDevice.list()),
        with429Retry(() => DeviceLinkedAccount.list()),
        with429Retry(() => DeviceApp.list()),
        with429Retry(() => VRApp.list())
      ]);

      const appNameById = new Map((allApps || []).map(a => [a.id, a.name || ""]));
      
      const deviceMap = {}; 

      (allDeviceApps || []).forEach(rel => {
        if (!deviceMap[rel.device_id]) deviceMap[rel.device_id] = { appIds: [], appNames: [], appCount: 0 };
        const name = appNameById.get(rel.app_id);
        if (name) {
          deviceMap[rel.device_id].appNames.push(name);
          deviceMap[rel.device_id].appIds.push(rel.app_id);
          deviceMap[rel.device_id].appCount++;
        }
      });

      const accTypesPerDevice = {};
      const allTypesSet = new Set();
      
      (allDeviceAccounts || []).forEach(acc => {
        if (!accTypesPerDevice[acc.device_id]) accTypesPerDevice[acc.device_id] = [];
        if (acc.account_type) {
            accTypesPerDevice[acc.device_id].push(acc.account_type);
            allTypesSet.add(acc.account_type);
        }
      });

      setAllAccountTypes(Array.from(allTypesSet).sort());

      const enrichedDevices = devicesList.map(device => {
        const dMap = deviceMap[device.id] || { appIds: [], appNames: [], appCount: 0 };
        const dAccs = accTypesPerDevice[device.id] || [];
        
        return {
          ...device,
          appCount: dMap.appCount,
          accountCount: (allDeviceAccounts || []).filter(a => a.device_id === device.id).length,
          installedAppNames: dMap.appNames.sort(),
          installedAppIds: dMap.appIds,
          accountTypes: dAccs
        };
      });

      setDevices(enrichedDevices);

    } catch (error) {
      console.error("Error loading data:", error);
      alert("שגיאה בטעינת הנתונים.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
    setDeviceModalOpen(true);
  };

  const handleDeleteDevice = async (deviceId) => {
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      await with429Retry(() => VRDevice.delete(deviceId));
  };

  const filteredAndSortedDevices = useMemo(() => {
    let filtered = devices.filter(device => {
      const numberMatch = device.binocular_number.toString().includes(searchTerm.trim());
      const accountsMatch = selectedAccountTypes.length === 0 || 
                            device.accountTypes.some(t => selectedAccountTypes.includes(t));
      const appsMatch = selectedAppIds.length === 0 || 
                        device.installedAppIds.some(id => selectedAppIds.includes(id));
      return numberMatch && accountsMatch && appsMatch;
    });
    
    return filtered.sort((a, b) => {
      return sortOrder === "asc" 
        ? a.binocular_number - b.binocular_number 
        : b.binocular_number - a.binocular_number;
    });
  }, [devices, searchTerm, sortOrder, selectedAccountTypes, selectedAppIds]);

  const devicesGroupedByEmail = useMemo(() => {
    if (viewMode !== "columns") return {};
    const grouped = {};
    [...filteredAndSortedDevices].sort((a, b) => (a.primary_email || "").localeCompare(b.primary_email || "", 'he'))
    .forEach(device => {
      const char = (device.primary_email?.[0] || "#").toUpperCase();
      if (!grouped[char]) grouped[char] = [];
      grouped[char].push(device);
    });
    return grouped;
  }, [filteredAndSortedDevices, viewMode]);

  if (isLoading) return <div className="flex h-screen items-center justify-center text-lg text-slate-500 gap-2"><RotateCw className="animate-spin"/> טוען משקפות...</div>;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-5" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-5">
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Orbit className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">משקפות</h1>
              <p className="text-slate-500 text-sm">ניהול ציוד VR</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("AddNewHeadset")}>
              <Button className="bg-green-600 hover:bg-green-700">הוסף משקפת</Button>
            </Link>
            <BackHomeButtons />
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3 pt-4"><CardTitle className="text-base">כלים וסינון</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
               <div className="bg-slate-100 p-1 rounded-lg flex border">
                 {[{id: 'cards', icon: Grid, label: 'כרטיסים'}, {id: 'tiles', icon: LayoutGrid, label: 'אריחים'}, {id: 'columns', icon: List, label: 'רשימה'}].map(mode => (
                   <Button key={mode.id} variant={viewMode === mode.id ? "white" : "ghost"} size="sm" onClick={() => setViewMode(mode.id)} className={`h-7 ${viewMode === mode.id ? 'shadow-sm bg-white' : ''}`}>
                     <mode.icon className="w-4 h-4 ml-1" /> {mode.label}
                   </Button>
                 ))}
               </div>
               
               <div className="relative">
                 <Input 
                   placeholder="חפש לפי מספר..." 
                   value={searchTerm} 
                   onChange={e => setSearchTerm(e.target.value)} 
                   className="w-40" 
                 />
               </div>

               <Button variant="outline" size="icon" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                 {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4"/> : <ArrowDown className="w-4 h-4"/>}
               </Button>

               <Popover>
                 <PopoverTrigger asChild><Button variant="outline">סוג חשבון ({selectedAccountTypes.length})</Button></PopoverTrigger>
                 <PopoverContent className="w-60 p-3" align="start">
                   <div className="space-y-2 max-h-60 overflow-y-auto">
                     {allAccountTypes.map(t => (
                       <div key={t} className="flex items-center gap-2">
                         <Checkbox 
                           checked={selectedAccountTypes.includes(t)}
                           onCheckedChange={(checked) => {
                             setSelectedAccountTypes(prev => checked ? [...prev, t] : prev.filter(x => x !== t));
                           }}
                         />
                         <span className="text-sm">{t}</span>
                       </div>
                     ))}
                   </div>
                 </PopoverContent>
               </Popover>
               
               <Button variant="outline" onClick={() => setAppsModalOpen(true)}>
                 סינון אפליקציות ({selectedAppIds.length})
               </Button>
               
               {(searchTerm || selectedAccountTypes.length > 0 || selectedAppIds.length > 0) && (
                 <Button variant="ghost" className="text-red-500" onClick={() => {setSearchTerm(""); setSelectedAccountTypes([]); setSelectedAppIds([])}}>
                   נקה הכל
                 </Button>
               )}
            </div>
          </CardContent>
        </Card>

        {filteredAndSortedDevices.length === 0 ? (
          <div className="text-center py-20 text-slate-400">לא נמצאו משקפות תואמות לחיפוש.</div>
        ) : (
          <>
            {viewMode === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedDevices.map(device => (
                   <div key={device.id} onClick={() => handleDeviceClick(device)} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:border-cyan-400 cursor-pointer transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-lg text-slate-800 group-hover:text-cyan-700">#{device.binocular_number}</div>
                        <span className={`text-xs px-2 py-1 rounded ${device.is_disabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {device.is_disabled ? 'מושבת' : 'פעיל'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 mb-2">{device.primary_email || 'ללא אימייל'}</div>
                      <div className="flex gap-2 text-xs text-slate-400">
                         <span>{device.appCount} אפליקציות</span>
                         <span>•</span>
                         <span>{device.accountCount} חשבונות</span>
                      </div>
                   </div>
                ))}
              </div>
            )}
            
            {viewMode === 'tiles' && (
               <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                 {filteredAndSortedDevices.map(device => (
                   <div key={device.id} onClick={() => handleDeviceClick(device)} className={`
                     h-16 rounded-md border-2 flex items-center justify-center cursor-pointer font-bold text-lg shadow-sm transition-all hover:scale-105
                     ${device.is_disabled ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-slate-200 hover:border-cyan-400 text-slate-700'}
                   `}>
                     {device.binocular_number}
                   </div>
                 ))}
               </div>
            )}

            {viewMode === 'columns' && (
              <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                {Object.entries(devicesGroupedByEmail).map(([letter, grpDevices]) => (
                   <div key={letter} className="break-inside-avoid mb-4">
                      <div className="bg-cyan-600 text-white px-3 py-1 rounded-t-md font-bold">{letter}</div>
                      <div className="bg-white border border-t-0 rounded-b-md p-2 space-y-1">
                        {grpDevices.map(d => (
                          <div key={d.id} onClick={() => handleDeviceClick(d)} className="p-2 hover:bg-slate-50 rounded cursor-pointer flex justify-between">
                            <span className="font-medium">#{d.binocular_number}</span>
                            <span className="text-xs text-slate-500">{d.primary_email}</span>
                          </div>
                        ))}
                      </div>
                   </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <HeadsetDetailsModal 
        isOpen={deviceModalOpen}
        onClose={() => setDeviceModalOpen(false)}
        device={selectedDevice}
        onDeviceUpdated={loadData} 
        onDeviceDeleted={(id) => {
            handleDeleteDevice(id);
            setDeviceModalOpen(false);
        }}
      />

      <AppFilterMultiSelect
        open={appsModalOpen}
        onClose={() => setAppsModalOpen(false)}
        initialSelected={selectedAppIds}
        onConfirm={(ids) => { setSelectedAppIds(ids || []); setAppsModalOpen(false); }}
      />
    </div>
  );
}