
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileJson,
  AlertTriangle,
  Download,
  History as HistoryIcon,
  CheckCircle,
  Play,
} from "lucide-react";
import { ImportJob } from "@/entities/ImportJob";
import { VRDevice } from "@/entities/VRDevice";
import { VRApp } from "@/entities/VRApp";
import { DeviceLinkedAccount } from "@/entities/DeviceLinkedAccount";
import { DeviceApp } from "@/entities/DeviceApp";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { Teacher } from "@/entities/Teacher";
import { Syllabus } from "@/entities/Syllabus";
import { InstitutionProgram } from "@/entities/InstitutionProgram";
import { GenreOption } from "@/entities/GenreOption";
import { EducationFieldOption } from "@/entities/EducationFieldOption";
import { PlatformOption } from "@/entities/PlatformOption";
import { PlayerCountOption } from "@/entities/PlayerCountOption";
import { InternetRequirementOption } from "@/entities/InternetRequirementOption";
import { PurchaseTypeOption } from "@/entities/PurchaseTypeOption";
import { CourseTopicOption } from "@/entities/CourseTopicOption";
import { SubjectOption } from "@/entities/SubjectOption";
import { Settings } from "@/entities/Settings";
import { with429Retry } from "@/components/utils/retry";

// --- START: Hardcoded data for static seeding (from outline's implied context) ---
// These constants are placeholders and would typically come from configuration or a dedicated file.
const APP_NAMES = [
  "Tilt Brush",
  "Beat Saber",
  "Rec Room",
  "VR Chat",
  "Metaverse",
  "Space Explorers",
  "Google Earth VR",
  "The Lab",
  "Nature Treks VR",
  "Apollo 11 VR",
  "Ocean Rift",
  "Anne Frank House VR",
  "VirtualSpeech",
  "Engage VR",
  "Labster VR",
  "Anatomy 4D",
];

const DEVICES_DATA = [
  { binocular_number: 101, device_name: "Meta Quest 2 (A)", primary_email: "device101@example.com", model: "Meta Quest 2", purchase_date: "2023-01-01", meta_email: "meta.101@example.com", meta_password: "password101", applab_email: "applab.101@example.com", applab_password: "password101", facebook_email: "fb.101@example.com", facebook_password: "password101", gmail_password: "password101" },
  { binocular_number: 102, device_name: "Meta Quest 2 (B)", primary_email: "device102@example.com", model: "Meta Quest 2", purchase_date: "2023-01-01", meta_email: "meta.102@example.com", meta_password: "password102", applab_email: "applab.102@example.com", applab_password: "password102", facebook_email: "fb.102@example.com", facebook_password: "password102", gmail_password: "password102" },
  { binocular_number: 103, device_name: "Meta Quest 3 (C)", primary_email: "device103@example.com", model: "Meta Quest 3", purchase_date: "2023-03-15", meta_email: "meta.103@example.com", meta_password: "password103", applab_email: "applab.103@example.com", applab_password: "password103", facebook_email: "fb.103@example.com", facebook_password: "password103", gmail_password: "password103" },
  { binocular_number: 104, device_name: "Meta Quest 2 (D)", primary_email: "device104@example.com", model: "Meta Quest 2", purchase_date: "2023-01-01", meta_email: "meta.104@example.com", meta_password: "password104", applab_email: "applab.104@example.com", applab_password: "password104", facebook_email: "fb.104@example.com", facebook_password: "password104", gmail_password: "password104" },
  { binocular_number: 105, device_name: "Meta Quest 3 (E)", primary_email: "device105@example.com", model: "Meta Quest 3", purchase_date: "2023-03-15", meta_email: "meta.105@example.com", meta_password: "password105", applab_email: "applab.105@example.com", applab_password: "password105", facebook_email: "fb.105@example.com", facebook_password: "password105", gmail_password: "password105" },
];

const DEVICE_APPS_MAP = {
  101: ["Tilt Brush", "Beat Saber", "Rec Room"],
  102: ["VR Chat", "Metaverse", "Space Explorers"],
  103: ["Google Earth VR", "The Lab", "Nature Treks VR"],
  104: ["Apollo 11 VR", "Ocean Rift", "Anne Frank House VR"],
  105: ["VirtualSpeech", "Engage VR", "Labster VR", "Anatomy 4D"],
};
// --- END: Hardcoded data for static seeding ---


