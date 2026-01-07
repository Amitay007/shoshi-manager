import React from "react";
import { Syllabus } from "@/entities/Syllabus";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { VRApp } from "@/entities/VRApp";
import { CourseTopicOption } from "@/entities/CourseTopicOption";
import { SubjectOption } from "@/entities/SubjectOption";
import { Teacher } from "@/entities/Teacher";
import { TargetAudienceOption } from "@/entities/TargetAudienceOption";
import { ActivityTypeOption } from "@/entities/ActivityTypeOption";
// Removed ContentAreaOption and EducationalPurposeOption imports
import { TechnologyToolOption } from "@/entities/TechnologyToolOption";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Save, Printer, FileText, Trash2, Home, ArrowRight, Pencil, ExternalLink } from "lucide-react";
import { with429Retry } from "@/components/utils/retry";
import { createPageUrl } from "@/utils";
import { Link, useNavigate } from "react-router-dom";
import LinkInput from "@/components/syllabus/LinkInput";
import { Checkbox } from "@/components/ui/checkbox";

export default function SyllabusWizard() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const syllabusIdParam = urlParams.get("id") || urlParams.get("syllabusId") || null;
  const viewOnly = urlParams.get("viewOnly") === "true";

  const [saving, setSaving] = React.useState(false);
  const [printOpen, setPrintOpen] = React.useState(false);

  const [schools, setSchools] = React.useState([]);
  const [apps, setApps] = React.useState([]);
  const [topics, setTopics] = React.useState([]);
  const [subjects, setSubjects] = React.useState([]);
  const [teachers, setTeachers] = React.useState([]);

  // New state for option entities (removed contentAreaOptions and purposeOptions)
  const [targetAudienceOptions, setTargetAudienceOptions] = React.useState([]);
  const [activityTypeOptions, setActivityTypeOptions] = React.useState([]);
  const [technologyToolOptions, setTechnologyToolOptions] = React.useState([]);

  const [data, setData] = React.useState({
    title: "",
    school_id: "",
    teacher_name: "",
    classes_text: [],
    notes: "",
    meetings_count: 0,
    course_topic: "",
    subject: "",
    target_audience: [],
    content_areas: "", // Changed from array to string
    activity_type: "",
    technology_tools: [],
    purposes: "", // Changed from array to string
    gift_knowledge: "",
    gift_skill: "",
    gift_understanding: "",
    final_product: "",
    submission_method: "",
    assessment_method: "",
    rubric: "",
    preparations: [],
    enrichment_materials: [],
    teaching_materials: [],
    sessions: [],
    status: "draft",
    active: true
  });

  React.useEffect(() => {
    const load = async () => {
      try {
        // Removed caOpts, pOpts from Promise.all and destructuring
        const [sch, ap, tp, sb, tc, taOpts, atOpts, ttOpts] = await Promise.all([
          with429Retry(() => EducationInstitution.list()).catch(() => []),
          with429Retry(() => VRApp.list()).catch(() => []),
          with429Retry(() => CourseTopicOption.list()).catch(() => []),
          with429Retry(() => SubjectOption.list()).catch(() => []),
          with429Retry(() => Teacher.list()).catch(() => []),
          with429Retry(() => TargetAudienceOption.list()).catch(() => []),
          with429Retry(() => ActivityTypeOption.list()).catch(() => []),
          with429Retry(() => TechnologyToolOption.list()).catch(() => []),
        ]);
        setSchools(sch || []);
        setApps(ap || []);
        setTopics(tp || []);
        setSubjects(sb || []);
        setTeachers(tc || []);
        setTargetAudienceOptions(taOpts || []);
        setActivityTypeOptions(atOpts || []);
        // Removed setContentAreaOptions and setPurposeOptions
        setTechnologyToolOptions(ttOpts || []);

        if (syllabusIdParam) {
          const existing = await with429Retry(() => Syllabus.get(syllabusIdParam));
          if (existing) {
            let validSchoolId = existing.school_id || "";

            if (validSchoolId) {
              try {
                await with429Retry(() => EducationInstitution.get(validSchoolId));
              } catch (err) {
                console.warn(`School ID ${validSchoolId} not found, clearing invalid reference`);
                validSchoolId = "";
                try {
                  const { id, created_date, updated_date, created_by_id, created_by, is_sample, ...updateData } = existing;
                  await with429Retry(() => Syllabus.update(syllabusIdParam, { ...updateData, school_id: "" }));
                } catch (updateErr) {
                  console.error("Failed to update syllabus with cleared school_id:", updateErr);
                }
              }
            }

            setData({
              title: existing.title || "",
              school_id: validSchoolId,
              teacher_name: existing.teacher_name || "",
              classes_text: Array.isArray(existing.classes_text) ? existing.classes_text : existing.classes_text ? [existing.classes_text] : [],
              notes: existing.notes || "",
              meetings_count: existing.meetings_count || 0,
              course_topic: existing.course_topic || "",
              subject: existing.subject || "",
              target_audience: Array.isArray(existing.target_audience) ? existing.target_audience : existing.target_audience ? [existing.target_audience] : [],
              content_areas: existing.content_areas || "", // Changed to string
              activity_type: existing.activity_type || "",
              technology_tools: existing.technology_tools || [],
              purposes: existing.purposes || "", // Changed to string
              gift_knowledge: existing.gift_knowledge || "",
              gift_skill: existing.gift_skill || "",
              gift_understanding: existing.gift_understanding || "",
              final_product: existing.final_product || "",
              submission_method: existing.submission_method || "",
              assessment_method: existing.assessment_method || "",
              rubric: existing.rubric || "",
              preparations: existing.preparations || [],
              enrichment_materials: existing.enrichment_materials || [],
              teaching_materials: existing.teaching_materials || [],
              sessions: existing.sessions || [],
              status: existing.status || "draft",
              active: existing.active !== false
            });
          }
        }
      } catch (error) {
        console.error("Error loading syllabus data:", error);
      }
    };
    load();
  }, [syllabusIdParam]);

  const setField = (k, v) => setData((prev) => ({ ...prev, [k]: v }));

  const saveDraft = async () => {
    setSaving(true);
    try {
      // Ensure content_areas and purposes are strings
      const dataToSave = {
        ...data,
        status: "draft",
        meetings_count: (data.sessions || []).length,
        content_areas: typeof data.content_areas === 'string' ? data.content_areas : (Array.isArray(data.content_areas) ? data.content_areas.join(", ") : ""),
        purposes: typeof data.purposes === 'string' ? data.purposes : (Array.isArray(data.purposes) ? data.purposes.join(", ") : "")
      };
      
      if (syllabusIdParam) {
        await with429Retry(() => Syllabus.update(syllabusIdParam, dataToSave));
      } else {
        const created = await with429Retry(() => Syllabus.create(dataToSave));
        const newId = created?.id;
        if (newId) {
          const url = createPageUrl(`SyllabusWizard?id=${newId}`);
          window.history.replaceState(null, "", url);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const saveFinal = async () => {
    setSaving(true);
    try {
      // Ensure content_areas and purposes are strings
      const payload = {
        ...data,
        status: "final",
        meetings_count: (data.sessions || []).length,
        content_areas: typeof data.content_areas === 'string' ? data.content_areas : (Array.isArray(data.content_areas) ? data.content_areas.join(", ") : ""),
        purposes: typeof data.purposes === 'string' ? data.purposes : (Array.isArray(data.purposes) ? data.purposes.join(", ") : "")
      };
      
      if (syllabusIdParam) {
        await with429Retry(() => Syllabus.update(syllabusIdParam, payload));
      } else {
        await with429Retry(() => Syllabus.create(payload));
      }
      navigate(createPageUrl("Programs"));
    } finally {
      setSaving(false);
    }
  };

  const exportWord = () => {
    const html = renderPrintableHTML(data, schools, apps);
    const blob = new Blob(
      [`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' dir="rtl"><head><meta charset="utf-8"></head><body>${html}</body></html>`],
      { type: "application/msword;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.title || "סילבוס"}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Rows helpers
  const addPreparation = () => setField("preparations", [...(data.preparations || []), ""]);
  const updatePreparation = (idx, val) => {
    const arr = [...(data.preparations || [])];
    arr[idx] = val;
    setField("preparations", arr);
  };
  const removePreparation = (idx) => {
    const arr = [...(data.preparations || [])];
    arr.splice(idx, 1);
    setField("preparations", arr);
  };

  const newEnrichmentRow = () => setField("enrichment_materials", [...(data.enrichment_materials || []), { app_ids: [], experiences: [], links: [] }]);
  const setEnrichmentCell = (idx, key, val) => {
    const rows = [...(data.enrichment_materials || [])];
    rows[idx] = { ...(rows[idx] || {}), [key]: val };
    setField("enrichment_materials", rows);
  };
  const removeEnrichmentRow = (idx) => {
    const rows = [...(data.enrichment_materials || [])];
    rows.splice(idx, 1);
    setField("enrichment_materials", rows);
  };

  const newTeachingRow = () => setField("teaching_materials", [...(data.teaching_materials || []), { app_ids: [], experiences: [], links: [] }]);
  const setTeachingCell = (idx, key, val) => {
    const rows = [...(data.teaching_materials || [])];
    rows[idx] = { ...(rows[idx] || {}), [key]: val };
    setField("teaching_materials", rows);
  };
  const removeTeachingRow = (idx) => {
    const rows = [...(data.teaching_materials || [])];
    rows.splice(idx, 1);
    setField("teaching_materials", rows);
  };

  const addSession = () => {
    const nextNum = (data.sessions?.length || 0) + 1;
    setField("sessions", [...(data.sessions || []), { number: nextNum, topic: "", steps: [], worksheet_urls: [], teaching_refs: [], app_ids: [], experience_ids: [] }]);
  };
  const setSessionField = (i, key, val) => {
    const list = [...(data.sessions || [])];
    list[i] = { ...(list[i] || {}), [key]: val };
    setField("sessions", list);
  };
  const removeSession = (i) => {
    const list = [...(data.sessions || [])];
    list.splice(i, 1);
    const renum = list.map((s, idx) => ({ ...s, number: idx + 1 }));
    setField("sessions", renum);
  };
  const addSessionStep = (i) => {
    const list = [...(data.sessions || [])];
    const cur = list[i] || {};
    const steps = [...(cur.steps || []), ""];
    list[i] = { ...cur, steps };
    setField("sessions", list);
  };
  const setSessionStep = (i, stepIdx, val) => {
    const list = [...(data.sessions || [])];
    const cur = list[i] || {};
    const steps = [...(cur.steps || [])];
    steps[stepIdx] = val;
    list[i] = { ...cur, steps };
    setField("sessions", list);
  };
  const removeSessionStep = (i, stepIdx) => {
    const list = [...(data.sessions || [])];
    const cur = list[i] || {};
    const steps = [...(cur.steps || [])];
    steps.splice(stepIdx, 1);
    list[i] = { ...cur, steps };
    setField("sessions", list);
  };

  const appOptions = (apps || []).map((a) => ({ value: a.id, label: a.name || "ללא שם" }));

  const Toolbar = () => {
    if (viewOnly) {
      return (
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b shadow-sm mb-4">
          <div className="max-w-7xl mx-auto p-3 flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Link to={createPageUrl(`SyllabusWizard?id=${syllabusIdParam}`)}>
                <Button className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg">
                  <Pencil className="w-4 h-4" /> ערוך
                </Button>
              </Link>
              <Link to={createPageUrl(`ProgramView?id=${syllabusIdParam}`)}>
                <Button variant="outline" className="gap-2 shadow-md"><ArrowRight className="w-4 h-4" /> חזרה לתוכנית</Button>
              </Link>
              <Button variant="outline" onClick={() => setPrintOpen(true)} className="gap-2 shadow-md"><Printer className="w-4 h-4" /> הדפס/ PDF</Button>
              <Button variant="outline" onClick={exportWord} className="gap-2 shadow-md"><FileText className="w-4 h-4" /> Word</Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b shadow-sm mb-4">
        <div className="max-w-7xl mx-auto p-3 flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("Home")}>
              <Button variant="outline" className="gap-2 shadow-md"><Home className="w-4 h-4" /> מסך ראשי</Button>
            </Link>
            <Button variant="outline" onClick={() => setPrintOpen(true)} className="gap-2 shadow-md"><Printer className="w-4 h-4" /> הדפס/PDF</Button>
            <Button variant="outline" onClick={exportWord} className="gap-2 shadow-md"><FileText className="w-4 h-4" /> Word</Button>
            <Button variant="outline" onClick={saveDraft} disabled={saving} className="gap-2 shadow-md"><Save className="w-4 h-4" /> שמור טיוטה</Button>
            <Button onClick={saveFinal} disabled={saving} className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg"><Save className="w-4 h-4" /> שמור וסיום</Button>
          </div>
        </div>
      </div>
    );
  };

  // Multi-select helpers - button style
  const toggleMulti = (field, value) => {
    const current = data[field] || [];
    if (current.includes(value)) {
      setField(field, current.filter((v) => v !== value));
    } else {
      setField(field, [...current, value]);
    }
  };

  const CLASS_OPTIONS = ["כיתה א'", "כיתה ב'", "כיתה ג'", "כיתה ד'", "כיתה ה'", "כיתה ו'", "כיתה ז'", "כיתה ח'", "כיתה ט'", "כיתה י'", "כיתה י\"א", "כיתה י\"ב", "בוגרים"];

  // Button style multi-select component (used for multi-select fields like technology_tools)
  const ButtonMultiSelect = ({ options, selected, onToggle, label }) => (
    <div className="border rounded-lg p-3 bg-white shadow-sm">
      <div className="text-sm font-medium text-slate-700 mb-2 text-right">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = (selected || []).includes(opt.label);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.label)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                isSelected
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-2 border-cyan-600 shadow-md"
                  : "bg-white text-slate-700 border-2 border-slate-300 hover:border-cyan-400 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Single-select for activity type
  const ButtonSingleSelect = ({ options, selected, onSelect, label }) => (
    <div className="border rounded-lg p-3 bg-white shadow-sm">
      <div className="text-sm font-medium text-slate-700 mb-2 text-right">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected === opt.label;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.label)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                isSelected
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-2 border-cyan-600 shadow-md"
                  : "bg-white text-slate-700 border-2 border-slate-300 hover:border-cyan-400 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  // View-only mode
  if (viewOnly) {
    const schoolName = (schools || []).find((s) => s.id === data.school_id)?.name || "—";
    const classesDisplay = Array.isArray(data.classes_text) ? data.classes_text.join(", ") : data.classes_text ? [data.classes_text].join(", ") : "—";
    const targetAudienceDisplay = (data.target_audience || []).join(", ") || "—";

    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <Toolbar />
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-900 to-blue-900 bg-clip-text text-transparent">
              {data.title || data.course_topic || "סילבוס"}
            </h1>
          </div>

          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50">

            </CardHeader>
            <CardContent className="space-y-3 pt-4">

              <div><strong>מורה:</strong> {data.teacher_name || "—"}</div>
              <div><strong>כיתות:</strong> {classesDisplay}</div>
              {data.notes && <div><strong>הערות:</strong> {data.notes}</div>}
              <div><strong>מספר מפגשים:</strong> {data.sessions?.length || 0}</div>
              <div><strong>נושא הקורס:</strong> {data.course_topic || "—"}</div>
              <div><strong>מקצוע:</strong> {data.subject || "—"}</div>
              <div><strong>קהל יעד:</strong> {targetAudienceDisplay}</div>
              {/* Changed content_areas display from join to direct string */}
              <div><strong>תחום דעת:</strong> {data.content_areas || "—"}</div>
              <div><strong>סוג פעילות:</strong> {data.activity_type || "—"}</div>
              {/* Changed purposes display from join to direct string */}
              <div><strong>מטרות חינוכיות:</strong> {data.purposes || "—"}</div>
              <div>
                <strong>כלים טכנולוגיים:</strong> {(data.technology_tools || []).join(", ") || "—"}
              </div>
            </CardContent>
          </Card>

          {(data.gift_knowledge || data.gift_skill || data.gift_understanding) &&
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle>מתנות למידה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {data.gift_knowledge && <div><strong>מתנת הידע:</strong> {data.gift_knowledge}</div>}
                {data.gift_skill && <div><strong>מתנת המיומנות:</strong> {data.gift_skill}</div>}
                {data.gift_understanding && <div><strong>מתנת ההבנה:</strong> {data.gift_understanding}</div>}
              </CardContent>
            </Card>
          }

          {(data.final_product || data.submission_method || data.assessment_method || data.rubric) &&
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle>סיכום ראשוני</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {data.final_product && <div><strong>תוצר סופי:</strong> {data.final_product}</div>}
                {data.submission_method && <div><strong>אופן הגשה:</strong> {data.submission_method}</div>}
                {data.assessment_method && <div><strong>שיטת הערכה:</strong> {data.assessment_method}</div>}
                {data.rubric && <div><strong>מחוון:</strong> {data.rubric}</div>}
              </CardContent>
            </Card>
          }

          {(data.preparations || []).length > 0 &&
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
                <CardTitle>הכנות מוקדמות</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="list-disc list-inside space-y-1">
                  {(data.preparations || []).map((p, idx) => p && <li key={idx}>{p}</li>)}
                </ul>
              </CardContent>
            </Card>
          }

          {(data.enrichment_materials || []).length > 0 &&
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <CardTitle>חומרי העשרה</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {(data.enrichment_materials || []).map((row, idx) =>
                    <div key={idx} className="border-b pb-3 last:border-b-0">
                      {(row.app_ids || []).length > 0 &&
                        <div className="mb-2">
                          <strong>אפליקציות:</strong>{" "}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {row.app_ids.map((appId) => {
                              const app = apps.find((a) => a.id === appId);
                              return app ?
                                <Link
                                  key={appId}
                                  to={createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`)}
                                  className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded text-xs hover:bg-cyan-100 border border-cyan-200">
                                  {app.name}
                                </Link> :
                                null;
                            })}
                          </div>
                        </div>
                      }
                      {(row.experiences || []).length > 0 &&
                        <div className="mb-2">
                          <strong>חוויות:</strong>{" "}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {row.experiences.map((appId) => {
                              const app = apps.find((a) => a.id === appId);
                              return app ?
                                <Link
                                  key={appId}
                                  to={createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`)}
                                  className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded text-xs hover:bg-cyan-100 border border-cyan-200">
                                  {app.name}
                                </Link> :
                                null;
                            })}
                          </div>
                        </div>
                      }
                      {(row.links || []).filter((link) => link && link.url).length > 0 &&
                        <div>
                          <strong>קישורים:</strong>{" "}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(row.links || []).filter((link) => link && link.url).map((link, i) => {
                              const url = link.url || "";
                              const href = url.startsWith("http") ? url : `https://${url}`;
                              return (
                                <a key={i} href={href} target="_blank" rel="noreferrer" className="text-cyan-700 hover:underline text-xs inline-flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" />
                                  {link.name || link.url}
                                </a>);

                            })}
                          </div>
                        </div>
                      }
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          }

          {(data.teaching_materials || []).length > 0 &&
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-rose-50 to-red-50">
                <CardTitle>חומרי הוראה</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {(data.teaching_materials || []).map((row, idx) =>
                    <div key={idx} className="border-b pb-3 last:border-b-0">
                      {(row.app_ids || []).length > 0 &&
                        <div className="mb-2">
                          <strong>אפליקציות:</strong>{" "}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {row.app_ids.map((appId) => {
                              const app = apps.find((a) => a.id === appId);
                              return app ?
                                <Link
                                  key={appId}
                                  to={createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`)}
                                  className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded text-xs hover:bg-cyan-100 border border-cyan-200">
                                  {app.name}
                                </Link> :
                                null;
                            })}
                          </div>
                        </div>
                      }
                      {(row.experiences || []).length > 0 &&
                        <div className="mb-2">
                          <strong>חוויות:</strong>{" "}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {row.experiences.map((appId) => {
                              const app = apps.find((a) => a.id === appId);
                              return app ?
                                <Link
                                  key={appId}
                                  to={createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`)}
                                  className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded text-xs hover:bg-cyan-100 border border-cyan-200">
                                  {app.name}
                                </Link> :
                                null;
                            })}
                          </div>
                        </div>
                      }
                      {(row.links || []).filter((link) => link && link.url).length > 0 &&
                        <div>
                          <strong>קישורים:</strong>{" "}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(row.links || []).filter((link) => link && link.url).map((link, i) => {
                              const url = link.url || "";
                              const href = url.startsWith("http") ? url : `https://${url}`;
                              return (
                                <a key={i} href={href} target="_blank" rel="noreferrer" className="text-cyan-700 hover:underline text-xs inline-flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" />
                                  {link.name || link.url}
                                </a>);

                            })}
                          </div>
                        </div>
                      }
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          }

          {(data.sessions || []).length > 0 &&
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50">
                <CardTitle>מהלך המפגשים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {(data.sessions || []).map((ses, idx) =>
                  <div key={idx} className="border rounded p-4 bg-slate-50">
                    <h3 className="font-bold text-lg mb-2">מפגש #{ses.number}: {ses.topic || "ללא נושא"}</h3>
                    {(ses.app_ids || []).length > 0 &&
                      <div className="mb-2">
                        <strong>אפליקציות:</strong>{" "}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ses.app_ids.map((appId) => {
                            const app = apps.find((a) => a.id === appId);
                            return app ?
                              <Link
                                key={appId}
                                to={createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`)}
                                className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded text-xs hover:bg-cyan-100 border border-cyan-200">
                                {app.name}
                              </Link> :
                              null;
                          })}
                        </div>
                      </div>
                    }
                    {(ses.experience_ids || []).length > 0 &&
                      <div className="mb-2">
                        <strong>חוויות:</strong>{" "}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ses.experience_ids.map((appId) => {
                            const app = apps.find((a) => a.id === appId);
                            return app ?
                              <Link
                                key={appId}
                                to={createPageUrl(`AppDetailsPage?name=${encodeURIComponent(app.name)}`)}
                                className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded text-xs hover:bg-cyan-100 border border-cyan-200">
                                {app.name}
                              </Link> :
                              null;
                          })}
                        </div>
                      </div>
                    }
                    {(ses.steps || []).length > 0 &&
                      <div className="mb-2">
                        <strong>מהלך:</strong>
                        <ol className="list-decimal list-inside mt-1">
                          {(ses.steps || []).map((st, si) => st && <li key={si}>{st}</li>)}
                        </ol>
                      </div>
                    }
                    {(ses.worksheet_urls || []).filter((link) => link && link.url).length > 0 &&
                      <div>
                        <strong>דפי עבודה:</strong>{" "}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(ses.worksheet_urls || []).filter((link) => link && link.url).map((link, i) => {
                            const url = link.url || "";
                            const href = url.startsWith("http") ? url : `https://${url}`;
                            return (
                              <a key={i} href={href} target="_blank" rel="noreferrer" className="text-cyan-700 hover:underline text-xs inline-flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                {link.name || link.url}
                              </a>);

                          })}
                        </div>
                      </div>
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          }
        </div>

        <Dialog open={printOpen} onOpenChange={setPrintOpen}>
          <DialogContent dir="rtl" className="max-w-3xl">
            <DialogHeader><DialogTitle>תצוגה להדפסה</DialogTitle></DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
              <div id="printable" className="prose prose-slate max-w-none" dir="rtl">
                <div dangerouslySetInnerHTML={{ __html: renderPrintableHTML(data, schools, apps) }} />
              </div>
            </div>
            <DialogFooter className="justify-between">
              <Button variant="outline" onClick={() => setPrintOpen(false)}>סגור</Button>
              <Button onClick={() => window.print()} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">הדפס</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>);

  }

  // Edit mode
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <Toolbar />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-900 to-blue-900 bg-clip-text text-transparent">יצירת סילבוס</h1>
          <Badge variant="secondary" className="text-lg px-4 py-2 shadow-md">
            מפגשים: {data.sessions?.length || 0}
          </Badge>
        </div>

        {/* Section 1: פרטי פתיחה */}
        <Card className="shadow-lg border-0 border-t-4 border-t-cyan-600">
          <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-md">1</span>
              פרטי פתיחה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Input placeholder="כותרת סילבוס (אופציונלי)" value={data.title} onChange={(e) => setField("title", e.target.value)} className="text-right shadow-sm" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div>
                <Select value={data.teacher_name} onValueChange={(v) => setField("teacher_name", v)}>
                  <SelectTrigger className="text-right shadow-sm"><SelectValue placeholder="שם מורה" /></SelectTrigger>
                  <SelectContent>
                    {(teachers || []).map((t) => (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name}
                        {t.institution_id && schools.find((s) => s.id === t.institution_id) &&
                          ` - ${schools.find((s) => s.id === t.institution_id).name}`
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-slate-600 mb-2">כיתות (בחירה מרובה)</div>
                <div className="border rounded-lg p-3 bg-white max-h-48 overflow-y-auto shadow-sm">
                  {CLASS_OPTIONS.map((cls) => {
                    const selected = (data.classes_text || []).includes(cls);
                    return (
                      <label key={cls} className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => {
                            const current = data.classes_text || [];
                            if (selected) {
                              setField("classes_text", current.filter((c) => c !== cls));
                            } else {
                              setField("classes_text", [...current, cls]);
                            }
                          }}
                        />
                        <span className="text-sm">{cls}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <Input placeholder="הערות" value={data.notes} onChange={(e) => setField("notes", e.target.value)} className="bg-background my-8 px-3 py-2 text-base text-right rounded-md flex h-10 w-full border border-input ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-sm" />
            </div>

            {/* Subject and Course Topic with dynamic options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">מקצוע</label>
                <Select value={data.subject} onValueChange={(v) => setField("subject", v)}>
                  <SelectTrigger className="text-right shadow-sm"><SelectValue placeholder="בחר מקצוע" /></SelectTrigger>
                  <SelectContent>
                    {(subjects || []).map((o) => <SelectItem key={o.id} value={o.label}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="או הקלד חדש (Enter)"
                  className="mt-2 text-right shadow-sm"
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const label = (e.currentTarget.value || "").trim();
                      if (!label) return;
                      const exists = (subjects || []).some((t) => (t.label || "").toLowerCase() === label.toLowerCase());
                      if (!exists) {
                        const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                        await with429Retry(() => SubjectOption.create({ value: value || `s_${Date.now()}`, label, active: true }));
                        const sb = await with429Retry(() => SubjectOption.list());
                        setSubjects(sb || []);
                      }
                      setField("subject", label);
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">נושא קורס</label>
                <Select value={data.course_topic} onValueChange={(v) => setField("course_topic", v)}>
                  <SelectTrigger className="text-right shadow-sm"><SelectValue placeholder="בחר נושא" /></SelectTrigger>
                  <SelectContent>
                    {(topics || []).map((o) => <SelectItem key={o.id} value={o.label}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="או הקלד חדש (Enter)"
                  className="mt-2 text-right shadow-sm"
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const label = (e.currentTarget.value || "").trim();
                      if (!label) return;
                      const exists = (topics || []).some((t) => (t.label || "").toLowerCase() === label.toLowerCase());
                      if (!exists) {
                        const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                        await with429Retry(() => CourseTopicOption.create({ value: value || `t_${Date.now()}`, label, active: true }));
                        const tp = await with429Retry(() => CourseTopicOption.list());
                        setTopics(tp || []);
                      }
                      setField("course_topic", label);
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>
            </div>

            {/* Multi-select buttons and free text fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              <ButtonMultiSelect
                label="קהל יעד"
                options={targetAudienceOptions}
                selected={data.target_audience || []}
                onToggle={(v) => toggleMulti("target_audience", v)}
              />

              <ButtonSingleSelect
                label="סוג פעילות"
                options={activityTypeOptions}
                selected={data.activity_type}
                onSelect={(v) => setField("activity_type", v)}
              />

              <ButtonMultiSelect
                label="כלים טכנולוגיים"
                options={technologyToolOptions}
                selected={data.technology_tools || []}
                onToggle={(v) => toggleMulti("technology_tools", v)}
              />
            </div>

            {/* Free text fields for content_areas and purposes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">תחום דעת</label>
                <Textarea
                  placeholder="תיאור חופשי של תחום הדעת..."
                  value={data.content_areas}
                  onChange={(e) => setField("content_areas", e.target.value)}
                  className="text-right shadow-sm min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">מטרות חינוכיות</label>
                <Textarea
                  placeholder="תיאור חופשי של המטרות החינוכיות..."
                  value={data.purposes}
                  onChange={(e) => setField("purposes", e.target.value)}
                  className="text-right shadow-sm min-h-[80px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: מתנות למידה */}
        <Card className="shadow-lg border-0 border-t-4 border-t-purple-600">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-md">2</span>
              מתנות למידה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <Textarea placeholder="מתנת הידע - מה התלמידים ידעו?" value={data.gift_knowledge} onChange={(e) => setField("gift_knowledge", e.target.value)} className="min-h-[80px] text-right shadow-sm" />
            <Textarea placeholder="מתנת המיומנות - מה התלמידים יוכלו לעשות?" value={data.gift_skill} onChange={(e) => setField("gift_skill", e.target.value)} className="min-h-[80px] text-right shadow-sm" />
            <Textarea placeholder="מתנת ההבנה - מה התלמידים יבינו?" value={data.gift_understanding} onChange={(e) => setField("gift_understanding", e.target.value)} className="min-h-[80px] text-right shadow-sm" />
          </CardContent>
        </Card>

        {/* Section 3: סיכום ראשוני */}
        <Card className="shadow-lg border-0 border-t-4 border-t-green-600">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-md">3</span>
              סיכום ראשוני
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <Textarea placeholder="תוצר סופי" value={data.final_product} onChange={(e) => setField("final_product", e.target.value)} className="min-h-[70px] text-right shadow-sm" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Textarea placeholder="אופן הגשה" value={data.submission_method} onChange={(e) => setField("submission_method", e.target.value)} className="min-h-[70px] text-right shadow-sm" />
              <Textarea placeholder="שיטת הערכה" value={data.assessment_method} onChange={(e) => setField("assessment_method", e.target.value)} className="min-h-[70px] text-right shadow-sm" />
            </div>
            <Textarea placeholder="מחוון להערכה" value={data.rubric} onChange={(e) => setField("rubric", e.target.value)} className="min-h-[70px] text-right shadow-sm" />
          </CardContent>
        </Card>

        {/* Section 4: הכנות מוקדמות */}
        <Card className="shadow-lg border-0 border-t-4 border-t-amber-600">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-md">4</span>
              הכנות מוקדמות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {(data.preparations || []).map((p, idx) =>
              <div key={idx} className="flex gap-2">
                <Input value={p} onChange={(e) => updatePreparation(idx, e.target.value)} placeholder={`הכנה ${idx + 1}`} className="text-right shadow-sm" />
                <Button variant="destructive" size="sm" onClick={() => removePreparation(idx)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={addPreparation} className="gap-2"><Plus className="w-4 h-4" /> הוסף</Button>
          </CardContent>
        </Card>

        {/* Section 5: חומרי העשרה - NOW OPTIONAL */}
        <Card className="shadow-lg border-0 border-t-4 border-t-indigo-600">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-md">5</span>
              חומרי העשרה (אופציונלי)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <p className="text-sm text-slate-600 mb-3">
              ניתן להוסיף אפליקציות וחוויות VR, או להשאיר ריק אם התוכנית לא דורשת שימוש ב-VR
            </p>
            {(data.enrichment_materials || []).map((row, idx) =>
              <div key={idx} className="border rounded-lg p-3 space-y-2 bg-white shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-700 text-sm">חומר #{idx + 1}</span>
                  <Button variant="destructive" size="sm" onClick={() => removeEnrichmentRow(idx)}><Trash2 className="w-3 h-3" /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block text-right">אפליקציות</label>
                    <MultiSelectApps value={row.app_ids || []} onChange={(v) => setEnrichmentCell(idx, "app_ids", v)} options={appOptions} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block text-right">חוויות</label>
                    <MultiSelectApps value={row.experiences || []} onChange={(v) => setEnrichmentCell(idx, "experiences", v)} options={appOptions} />
                  </div>
                </div>
                <LinkInput label="קישורים" value={row.links || []} onChange={(v) => setEnrichmentCell(idx, "links", v)} />
              </div>
            )}
            <Button variant="outline" size="sm" onClick={newEnrichmentRow} className="gap-2"><Plus className="w-4 h-4" /> הוסף שורה</Button>
          </CardContent>
        </Card>

        {/* Section 6: חומרי הוראה - NOW OPTIONAL */}
        <Card className="shadow-lg border-0 border-t-4 border-t-rose-600">
          <CardHeader className="bg-gradient-to-r from-rose-50 to-red-50 py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-rose-600 to-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-md">6</span>
              חומרי הוראה (אופציונלי)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <p className="text-sm text-slate-600 mb-3">
              ניתן להוסיף אפליקציות וחוויות VR, או להשאיר ריק אם התוכנית לא דורשת שימוש ב-VR
            </p>
            {(data.teaching_materials || []).map((row, idx) =>
              <div key={idx} className="border rounded-lg p-3 space-y-2 bg-white shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-700 text-sm">חומר #{idx + 1}</span>
                  <Button variant="destructive" size="sm" onClick={() => removeTeachingRow(idx)}><Trash2 className="w-3 h-3" /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block text-right">אפליקציות</label>
                    <MultiSelectApps value={row.app_ids || []} onChange={(v) => setTeachingCell(idx, "app_ids", v)} options={appOptions} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block text-right">חוויות</label>
                    <MultiSelectApps value={row.experiences || []} onChange={(v) => setTeachingCell(idx, "experiences", v)} options={appOptions} />
                  </div>
                </div>
                <LinkInput label="קישורים" value={row.links || []} onChange={(v) => setTeachingCell(idx, "links", v)} />
              </div>
            )}
            <Button variant="outline" size="sm" onClick={newTeachingRow} className="gap-2"><Plus className="w-4 h-4" /> הוסף שורה</Button>
          </CardContent>
        </Card>

        {/* Section 7: מהלך המפגשים - NOW OPTIONAL VR */}
        <Card className="shadow-lg border-0 border-t-4 border-t-teal-600">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-md">7</span>
              מהלך המפגשים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="text-sm text-slate-600 bg-teal-50 p-2 rounded">
              נוספו <strong>{data.sessions?.length || 0}</strong> מפגשים. ניתן להוסיף מפגשים ללא אפליקציות VR
            </div>
            {(data.sessions || []).map((ses, idx) =>
              <div key={idx} className="border rounded-lg p-3 space-y-2 bg-white shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="font-semibold">מפגש #{ses.number}</div>
                  <Button variant="destructive" size="sm" onClick={() => removeSession(idx)}><Trash2 className="w-3 h-3" /></Button>
                </div>
                <Input placeholder="נושא המפגש" value={ses.topic || ""} onChange={(e) => setSessionField(idx, "topic", e.target.value)} className="text-right shadow-sm" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block text-right">אפליקציות</label>
                    <MultiSelectApps value={ses.app_ids || []} onChange={(v) => setSessionField(idx, "app_ids", v)} options={appOptions} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block text-right">חוויות</label>
                    <MultiSelectApps value={ses.experience_ids || []} onChange={(v) => setSessionField(idx, "experience_ids", v)} options={appOptions} />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-600 mb-1 block text-right">מהלך מפגש</label>
                  <div className="space-y-1">
                    {(ses.steps || []).map((st, si) =>
                      <div key={si} className="flex gap-1 items-center">
                        <div className="text-slate-500 w-5 text-center text-sm">{si + 1}.</div>
                        <Input value={st} onChange={(e) => setSessionStep(idx, si, e.target.value)} placeholder="שלב" className="text-sm text-right shadow-sm" />
                        <Button variant="destructive" size="sm" onClick={() => removeSessionStep(idx, si)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="mt-1 gap-1" onClick={() => addSessionStep(idx)}><Plus className="w-3 h-3" /> שלב</Button>
                </div>
                <LinkInput label="דפי עבודה" value={ses.worksheet_urls || []} onChange={(v) => setSessionField(idx, "worksheet_urls", v)} />
                <div>
                  <label className="text-xs text-slate-600 mb-1 block text-right">קישור לחומרי הוראה (מתוך "חומרי הוראה")</label>
                  <MultiSelectTeachingRefs
                    options={(data.teaching_materials || []).map((r, i) => ({ value: i, label: `חומר #${i + 1}` }))}
                    value={ses.teaching_refs || []}
                    onChange={(v) => setSessionField(idx, "teaching_refs", v)}
                  />

                </div>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={addSession} className="gap-2"><Plus className="w-4 h-4" /> הוסף מפגש</Button>
          </CardContent>
        </Card>

        {/* Section 8: סיום ושמירה */}
        <Card className="shadow-lg border-0 border-t-4 border-t-slate-600">
          <CardHeader className="bg-slate-50 py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="bg-slate-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-md">8</span>
              סיום ושמירה
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-4">
            <Button variant="outline" onClick={saveDraft} disabled={saving} className="gap-2 shadow-md"><Save className="w-4 h-4" /> שמור טיוטה</Button>
            <Button onClick={saveFinal} disabled={saving} className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg"><Save className="w-4 h-4" /> שמור וסיום</Button>
            <Button variant="outline" onClick={() => setPrintOpen(true)} className="gap-2 shadow-md"><Printer className="w-4 h-4" /> הדפס/PDF</Button>
            <Button variant="outline" onClick={exportWord} className="gap-2 shadow-md"><FileText className="w-4 h-4" /> Word</Button>
          </CardContent>
        </Card>
      </div>

      {/* Print dialog */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent dir="rtl" className="max-w-3xl">
          <DialogHeader><DialogTitle>תצוגה להדפסה</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <div id="printable" className="prose prose-slate max-w-none" dir="rtl">
              <div dangerouslySetInnerHTML={{ __html: renderPrintableHTML(data, schools, apps) }} />
            </div>
          </div>
          <DialogFooter className="justify-between">
            <Button variant="outline" onClick={() => setPrintOpen(false)}>סגור</Button>
            <Button onClick={() => window.print()} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">הדפס</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* Helper Components */

function TagsInput({ value = [], onChange, placeholder }) {
  const [input, setInput] = React.useState("");
  const add = (val) => {
    const v = (val || "").trim();
    if (!v) return;
    const next = Array.from(new Set([...(value || []), v]));
    onChange?.(next);
    setInput("");
  };
  return (
    <div>
      {(value || []).length > 0 &&
        <div className="flex flex-wrap gap-1 mb-1">
          {(value || []).map((t, i) =>
            <span key={`${t}-${i}`} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">{t}</span>
          )}
        </div>
      }
      <Input
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
        className="text-sm text-right" />

    </div>);

}

function MultiSelectApps({ value = [], onChange, options = [] }) {
  const [input, setInput] = React.useState("");
  const add = (id) => {
    if (!id) return;
    if ((value || []).includes(id)) return;
    onChange?.([...(value || []), id]);
  };
  const remove = (id) => onChange?.((value || []).filter((v) => v !== id));
  const filtered = options.filter((o) => (o.label || "").toLowerCase().includes((input || "").toLowerCase()));
  return (
    <div>
      {(value || []).length > 0 &&
        <div className="flex flex-wrap gap-1 mb-1">
          {(value || []).map((id) => {
            const label = options.find((o) => o.value === id)?.label || id;
            return (
              <span key={id} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs flex items-center gap-1">
                {label}
                <button onClick={() => remove(id)} className="ml-1 text-emerald-700 hover:text-emerald-900">×</button>
              </span>);

          })}
        </div>
      }
      <Input placeholder="חיפוש..." value={input} onChange={(e) => setInput(e.target.value)} className="text-sm text-right" />
      <div className="max-h-24 overflow-y-auto mt-1 border rounded text-sm">
        {filtered.slice(0, 50).map((o) =>
          <div key={o.value} className="px-2 py-1 hover:bg-slate-50 cursor-pointer text-right" onClick={() => add(o.value)}>
            {o.label}
          </div>
        )}
        {filtered.length === 0 && <div className="px-2 py-2 text-slate-400 text-xs text-right">אין תוצאות</div>}
      </div>
    </div>);

}

function MultiSelectTeachingRefs({ options = [], value = [], onChange }) {
  const toggle = (v) => {
    const exists = (value || []).includes(v);
    onChange?.(exists ? (value || []).filter((x) => x !== v) : [...(value || []), v]);
  };
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) =>
        <button
          key={opt.value}
          type="button"
          onClick={() => toggle(opt.value)}
          className={`px-2 py-1 rounded-lg text-xs border transition-all ${
            (value || []).includes(opt.value) ?
              "bg-blue-600 text-white border-blue-600" :
              "bg-white text-slate-700 border-slate-300 hover:border-blue-400"}`
          }>

          {opt.label}
        </button>
      )}
      {options.length === 0 && <div className="text-slate-400 text-xs">עדיין אין חומרי הוראה</div>}
    </div>);

}

function renderPrintableHTML(data, schools, apps) {
  const schoolName = (schools || []).find((s) => s.id === data.school_id)?.name || "—";
  const classesDisplay = Array.isArray(data.classes_text) ? data.classes_text.join(", ") : data.classes_text ? [data.classes_text].join(", ") : "—";
  const targetAudienceDisplay = (data.target_audience || []).join(", ") || "—";

  const appName = (id) => (apps || []).find((a) => a.id === id)?.name || id;
  const list = (arr) => (arr || []).length ? `<ul dir="rtl">${arr.map((x) => `<li>${escapeHtml(String(x || ""))}</li>`).join("")}</ul>` : "—";
  const links = (arr) => {
    const validLinks = (arr || []).filter((link) => link && typeof link === 'object' && link.url);
    return validLinks.length ? `<ul dir="rtl">${validLinks.map((link) => {
      const name = link.name || link.url || "";
      const url = link.url || "";
      const href = url.startsWith("http") ? url : `https://${url}`;
      return `<li><a href="${href}" target="_blank">${escapeHtml(name)}</a></li>`;
    }).join("")}</ul>` : "—";
  };

  const enrichment = (data.enrichment_materials || []).map((r) => `
    <tr>
      <td>${(r.app_ids || []).map(appName).join(", ") || "—"}</td>
      <td>${(r.experiences || []).map(appName).join(", ") || "—"}</td>
      <td>${links(r.links)}</td>
    </tr>
  `).join("");

  const teaching = (data.teaching_materials || []).map((r) => `
    <tr>
      <td>${(r.app_ids || []).map(appName).join(", ") || "—"}</td>
      <td>${(r.experiences || []).map(appName).join(", ") || "—"}</td>
      <td>${links(r.links)}</td>
    </tr>
  `).join("");

  const sessions = (data.sessions || []).map((s) => `
    <div style="margin-bottom:12px;">
      <div><strong>מפגש #${s.number}:</strong> ${escapeHtml(s.topic || "")}</div>
      <div><em>אפליקציות:</em> ${(s.app_ids || []).map(appName).join(", ") || "—"}</div>
      <div><em>חוויות:</em> ${(s.experience_ids || []).map(appName).join(", ") || "—"}</div>
      <div><em>מהלך:</em> ${list(s.steps)}</div>
      <div><em>דפי עבודה:</em> ${links(s.worksheet_urls)}</div>
    </div>
  `).join("");

  return `
    <div style="font-family:Arial; direction:rtl; text-align:right;">
      <h1>${escapeHtml(data.title || "סילבוס")}</h1>
      <div><strong>בית ספר:</strong> ${escapeHtml(schoolName)}</div>
      <div><strong>מורה:</strong> ${escapeHtml(data.teacher_name || "—")}</div>
      <div><strong>כיתות:</strong> ${escapeHtml(classesDisplay)}</div>
      ${data.notes ? `<div><strong>הערות:</strong> ${escapeHtml(data.notes)}</div>` : ''}
      <div><strong>מספר מפגשים:</strong> ${(data.sessions || []).length}</div>
      <div><strong>נושא הקורס:</strong> ${escapeHtml(data.course_topic || "—")}</div>
      <div><strong>מקצוע:</strong> ${escapeHtml(data.subject || "—")}</div>
      <div><strong>קהל יעד / רמת גיל:</strong> ${escapeHtml(targetAudienceDisplay)}</div>
      <div><strong>תחום דעת:</strong> ${escapeHtml(data.content_areas || "—")}</div>
      <div><strong>סוג פעילות:</strong> ${escapeHtml(data.activity_type || "—")}</div>
      <div><strong>מטרות חינוכיות:</strong> ${escapeHtml(data.purposes || "—")}</div>
      <div><strong>כלים טכנולוגיים:</strong> ${(data.technology_tools || []).map(escapeHtml).join(", ") || "—"}</div>

      <hr />
      <h3>מתנות למידה</h3>
      <div><strong>ידע:</strong> ${escapeHtml(data.gift_knowledge || "—")}</div>
      <div><strong>מיומנות:</strong> ${escapeHtml(data.gift_skill || "—")}</div>
      <div><strong>הבנה:</strong> ${escapeHtml(data.gift_understanding || "—")}</div>

      <hr />
      <h3>סיכום ראשוני</h3>
      <div><strong>תוצר סופי:</strong> ${escapeHtml(data.final_product || "—")}</div>
      <div><strong>אופן הגשה:</strong> ${escapeHtml(data.submission_method || "—")}</div>
      <div><strong>שיטת הערכה:</strong> ${escapeHtml(data.assessment_method || "—")}</div>
      <div><strong>מחוון:</strong> ${escapeHtml(data.rubric || "—")}</div>

      <hr />
      <h3>הכנות מוקדמות</h3>
      ${list(data.preparations)}

      <hr />
      <h3>חומרי העשרה</h3>
      <table border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse;">
        <thead><tr><th>אפליקציות</th><th>חוויות</th><th>קישורים</th></tr></thead>
        <tbody>${enrichment || "<tr><td colspan='3'>—</td></tr>"}</tbody>
      </table>

      <hr />
      <h3>חומרי הוראה</h3>
      <table border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse;">
        <thead><tr><th>אפליקציות</th><th>חוויות</th><th>קישורים</th></tr></thead>
        <tbody>${teaching || "<tr><td colspan='3'>—</td></tr>"}</tbody>
      </table>

      <hr />
      <h3>מהלך המפגשים</h3>
      ${sessions || "—"}
    </div>
  `;
}

function escapeHtml(s) {
  return String(s || "").
    replace(/&/g, "&amp;").
    replace(/</g, "&lt;").
    replace(/>/g, "&gt;").
    replace(/"/g, "&quot;").
    replace(/'/g, "&#039;");
}