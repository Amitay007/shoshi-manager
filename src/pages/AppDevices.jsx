
import React, { useState, useEffect, useCallback } from "react";
import { VRApp, DeviceApp, VRDevice } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { with429Retry } from "@/components/utils/retry";

export default function AppDevices() {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const appName = urlParams.get('appName');
  const count = urlParams.get('count');

  const loadDevicesWithApp = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get the app by name
      const apps = await with429Retry(() => VRApp.filter({ name: appName }));
      if (apps.length === 0) {
        navigate(createPageUrl("Home"));
        return;
      }
      
      const app = apps[0];
      
      // Get all device-app relations for this app
      const deviceApps = await with429Retry(() => DeviceApp.filter({ app_id: app.id }));
      
      // Get device details for each device that has this app
      const allDevices = await with429Retry(() => VRDevice.list());
      const devicesWithApp = allDevices.filter(device => 
        deviceApps.some(da => da.device_id === device.id)
      );
      
      setDevices(devicesWithApp);
    } catch (error) {
      console.error("Error loading devices:", error);
    }
    setIsLoading(false);
  }, [appName, navigate]); // Added navigate to useCallback dependencies

  useEffect(() => {
    if (!appName) {
      navigate(createPageUrl("Home"));
      return;
    }
    loadDevicesWithApp();
  }, [appName, loadDevicesWithApp, navigate]); // Added loadDevicesWithApp and navigate to useEffect dependencies

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-lg text-slate-600">טוען נתונים...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate(-1)}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{appName}</h1>
            <p className="text-slate-600">מותקן על {count} מכשירים</p>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-blue-600" />
              מכשירים עם האפליקציה הזו
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devices.length > 0 ? (
              <div className="space-y-3">
                {devices.map(device => (
                  <div key={device.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-slate-800">{device.device_name}</h3>
                      <p className="text-slate-600">מספר משקפת: {device.binocular_number}</p>
                    </div>
                    <div className="text-left text-slate-600">
                      <p>{device.model}</p>
                      <p className="text-sm">{device.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>לא נמצאו מכשירים עם האפליקציה הזו</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