export default function DataImport() {
  const [dragActive, setDragActive] = React.useState(false);
  const [fileInfo, setFileInfo] = React.useState(null);
  const [rawData, setRawData] = React.useState([]);
  const [previewRows, setPreviewRows] = React.useState([]);
  const [columns, setColumns] = React.useState([]);
  const [dataType, setDataType] = React.useState("");
  const [fieldMapping, setFieldMapping] = React.useState({});
  const [options, setOptions] = React.useState({
    addOnly: true, // This implies "create if not exists, otherwise error" if upsert is false
    upsert: false, // Update if exists, create if not
    wipeReimport: false, // Delete all existing of type then import
  });
  const [importing, setImporting] = React.useState(false);
  const [history, setHistory] = React.useState([]);
  const [dangerOpen, setDangerOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [deletionStatus, setDeletionStatus] = React.useState(null);
  const [deletionProgress, setDeletionProgress] = React.useState("");

  // --- START: State for static data seeding (from outline's implied context) ---
  const [seedingStatus, setSeedingStatus] = React.useState(null); // 'idle', 'in-progress', 'success', 'error'
  const [seedingProgress, setSeedingProgress] = React.useState("");
  const [seedingLog, setSeedingLog] = React.useState([]); // Array of log messages
  // --- END: State for static data seeding ---


  const dataTypeOptions = [
    { value: "students", label: "תלמידים" }, // Not fully implemented
    { value: "classes", label: "כיתות" },    // Not fully implemented
    { value: "schools", label: "בתי ספר" },
    { value: "devices", label: "משקפות" },
    { value: "apps", label: "אפליקציות" },
    { value: "users", label: "משתמשים" },    // Not fully implemented
  ];

  const dbFieldsByType = React.useMemo(
    () => ({
      students: [
        { value: "name", label: "שם תלמיד" },
        { value: "student_id", label: "מזהה תלמיד" },
        { value: "class_name", label: "שם כיתה" },
        { value: "headset_number", label: "מס׳ משקפת" },
        { value: "age", label: "גיל" },
        { value: "email", label: "אימייל" },
      ],
      classes: [
        { value: "name", label: "שם כיתה" },
        { value: "grade", label: "שכבה" },
        { value: "school_name", label: "שם בית ספר" },
        { value: "class_id", label: "מזהה כיתה" },
      ],
      schools: [
        { value: "name", label: "שם בית ספר" },
        { value: "city", label: "עיר" },
        { value: "address", label: "כתובת" },
        { value: "contact_name", label: "איש קשר" },
      ],
      devices: [
        { value: "binocular_number", label: "מס׳ משקפת" },
        { value: "serial_number", label: "מס׳ סידורי" },
        { value: "model", label: "דגם" },
        { value: "status", label: "סטטוס" },
        { value: "school_name", label: "שם בית ספר" },
        { value: "primary_email", label: "אימייל ראשי" },
        { value: "device_name", label: "שם משקפת" },
      ],
      apps: [
        { value: "name", label: "שם אפליקציה" },
        { value: "purchase_type", label: "סוג רכישה" },
        { value: "store_link", label: "קישור חנות" },
        { value: "website_link", label: "קישור אתר" },
        { value: "internet_required", label: "דורש אינטרנט" },
      ],
      users: [
        { value: "full_name", label: "שם מלא" },
        { value: "email", label: "אימייל" },
        { value: "role", label: "תפקיד (admin/user)" },
        { value: "phone", label: "טלפון" },
      ],
    }),
    []
  );

  const loadHistory = React.useCallback(async () => {
    const rows = await with429Retry(() => ImportJob.list("-created_date", 50));
    setHistory(rows || []);
  }, []);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const parseCSV = (text) => {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { columns: [], rows: [] };
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const parts = line.split(",");
      const obj = {};
      headers.forEach((h, i) => (obj[h] = (parts[i] || "").trim()));
      return obj;
    });
    return { columns: headers, rows };
  };

  const parseJSON = (text) => {
    const obj = JSON.parse(text);
    const rows = Array.isArray(obj) ? obj : [obj];
    const headers = rows.length ? Object.keys(rows[0]) : [];
    return { columns: headers, rows };
  };

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file) return;
    const name = file.name || "";
    const lower = name.toLowerCase();
    setFileInfo({ name: file.name, type: file.type, size: file.size });

    setRawData([]);
    setPreviewRows([]);
    setColumns([]);
    setFieldMapping({});

    const text = await file.text();

    if (lower.endsWith(".csv")) {
      const { columns: cols, rows } = parseCSV(text);
      setColumns(cols);
      setRawData(rows);
      setPreviewRows(rows.slice(0, 8));
      const defaultMap = {};
      cols.forEach((c) => (defaultMap[c] = "ignore"));
      setFieldMapping(defaultMap);
    } else if (lower.endsWith(".json")) {
      try {
        const { columns: cols, rows } = parseJSON(text);
        setColumns(cols);
        setRawData(rows);
        setPreviewRows(rows.slice(0, 8));
        const defaultMap = {};
        cols.forEach((c) => (defaultMap[c] = "ignore"));
        setFieldMapping(defaultMap);
      } catch (e) {
        alert("קובץ JSON אינו תקין.");
      }
    } else if (lower.endsWith(".xlsx")) {
      alert("תצוגה מקדימה עבור XLSX אינה נתמכת. אנא המירו את הקובץ ל-CSV או JSON.");
      setColumns([]);
      setRawData([]);
      setPreviewRows([]);
    } else {
      alert("סוג קובץ לא נתמך. תמיכה ב-CSV, JSON בלבד.");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFiles(files);
      e.dataTransfer.clearData();
    }
  };

  const iconForFile = () => {
    if (!fileInfo) return <UploadCloud className="w-8 h-8 text-slate-500" />;
    const n = (fileInfo.name || "").toLowerCase();
    if (n.endsWith(".csv")) return <FileText className="w-8 h-8 text-cyan-700" />;
    if (n.endsWith(".xlsx")) return <FileSpreadsheet className="w-8 h-8 text-cyan-700" />;
    if (n.endsWith(".json")) return <FileJson className="w-8 h-8 text-cyan-700" />;
    return <UploadCloud className="w-8 h-8 text-slate-500" />;
  };

  const columnsForSelectedType = React.useMemo(() => {
    return dbFieldsByType[dataType] || [];
  }, [dbFieldsByType, dataType]);

  const handleImport = async () => {
    if (!fileInfo) {
      alert("אנא בחרו קובץ קודם.");
      return;
    }
    if (!dataType) {
      alert("אנא בחרו סוג נתונים לייבוא.");
      return;
    }
    
    if (!rawData || rawData.length === 0) {
      alert("אין נתונים לייבוא. ודאו שהקובץ מכיל מידע תקין.");
      return;
    }

    const mappedCount = Object.values(fieldMapping || {}).filter((v) => v && v !== "ignore").length;
    if (mappedCount === 0) {
      alert("לא בוצע מיפוי עמודות. יש למפות לפחות שדה אחד.");
      return;
    }

    setImporting(true);

    let status = "success";
    let errLog = "";
    let importedCount = 0;
    let errorCount = 0;

    try {
      // Map data from file columns to entity fields
      const mappedData = rawData.map(row => {
        const mapped = {};
        Object.keys(fieldMapping).forEach(fileCol => {
          const entityField = fieldMapping[fileCol];
          if (entityField && entityField !== "ignore") {
            mapped[entityField] = row[fileCol];
          }
        });
        return mapped;
      });

      // Import based on data type
      if (dataType === "devices") {
        // Wipe if requested
        if (options.wipeReimport) {
          const existing = await with429Retry(() => VRDevice.list());
          for (const item of existing) {
            await with429Retry(() => VRDevice.delete(item.id));
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between deletions
          }
        }

        for (const item of mappedData) {
          try {
            // Validate and convert binocular_number to number
            if (!item.binocular_number || String(item.binocular_number).trim() === "") {
              throw new Error("מזהה משקפת חסר או ריק");
            }
            
            item.binocular_number = Number(item.binocular_number);
            if (isNaN(item.binocular_number)) {
              throw new Error(`מספר משקפת אינו תקין: ${item.binocular_number}`);
            }

            // Ensure device_name exists
            if (!item.device_name || String(item.device_name).trim() === "") {
              item.device_name = `משקפת ${item.binocular_number}`;
            }
            
            if (options.upsert) {
              // Try to find existing by binocular_number
              const existing = await with429Retry(() => VRDevice.list());
              const found = existing.find(d => d.binocular_number === item.binocular_number);
              if (found) {
                await with429Retry(() => VRDevice.update(found.id, item));
              } else {
                await with429Retry(() => VRDevice.create(item));
              }
            } else {
              await with429Retry(() => VRDevice.create(item));
            }
            importedCount++;
            await new Promise(resolve => setTimeout(resolve, 200)); // Delay to avoid rate limits
          } catch (err) {
            errorCount++;
            errLog += `שגיאה בשורת קובץ (${item.binocular_number || item.serial_number || 'לא ידוע'}): ${err.message}\n`;
          }
        }
      } else if (dataType === "apps") {
        if (options.wipeReimport) {
          const existing = await with429Retry(() => VRApp.list());
          for (const item of existing) {
            await with429Retry(() => VRApp.delete(item.id));
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between deletions
          }
        }

        let existingAppsForUpsert = [];
        if (options.upsert) {
          existingAppsForUpsert = await with429Retry(() => VRApp.list());
        }

        for (const item of mappedData) {
          try {
            // Validate app name exists
            if (!item.name || String(item.name).trim() === "") {
              throw new Error("שם אפליקציה חסר");
            }

            const appPayload = { ...item }; // Create a copy to modify

            // Transform internet_required to boolean
            if (appPayload.hasOwnProperty('internet_required')) {
                const rawValue = appPayload.internet_required;
                if (rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== "") {
                    const lowerVal = String(rawValue).trim().toLowerCase();
                    appPayload.internet_required = (lowerVal === "true" || lowerVal === "yes" || lowerVal === "1");
                } else {
                    appPayload.internet_required = false;
                }
            }

            if (options.upsert) {
              const found = existingAppsForUpsert.find(a => a.name === appPayload.name);
              if (found) {
                await with429Retry(() => VRApp.update(found.id, appPayload));
              } else {
                await with429Retry(() => VRApp.create(appPayload));
              }
            } else {
              await with429Retry(() => VRApp.create(appPayload));
            }
            importedCount++;
            await new Promise(resolve => setTimeout(resolve, 200)); // Delay to avoid rate limits
          } catch (err) {
            errorCount++;
            errLog += `שגיאה בשורת קובץ (אפליקציה: ${item.name || 'לא ידוע'}): ${err.message}\n`;
          }
        }
      } else if (dataType === "schools") {
        if (options.wipeReimport) {
          const existing = await with429Retry(() => EducationInstitution.list());
          for (const item of existing) {
            await with429Retry(() => EducationInstitution.delete(item.id));
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between deletions
          }
        }

        for (const item of mappedData) {
          try {
            // Validate school name exists
            if (!item.name || String(item.name).trim() === "") {
              throw new Error("שם בית ספר חסר");
            }

            if (options.upsert) {
              const existing = await with429Retry(() => EducationInstitution.list());
              const found = existing.find(s => s.name === item.name);
              if (found) {
                await with429Retry(() => EducationInstitution.update(found.id, item));
              } else {
                await with429Retry(() => EducationInstitution.create(item));
              }
            } else {
              await with429Retry(() => EducationInstitution.create(item));
            }
            importedCount++;
            await new Promise(resolve => setTimeout(resolve, 200)); // Delay to avoid rate limits
          } catch (err) {
            errorCount++;
            errLog += `שגיאה בשורת קובץ (בית ספר: ${item.name || 'לא ידוע'}): ${err.message}\n`;
          }
        }
      } else {
        // For other types (students, classes, users) - not fully implemented yet
        status = "partial";
        errLog = `ייבוא מסוג "${dataType}" טרם מיושם במלואו. יש תמיכה ב: devices, apps, schools.`;
      }

      if (errorCount > 0) {
        status = importedCount > 0 ? "partial" : "failure";
      }

    } catch (error) {
      status = "failure";
      errLog += `שגיאה כללית בתהליך הייבוא: ${error.message}\n`;
      console.error("Import error:", error);
    }

    await with429Retry(() => ImportJob.create({
      file_name: fileInfo.name,
      data_type: dataType,
      status,
      options,
      error_log: errLog.length > 0 ? errLog : undefined,
    }));

    await loadHistory();
    setImporting(false);
    
    if (status === "success") {
      alert(`הייבוא הושלם בהצלחה! יובאו ${importedCount} רשומות.`);
    } else if (status === "partial") {
      alert(`הייבוא הושלם חלקית. יובאו ${importedCount} רשומות, ${errorCount} כשלו.\nעיינו בלוג השגיאות לפרטים.`);
    } else {
      alert(`הייבוא נכשל. ${errorCount} רשומות נכשלו.\nעיינו בלוג השגיאות לפרטים.`);
    }
  };

  const resetAll = () => {
    setFileInfo(null);
    setRawData([]);
    setPreviewRows([]);
    setColumns([]);
    setDataType("");
    setFieldMapping({});
    setOptions({ addOnly: true, upsert: false, wipeReimport: false });
    setDeletionStatus(null);
    setDeletionProgress("");
    setSeedingStatus(null); // Reset seeding state
    setSeedingProgress("");
    setSeedingLog([]);
  };

  const deleteAllRecords = async (Entity, name) => {
    setDeletionProgress(`מוחק ${name}...`);
    try {
      const records = await with429Retry(() => Entity.list());
      if (records && records.length > 0) {
        for (const record of records) {
          try {
            await with429Retry(() => Entity.delete(record.id));
          } catch (err) {
            console.error(`Error deleting ${name} record ${record.id}:`, err);
            // Optionally throw to stop entire deletion, or just log and continue
          }
        }
      }
    } catch (err) {
      console.error(`Error loading ${name} for deletion:`, err);
      throw err; // Re-throw to indicate failure in overall deletion process
    }
  };

  const handleFullDeletion = async () => {
    setDeletionStatus("deleting");
    setDeletionProgress("מתחיל מחיקה...");
    
    try {
      await deleteAllRecords(DeviceApp, "שיוכי משקפות-אפליקציות");
      await deleteAllRecords(DeviceLinkedAccount, "חשבונות מקושרים");
      await deleteAllRecords(InstitutionProgram, "שיוכי מוסדות-תוכניות");
      
      await deleteAllRecords(Syllabus, "סילבוסים");
      await deleteAllRecords(VRDevice, "משקפות");
      await deleteAllRecords(VRApp, "אפליקציות");
      await deleteAllRecords(EducationInstitution, "מוסדות חינוך");
      await deleteAllRecords(Teacher, "מורים");
      
      await deleteAllRecords(ImportJob, "היסטוריית ייבוא");
      await deleteAllRecords(Settings, "הגדרות");

      await deleteAllRecords(GenreOption, "אפשרויות ז'אנר");
      await deleteAllRecords(EducationFieldOption, "אפשרויות תחום חינוכי");
      await deleteAllRecords(PlatformOption, "אפשרויות פלטפורמה");
      await deleteAllRecords(PlayerCountOption, "אפשרויות מספר שחקנים");
      await deleteAllRecords(InternetRequirementOption, "אפשרויות אינטרנט");
      await deleteAllRecords(PurchaseTypeOption, "אפשרויות סוג רכישה");
      await deleteAllRecords(CourseTopicOption, "אפשרויות נושא קורס");
      await deleteAllRecords(SubjectOption, "אפשרויות מקצוע");
      
      setDeletionStatus("success");
      setDeletionProgress("כל הנתונים נמחקו בהצלחה!");
      alert("כל הנתונים נמחקו בהצלחה מהמערכת!");
      setDangerOpen(false);
      resetAll();
      loadHistory();
    } catch (error) {
      console.error("Error during full data deletion:", error);
      setDeletionStatus("error");
      setDeletionProgress(`שגיאה במחיקת הנתונים: ${error.message}`);
      alert(`שגיאה במחיקת הנתונים: ${error.message}`);
    }
  };

  // --- START: Static Data Seeding Function (from outline) ---
  const handleSeedStaticData = async () => {
    setSeedingStatus("in-progress");
    setSeedingProgress("מתחיל טעינת נתונים ראשונית...");
    setSeedingLog([]);
    const addLog = (msg) => setSeedingLog((prev) => [...prev, msg]);
    const setProgress = (msg) => setSeedingProgress(msg);
    const setStatus = (status) => setSeedingStatus(status);

    try {
      addLog("\n=== שלב 1: יצירת אפליקציות ===");
      setProgress("שלב 1/4: יוצר אפליקציות...");

      let existingAppsInDB = await with429Retry(() => VRApp.list());
      const appNameToId = {}; // This will hold the final map of appName -> appId

      // Populate appNameToId and identify apps that need updating for 'is_installed' status
      for (const app of existingAppsInDB) {
        appNameToId[(app.name || "").trim().toLowerCase()] = app.id;
      }

      let appsCreatedCount = 0;
      const newAppsPayload = [];
      const appsToUpdateInstalledStatus = [];

      // First, identify apps that need to be created or updated for their installed status
      for (const appName of APP_NAMES) {
        const appNameLower = appName.trim().toLowerCase();
        const existingAppId = appNameToId[appNameLower];

        if (!existingAppId) {
          // App does not exist, prepare for creation
          newAppsPayload.push({
            name: appName,
            is_installed: true,
            is_research: false,
            internet_required: false, // Default for static apps if not specified in APP_NAMES
          });
        } else {
          // App exists, check if it needs 'is_installed' update
          const appInDB = existingAppsInDB.find(a => (a.name || "").trim().toLowerCase() === appNameLower);
          if (appInDB && !appInDB.is_installed) {
            appsToUpdateInstalledStatus.push({ id: existingAppId, name: appName });
          }
        }
      }

      // Bulk create new apps
      if (newAppsPayload.length > 0) {
        addLog(`נמצאו ${newAppsPayload.length} אפליקציות חדשות ליצירה.`);
        // Assuming VRApp.bulkCreate is available. If not, use a loop with VRApp.create
        const createdApps = await with429Retry(() => VRApp.bulkCreate(newAppsPayload));
        appsCreatedCount = createdApps.length;
        addLog(`נוצרו ${appsCreatedCount} אפליקציות חדשות.`);

        // Update appNameToId with newly created apps
        createdApps.forEach(app => {
          appNameToId[app.name.trim().toLowerCase()] = app.id;
        });
      } else {
        addLog("אין אפליקציות חדשות ליצירה.");
      }

      // Update existing apps to ensure they are marked as installed
      addLog("מסמן את האפליקציות כמותקנות...");
      let appsUpdatedAsInstalledCount = 0;
      for (const appToUpdate of appsToUpdateInstalledStatus) {
        await with429Retry(() => VRApp.update(appToUpdate.id, { is_installed: true }));
        appsUpdatedAsInstalledCount++;
      }
      addLog(`עודכנו ${appsUpdatedAsInstalledCount} אפליקציות לסטטוס 'מותקנת'.`);
      addLog(`סה"כ אפליקציות חדשות שנוצרו: ${appsCreatedCount}. סה"כ אפליקציות קיימות שעודכנו ל'מותקנת': ${appsUpdatedAsInstalledCount}`);
      addLog(`(סה"כ אפליקציות רשומות במערכת: ${Object.keys(appNameToId).length})`);


      // Step 2: Create/Update Devices
      addLog("\n=== שלב 2: יצירת משקפות ===");
      setProgress("יוצר משקפות...");
      
      const existingDevices = await with429Retry(() => VRDevice.list());
      const deviceNumToId = {};
      existingDevices.forEach(d => {
        deviceNumToId[d.binocular_number] = d.id;
      });

      let devicesCreated = 0;
      for (const deviceData of DEVICES_DATA) {
        const devicePayload = {
          binocular_number: deviceData.binocular_number,
          device_name: deviceData.device_name,
          primary_email: deviceData.primary_email,
          model: deviceData.model || "Meta Quest 2",
          headset_type: deviceData.headset_type || "Meta Quest 2",
          purchase_date: deviceData.purchase_date,
          price: deviceData.price,
          status: deviceData.status || "פעיל",
          usage_role: deviceData.usage_role || "תלמיד"
        };

        if (deviceNumToId[deviceData.binocular_number]) {
          // Update existing
          await with429Retry(() => VRDevice.update(
            deviceNumToId[deviceData.binocular_number],
            devicePayload
          ));
          addLog(`↻ עודכנה משקפת #${deviceData.binocular_number}`);
        } else {
          // Create new
          const created = await with429Retry(() => VRDevice.create(devicePayload));
          deviceNumToId[deviceData.binocular_number] = created.id;
          devicesCreated++;
          addLog(`✓ נוצרה משקפת #${deviceData.binocular_number} (${deviceData.device_name})`);
        }
      }
      addLog(`סה"כ משקפות חדשות: ${devicesCreated}/${DEVICES_DATA.length}`);

      // Step 3: Create/Update Linked Accounts
      addLog("\n=== שלב 3: יצירת חשבונות משויכים ===");
      setProgress("יוצר חשבונות משויכים...");
      
      let accountsCreated = 0;
      for (const deviceData of DEVICES_DATA) {
        const deviceId = deviceNumToId[deviceData.binocular_number];
        if (!deviceId) continue;

        const accountTypes = [
          { type: "GMAIL", email: deviceData.primary_email, password: deviceData.gmail_password },
          { type: "META", email: deviceData.meta_email, password: deviceData.meta_password },
          { type: "App Lab", email: deviceData.applab_email, password: deviceData.applab_password },
          { type: "Facebook", email: deviceData.facebook_email, password: deviceData.facebook_password },
        ];

        for (const acc of accountTypes) {
          if (!acc.email) continue;
          
          const existing = await with429Retry(() => 
            DeviceLinkedAccount.filter({ device_id: deviceId, account_type: acc.type })
          );

          if (existing && existing.length > 0) {
            // Update
            await with429Retry(() => DeviceLinkedAccount.update(existing[0].id, {
              email: acc.email,
              password: acc.password
            }));
          } else {
            // Create
            await with429Retry(() => DeviceLinkedAccount.create({
              device_id: deviceId,
              account_type: acc.type,
              email: acc.email,
              password: acc.password
            }));
            accountsCreated++;
          }
        }
        addLog(`✓ חשבונות למשקפת #${deviceData.binocular_number}`);
      }
      addLog(`סה"כ חשבונות חדשים: ${accountsCreated}`);

      // Step 4: Create DeviceApp relationships
      addLog("\n=== שלב 4: שיוך אפליקציות למשקפות ===");
      setProgress("משייך אפליקציות למשקפות...");
      
      const existingRelations = await with429Retry(() => DeviceApp.list());
      const existingRelationsSet = new Set(
        existingRelations.map(r => `${r.device_id}_${r.app_id}`)
      );

      let relationsCreated = 0;
      for (const [deviceNum, appNames] of Object.entries(DEVICE_APPS_MAP)) {
        const deviceId = deviceNumToId[Number(deviceNum)];
        if (!deviceId) {
          addLog(`⚠ לא נמצאה משקפת #${deviceNum} בבסיס הנתונים, מדלג על שיוך אפליקציות.`);
          continue;
        }

        for (const appName of appNames) {
          const appId = appNameToId[appName.toLowerCase()];
          if (!appId) {
            addLog(`⚠ לא נמצא app_id עבור: ${appName} (משקפת #${deviceNum}), מדלג על שיוך.`);
            continue;
          }

          const relationKey = `${deviceId}_${appId}`;
          if (!existingRelationsSet.has(relationKey)) {
            await with429Retry(() => DeviceApp.create({
              device_id: deviceId,
              app_id: appId
            }));
            relationsCreated++;
          }
        }
        addLog(`✓ אפליקציות למשקפת #${deviceNum}: ${appNames.length} אפליקציות`);
      }
      addLog(`סה"כ שיוכים חדשים: ${relationsCreated}`);

      setStatus("success");
      setProgress("הטעינה הושלמה בהצלחה!");
      addLog("\n=== סיום מוצלח! ===");
      
    } catch (error) {
      console.error("Static data load failed:", error);
      setStatus("error");
      setProgress(`שגיאה: ${error.message}`);
      addLog(`❌ שגיאה: ${error.message}`);
    }
  };
  // --- END: Static Data Seeding Function ---


  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ייבוא נתונים למערכת</h1>
          <p className="text-slate-600 mt-1">
            בחרו קובץ CSV/JSON כדי להוסיף או לעדכן נתונים במערכת.
          </p>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">טעינת קובץ</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition ${
                dragActive ? "border-cyan-600 bg-cyan-50" : "border-slate-300 bg-white"
              }`}
            >
              <div className="mb-3">{iconForFile()}</div>
              <p className="text-slate-700 mb-2">גררו לכאן קובץ או לחצו לבחירה</p>
              <p className="text-slate-500 text-sm mb-4">תמיכה: CSV, JSON</p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => document.getElementById("fileInputHidden")?.click()}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  בחר קובץ
                </Button>
                {fileInfo && (
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                    {fileInfo.name}
                  </Badge>
                )}
              </div>
              <input
                id="fileInputHidden"
                type="file"
                accept=".csv,.json,application/json,text/csv"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {fileInfo && (previewRows.length > 0 ? (
              <div className="mt-6">
                <div className="text-sm text-slate-600 mb-2">תצוגה מקדימה (עד 8 שורות):</div>
                <div className="overflow-auto border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-right text-slate-700">
                        {columns.map((c) => (
                          <th key={`head-${c}`} className="px-3 py-2 font-medium">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, idx) => (
                        <tr key={`row-${idx}`} className="odd:bg-white even:bg-slate-50">
                          {columns.map((c) => (
                            <td key={`cell-${idx}-${c}`} className="px-3 py-2">
                              {String(row[c] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null)}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="rounded-2xl shadow-sm lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">סוג הנתונים</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={dataType} onValueChange={setDataType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="בחרו סוג נתונים" />
                </SelectTrigger>
                <SelectContent>
                  {dataTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-2">
                יש לבחור את סוג הנתונים כדי למפות את עמודות הקובץ לשדות במערכת.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">מיפוי שדות</CardTitle>
            </CardHeader>
            <CardContent>
              {(!columns || columns.length === 0) && (
                <div className="text-sm text-slate-500">
                  העלו קובץ כדי להציג את עמודות המידע למיפוי.
                </div>
              )}
              {columns.length > 0 && (
                <div className="overflow-auto border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-right text-slate-700">
                        <th className="px-3 py-2 font-medium">עמודה בקובץ</th>
                        <th className="px-3 py-2 font-medium">שדה במערכת</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((col) => (
                        <tr key={`map-${col}`} className="odd:bg-white even:bg-slate-50">
                          <td className="px-3 py-2">{col}</td>
                          <td className="px-3 py-2">
                            <Select
                              value={fieldMapping[col] ?? "ignore"}
                              onValueChange={(v) =>
                                setFieldMapping((prev) => ({ ...prev, [col]: v }))
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="בחרו שדה" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ignore">Ignore</SelectItem>
                                {(columnsForSelectedType || []).map((f) => (
                                  <SelectItem key={f.value} value={f.value}>
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">אפשרויות ייבוא</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={options.addOnly}
                  onCheckedChange={(v) => setOptions((o) => ({ ...o, addOnly: !!v, upsert: !!v ? o.upsert : false }))}
                  disabled={options.upsert} // if upsert is true, addOnly is implicitly true (or irrelevant)
                />
                הוספת רשומות חדשות בלבד
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={options.upsert}
                  onCheckedChange={(v) => setOptions((o) => ({ ...o, upsert: !!v, addOnly: !!v ? false : o.addOnly }))}
                />
                עדכון רשומות קיימות אם נמצאה התאמה (Upsert)
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={options.wipeReimport}
                  onCheckedChange={(v) => setOptions((o) => ({ ...o, wipeReimport: !!v }))}
                />
                מחיקת נתונים קיימים וייבוא מחדש (לסוג הנתונים הנבחר)
              </label>
            </div>

            <div className="flex flex-wrap gap-3 justify-end">
              <Button variant="outline" onClick={resetAll}>
                ביטול
              </Button>
              <Button
                onClick={handleImport}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={importing}
              >
                {importing ? "מייבא..." : "ייבא נתונים"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* --- START: New Card for Static Data Seeding --- */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="w-5 h-5 text-purple-600" />
              טעינת נתונים ראשונית (קבועה)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              לחצו על הכפתור כדי לטעון נתוני אפליקציות ומשקפות קבועים למערכת. פעולה זו תעדכן נתונים קיימים או תיצור חדשים, ותקשר אפליקציות למשקפות.
            </p>
            <Button
              onClick={handleSeedStaticData}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={seedingStatus === "in-progress"}
            >
              {seedingStatus === "in-progress" ? "טוען..." : "הפעל טעינת נתונים קבועים"}
            </Button>
            {seedingStatus && seedingStatus !== "idle" && (
              <div className="mt-4 p-3 rounded-lg border bg-slate-50">
                <p className={`font-medium ${seedingStatus === "error" ? "text-red-700" : "text-blue-700"}`}>
                  {seedingProgress}
                </p>
                {seedingLog.length > 0 && (
                  <div className="mt-2 text-sm text-slate-600 max-h-40 overflow-y-auto border-t pt-2">
                    {seedingLog.map((log, index) => (
                      <div key={index} className="whitespace-pre-wrap">{log}</div>
                    ))}
                  </div>
                )}
                {seedingStatus === "success" && (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200 mt-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>טעינה הושלמה בהצלחה!</span>
                  </div>
                )}
                {seedingStatus === "error" && (
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 mt-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>טעינה נכשלה!</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        {/* --- END: New Card for Static Data Seeding --- */}


        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2 flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-slate-600" />
              היסטוריית ייבוא
            </CardTitle>
            <div className="text-xs text-slate-500">נשמר באמצעות מאגר הנתונים</div>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-sm text-slate-500">אין היסטוריה להצגה עדיין.</div>
            ) : (
              <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-right text-slate-600">
                      <th className="px-3 py-2 font-medium">תאריך</th>
                      <th className="px-3 py-2 font-medium">שם קובץ</th>
                      <th className="px-3 py-2 font-medium">סוג נתונים</th>
                      <th className="px-3 py-2 font-medium">סטטוס</th>
                      <th className="px-3 py-2 font-medium">לוג שגיאות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="odd:bg-white even:bg-slate-50">
                        <td className="px-3 py-2">
                          {h.created_date ? new Date(h.created_date).toLocaleString("he-IL") : "—"}
                        </td>
                        <td className="px-3 py-2">{h.file_name || "—"}</td>
                        <td className="px-3 py-2">
                          {(
                            {
                              students: "תלמידים",
                              classes: "כיתות",
                              schools: "בתי ספר",
                              devices: "משקפות",
                              apps: "אפליקציות",
                              users: "משתמשים",
                            }[h.data_type] || h.data_type
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {h.status === "success" && (
                            <Badge className="bg-green-100 text-green-800">הצלחה</Badge>
                          )}
                          {h.status === "failure" && (
                            <Badge className="bg-red-100 text-red-800">כשל</Badge>
                          )}
                          {h.status === "partial" && (
                            <Badge className="bg-amber-100 text-amber-800">חלקי</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {h.status !== "success" && h.error_log ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                const blob = new Blob([h.error_log || "—"], {
                                  type: "text/plain;charset=utf-8",
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `error_log_${h.id}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              title="הורדת לוג שגיאות"
                            >
                              <Download className="w-4 h-4" />
                              הורד
                            </Button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              פעולה מסוכנת
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              לחיצה על הכפתור הבא תמחק את כל הנתונים במערכת. פעולה זו בלתי הפיכה.
            </p>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setConfirmText("");
                setDeletionStatus(null);
                setDeletionProgress("");
                setDangerOpen(true);
              }}
            >
              מחק את כל הנתונים מהמערכת
            </Button>
            {deletionStatus === "success" && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5" />
                <span>כל הנתונים נמחקו בהצלחה!</span>
              </div>
            )}
            {deletionStatus === "error" && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertTriangle className="w-5 h-5" />
                <span>אירעה שגיאה במחיקת הנתונים.</span>
              </div>
            )}
            {deletionStatus === "deleting" && (
              <div className="flex items-center gap-2 text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <span className="animate-pulse">{deletionProgress}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dangerOpen} onOpenChange={setDangerOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>אזהרה – פעולה בלתי הפיכה!</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-slate-700">
                פעולה זו תמחק את כל הנתונים במערכת: משקפות, אפליקציות, בתי ספר, תוכניות, מורים, חשבונות, היסטוריית ייבוא, הגדרות וכל האפשרויות.
              </p>
              <p className="text-red-600 font-semibold">פעולה זו בלתי הפיכה!</p>
              <p className="text-slate-600 text-sm">להמשך, הקלידו: DELETE ALL</p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='הקלידו "DELETE ALL"'
              />
            </div>
            <DialogFooter className="justify-between gap-2">
              <Button variant="outline" onClick={() => setDangerOpen(false)}>
                ביטול
              </Button>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                disabled={confirmText !== "DELETE ALL" || deletionStatus === "deleting"}
                onClick={handleFullDeletion}
              >
                {deletionStatus === "deleting" ? "מוחק..." : "כן, מחק הכול"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
