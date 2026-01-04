import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, ChevronDown } from "lucide-react";

const AUDIENCE = ["יסודי","חטיבת ביניים","תיכון","חינוך מיוחד","צוות חינוכי"];
const CONTENT = ["מדעים/רפואה","טכנולוגיה/VR/AR","אמנות דיגיטלית/רחוב","שורשים/היסטוריה/חברה","אסטרטגיות למידה","יזמות/עיצוב"];
const ACTIVITY = ["קורס שנתי","קורס חצי שנתי","שיעור חד-פעמי","יום שיא","חשיפה VR","עבודת חקר"];
const TOOLS = ["VR","AR","Wix"];
const PURPOSES = ["יישום","יצירה","שיתוף פעולה","פיתוח רגשי/חברתי","חקר וחשיבה ביקורתית"];

export default function ProgramsFilterBar({ allPrograms, schools, instPrograms, onChange }) {
  const [search, setSearch] = React.useState("");
  const [selectedAudience, setSelectedAudience] = React.useState([]);
  const [selectedContent, setSelectedContent] = React.useState([]);
  const [selectedActivity, setSelectedActivity] = React.useState([]);
  const [selectedTools, setSelectedTools] = React.useState([]);
  const [selectedPurposes, setSelectedPurposes] = React.useState([]);

  React.useEffect(() => {
    if (onChange) {
      onChange({
        search,
        target_audiences: selectedAudience,
        content_areas: selectedContent,
        activity_types: selectedActivity,
        technology_tools: selectedTools,
        purposes: selectedPurposes
      });
    }
  }, [search, selectedAudience, selectedContent, selectedActivity, selectedTools, selectedPurposes]);  

  const ToggleGroup = ({ label, options, selected, setSelected }) => {
    const toggle = (opt) =>
      setSelected(prev => (prev || []).includes(opt) ? (prev || []).filter(v => v !== opt) : [...(prev || []), opt]);
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            {label} <ChevronDown className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" dir="rtl">
          <div className="space-y-2 max-h-72 overflow-auto">
            {(options || []).map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={(selected || []).includes(opt)} onCheckedChange={() => toggle(opt)} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="w-full bg-white border rounded-lg p-3 flex flex-wrap items-center gap-3">
      <div className="relative">
        <Input
          placeholder="חיפוש טקסט..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10 w-56"
        />
        <Filter className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <ToggleGroup label="קהל יעד" options={AUDIENCE} selected={selectedAudience} setSelected={setSelectedAudience} />
      <ToggleGroup label="תחום דעת/נושא" options={CONTENT} selected={selectedContent} setSelected={setSelectedContent} />
      <ToggleGroup label="סוג פעילות" options={ACTIVITY} selected={selectedActivity} setSelected={setSelectedActivity} />
      <ToggleGroup label="כלים טכנולוגיים" options={TOOLS} selected={selectedTools} setSelected={setSelectedTools} />
      <ToggleGroup label="מטרות חינוכיות" options={PURPOSES} selected={selectedPurposes} setSelected={setSelectedPurposes} />

      <div className="flex flex-wrap gap-2">
        {(selectedAudience || []).map(v => <span key={`a-${v}`} className="text-xs px-2 py-1 bg-cyan-50 text-cyan-700 rounded">{v}</span>)}
        {(selectedContent || []).map(v => <span key={`c-${v}`} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded">{v}</span>)}
        {(selectedActivity || []).map(v => <span key={`t-${v}`} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">{v}</span>)}
        {(selectedTools || []).map(v => <span key={`p-${v}`} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded">{v}</span>)}
        {(selectedPurposes || []).map(v => <span key={`u-${v}`} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">{v}</span>)}
      </div>
    </div>
  );
}