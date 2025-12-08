import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Filter, Wifi, WifiOff, ShoppingCart } from "lucide-react";
import { GenreOption } from "@/entities/GenreOption";
import { EducationFieldOption } from "@/entities/EducationFieldOption";
import { PlatformOption } from "@/entities/PlatformOption";
import { PlayerCountOption } from "@/entities/PlayerCountOption";
import { InternetRequirementOption } from "@/entities/InternetRequirementOption";
import { PurchaseTypeOption } from "@/entities/PurchaseTypeOption";
import { with429Retry } from "@/components/utils/retry";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export default function AppFilterBar({ allApps = [], onChange }) {
  const [search, setSearch] = useState("");
  const [genres, setGenres] = useState([]);
  const [educationFields, setEducationFields] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [playersCount, setPlayersCount] = useState(null);
  const [internetRequired, setInternetRequired] = useState(null);
  const [handTracking, setHandTracking] = useState(null);
  const [purchaseTypes, setPurchaseTypes] = useState([]);

  const [genreOpts, setGenreOpts] = useState([]);
  const [eduOpts, setEduOpts] = useState([]);
  const [platformOpts, setPlatformOpts] = useState([]);
  const [playersOpts, setPlayersOpts] = useState([]);
  const [internetOpts, setInternetOpts] = useState([]);
  const [purchaseTypeOpts, setPurchaseTypeOpts] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        // Load options sequentially with delays to avoid rate limiting
        const g = await with429Retry(() => GenreOption.list()).catch(() => []);
        await sleep(500);
        
        const e = await with429Retry(() => EducationFieldOption.list()).catch(() => []);
        await sleep(500);
        
        const p = await with429Retry(() => PlatformOption.list()).catch(() => []);
        await sleep(500);
        
        const pc = await with429Retry(() => PlayerCountOption.list()).catch(() => []);
        await sleep(500);
        
        const net = await with429Retry(() => InternetRequirementOption.list()).catch(() => []);
        await sleep(500);
        
        const pt = await with429Retry(() => PurchaseTypeOption.list()).catch(() => []);

        const uniqueFromApps = (getter) => Array.from(new Set(allApps.flatMap(getter).filter(Boolean)));

        // Use labels as values to avoid duplicates
        setGenreOpts((g || []).filter(o => o.active !== false).map(o => o.label || o.value).length
          ? (g || []).filter(o => o.active !== false).map(o => ({ value: o.label || o.value, label: o.label || o.value }))
          : uniqueFromApps(a => a.genre || []).map(v => ({ value: v, label: v })));

        setEduOpts((e || []).filter(o => o.active !== false).map(o => o.label || o.value).length
          ? (e || []).filter(o => o.active !== false).map(o => ({ value: o.label || o.value, label: o.label || o.value }))
          : uniqueFromApps(a => a.education_field || []).map(v => ({ value: v, label: v })));

        setPlatformOpts((p || []).filter(o => o.active !== false).map(o => o.label || o.value).length
          ? (p || []).filter(o => o.active !== false).map(o => ({ value: o.label || o.value, label: o.label || o.value }))
          : uniqueFromApps(a => a.supported_platforms || []).map(v => ({ value: v, label: v })));

        const pcList = (pc || []).filter(o => o.active !== false).sort((a,b) => (a.order||0) - (b.order||0));
        setPlayersOpts(pcList.length
          ? pcList.map(o => ({ value: o.value, label: o.label || o.value }))
          : [
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
              { value: "4", label: "4" },
              { value: "5", label: "5+" },
              { value: "∞", label: "∞" },
            ]);

        setInternetOpts((net || []).filter(o => o.active !== false).length
          ? (net || []).filter(o => o.active !== false).map(o => ({ value: o.value, label: o.label }))
          : [
              { value: "all", label: "הכל" },
              { value: "yes", label: "דורש אינטרנט" },
              { value: "no", label: "לא דורש אינטרנט" },
            ]);

        setPurchaseTypeOpts((pt || []).filter(o => o.active !== false).length
          ? (pt || []).filter(o => o.active !== false).map(o => ({ value: o.value, label: o.label || o.value }))
          : [
              { value: "subscription", label: "מנוי" },
              { value: "free", label: "חינם" },
              { value: "one_time", label: "חד פעמי" },
              { value: "app_purchase", label: "רכישה בחנות" },
              { value: "other", label: "אחר" },
            ]);
      } catch (error) {
        console.error("Error loading filter options:", error);
      }
    };
    load();
  }, [allApps]);

  useEffect(() => {
    onChange?.({
      search,
      genres,
      education_fields: educationFields,
      platforms,
      players_count: playersCount,
      internet_required: internetRequired,
      hand_tracking: handTracking,
      purchase_types: purchaseTypes,
    });
  }, [search, genres, educationFields, platforms, playersCount, internetRequired, handTracking, purchaseTypes, onChange]);

  const toggle = (list, setList, value) => {
    setList(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  return (
    <div className="w-full bg-white border rounded-lg p-3" dir="rtl">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Input
            placeholder="חפש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 w-32"
          />
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-sm">
              ז'אנר <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2 max-h-64 overflow-auto">
              {genreOpts.map(opt => (
                <label key={opt.value} className="flex items-center gap-2">
                  <Checkbox checked={genres.includes(opt.value)} onCheckedChange={() => toggle(genres, setGenres, opt.value)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-sm">
              תחום חינוכי <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2 max-h-64 overflow-auto">
              {eduOpts.map(opt => (
                <label key={opt.value} className="flex items-center gap-2">
                  <Checkbox checked={educationFields.includes(opt.value)} onCheckedChange={() => toggle(educationFields, setEducationFields, opt.value)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-sm">
              פלטפורמות <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2 max-h-64 overflow-auto">
              {platformOpts.map(opt => (
                <label key={opt.value} className="flex items-center gap-2">
                  <Checkbox checked={platforms.includes(opt.value)} onCheckedChange={() => toggle(platforms, setPlatforms, opt.value)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-sm">
              מספר שחקנים <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <Checkbox checked={!playersCount} onCheckedChange={() => setPlayersCount(null)} />
                הכל
              </label>
              {playersOpts.map(opt => (
                <label key={opt.value} className="flex items-center gap-2">
                  <Checkbox checked={playersCount === opt.value} onCheckedChange={() => setPlayersCount(opt.value)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-sm">
              אינטרנט <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <Checkbox checked={internetRequired === null} onCheckedChange={() => setInternetRequired(null)} />
                הכל
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={internetRequired === true} onCheckedChange={() => setInternetRequired(true)} />
                <span className="inline-flex items-center gap-1"><Wifi className="w-4 h-4" /> דורש אינטרנט</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={internetRequired === false} onCheckedChange={() => setInternetRequired(false)} />
                <span className="inline-flex items-center gap-1"><WifiOff className="w-4 h-4" /> לא דורש אינטרנט</span>
              </label>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-sm">
              Hand Tracking <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <Checkbox checked={handTracking === null} onCheckedChange={() => setHandTracking(null)} />
                הכל
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={handTracking === true} onCheckedChange={() => setHandTracking(true)} />
                תומך ב-Hand Tracking
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={handTracking === false} onCheckedChange={() => setHandTracking(false)} />
                לא תומך ב-Hand Tracking
              </label>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-sm">
              סוג רכישה <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2 max-h-64 overflow-auto">
              {purchaseTypeOpts.map(opt => (
                <label key={opt.value} className="flex items-center gap-2">
                  <Checkbox checked={purchaseTypes.includes(opt.value)} onCheckedChange={() => toggle(purchaseTypes, setPurchaseTypes, opt.value)} />
                  <span className="inline-flex items-center gap-1"><ShoppingCart className="w-4 h-4" /> {opt.label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Selected badges summary */}
        {(genres.length > 0 || educationFields.length > 0 || platforms.length > 0 || playersCount || internetRequired !== null || handTracking !== null || purchaseTypes.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {genres.map(g => <Badge key={`g-${g}`} variant="secondary" className="text-xs">{g}</Badge>)}
            {educationFields.map(e => <Badge key={`e-${e}`} variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">{e}</Badge>)}
            {platforms.map(p => <Badge key={`p-${p}`} variant="secondary" className="text-xs">{p}</Badge>)}
            {playersCount && <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs">שחקנים: {playersCount}</Badge>}
            {internetRequired !== null && <Badge variant="secondary" className="bg-cyan-50 text-cyan-700 text-xs">{internetRequired ? "דורש אינטרנט" : "לא דורש אינטרנט"}</Badge>}
            {handTracking !== null && <Badge variant="secondary" className="bg-purple-50 text-purple-700 text-xs">{handTracking ? "Hand Tracking" : "ללא Hand Tracking"}</Badge>}
            {purchaseTypes.map(t => {
              const opt = purchaseTypeOpts.find(o => o.value === t);
              return <Badge key={`t-${t}`} variant="secondary" className="text-xs">{opt?.label || t}</Badge>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}