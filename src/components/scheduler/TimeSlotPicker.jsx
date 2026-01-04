import React from "react";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function TimeSlotPicker({ startTime, duration, onStartTimeChange, onDurationChange }) {
  const durations = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8];

  const calculateEndTime = () => {
    if (!startTime || !duration) return "";
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + (duration * 60);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-cyan-600" />
        <h3 className="font-semibold">שעת פעילות</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="start-time">שעת התחלה (00:00 - 23:59)</Label>
          <Input
            id="start-time"
            type="text"
            value={startTime}
            onChange={(e) => {
              let val = e.target.value.replace(/[^\d:]/g, '');
              if (val.length === 2 && !val.includes(':')) val += ':';
              if (val.length <= 5) {
                const parts = val.split(':');
                if (parts[0] && parseInt(parts[0]) > 23) parts[0] = '23';
                if (parts[1] && parseInt(parts[1]) > 59) parts[1] = '59';
                onStartTimeChange(parts.join(':'));
              }
            }}
            placeholder="09:00"
            maxLength={5}
            className="text-lg font-mono"
            dir="ltr"
          />
          <p className="text-xs text-slate-500 mt-1">הקלד שעה בפורמט 24 שעות (לדוגמה: 14:30)</p>
        </div>

        <div>
          <Label>משך זמן (שעות)</Label>
          <div className="grid grid-cols-6 gap-2">
            {durations.map(dur => (
              <button
                key={dur}
                type="button"
                onClick={() => onDurationChange(dur)}
                className={`p-2 rounded-lg border-2 transition-all text-sm font-medium ${
                  duration === dur
                    ? "bg-cyan-600 text-white border-cyan-600"
                    : "border-slate-200 hover:border-cyan-400 bg-white"
                }`}
              >
                {dur}
              </button>
            ))}
          </div>
        </div>

        {startTime && duration && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">התחלה:</span>
              <span className="font-bold text-lg font-mono" dir="ltr">{startTime}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-600">סיום:</span>
              <span className="font-bold text-lg font-mono" dir="ltr">{calculateEndTime()}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}