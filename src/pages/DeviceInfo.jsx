import React, { useState, useEffect, useCallback } from "react";
import { VRDevice } from "@/entities/VRDevice";
import { DeviceLinkedAccount } from "@/entities/DeviceLinkedAccount";
import { VRApp } from "@/entities/VRApp";
import { DeviceApp } from "@/entities/DeviceApp";
import { PlatformOption } from "@/entities/PlatformOption";
import { ScheduleEntry } from "@/entities/ScheduleEntry";
import { Syllabus } from "@/entities/Syllabus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, ArrowLeft, Mail, Calendar, Hash, AppWindow, Plus, Edit, Save, X, Clock, MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import AddAppsFromCatalogModal from "@/components/modals/AddAppsFromCatalogModal";
import { with429Retry } from "@/components/utils/retry";
import { format } from "date-fns";

export default function DeviceInfo() {
  const [device, setDevice] = useState(null);
  const [deviceAccounts, setDeviceAccounts] = useState([]);
  const [deviceApps, setDeviceApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [editGeneralData, setEditGeneralData] = useState({});
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountData, setNewAccountData] = useState({
    account_type: "",
    email: "",
    username: "",
    password: ""
  });
  const [showAddAppsModal, setShowAddAppsModal] = useState(false);
  const [platformOptions, setPlatformOptions] = useState([]);
  
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableReason, setDisableReason] = useState("");
  
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const deviceId = urlParams.get('id');

  const loadDeviceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const deviceResults = await with429Retry(() => VRDevice.filter({ binocular_number: Number(deviceId) }));
      if (!deviceResults || deviceResults.length === 0) {
        console.error(`Device with binocular_number ${deviceId} not found`);
        navigate(createPageUrl("Home"));
        return;
      }
      const deviceData = deviceResults[0];

      const accounts = await with429Retry(() => DeviceLinkedAccount.filter({ device_id: deviceData.id }));

      const [installedDeviceApps, allApps] = await Promise.all([
        with429Retry(() => DeviceApp.filter({ device_id: deviceData.id })),
        with429Retry(() => VRApp.list())
      ]);
      const appById = new Map((allApps || []).map(a => [a.id, a]));

      const installedAppsDetails = [];
      for (const da of installedDeviceApps) {
        const app = appById.get(da.app_id);
        if (app) {
          installedAppsDetails.push(app);
        } else {
          console.warn(`Orphan DeviceApp relation found (device_id=${da.device_id}, app_id=${da.app_id}). Deleting.`);
          await with429Retry(() => DeviceApp.delete(da.id));
        }
      }

      setDevice(deviceData);
      setDeviceAccounts(accounts);
      setDeviceApps(installedAppsDetails);
      setEditGeneralData(deviceData);
      setDisableReason(deviceData.disable_reason || "");
      const platforms = await with429Retry(() => PlatformOption.list());
      setPlatformOptions(platforms || []);
    } catch (error) {
      console.error("Error loading device data:", error);
      navigate(createPageUrl("Home"));
    }
    setIsLoading(false);
  }, [deviceId, navigate]);

  useEffect(() => {
    if (!deviceId) {
      navigate(createPageUrl("Home"));
      return;
    }
    loadDeviceData();
  }, [deviceId, navigate, loadDeviceData]);

  const handleSaveGeneral = async () => {
    await with429Retry(() => VRDevice.update(device.id, editGeneralData));
    setDevice(editGeneralData);
    setIsEditingGeneral(false);
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    await with429Retry(() => DeviceLinkedAccount.create({
      ...newAccountData,
      device_id: device.id
    }));
    setNewAccountData({
      account_type: "",
      email: "",
      username: "",
      password: ""
    });
    setShowAddAccount(false);
    loadDeviceData();
  };

  const handleRemoveApp = (appName) => {
    if (confirm(`האם אתה בטוח שברצונך להסיר את ${appName} מהמשקפת?`)) {
      (async () => {
        try {
          const appToRemove = deviceApps.find(app => app.name === appName);

          if (appToRemove) {
            const deviceAppRecords = await with429Retry(() => DeviceApp.filter({ device_id: device.id, app_id: appToRemove.id }));
            if (deviceAppRecords && deviceAppRecords.length > 0) {
              await with429Retry(() => DeviceApp.delete(deviceAppRecords[0].id));
            }

            const remainingInstallations = await with429Retry(() => DeviceApp.filter({ app_id: appToRemove.id }));
            if (remainingInstallations.length === 0) {
              await with429Retry(() => VRApp.update(appToRemove.id, { is_installed: false }));
            }
            loadDeviceData();
          }
        } catch (error) {
          console.error("Error removing app:", error);
        }
      })();
    }
  };

  const handleDisableDevice = async () => {
    await with429Retry(() => VRDevice.update(device.id, {
      is_disabled: true,
      disable_reason: disableReason,
      status: "מושבת"
    }));
    await loadDeviceData();
    setShowDisableDialog(false);
  };

  const handleEnableDevice = async () => {
    await with429Retry(() => VRDevice.update(device.id, {
      is_disabled: false,
      disable_reason: "",
      status: "זמין"
    }));
    await loadDeviceData();
  };

  if (isLoading) {
    return <div className="p-8 text-center text-lg">טוען נתונים...</div>;
  }

  if (!device) {
    return <div className="p-8 text-center text-lg">מכשיר לא נמצא</div>;
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          {isEditingGeneral ? (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-cyan-900">פרטי משקפת:</h1>
              <Input
                type="number"
                value={editGeneralData.binocular_number || device.binocular_number}
                onChange={(e) => setEditGeneralData({ ...editGeneralData, binocular_number: e.target.value })}
                className="w-24 text-2xl font-bold"
              />
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-cyan-900">פרטי משקפת: {device.binocular_number}</h1>
          )}
          <div className="flex gap-2">
            <Button className="bg-green-600 hover:bg-green-700 gap-2" onClick={() => setShowAddAppsModal(true)}>
              <Plus className="w-4 h-4" />
              הוסף אפליקציה
            </Button>
            <Link to={createPageUrl(`EditHeadset?id=${device.id}`)}>
              <Button variant="outline" className="gap-2">
                ערוך 
              </Button>
            </Link>
            <Link to={createPageUrl(`GeneralInfo`)}>
              <Button variant="outline" className="gap-2">
                חזרה לסקירה <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      <Button size="sm" variant="outline" onClick={() => {setIsEditingGeneral(false); setEditGeneralData(device);}} className="gap-2">
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
                  value={editGeneralData.binocular_number || ''}
                  editing={isEditingGeneral}
                  editValue={editGeneralData.binocular_number || ''}
                  onEdit={(e) => setEditGeneralData({...editGeneralData, binocular_number: e.target.value})}
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
                  value={device.primary_email}
                  editing={isEditingGeneral}
                  editValue={editGeneralData.primary_email || ''}
                  onEdit={(e) => setEditGeneralData({...editGeneralData, primary_email: e.target.value})}
                />
                <div className="flex items-start gap-3">
                  <div className="text-slate-400 mt-1"><Star size={18} /></div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500">דגם</p>
                    {!isEditingGeneral ? (
                      <p className="font-medium">{device.model || 'לא צוין'}</p>
                    ) : (
                      <Select
                        value={editGeneralData.model || ""}
                        onValueChange={(value) => setEditGeneralData({ ...editGeneralData, model: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="בחר דגם" />
                        </SelectTrigger>
                        <SelectContent>
                          {(platformOptions || []).map((opt) => (
                            <SelectItem key={opt.id} value={opt.label || opt.value}>
                              {opt.label || opt.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>סטטוס משקפת</CardTitle>
              </CardHeader>
              <CardContent>
                {device.is_disabled ? (
                  <div className="space-y-3">
                    <Button
                      className="w-full bg-slate-400 hover:bg-slate-500 text-white gap-2"
                      onClick={handleEnableDevice}
                    >
                      <AlertCircle className="w-5 h-5" />
                      מושבת
                    </Button>
                    {device.disable_reason && (
                      <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                        <p className="text-sm text-slate-600 font-medium mb-1">סיבת השבתה:</p>
                        <p className="text-sm text-slate-700">{device.disable_reason}</p>
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
                  <Link to={createPageUrl(`AccountsAndUsers?deviceId=${device.id}`)}>
                    <CardTitle className="cursor-pointer hover:text-cyan-700 flex items-center gap-2">
                      חשבונות מקושרים <ArrowRight className="w-4 h-4" />
                    </CardTitle>
                  </Link>
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

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <AppWindow className="w-6 h-6" />
                  אפליקציות מותקנות ({deviceApps.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deviceApps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {deviceApps.map((app) => (
                      <div key={app.id} className="relative group">
                        <div
                          onClick={() => navigate(createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`))}
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


          </div>
        </div>
      </div>

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
              setDisableReason(device.disable_reason || "");
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

      {device && (
        <AddAppsFromCatalogModal
          open={showAddAppsModal}
          onOpenChange={setShowAddAppsModal}
          device={device}
          installedNames={deviceApps.map(a => a.name)}
          onSaved={() => {
            setShowAddAppsModal(false);
            loadDeviceData();
          }}
        />
      )}
    </div>
  );
}