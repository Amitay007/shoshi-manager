import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GenericEntityForm from "@/components/data/GenericEntityForm";
import { Orbit, AppWindow, Link2, KeyRound, GraduationCap, Tags, Layers, Users, Network, ShoppingCart, ArrowRight, Plus, RefreshCw, Pencil, Trash2, UserCircle, Target, Briefcase, Wrench } from "lucide-react";
import { with429Retry } from "@/components/utils/retry";

import { base44 } from "@/api/base44Client";

const ENTITY_MAP = {
  VRDevice: { sdk: base44.entities.VRDevice, label: "משקפות (VRDevice)", icon: <Orbit className="w-5 h-5" /> },
  VRApp: { sdk: base44.entities.VRApp, label: "אפליקציות (VRApp)", icon: <AppWindow className="w-5 h-5" /> },
  DeviceApp: { sdk: base44.entities.DeviceApp, label: "שיוך משקפות-אפליקציות (DeviceApp)", icon: <Link2 className="w-5 h-5" /> },
  DeviceLinkedAccount: { sdk: base44.entities.DeviceLinkedAccount, label: "חשבונות מקושרים (DeviceLinkedAccount)", icon: <KeyRound className="w-5 h-5" /> },
  EducationInstitution: { sdk: base44.entities.EducationInstitution, label: "מוסדות חינוך (EducationInstitution)", icon: <GraduationCap className="w-5 h-5" /> },
  Teacher: { sdk: base44.entities.Teacher, label: "מורים (Teacher)", icon: <UserCircle className="w-5 h-5" /> },
  GenreOption: { sdk: base44.entities.GenreOption, label: "אפשרויות ז'אנר (GenreOption)", icon: <Tags className="w-5 h-5" /> },
  EducationFieldOption: { sdk: base44.entities.EducationFieldOption, label: "אפשרויות תחום חינוכי", icon: <GraduationCap className="w-5 h-5" /> },
  PlatformOption: { sdk: base44.entities.PlatformOption, label: "אפשרויות פלטפורמה", icon: <Layers className="w-5 h-5" /> },
  PlayerCountOption: { sdk: base44.entities.PlayerCountOption, label: "אפשרויות מספר שחקנים", icon: <Users className="w-5 h-5" /> },
  InternetRequirementOption: { sdk: base44.entities.InternetRequirementOption, label: "אפשרויות אינטרנט", icon: <Network className="w-5 h-5" /> },
  PurchaseTypeOption: { sdk: base44.entities.PurchaseTypeOption, label: "אפשרויות סוג רכישה", icon: <ShoppingCart className="w-5 h-5" /> },
  TargetAudienceOption: { sdk: base44.entities.TargetAudienceOption, label: "קהל יעד", icon: <Target className="w-5 h-5 text-purple-700" /> },
  ActivityTypeOption: { sdk: base44.entities.ActivityTypeOption, label: "סוג פעילות", icon: <Briefcase className="w-5 h-5 text-purple-700" /> },
  TechnologyToolOption: { sdk: base44.entities.TechnologyToolOption, label: "כלים טכנולוגיים", icon: <Wrench className="w-5 h-5 text-purple-700" /> }
};

