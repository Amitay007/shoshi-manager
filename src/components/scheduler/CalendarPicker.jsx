import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { he } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function CalendarPicker({ selectedDates = [], onDatesSelect, multiSelect = false }) {
  const [currentMonth, setCurrentMonth] = useState(
    selectedDates && selectedDates.length > 0 ? new Date(selectedDates[0]) : new Date()
  );

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    const startWeekday = start.getDay();
    const emptySlots = Array(startWeekday).fill(null);
    
    return [...emptySlots, ...days];
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDayClick = (day) => {
    if (!day) return;
    
    if (!multiSelect) {
      onDatesSelect([day]);
      return;
    }
    
    // Multi-select mode
    const isSelected = selectedDates.some(d => isSameDay(d, day));
    
    if (isSelected) {
      // Remove date
      onDatesSelect(selectedDates.filter(d => !isSameDay(d, day)));
    } else {
      // Add date
      onDatesSelect([...selectedDates, day]);
    }
  };

  const removeDate = (dateToRemove) => {
    onDatesSelect(selectedDates.filter(d => !isSameDay(d, dateToRemove)));
  };

  const clearAll = () => {
    onDatesSelect([]);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
          <ChevronRight className="w-5 h-5" />
        </Button>
        <h3 className="font-semibold text-lg">
          {format(currentMonth, 'MMMM yyyy', { locale: he })}
        </h3>
        <Button variant="ghost" size="icon" onClick={handleNextMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day, idx) => (
          <div key={idx} className="text-center text-sm font-medium text-slate-600 pb-2">
            {day}
          </div>
        ))}

        {monthDays.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const isSelected = selectedDates.some(d => isSameDay(d, day));
          const isTodayDay = isToday(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <button
              key={idx}
              onClick={() => handleDayClick(day)}
              disabled={!isCurrentMonth}
              className={`aspect-square rounded-lg border-2 transition-all text-center p-2 ${
                !isCurrentMonth
                  ? "opacity-30 cursor-not-allowed border-slate-100"
                  : isSelected
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : isTodayDay
                  ? "border-cyan-400 bg-cyan-50 text-cyan-700"
                  : "border-slate-200 hover:border-cyan-400 bg-white"
              }`}
            >
              <div className="text-sm font-semibold">{format(day, 'd')}</div>
            </button>
          );
        })}
      </div>

      {/* Selected dates display */}
      {multiSelect && selectedDates.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">
              תאריכים נבחרים ({selectedDates.length})
            </span>
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
              נקה הכל
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedDates
              .sort((a, b) => a - b)
              .map((date, idx) => (
                <Badge
                  key={idx}
                  className="bg-cyan-100 text-cyan-800 gap-1 pr-2 pl-1"
                >
                  {format(date, 'dd/MM/yyyy')}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDate(date);
                    }}
                    className="hover:bg-cyan-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}