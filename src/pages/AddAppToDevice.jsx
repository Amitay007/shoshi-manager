
import React, { useState, useEffect, useCallback } from "react";
import { VRDevice } from "@/entities/VRDevice";
import { VRApp } from "@/entities/VRApp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Plus, AppWindow, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DeviceApp } from "@/entities/DeviceApp"; // NEW: Import DeviceApp

export default function AddAppToDevice() {
  const [device, setDevice] = useState(null);
  const [availableApps, setAvailableApps] = useState([]); // list of app objects with name and ID for creation
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingApps, setAddingApps] = useState({}); // Stores state of app being added (using app.name as key for consistency with UI)
  const [installCountsByAppId, setInstallCountsByAppId] = useState({}); // New state to store installation counts for each app, keyed by app.id

  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const binocularNumber = parseInt(urlParams.get('binocular_number'));

  // 429 retry helper
  const sleep = (ms) => new Promise(res => setTimeout(res, ms));
  const with429Retry = useCallback(async (fn, retries = 2, backoffMs = 600) => {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err?.message || "");
      if (retries > 0 && (msg.includes("429") || msg.toLowerCase().includes("rate limit"))) {
        console.warn(`Rate limit hit, retrying in ${backoffMs}ms... (Retries left: ${retries})`);
        await sleep(backoffMs);
        return with429Retry(fn, retries - 1, backoffMs * 1.5);
      }
      throw err;
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Find device by binocular number
      const allDevices = await with429Retry(() => VRDevice.list());
      const deviceData = allDevices.find(d => Number(d.binocular_number) === Number(binocularNumber));
      
      if (!deviceData) {
        navigate(createPageUrl("Home"));
        return;
      }

      // Get ALL apps from VRApp and ALL DeviceApp mappings in parallel
      const [allApps, allDeviceApps] = await Promise.all([
        with429Retry(() => VRApp.list()),
        with429Retry(() => DeviceApp.list())
      ]);

      // Determine apps currently installed on THIS device
      const installedAppIds = new Set(
        (allDeviceApps || [])
          .filter(da => da.device_id === deviceData.id) // Use device_id from DeviceApp entity
          .map(da => da.app_id) // Use app_id from DeviceApp entity
      );

      // Calculate installation counts for ALL apps across ALL devices
      const counts = {};
      (allDeviceApps || []).forEach(da => {
        // Counts are now stored by app_id
        counts[da.app_id] = (counts[da.app_id] || 0) + 1;
      });
      setInstallCountsByAppId(counts); // Update the new state variable

      // Filter allApps to get only those NOT installed on this device
      const appsNotInstalled = (allApps || [])
        .filter(app => !installedAppIds.has(app.id));
        // No need to map if allApps already contains {id, name} objects

      setDevice(deviceData);
      setAvailableApps(appsNotInstalled);
    } catch (error) {
      console.error("Error loading data:", error);
      navigate(createPageUrl("Home"));
    }
    setIsLoading(false);
  }, [binocularNumber, navigate, with429Retry]); // Add with429Retry to dependencies

  useEffect(() => {
    if (!binocularNumber) {
      navigate(createPageUrl("Home"));
      return;
    }
    loadData();
  }, [binocularNumber, loadData, navigate]);

  const handleAddApp = async (appId, appName) => { // Now accepts appId and appName
    setAddingApps(prev => ({ ...prev, [appName]: true })); // Keyed by appName as per existing logic

    try {
      if (!device || !device.id) {
        throw new Error("Device ID is missing.");
      }
      if (!appId) {
        throw new Error("App ID is missing.");
      }

      // Check if the DeviceApp mapping already exists to prevent duplicates
      const existingMapping = await with429Retry(() => DeviceApp.filter({ device_id: device.id, app_id: appId })); // Use device_id and app_id
      if (existingMapping.length === 0) {
        // Create a new DeviceApp mapping
        await with429Retry(() => DeviceApp.create({ device_id: device.id, app_id: appId })); // Use device_id and app_id
      }

      // Update VRApp's is_installed status (if it implies 'installed on at least one device')
      const appToUpdate = await with429Retry(() => VRApp.find(appId));
      if (appToUpdate && !appToUpdate.is_installed) { 
        await with429Retry(() => VRApp.update(appId, { is_installed: true }));
      }
      
      // Re-load data to update the available apps list and counts
      await loadData();
      
    } catch (error) { 
      console.error("Error adding app:", error);
    }
    
    setAddingApps(prev => ({ ...prev, [appName]: false })); // Keyed by appName
  };

  const filteredApps = availableApps.filter(app => // Filter by app.name
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-8 text-center text-lg">טוען נתונים...</div>;
  }

  if (!device) {
    return <div className="p-8 text-center text-lg">משקפת לא נמצאה</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-cyan-900">הוספת אפליקציות למשקפת {device.binocular_number}</h1>
          <Link to={createPageUrl(`DeviceInfo?id=${device.id}`)}>
            <Button variant="outline" className="gap-2">
              חזרה לפרטי משקפת <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">חיפוש אפליקציות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="חיפוש אפליקציה..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <AppWindow className="w-6 h-6 text-cyan-600" />
              אפליקציות זמינות להתקנה ({filteredApps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredApps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredApps.map(app => ( // Iterate over app objects now
                  <div key={app.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                    <div>
                      <h3 className="font-semibold text-slate-800">{app.name}</h3>
                      <p className="text-sm text-slate-500">
                        מותקן על {installCountsByAppId[app.id] || 0} משקפות {/* Use installCountsByAppId with app.id */}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleAddApp(app.id, app.name)} // Pass app.id and app.name
                      disabled={addingApps[app.name]} // Use app.name for disabled state
                      className="bg-green-600 hover:bg-green-700 gap-2"
                      size="sm"
                    >
                      {addingApps[app.name] ? (
                        "מוסיף..."
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          הוסף
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                {availableApps.length === 0 ? (
                  <div>
                    <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">כל האפליקציות כבר מותקנות!</p>
                    <p>כל האפליקציות הזמינות במערכת כבר מותקנות על משקפת זו.</p>
                  </div>
                ) : (
                  <p>לא נמצאו אפליקציות התואמות לחיפוש.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