export default function DataRepositoryList() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const entityKey = urlParams.get("entity") || "";
  const config = ENTITY_MAP[entityKey];

  const [schema, setSchema] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [filtered, setFiltered] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  React.useEffect(() => {
    if (!config) return;
    const load = async () => {
      setLoading(true);
      let sch = null;
      try {
        // Try SDK first if available
        if (typeof config.sdk.schema === 'function') {
           sch = await with429Retry(() => config.sdk.schema());
        }
      } catch (e) {
        console.warn("SDK schema fetch failed", e);
      }

      // Fallback to backend function if SDK failed or method missing
      if (!sch) {
        try {
           const res = await base44.functions.invoke('getEntitySchema', { entityName: entityKey });
           sch = res.data || res; // Handle different response structures
        } catch (e) {
           console.error("Backend schema fetch failed", e);
        }
      }

      // fallback: in case schema is missing, avoid crash
      setSchema(sch || { properties: {} });

      try {
          const list = await with429Retry(() => config.sdk.list());
          setItems(list);
          setFiltered(list);
      } catch (e) {
          console.error("List fetch failed", e);
          setItems([]);
          setFiltered([]);
      }
      setLoading(false);
    };
    load();
  }, [entityKey]);  

  React.useEffect(() => {
    const term = q.trim().toLowerCase();
    if (!term) {
      setFiltered(items);
      return;
    }
    setFiltered(
      items.filter((it) => JSON.stringify(it).toLowerCase().includes(term))
    );
  }, [q, items]);

  // Moved before any conditional return to satisfy Rules of Hooks
  const columns = React.useMemo(() => {
    const keys = Object.keys(schema?.properties || {});
    // Pick up to first 5 columns for table preview
    return keys.slice(0, 5);
  }, [schema]);

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
        <div className="max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>ישות לא נמצאה</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate(createPageUrl("DataRepositories"))}>
                חזרה למאגרי מידע
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const refresh = async () => {
    const list = await with429Retry(() => config.sdk.list());
    setItems(list);
    const term = q.trim().toLowerCase();
    setFiltered(term ? list.filter((it) => JSON.stringify(it).toLowerCase().includes(term)) : list);
  };

  const handleCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    // Remove built-in fields to avoid accidental edits in form
    const { id, created_date, updated_date, created_by, ...rest } = item;
    setEditing({ id: item.id, data: rest });
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (!confirm("האם למחוק את הרשומה?")) return;
    await with429Retry(() => config.sdk.delete(item.id));
    await refresh();
  };

  const submitForm = async (data) => {
    setSaving(true);
    try {
      if (editing?.id) {
        await with429Retry(() => config.sdk.update(editing.id, data));
      } else {
        await with429Retry(() => config.sdk.create(data));
      }
      setShowForm(false);
      setEditing(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const isSyllabusValue = ["TargetAudienceOption", "ActivityTypeOption", "TechnologyToolOption"].includes(entityKey);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-cyan-900 flex items-center gap-2">
            {config.icon}
            {config.label}
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(createPageUrl("DataRepositories"))} className="gap-2">
              חזרה <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={refresh} className="gap-2">
              רענן <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={handleCreate} className="bg-cyan-600 hover:bg-cyan-700 gap-2">
              <Plus className="w-4 h-4" />
              רשומה חדשה
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Input
                placeholder="חיפוש חופשי בכל השדות..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full md:w-72"
              />
              <div className="text-sm text-slate-500">{loading ? "טוען..." : `נמצאו ${filtered.length} רשומות`}</div>
            </div>

            <div className="w-full overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-right text-slate-600">
                    <th className="p-2">#</th>
                    {columns.map((c) => (
                      <th key={c} className="p-2">{c}</th>
                    ))}
                    <th className="p-2">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it, idx) => (
                    <tr key={it.id} className="border-t">
                      <td className="p-2">{idx + 1}</td>
                      {columns.map((c) => {
                        const v = it[c];
                        let display = v;
                        if (Array.isArray(v)) {
                          display = v.length > 0 ? JSON.stringify(v).slice(0, 60) + (JSON.stringify(v).length > 60 ? "…" : "") : "[]";
                        } else if (v && typeof v === "object") {
                          const s = JSON.stringify(v);
                          display = s.slice(0, 60) + (s.length > 60 ? "…" : "");
                        } else if (typeof v === "boolean") {
                          display = v ? "כן" : "לא";
                        }
                        return <td key={c} className="p-2 align-top">{display ?? ""}</td>;
                      })}
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => handleEdit(it)}>
                            <Pencil className="w-4 h-4" /> ערוך
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDelete(it)}>
                            <Trash2 className="w-4 h-4" /> מחק
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={columns.length + 2} className="p-6 text-center text-slate-500">
                        לא נמצאו רשומות.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {showForm && (
          <Card className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-3xl">
              <CardHeader>
                <CardTitle>{editing ? "עריכת רשומה" : "רשומה חדשה"}</CardTitle>
              </CardHeader>
              <CardContent>
                <GenericEntityForm
                  schema={schema}
                  initialData={editing?.data || {} /* Ensure initialData is always an object */}
                  onSubmit={submitForm}
                  onCancel={() => { setShowForm(false); setEditing(null); }}
                  disabled={saving}
                />
              </CardContent>
            </Card>
          </Card>
        )}
      </div>
    </div>
  );
}