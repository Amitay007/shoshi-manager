
import React, { useState, useEffect, useCallback } from "react";
import { VRDevice } from "@/entities/VRDevice";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Orbit, KeyRound } from "lucide-react";
import { with429Retry } from "@/components/utils/retry";

export default function DeviceMenu() {
  const [device, setDevice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deviceId = searchParams.get("id");

  const loadDevice = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const deviceData = await with429Retry(() => VRDevice.get(deviceId));
      if (!deviceData) {
        setError("לא נמצאו נתונים עבור המכשיר");
        return;
      }
      setDevice(deviceData);
    } catch (err) {
      console.error("Error loading device:", err);
      setError("אירעה שגיאה בטעינת נתוני המכשיר");
    }
    setIsLoading(false);
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) {
      navigate(createPageUrl("Home"));
      return;
    }
    loadDevice();
  }, [deviceId, loadDevice, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        טוען...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <p className="text-red-600 text-xl font-semibold">{error}</p>
        <Button onClick={() => navigate(createPageUrl("Home"))}>
          חזור לדף הבית
        </Button>
      </div>
    );
  }

  const NavButton = ({ to, children, icon }) => (
    <Link to={to} className="w-full sm:w-64">
      <Button
        variant="outline"
        className="w-full h-28 text-xl bg-white border-slate-200 hover:bg-slate-100 hover:border-cyan-600 shadow-sm transition-all duration-300 flex flex-col gap-2 items-center justify-center text-cyan-800 hover:text-cyan-900 rounded-xl"
      >
        {icon}
        {children}
      </Button>
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir="rtl">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-cyan-900">
          מכשיר מספר {device?.binocular_number || "לא ידוע"}
        </h1>
        <p className="text-slate-500 mt-2">בחר את הפעולה הרצויה</p>
      </div>
      <div className="flex flex-col sm:flex-row flex-wrap gap-8 justify-center">
        <NavButton to={createPageUrl(`DeviceInfo?id=${deviceId}`)} icon={<Orbit className="w-8 h-8" />}>
          מידע כללי
        </NavButton>
        <NavButton to={createPageUrl(`ExistingAccounts?id=${deviceId}`)} icon={<KeyRound className="w-8 h-8" />}>
          חשבונות קיימים
        </NavButton>
      </div>
    </div>
  );
}
