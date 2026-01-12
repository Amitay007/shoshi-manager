import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  X,
  Gift,
  PenSquare,
  Turtle,
  Dot,
  Calendar as CalendarIcon,
  Star,
  Wifi, // NEW: Wifi icon for internet required
  WifiOff // NEW: WifiOff icon for internet not required
} from "lucide-react";
import { format, addMonths, addYears } from "date-fns";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import AppLinkButtons from "@/components/common/AppLinkButtons"; // NEW: AppLinkButtons
import { VRApp } from "@/entities/VRApp";
import { VRDevice } from "@/entities/VRDevice";
import { DeviceApp } from "@/entities/DeviceApp";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Switch } from "@/components/ui/switch"; // NEW: Switch component for toggle
import { GenreOption } from "@/entities/GenreOption";
import { EducationFieldOption } from "@/entities/EducationFieldOption";
import { PlatformOption } from "@/entities/PlatformOption";
import { PlayerCountOption } from "@/entities/PlayerCountOption";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from "@/components/ui/alert-dialog";
import { with429Retry } from "@/components/utils/retry";

// Utility function to add a delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function AddAppPage() {
  const urlParamsTop = new URLSearchParams(window.location.search);
  const editIdParam = urlParamsTop.get("editId");
  const modeParam = urlParamsTop.get("mode");
  const returnToParamRaw = urlParamsTop.get("returnTo");
  const returnToParam = returnToParamRaw ? decodeURIComponent(returnToParamRaw) : null;
  const viewOnly = modeParam === "view" || urlParamsTop.get("view") === "1" || urlParamsTop.get("viewOnly") === "true";
  const isEditing = !!editIdParam && !viewOnly;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    // headset_number field removed per request
    purchase_type: "",
    purchase_price: "",
    purchase_currency: "₪",
    store_link: "", // General store link for the app
    subscription_type: "",
    subscription_start_date: null,
    subscription_end_date: null,
    subscription_price: "",
    subscription_currency: "₪",
    subscription_store_link: "", // NEW: Store link for subscriptions
    website_link: "", // Company website link
    purchased_on: null,
    other_purchase_text: "",
    downloaded_on: null, // NEW: free download date
    genre: [],
    education_field: [],
    supported_platforms: [],
    player_count_details: [],
    research_by: [], // Will store user IDs
    purchased_by: [], // Will store user IDs
    installed_by: [], // Will store user IDs
    is_research: false,
    is_installed: false,
    rating: null, // New field for rating (0-5)
    internet_required: false, // NEW: internet required toggle default
    hand_tracking: false // NEW: Hand Tracking support toggle default
  });

  const navigate = useNavigate();

  // Category modal states
  const [openGenre, setOpenGenre] = useState(false);
  const [openEdu, setOpenEdu] = useState(false);
  const [openPlatforms, setOpenPlatforms] = useState(false);

  // Options from DB (GenreOption)
  const [genreOptionsDb, setGenreOptionsDb] = useState([]);
  const [openGenreDeleteConfirm, setOpenGenreDeleteConfirm] = useState(false);
  // NEW: add-genre states (already exist)
  const [newGenreLabel, setNewGenreLabel] = useState("");
  const [openAddGenreConfirm, setOpenAddGenreConfirm] = useState(false);

  // NEW: Options from DB for Education and Platforms
  const [eduOptionsDb, setEduOptionsDb] = useState([]);
  const [platformOptionsDb, setPlatformOptionsDb] = useState([]);

  // NEW: Delete confirmations
  const [openEduDeleteConfirm, setOpenEduDeleteConfirm] = useState(false);
  const [openPlatformDeleteConfirm, setOpenPlatformDeleteConfirm] = useState(false);

  // NEW: Add-option states for Education and Platforms
  const [newEduLabel, setNewEduLabel] = useState("");
  const [openAddEduConfirm, setOpenAddEduConfirm] = useState(false);
  const [newPlatformLabel, setNewPlatformLabel] = useState("");
  const [openAddPlatformConfirm, setOpenAddPlatformConfirm] = useState(false);

  // NEW: Players Pro - add definition state
  const [newPlayerOptionLabel, setNewPlayerOptionLabel] = useState("");

  // Temporary selections for dialogs
  const [tempGenres, setTempGenres] = useState(formData.genre || []);
  const [tempEdu, setTempEdu] = useState(formData.education_field || []);
  const [tempPlatforms, setTempPlatforms] = useState(formData.supported_platforms || []);

  const [associatedDevice, setAssociatedDevice] = useState(null); // device object if headsetId is provided
  const [showAssociation, setShowAssociation] = useState(true);

  // New states for User selection
  const [users, setUsers] = useState([]); // All available users

  // New states for Players Pro modal
  const [openPlayersProDialog, setOpenPlayersProDialog] = useState(false);
  const [openPlayersPro, setOpenPlayersPro] = useState({
    single: false,
    coopCount: "",
    multiCount: "",
    metaverseInfinity: false,
    metaverseCount: "",
    unknown: false // ADDED: unknown player count option
  });
  // NEW: popups control for players sub-options
  const [openCoopPop, setOpenCoopPop] = useState(false);
  const [openMultiPop, setOpenMultiPop] = useState(false);
  const [openMetaPop, setOpenMetaPop] = useState(false);

  // New states for Team Quick modal
  const [openTeamQuick, setOpenTeamQuick] = useState(false);
  const [tempTeamSelection, setTempTeamSelection] = useState({}); // Maps userId to {research, purchased, installed}

  // NEW: Subscription type dialog state
  const [openSubTypeDialog, setOpenSubTypeDialog] = useState(false);
  const [tempSubType, setTempSubType] = useState(formData.subscription_type || "");
  const [tempStartDate, setTempStartDate] = useState(formData.subscription_start_date || null);

  // NEW: Summary modal state
  const [openSummary, setOpenSummary] = useState(false);

  // NEW: Device selection for simultaneous installation
  const [allDevices, setAllDevices] = useState([]);
  const [selectedDeviceNumbers, setSelectedDeviceNumbers] = new useState(new Set());
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [currentAppDevices, setCurrentAppDevices] = useState([]); // Numbers of devices that have this app

  // Read context from URL and fetch users
  useEffect(() => {
    const init = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const headsetId = urlParams.get("headsetId");

      if (headsetId) {
        const dev = await with429Retry(() => VRDevice.get(headsetId));
        await sleep(300); // Add delay
        if (dev) {
          setAssociatedDevice(dev);
          // Pre-flag new apps as installed when coming from a device,
          // reflecting that they will be installed on this specific device.
          setFormData((prev) => ({ ...prev, is_installed: true }));
          // Initialize selectedDeviceNumbers with the associated device's number if creating a new app
          // This ensures the device is pre-selected in the modal if app is new.
          if (!editIdParam && Number.isFinite(Number(dev.binocular_number))) {
            setSelectedDeviceNumbers(new Set([Number(dev.binocular_number)]));
          }
        }
      }

      // REPLACED: Use fixed team names as requested
      setUsers([
        { id: "tm-amitza", name: "אמיצה" },
        { id: "tm-natznatzit", name: "נאצנאצית" },
        { id: "tm-gibor", name: "גיבור" }
      ]);

      // Load/seed genres from DB (Meta-style)
      const metaGenres = [
        { value: "action", label: "פעולה", active: true },
        { value: "adventure", label: "הרפתקה", active: true },
        { value: "casual", label: "קז׳ואל", active: true },
        { value: "puzzle", label: "פאזל", active: true },
        { value: "simulation", label: "סימולציה", active: true },
        { value: "sports", label: "ספורט", active: true },
        { value: "racing", label: "מירוצים", active: true },
        { value: "shooter", label: "יריות", active: true },
        { value: "strategy", label: "אסטרטגיה", active: true },
        { value: "music_rhythm", label: "מוזיקה וקצב", active: true },
        { value: "art_creativity", label: "אמנות ויצירה", active: true },
        { value: "education", label: "חינוך", active: true },
        { value: "health_fitness", label: "בריאות וכושר", active: true },
        { value: "social", label: "חברתי", active: true },
        { value: "entertainment", label: "בידור", active: true },
        { value: "productivity", label: "פרודוקטיביות", active: true },
        { value: "tools", label: "כלים", active: true },
        { value: "horror", label: "אימה", active: true },
        { value: "exploration", label: "חוויות", active: true },
        { value: "kids_family", label: "ילדים ומשפחה", active: true }
      ];


      let gopts = await with429Retry(() => GenreOption.list());
      await sleep(300); // Small delay

      if (!gopts || gopts.length === 0) {
        // If no genres exist, create all metaGenres
        await with429Retry(() => GenreOption.bulkCreate(metaGenres));
        await sleep(300); // Small delay
        gopts = await with429Retry(() => GenreOption.list()); // Re-fetch after creation
      } else {
        // If genres exist, check for missing ones and add them
        const existingLabels = new Set(gopts.map((o) => o.label));
        const missing = metaGenres.filter((m) => !existingLabels.has(m.label));
        if (missing.length > 0) {
          await with429Retry(() => GenreOption.bulkCreate(missing));
          await sleep(300); // Small delay
          gopts = await with429Retry(() => GenreOption.list()); // Re-fetch after creation
        }
      }

      setGenreOptionsDb(gopts || []);
      await sleep(300); // Small delay

      // NEW: Load/seed Education Field options
      const defaultEdu = [
        { value: "history", label: "היסטוריה", active: true },
        { value: "space", label: "חלל", active: true },
        { value: "biology", label: "ביולוגיה", active: true },
        { value: "art", label: "אמנות", active: true },
        { value: "language", label: "שפה", active: true },
        { value: "stem", label: "STEM", active: true }
      ];

      let edu = await with429Retry(() => EducationFieldOption.list());
      await sleep(300); // Small delay

      if (!edu || edu.length === 0) {
        await with429Retry(() => EducationFieldOption.bulkCreate(defaultEdu));
        await sleep(300); // Small delay
        edu = await with429Retry(() => EducationFieldOption.list());
      } else {
        const existingEduLabels = new Set(edu.map((o) => o.label));
        const missingEdu = defaultEdu.filter((m) => !existingEduLabels.has(m.label));
        if (missingEdu.length > 0) {
          await with429Retry(() => EducationFieldOption.bulkCreate(missingEdu));
          await sleep(300); // Small delay
          edu = await with429Retry(() => EducationFieldOption.list());
        }
      }
      setEduOptionsDb(edu || []);
      await sleep(300); // Small delay

      // NEW: Load/seed Platform options
      const defaultPlatforms = [
        { value: "quest_2", label: "Quest 2", active: true },
        { value: "quest_3", label: "Quest 3", active: true },
        { value: "quest_pro", label: "Quest Pro", active: true },
        { value: "rift", label: "Rift", active: true },
        { value: "pcvr", label: "PCVR", active: true },
        { value: "steamvr", label: "SteamVR", active: true },
        { value: "psvr", label: "PSVR", active: true }
      ];

      let plats = await with429Retry(() => PlatformOption.list());
      await sleep(300); // Small delay

      if (!plats || plats.length === 0) {
        await with429Retry(() => PlatformOption.bulkCreate(defaultPlatforms));
        await sleep(300); // Small delay
        plats = await with429Retry(() => PlatformOption.list());
      } else {
        const existingPlatLabels = new Set(plats.map((o) => o.label));
        const missingPlats = defaultPlatforms.filter((m) => !existingPlatLabels.has(m.label));
        if (missingPlats.length > 0) {
          await with429Retry(() => PlatformOption.bulkCreate(missingPlats));
          await sleep(300); // Small delay
          plats = await with429Retry(() => PlatformOption.list());
        }
      }
      setPlatformOptionsDb(plats || []);
      await sleep(300); // Small delay

      // NEW: Load all devices for selection
      const devices = await with429Retry(() => VRDevice.list());
      await sleep(300); // Small delay
      setAllDevices(devices || []);
    };
    init();
  }, []);

  // NEW: Load current app's devices when editing
  useEffect(() => {
    const loadAppDevices = async () => {
      if (!editIdParam) {
        setCurrentAppDevices([]);
        return;
      }

      try {
        const [deviceApps, devices] = await Promise.all([
          with429Retry(() => DeviceApp.filter({ app_id: editIdParam })),
          with429Retry(() => VRDevice.list())
        ]);

        const deviceIdToNumber = new Map(
          (devices || []).map((d) => [d.id, Number(d.binocular_number)])
        );

        const numbers = (deviceApps || [])
          .map((da) => deviceIdToNumber.get(da.device_id))
          .filter((n) => Number.isFinite(n))
          .sort((a, b) => a - b);

        setCurrentAppDevices(numbers);
      } catch (error) {
        console.error("Error loading app devices:", error);
        setCurrentAppDevices([]);
      }
    };

    loadAppDevices();
  }, [editIdParam]);

  // Load existing app into form when editIdParam exists (for view-only or edit prefill)
  useEffect(() => {
    const toDate = (v) => v ? new Date(v) : null;
    const loadExisting = async () => {
      if (!editIdParam) return;
      const existing = await with429Retry(() => VRApp.get(editIdParam));
      if (!existing) return;
      setFormData((prev) => ({
        ...prev,
        name: existing.name || "",
        description: existing.description || "",
        purchase_type: existing.purchase_type || "free",
        purchase_price: existing.purchase_price ?? "",
        purchase_currency: existing.purchase_currency || "₪",
        store_link: existing.store_link || "", // General store link
        website_link: existing.website_link || "",
        subscription_type: existing.subscription_type || "",
        subscription_price: existing.subscription_price ?? "",
        subscription_currency: existing.subscription_currency || "₪",
        subscription_start_date: toDate(existing.subscription_start_date),
        subscription_end_date: toDate(existing.subscription_end_date),
        subscription_store_link: existing.subscription_store_link || "", // NEW
        purchased_on: toDate(existing.purchased_on),
        downloaded_on: toDate(existing.downloaded_on),
        other_purchase_text: existing.other_purchase_text || "",
        genre: existing.genre || [],
        education_field: existing.education_field || [],
        supported_platforms: existing.supported_platforms || [],
        player_count_details: existing.player_count_details || [],
        research_by: existing.research_by || [],
        purchased_by: existing.purchased_by || [],
        installed_by: existing.installed_by || [],
        is_research: !!existing.is_research,
        is_installed: !!existing.is_installed,
        rating: existing.rating ?? null,
        internet_required: !!existing.internet_required,
        hand_tracking: !!existing.hand_tracking // NEW: Load hand_tracking
      }));
    };
    loadExisting();
  }, [editIdParam]);

  // Effect to initialize tempTeamSelection when the team quick modal opens
  useEffect(() => {
    if (openTeamQuick) {
      const initialSelection = {};
      users.forEach((user) => {
        initialSelection[user.id] = {
          research: (formData.research_by || []).includes(user.id),
          purchased: (formData.purchased_by || []).includes(user.id),
          installed: (formData.installed_by || []).includes(user.id)
        };
      });
      // Ensure tempTeamSelection is mutable for updates
      setTempTeamSelection(initialSelection);
    }
  }, [openTeamQuick, users, formData.research_by, formData.purchased_by, formData.installed_by]);

  // Helpers
  const toggleFromList = (list, value) => (list || []).includes(value) ? (list || []).filter((v) => v !== value) : [...(list || []), value];
  const handleFieldChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const applyGenres = () => { setField(formData.genre, "genre", tempGenres); setOpenGenre(false); };
  const applyEdu = () => { setField(formData.education_field, "education_field", tempEdu); setOpenEdu(false); };
  const applyPlatforms = () => { setField(formData.supported_platforms, "supported_platforms", tempPlatforms); setOpenPlatforms(false); };

  const computeSubEnd = (start, type) => {
    if (!start || !type) return null;
    const d = new Date(start);
    if (type === "monthly") return addMonths(d, 1);
    if (type === "semi_annual") return addMonths(d, 6);
    if (type === "yearly") return addYears(d, 1);
    return null;
  };

  const applyPlayersPro = () => {
    const details = [];
    if (openPlayersPro.single) {
      details.push({ mode: "Single", count: "1" });
    }
    if (openPlayersPro.coopCount && String(openPlayersPro.coopCount).trim() !== "") {
      details.push({ mode: "Co-op", count: String(openPlayersPro.coopCount).trim() });
    }
    if (openPlayersPro.multiCount && String(openPlayersPro.multiCount).trim() !== "") {
      details.push({ mode: "Multiplayer", count: String(openPlayersPro.multiCount).trim() });
    }
    if (openPlayersPro.metaverseInfinity) {
      details.push({ mode: "Metaverse", count: "∞" });
    } else if (openPlayersPro.metaverseCount && String(openPlayersPro.metaverseCount).trim() !== "") {
      details.push({ mode: "Metaverse", count: String(openPlayersPro.metaverseCount).trim() });
    }
    if (openPlayersPro.unknown) {
      details.push({ mode: "Unknown", count: "לא ידוע" });
    }
    handleFieldChange("player_count_details", details);
    setOpenPlayersProDialog(false);
  };

  const applyTeamQuick = () => {
    const newResearchBy = [];
    const newPurchasedBy = [];
    const newInstalledBy = [];

    users.forEach((user) => {
      const status = tempTeamSelection[user.id];
      if (status) {
        if (status.research) newResearchBy.push(user.id);
        if (status.purchased) newPurchasedBy.push(user.id);
        if (status.installed) newInstalledBy.push(user.id);
      }
    });

    setFormData((prev) => ({
      ...prev,
      research_by: newResearchBy,
      purchased_by: newPurchasedBy,
      installed_by: newInstalledBy
    }));
    setOpenTeamQuick(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (viewOnly) return; // Prevent submission in viewOnly mode

    try {
      // Persist fields for VRApp creation/update
      const dataToSave = {
        name: formData.name,
        description: formData.description || "",
        purchase_type: formData.purchase_type || "free",
        purchase_price: formData.purchase_price ? Number(formData.purchase_price) : undefined,
        purchase_currency: formData.purchase_currency || undefined,
        store_link: formData.store_link || undefined, // General store link
        website_link: formData.website_link || undefined,
        subscription_type: formData.subscription_type || undefined,
        subscription_price: formData.subscription_price ? Number(formData.subscription_price) : undefined,
        subscription_currency: formData.subscription_currency || undefined,
        subscription_start_date: formData.subscription_start_date || undefined,
        subscription_end_date: formData.subscription_end_date || undefined,
        subscription_store_link: formData.subscription_store_link || undefined, // NEW
        purchased_on: formData.purchased_on || undefined,
        downloaded_on: formData.downloaded_on || undefined, // NEW: Added downloaded_on
        other_purchase_text: formData.other_purchase_text || undefined,
        research_by: formData.research_by || [],
        purchased_by: formData.purchased_by || [],
        installed_by: formData.installed_by || [],
        supported_platforms: formData.supported_platforms || [],
        education_field: formData.education_field || [],
        genre: formData.genre || [],
        player_count_details: formData.player_count_details || [],
        is_research: !!formData.is_research,
        is_installed: !!formData.is_installed,
        rating: formData.rating ? Number(formData.rating) : null,
        internet_required: !!formData.internet_required, // NEW: persist internet requirement
        hand_tracking: !!formData.hand_tracking // NEW: persist hand tracking
      };

      let savedAppId = editIdParam;

      // Check if we're editing or creating
      if (editIdParam) {
        // UPDATE existing app
        await with429Retry(() => VRApp.update(editIdParam, dataToSave));
        await sleep(500); // Add delay after update
        savedAppId = editIdParam;
      } else {
        // CREATE new app
        const createdApp = await with429Retry(() => VRApp.create(dataToSave));
        await sleep(500); // Add delay after create
        if (!createdApp || !createdApp.id) {
          console.error("Failed to create app.");
          return; // Stop if app creation fails
        }
        savedAppId = createdApp.id;
      }

      // --- DeviceApp Management ---
      const deviceIdByNumber = new Map();
      allDevices.forEach((d) => {
        const num = Number(d.binocular_number);
        if (Number.isFinite(num)) {
          deviceIdByNumber.set(num, d.id);
        }
      });

      // Combined set of devices that *should* be installed
      const targetInstalledDevices = new Set(selectedDeviceNumbers);

      // If there's an associated device from the URL param and it's not unchecked
      if (associatedDevice && associatedDevice.id && showAssociation) {
        const associatedBinocularNumber = Number(associatedDevice.binocular_number);
        if (Number.isFinite(associatedBinocularNumber)) {
          targetInstalledDevices.add(associatedBinocularNumber);
        }
      }

      // Devices currently installed according to the database
      const currentlyInstalledDevices = new Set(currentAppDevices);

      const devicesToAdd = new Set();
      const devicesToRemove = new Set();

      // Determine what to add
      for (const num of targetInstalledDevices) {
        if (!currentlyInstalledDevices.has(num)) {
          devicesToAdd.add(num);
        }
      }

      // Determine what to remove
      for (const num of currentlyInstalledDevices) {
        if (!targetInstalledDevices.has(num)) {
          devicesToRemove.add(num);
        }
      }

      // Perform additions
      for (const num of devicesToAdd) {
        const deviceId = deviceIdByNumber.get(num);
        if (deviceId) {
          try {
            await with429Retry(() => DeviceApp.create({
              device_id: deviceId,
              app_id: savedAppId,
              status: "installed",
              installation_date: new Date().toISOString().split('T')[0]
            }));
            await sleep(300); // Add delay between additions
          } catch (error) {
            console.warn(`Failed to create DeviceApp for device ${num}:`, error);
          }
        }
      }

      // Perform removals with improved error handling
      for (const num of devicesToRemove) {
        const deviceId = deviceIdByNumber.get(num);
        if (!deviceId) continue;

        try {
          // Get all existing relations for this device-app pair
          const existingRelations = await with429Retry(() => DeviceApp.filter({
            device_id: deviceId,
            app_id: savedAppId
          }));

          if (!existingRelations || existingRelations.length === 0) {
            continue;
          }

          // Try to delete each relation
          for (const rel of existingRelations) {
            if (!rel || !rel.id) continue;

            try {
              // Try to delete the relation with retry mechanism
              await with429Retry(() => DeviceApp.delete(rel.id));
              // Add delay between deletions to prevent rate limiting
              await sleep(300);
            } catch (deleteErr) {
              // Check if it's a 404 error (already deleted)
              const is404 =
                deleteErr?.response?.status === 404 ||
                deleteErr?.status === 404 ||
                String(deleteErr?.message || "").toLowerCase().includes("not found") ||
                String(deleteErr?.response?.data?.message || "").toLowerCase().includes("not found");

              if (is404) {
                // Silently ignore - relation was already deleted
                console.log(`DeviceApp ${rel.id} already deleted, skipping`);
                continue;
              }

              // For network errors, log and continue
              const isNetworkError = String(deleteErr?.message || "").toLowerCase().includes("network error");
              if (isNetworkError) {
                console.warn(`Network error deleting DeviceApp ${rel.id}, skipping`);
                continue;
              }

              // For other errors, just log and continue
              console.warn(`Error deleting DeviceApp ${rel.id}:`, deleteErr);
            }
          }
        } catch (filterError) {
          // If filtering fails, just log and continue
          console.warn(`Error filtering DeviceApp for device ${num}:`, filterError);
        }
      }

      // Update the app's overall `is_installed` status based on the final state
      await sleep(500); // Delay before final update
      await with429Retry(() => VRApp.update(savedAppId, { is_installed: targetInstalledDevices.size > 0 }));
      await sleep(300); // Delay after final update
      // --- End DeviceApp Management ---

      // Prefer explicit returnTo when provided (from DeviceInfo or AddNewHeadset)
      if (returnToParam) {
        navigate(createPageUrl(returnToParam));
        return;
      }
      // Navigate after save:
      if (associatedDevice && showAssociation) {
        // Return to previous screen (device) when coming from a device context
        navigate(-1);
      } else {
        // Otherwise, go to General Apps overview
        navigate(createPageUrl("GeneralApps"));
      }
    } catch (error) {
      console.error("Error saving app:", error);
      alert("שגיאה בשמירת האפליקציה. אנא נסה שוב.");
    }
  };

  const purchaseIcons = {
    subscription: <PenSquare className="w-4 h-4" />,
    free: <Gift className="w-4 h-4" />,
    one_time: <Dot className="w-4 h-4" />,
    other: <Turtle className="w-4 h-4" />
  };

  // NEW: Toggle device selection
  const toggleDeviceNumber = (num) => {
    setSelectedDeviceNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        next.add(num);
      }
      return next;
    });
  };

  // NEW: Initialize selectedDeviceNumbers when opening selector
  const handleOpenDeviceSelector = () => {
    // If an associated device is present and should be considered, pre-select it
    const initialSelection = new Set(currentAppDevices);
    if (associatedDevice && associatedDevice.id && showAssociation) {
      const associatedBinocularNumber = Number(associatedDevice.binocular_number);
      if (Number.isFinite(associatedBinocularNumber)) {
        initialSelection.add(associatedBinocularNumber);
      }
    }
    setSelectedDeviceNumbers(initialSelection);
    setShowDeviceSelector(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-cyan-900">
            {viewOnly ? "פרטי אפליקציה" : isEditing ? "עריכת אפליקציה" : "הוספת אפליקציה"}
          </h1>
          <div className="flex items-center gap-2">
            {viewOnly && editIdParam &&
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl(`AddAppPage?editId=${editIdParam}`))}>
                ערוך
              </Button>
            }
            <BackHomeButtons />
          </div>
        </div>

        {/* Rating stars under the title */}
        <div className="mb-4 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((i) =>
            <button
              key={i}
              type="button"
              onClick={() => !viewOnly && handleFieldChange("rating", i)}
              className="p-1"
              title={`דירוג ${i}`}
              disabled={viewOnly}>
              <Star className={`w-6 h-6 ${formData.rating >= i ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`} />
            </button>
          )}
          {formData.rating !== null ?
            <button type="button" onClick={() => !viewOnly && handleFieldChange("rating", null)} className="text-sm text-slate-500 underline" disabled={viewOnly}>
              נקה דירוג
            </button> :
            null}
        </div>

        {/* Device association indicator */}
        {associatedDevice && showAssociation &&
          <Card className="mb-4 border-cyan-200">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-cyan-100 text-cyan-800">משויך למשקפת</Badge>
                <span className="font-medium">
                  #{associatedDevice.binocular_number || "—"} {associatedDevice.device_name ? `— ${associatedDevice.device_name}` : ""}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => !viewOnly && setShowAssociation(false)} className="gap-2" disabled={viewOnly}>
                הסר שיוך <X className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        }

        {/* Flags under the title - NOW SHOWN ALWAYS (not just when associatedDevice or isEditing) */}
        {!viewOnly && (
          <Card className="mb-4">
            <CardContent className="py-4">
              <div className="flex gap-6 items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.is_research}
                    onCheckedChange={(v) => {
                      if (viewOnly) return;
                      const val = Boolean(v);
                      // If marking as research, unmark installed to keep tags mutually exclusive
                      setFormData((prev) => ({
                        ...prev,
                        is_research: val,
                        ...(val ? { is_installed: false } : {})
                      }));
                    }}
                    disabled={viewOnly} />
                  <span>מחקר</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.is_installed}
                    onCheckedChange={(v) => {
                      if (viewOnly) return;
                      const val = Boolean(v);
                      // If marking as installed, unmark research to keep tags mutually exclusive
                      setFormData((prev) => ({
                        ...prev,
                        is_installed: val,
                        ...(val ? { is_research: false } : {})
                      }));
                    }}
                    disabled={viewOnly} />
                  <span>מותקן</span>
                </label>
                <span className="text-sm text-slate-500">
                  הגדרה זו תקבע היכן תופיע האפליקציה לאחר השמירה.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" style={{ opacity: viewOnly ? 0.98 : 1 }}>
          {/* מידע כללי */}
          <Card>
            <CardHeader>
              <CardTitle>מידע כללי</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="שם האפליקציה"
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                required
                disabled={viewOnly} />
              <Textarea
                placeholder="תיאור האפליקציה"
                value={formData.description}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                disabled={viewOnly}
                className="min-h-[140px] max-h-[420px] overflow-y-auto resize-y" />
            </CardContent>
          </Card>

          {/* View-only: Links + Team summary */}
          {viewOnly &&
            <>
              <Card>
                <CardHeader>
                  <CardTitle>קישורים</CardTitle>
                </CardHeader>
                <CardContent>
                  <AppLinkButtons
                    storeLink={formData.store_link || ""}
                    websiteLink={formData.website_link || ""}
                    subscriptionLink={formData.subscription_store_link || ""}
                    stopPropagation={false} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>פרטי צוות</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {(() => {
                    const mapName = (id) => users.find((u) => u.id === id)?.name || id;
                    const researchList = (formData.research_by || []).map(mapName).filter(Boolean);
                    const purchasedList = (formData.purchased_by || []).map(mapName).filter(Boolean);
                    const installedList = (formData.installed_by || []).map(mapName).filter(Boolean);
                    const hasAny = researchList.length || purchasedList.length || installedList.length;
                    if (!hasAny) {
                      return <div className="text-slate-500">לא הוגדר צוות עבור אפליקציה זו.</div>;
                    }
                    return (
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <div className="text-slate-500 mb-1">מחקר</div>
                          <div className="font-medium">{researchList.length ? researchList.join(", ") : "—"}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-1">רכש</div>
                          <div className="font-medium">{purchasedList.length ? purchasedList.join(", ") : "—"}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-1">התקנה</div>
                          <div className="font-medium">{installedList.length ? installedList.join(", ") : "—"}</div>
                        </div>
                      </div>);

                  })()}
                </CardContent>
              </Card>
            </>
          }

          {/* מאפייני אפליקציה */}
          <Card>
            <CardHeader>
              <CardTitle>מאפייני אפליקציה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Button type="button" variant="outline" className="w-full justify-start" onClick={() => { if (!viewOnly) { setOpenGenre(true); setTempGenres(formData.genre || []); } }} disabled={viewOnly}>
                    ז'אנר
                    {formData.genre && formData.genre.length > 0 &&
                      <span className="ml-2 text-sm text-gray-500">({formData.genre.length})</span>
                    }
                  </Button>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.genre.map((item) =>
                      <Badge key={item} variant="secondary">{item}</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Button type="button" variant="outline" className="w-full justify-start" onClick={() => { if (!viewOnly) { setOpenEdu(true); setTempEdu(formData.education_field || []); } }} disabled={viewOnly}>
                    תחום חינוכי
                    {formData.education_field && formData.education_field.length > 0 &&
                      <span className="ml-2 text-sm text-gray-500">({formData.education_field.length})</span>
                    }
                  </Button>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.education_field.map((item) =>
                      <Badge key={item} variant="secondary">{item}</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Button type="button" variant="outline" className="w-full justify-start" onClick={() => { if (!viewOnly) { setOpenPlatforms(true); setTempPlatforms(formData.supported_platforms || []); } }} disabled={viewOnly}>
                    פלטפורמות נתמכות
                    {formData.supported_platforms && formData.supported_platforms.length > 0 &&
                      <span className="ml-2 text-sm text-gray-500">({formData.supported_platforms.length})</span>
                    }
                  </Button>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.supported_platforms.map((item) =>
                      <Badge key={item} variant="secondary">{item}</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      if (!viewOnly) {
                        const existingPlayers = formData.player_count_details || [];
                        setOpenPlayersPro({
                          single: existingPlayers.some((p) => p.mode === "Single"),
                          coopCount: existingPlayers.find((p) => p.mode === "Co-op")?.count || "",
                          multiCount: existingPlayers.find((p) => p.mode === "Multiplayer")?.count || "",
                          metaverseInfinity: existingPlayers.some((p) => p.mode === "Metaverse" && p.count === "∞"),
                          metaverseCount: existingPlayers.find((p) => p.mode === "Metaverse" && p.count !== "∞")?.count || "",
                          unknown: existingPlayers.some((p) => p.mode === "Unknown")
                        });
                        setOpenPlayersProDialog(true);
                      }
                    }}
                    disabled={viewOnly}>
                    מספר שחקנים
                    {formData.player_count_details && formData.player_count_details.length > 0 &&
                      <span className="ml-2 text-sm text-gray-500">
                        ({formData.player_count_details.length})
                      </span>
                    }
                  </Button>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(formData.player_count_details || []).map((p, idx) =>
                      <Badge key={`p-badge-${p.mode}-${p.count}-${idx}`} variant="secondary">
                        {p.mode}:{' '}{p.count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Internet required toggle with dynamic label */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  {formData.internet_required ?
                    <>
                      <Wifi className="w-5 h-5 text-cyan-600" />
                      <span className="text-sm font-medium">דורש אינטרנט</span>
                    </> :
                    <>
                      <WifiOff className="w-5 h-5 text-slate-400" />
                      <span className="text-sm font-medium">לא דורש אינטרנט</span>
                    </>
                  }
                </div>
                <Switch
                  checked={!!formData.internet_required}
                  onCheckedChange={(v) => !viewOnly && handleFieldChange("internet_required", Boolean(v))}
                  disabled={viewOnly} className="px-16 rounded-full peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input" />
              </div>

              {/* Hand Tracking toggle */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="text-sm font-medium">
                    {formData.hand_tracking ? "תומך ב-Hand Tracking" : "לא תומך ב-Hand Tracking"}
                  </span>
                </div>
                <Switch
                  checked={!!formData.hand_tracking}
                  onCheckedChange={(v) => !viewOnly && handleFieldChange("hand_tracking", Boolean(v))}
                  disabled={viewOnly} className="px-16 rounded-full peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input" />
              </div>
            </CardContent>
          </Card>

          {/* Dialogs for categories */}
          <Dialog open={openGenre} onOpenChange={setOpenGenre}>
            <DialogContent>
              <DialogHeader><DialogTitle>בחר ז'אנרים</DialogTitle></DialogHeader>

              {/* NEW: Add-genre inline row */}
              <div className="flex items-center gap-2 mb-3">
                <Input
                  placeholder="הזן ז'אנר חדש להוספה למאגר הכללי"
                  value={newGenreLabel}
                  onChange={(e) => setNewGenreLabel(e.target.value)}
                  disabled={viewOnly} />
                <Button
                  type="button"
                  onClick={() => {
                    if (!viewOnly && (newGenreLabel || '').trim()) {
                      setOpenAddGenreConfirm(true);
                    }
                  }}
                  disabled={!String(newGenreLabel || '').trim() || viewOnly}>
                  הוסף ז'אנר
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {genreOptionsDb.length > 0 ?
                  genreOptionsDb.map((opt) =>
                    <label key={opt.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={tempGenres.includes(opt.label)}
                        onCheckedChange={() => !viewOnly && setTempGenres((prev) => toggleFromList(prev, opt.label))}
                        disabled={viewOnly} />
                      <span>{opt.label}</span>
                    </label>
                  ) :
                  <div className="col-span-2 text-sm text-slate-500">לא נמצאו ז'אנרים במאגר.</div>
                }
              </div>
              <div className="flex items-center justify-between gap-2 mt-4">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => !viewOnly && setOpenGenreDeleteConfirm(true)}
                  disabled={viewOnly}>
                  מחיקה
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" type="button" onClick={() => setOpenGenre(false)}>ביטול</Button>
                  <Button type="button" onClick={applyGenres} disabled={viewOnly}>הוסף</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dramatic delete confirmation for genres */}
          <AlertDialog open={openGenreDeleteConfirm} onOpenChange={setOpenGenreDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>אישור מחיקה</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-700">
                  כוונתך היא למחוק אותו מרשימת הז'אנרים הכללית שזמינה לבחירה עבור כל האפליקציות במערכת, ולא רק לבטל את בחירתו עבור האפליקציה הנוכחית. פעולה זו היא בעלת השלכה רחבה על כל האפליקציות שעשויות להשתמש בז'אנר זה בעבר או בעתיד.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-red-200 text-red-600 hover:bg-red-50">
                  וואו, מתחרט
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (viewOnly) return; // Defensive check, action should not be triggered if viewOnly
                    if (!tempGenres || tempGenres.length === 0) {
                      setOpenGenreDeleteConfirm(false);
                      return;
                    }
                    const labelsToDelete = [...tempGenres];
                    const actualGenreOptionsToDelete = (genreOptionsDb || []).filter((o) => labelsToDelete.includes(o.label));
                    for (const opt of actualGenreOptionsToDelete) {
                      await with429Retry(() => GenreOption.delete(opt.id));
                    }
                    const refreshedGenreOptions = await with429Retry(() => GenreOption.list());
                    setGenreOptionsDb(refreshedGenreOptions || []);
                    setTempGenres((prev) => prev.filter((label) => !labelsToDelete.includes(label)));
                    setFormData((prev) => ({
                      ...prev,
                      genre: (prev.genre || []).filter((label) => !labelsToDelete.includes(label))
                    }));
                    setOpenGenreDeleteConfirm(false);
                  }}>
                  בכל זאת - אישור ובצע פעולה מחיקה
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* NEW: Add-genre confirmation */}
          <AlertDialog open={openAddGenreConfirm} onOpenChange={setOpenAddGenreConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>אישור הוספת ז'אנר</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-700">
                  כוונתך היא להוסיף אותו לרשימת הז'אנרים הכללית, כך שיהיה זמין לבחירה עבור כל האפליקציות במערכת. פעולה זו תאפשר שימוש בז'אנר זה לא רק באפליקציה הנוכחית, אלא גם בכל אפליקציה אחרת בעתיד.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-red-200 text-red-600 hover:bg-red-50">
                  בטל
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (viewOnly) return; // Defensive check
                    const label = (newGenreLabel || "").trim();
                    if (!label) {
                      setOpenAddGenreConfirm(false);
                      return;
                    }
                    const exists = (genreOptionsDb || []).some((o) => (o.label || "").trim().toLowerCase() === label.toLowerCase());
                    if (!exists) {
                      const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                      const payload = { value: value || `custom_${Date.now()}`, label, active: true };
                      await with429Retry(() => GenreOption.create(payload));
                      const refreshed = await with429Retry(() => GenreOption.list());
                      setGenreOptionsDb(refreshed || []);
                    }
                    // Auto-select newly added (or existing) label
                    setTempGenres((prev) => Array.from(new Set([...(prev || []), label])));
                    setNewGenreLabel("");
                    setOpenAddGenreConfirm(false);
                  }}>
                  שמור
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* NEW: Education Fields dialog */}
          <Dialog open={openEdu} onOpenChange={setOpenEdu}>
            <DialogContent>
              <DialogHeader><DialogTitle>בחר תחומים חינוכיים</DialogTitle></DialogHeader>

              {/* Add-education inline row */}
              <div className="flex items-center gap-2 mb-3">
                <Input
                  placeholder="הזן תחום חדש להוספה למאגר הכללי"
                  value={newEduLabel}
                  onChange={(e) => setNewEduLabel(e.target.value)}
                  disabled={viewOnly} />
                <Button
                  type="button"
                  onClick={() => {
                    if (!viewOnly && (newEduLabel || '').trim()) setOpenAddEduConfirm(true);
                  }}
                  disabled={!String(newEduLabel || '').trim() || viewOnly}>
                  הוסף תחום
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {eduOptionsDb.length > 0 ?
                  eduOptionsDb.map((opt) =>
                    <label key={opt.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={tempEdu.includes(opt.label)}
                        onCheckedChange={() => !viewOnly && setTempEdu((prev) => toggleFromList(prev, opt.label))}
                        disabled={viewOnly} />
                      <span>{opt.label}</span>
                    </label>
                  ) :
                  <div className="col-span-2 text-sm text-slate-500">לא נמצאו תחומים חינוכיים במאגר.</div>
                }
              </div>

              <div className="flex items-center justify-between gap-2 mt-4">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => !viewOnly && setOpenEduDeleteConfirm(true)}
                  disabled={viewOnly}>
                  מחיקה
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" type="button" onClick={() => setOpenEdu(false)}>ביטול</Button>
                  <Button type="button" onClick={applyEdu} disabled={viewOnly}>הוסף</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Education delete confirmation */}
          <AlertDialog open={openEduDeleteConfirm} onOpenChange={setOpenEduDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>אישור מחיקה</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-700">
                  כוונתך היא למחוק אותו מרשימת התחומים הח חינוכיים הכללית שזמינה לבחירה עבור כל האפליקציות במערכת, ולא רק לבטל את בחירתו עבור האפליקציה הנוכחית. פעולה זו היא בעלת השלכה רחבה על כל האפליקציות שעשויות להשתמש בתחום זה בעבר או בעתיד.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-red-200 text-red-600 hover:bg-red-50">
                  וואו, מתחרט
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (viewOnly) return; // Defensive check
                    if (!tempEdu || tempEdu.length === 0) {
                      setOpenEduDeleteConfirm(false);
                      return;
                    }
                    const labelsToDelete = [...tempEdu];
                    const optsToDelete = (eduOptionsDb || []).filter((o) => labelsToDelete.includes(o.label));
                    for (const opt of optsToDelete) {
                      await with429Retry(() => EducationFieldOption.delete(opt.id));
                    }
                    const refreshed = await with429Retry(() => EducationFieldOption.list());
                    setEduOptionsDb(refreshed || []);
                    setTempEdu((prev) => prev.filter((label) => !labelsToDelete.includes(label)));
                    setFormData((prev) => ({
                      ...prev,
                      education_field: (prev.education_field || []).filter((label) => !labelsToDelete.includes(label))
                    }));
                    setOpenEduDeleteConfirm(false);
                  }}>
                  בכל זאת - אישור ובצע פעולה מחיקה
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Education add confirmation */}
          <AlertDialog open={openAddEduConfirm} onOpenChange={setOpenAddEduConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>אישור הוספת תחום</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-700">
                  כוונתך היא להוסיף אותו לרשימת התחומים החינוכיים הכללית, כך שיהיה זמין לבחירה עבור כל האפליקציות במערכת. פעולה זו תאפשר שימוש בתחום זה לא רק באפליקציה הנוכחית, אלא גם בכל אפליקציה אחרת בעתיד.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-red-200 text-red-600 hover:bg-red-50">
                  בטל
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (viewOnly) return; // Defensive check
                    const label = (newEduLabel || "").trim();
                    if (!label) {
                      setOpenAddEduConfirm(false);
                      return;
                    }
                    const exists = (eduOptionsDb || []).some((o) => (o.label || "").trim().toLowerCase() === label.toLowerCase());
                    if (!exists) {
                      const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                      await with429Retry(() => EducationFieldOption.create({ value: value || `custom_${Date.now()}`, label, active: true }));
                      const refreshed = await with429Retry(() => EducationFieldOption.list());
                      setEduOptionsDb(refreshed || []);
                    }
                    setTempEdu((prev) => Array.from(new Set([...(prev || []), label])));
                    setNewEduLabel("");
                    setOpenAddEduConfirm(false);
                  }}>
                  שמור
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* NEW: Platforms dialog */}
          <Dialog open={openPlatforms} onOpenChange={setOpenPlatforms}>
            <DialogContent>
              <DialogHeader><DialogTitle>בחר פלטפורמות</DialogTitle></DialogHeader>

              {/* Add-platform inline row */}
              <div className="flex items-center gap-2 mb-3">
                <Input
                  placeholder="הזן פלטפורמה חדשה להוספה למאגר הכללי"
                  value={newPlatformLabel}
                  onChange={(e) => setNewPlatformLabel(e.target.value)}
                  disabled={viewOnly} />
                <Button
                  type="button"
                  onClick={() => {
                    if (!viewOnly && (newPlatformLabel || '').trim()) setOpenAddPlatformConfirm(true);
                  }}
                  disabled={!String(newPlatformLabel || '').trim() || viewOnly}>
                  הוסף פלטפורמה
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {platformOptionsDb.length > 0 ?
                  platformOptionsDb.map((opt) =>
                    <label key={opt.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={tempPlatforms.includes(opt.label)}
                        onCheckedChange={() => !viewOnly && setTempPlatforms((prev) => toggleFromList(prev, opt.label))}
                        disabled={viewOnly} />
                      <span>{opt.label}</span>
                    </label>
                  ) :
                  <div className="col-span-2 text-sm text-slate-500">לא נמצאו פלטפורמות במאגר.</div>
                }
              </div>

              <div className="flex items-center justify-between gap-2 mt-4">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => !viewOnly && setOpenPlatformDeleteConfirm(true)}
                  disabled={viewOnly}>
                  מחיקה
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" type="button" onClick={() => setOpenPlatforms(false)}>ביטול</Button>
                  <Button type="button" onClick={applyPlatforms} disabled={viewOnly}>הוסף</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Platforms delete confirmation */}
          <AlertDialog open={openPlatformDeleteConfirm} onOpenChange={setOpenPlatformDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>אישור מחיקה</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-700">
                  כוונתך היא למחוק אותה מרשימת הפלטפורמות הכללית שזמינה לבחירה עבור כל האפליקציות במערכת, ולא רק לבטל את בחירתה עבור האפליקציה הנוכחית. פעולה זו היא בעלת השלכה רחבה על כל האפליקציות שעשויות להשתמש בפלטפורמה זו בעבר או בעתיד.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-red-200 text-red-600 hover:bg-red-50">
                  וואו, מתחרט
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (viewOnly) return; // Defensive check
                    if (!tempPlatforms || tempPlatforms.length === 0) {
                      setOpenPlatformDeleteConfirm(false);
                      return;
                    }
                    const labelsToDelete = [...tempPlatforms];
                    const optsToDelete = (platformOptionsDb || []).filter((o) => labelsToDelete.includes(o.label));
                    for (const opt of optsToDelete) {
                      await with429Retry(() => PlatformOption.delete(opt.id));
                    }
                    const refreshed = await with429Retry(() => PlatformOption.list());
                    setPlatformOptionsDb(refreshed || []);
                    setTempPlatforms((prev) => prev.filter((label) => !labelsToDelete.includes(label)));
                    setFormData((prev) => ({
                      ...prev,
                      supported_platforms: (prev.supported_platforms || []).filter((label) => !labelsToDelete.includes(label))
                    }));
                    setOpenPlatformDeleteConfirm(false);
                  }}>
                  בכל זאת - אישור ובצע פעולה מחיקה
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Platforms add confirmation */}
          <AlertDialog open={openAddPlatformConfirm} onOpenChange={setOpenAddPlatformConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>אישור הוספת פלטפורמה</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-700">
                  כוונתך היא להוסיף אותה לרשימת הפלטפורמות הכללית, כך שתהיה זמינה לבחירה עבור כל האפליקציות במערכת. פעולה זו תאפשר שימוש בפלטפורמה זו לא רק באפליקציה הנוכחית, אלא גם בכל אפליקציה אחרת בעתיד.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-red-200 text-red-600 hover:bg-red-50">
                  בטל
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (viewOnly) return; // Defensive check
                    const label = (newPlatformLabel || "").trim();
                    if (!label) {
                      setOpenAddPlatformConfirm(false);
                      return;
                    }
                    const exists = (platformOptionsDb || []).some((o) => (o.label || "").trim().toLowerCase() === label.toLowerCase());
                    if (!exists) {
                      const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                      await with429Retry(() => PlatformOption.create({ value: value || `custom_${Date.now()}`, label, active: true }));
                      const refreshed = await with429Retry(() => PlatformOption.list());
                      setPlatformOptionsDb(refreshed || []);
                    }
                    setTempPlatforms((prev) => Array.from(new Set([...(prev || []), label])));
                    setNewPlatformLabel("");
                    setOpenAddPlatformConfirm(false);
                  }}>
                  שמור
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog open={openPlayersProDialog} onOpenChange={setOpenPlayersProDialog}>
            <DialogContent>
              <DialogHeader><DialogTitle>הגדרת מספר שחקנים</DialogTitle></DialogHeader>

              {/* NEW: Add Player definition inline row */}
              <div className="flex items-center gap-2 mb-3">
                <Input
                  placeholder="תווית הגדרה חדשה (למשל: Multiplayer 10+)"
                  value={newPlayerOptionLabel}
                  onChange={(e) => setNewPlayerOptionLabel(e.target.value)}
                  disabled={viewOnly} />
                <Button
                  type="button"
                  onClick={async () => {
                    if (viewOnly) return; // Defensive check
                    const label = (newPlayerOptionLabel || "").trim();
                    if (!label) return;
                    const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                    // Assuming PlayerCountOption entity exists and has a create method
                    await with429Retry(() => PlayerCountOption.create({ value: value || `custom_${Date.now()}`, label, active: true }));
                    setNewPlayerOptionLabel("");
                    // No need to refresh a state for PlayerCountOption as it's not currently displayed/managed in this UI directly after creation
                  }}
                  disabled={!String(newPlayerOptionLabel || '').trim() || viewOnly}>
                  הוסף הגדרה
                </Button>
              </div>

              {/* Buttons row per requirement */}
              <div className="space-y-4">
                {/* שחקן יחיד → לחצן ירוק */}
                <Button
                  type="button"
                  onClick={() => !viewOnly && setOpenPlayersPro((prev) => ({ ...prev, single: !prev.single }))}
                  className={openPlayersPro.single ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-600 text-green-700 hover:bg-green-50"}
                  variant={openPlayersPro.single ? "default" : "outline"}
                  disabled={viewOnly}>
                  שחקן יחיד
                </Button>

                {/* ADDED: Unknown player count button */}
                <Button
                  type="button"
                  onClick={() => !viewOnly && setOpenPlayersPro((prev) => ({ ...prev, unknown: !prev.unknown }))}
                  className={openPlayersPro.unknown ? "bg-slate-600 hover:bg-slate-700 text-white" : "border-slate-600 text-slate-700 hover:bg-slate-50"}
                  variant={openPlayersPro.unknown ? "default" : "outline"}
                  disabled={viewOnly}>
                  לא ידוע
                </Button>

                <div className="flex flex-wrap gap-2">

                  {/* שיתוף פעולה → חלון קופץ עם שדה מספר + כפתור אישור */}
                  <Popover open={openCoopPop} onOpenChange={setOpenCoopPop}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="border-cyan-600 text-cyan-700 hover:bg-cyan-50" disabled={viewOnly}>
                        שיתוף פעולה
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-24">מספר</span>
                          <Input
                            type="number"
                            min="1"
                            placeholder="לדוג׳ 2"
                            value={openPlayersPro.coopCount}
                            onChange={(e) => setOpenPlayersPro((prev) => ({ ...prev, coopCount: e.target.value }))}
                            disabled={viewOnly} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setOpenCoopPop(false)}>ביטול</Button>
                          <Button
                            size="sm"
                            onClick={() => { if (!viewOnly) setOpenCoopPop(false); }}
                            disabled={!String(openPlayersPro.coopCount || "").trim() || viewOnly}>
                            אישור
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* רב משתתפים → חלון קופץ עם שדה מספר + כפתור אישור */}
                  <Popover open={openMultiPop} onOpenChange={setOpenMultiPop}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="border-cyan-600 text-cyan-700 hover:bg-cyan-50" disabled={viewOnly}>
                        רב משתתפים
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-24">מספר</span>
                          <Input
                            type="number"
                            min="2"
                            placeholder="לדוג׳ 4"
                            value={openPlayersPro.multiCount}
                            onChange={(e) => setOpenPlayersPro((prev) => ({ ...prev, multiCount: e.target.value }))}
                            disabled={viewOnly} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setOpenMultiPop(false)}>ביטול</Button>
                          <Button
                            size="sm"
                            onClick={() => { if (!viewOnly) setOpenMultiPop(false); }}
                            disabled={!String(openPlayersPro.multiCount || "").trim() || viewOnly}>
                            אישור
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* מטאוורס → חלון קופץ עם שדה מספר או ∞ + כפתור אישור */}
                  <Popover open={openMetaPop} onOpenChange={setOpenMetaPop}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="border-cyan-600 text-cyan-700 hover:bg-cyan-50" disabled={viewOnly}>
                        מטאוורס
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="w-24">אינסוף</span>
                          <Checkbox
                            checked={openPlayersPro.metaverseInfinity}
                            onCheckedChange={(v) =>
                              !viewOnly && setOpenPlayersPro((prev) => ({ ...prev, metaverseInfinity: Boolean(v), metaverseCount: "" }))
                            }
                            disabled={viewOnly} />
                          <span>∞</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-24">או מספר</span>
                          <Input
                            type="number"
                            min="1"
                            placeholder="לדוג׳ 20"
                            disabled={openPlayersPro.metaverseInfinity || viewOnly}
                            value={openPlayersPro.metaverseCount}
                            onChange={(e) => setOpenPlayersPro((prev) => ({ ...prev, metaverseCount: e.target.value }))} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setOpenMetaPop(false)}>ביטול</Button>
                          <Button
                            size="sm"
                            onClick={() => { if (!viewOnly) setOpenMetaPop(false); }}
                            disabled={!openPlayersPro.metaverseInfinity && !String(openPlayersPro.metaverseCount || "").trim() || viewOnly}>
                            אישור
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Summary preview inside dialog */}
                <div className="text-sm text-slate-600">
                  בחירות נוכחיות:
                  <div className="mt-2 flex flex-wrap gap-2">
                    {openPlayersPro.single && <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">Single: 1</span>}
                    {openPlayersPro.unknown && <span className="px-2 py-1 rounded bg-slate-100 text-slate-800 text-xs">לא ידוע</span>}
                    {String(openPlayersPro.coopCount || "").trim() && <span className="px-2 py-1 rounded bg-cyan-100 text-cyan-800 text-xs">Co-op: {openPlayersPro.coopCount}</span>}
                    {String(openPlayersPro.multiCount || "").trim() && <span className="px-2 py-1 rounded bg-cyan-100 text-cyan-800 text-xs">Multiplayer: {openPlayersPro.multiCount}</span>}
                    {(openPlayersPro.metaverseInfinity || String(openPlayersPro.metaverseCount || "").trim()) &&
                      <span className="px-2 py-1 rounded bg-cyan-100 text-cyan-800 text-xs">
                        Metaverse: {openPlayersPro.metaverseInfinity ? "∞" : openPlayersPro.metaverseCount}
                      </span>
                    }
                  </div>
                </div>
              </div>

              {/* כפתורי פעולה כלליים לדיאלוג הראשי */}
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" type="button" onClick={() => setOpenPlayersProDialog(false)}>ביטול</Button>
                <Button type="button" onClick={applyPlayersPro} disabled={viewOnly}>שמור</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Team Quick Dialog */}
          <Dialog open={openTeamQuick} onOpenChange={setOpenTeamQuick}>
            <DialogContent>
              <DialogHeader><DialogTitle>בחירת צוות</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {users.map((user) =>
                  <div key={user.id} className="border rounded p-2">
                    <div className="font-medium mb-2">{user.name}</div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={tempTeamSelection[user.id]?.research || false}
                          onCheckedChange={(v) => !viewOnly && setTempTeamSelection((prev) => ({
                            ...prev,
                            [user.id]: { ...prev[user.id], research: Boolean(v) }
                          }))}
                          disabled={viewOnly} />
                        <span>מחקר</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={tempTeamSelection[user.id]?.purchased || false}
                          onCheckedChange={(v) => !viewOnly && setTempTeamSelection((prev) => ({
                            ...prev,
                            [user.id]: { ...prev[user.id], purchased: Boolean(v) }
                          }))}
                          disabled={viewOnly} />
                        <span>רכש</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={tempTeamSelection[user.id]?.installed || false}
                          onCheckedChange={(v) => !viewOnly && setTempTeamSelection((prev) => ({
                            ...prev,
                            [user.id]: { ...prev[user.id], installed: Boolean(v) }
                          }))}
                          disabled={viewOnly} />
                        <span>התקנה</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" type="button" onClick={() => setOpenTeamQuick(false)}>ביטול</Button>
                <Button type="button" onClick={applyTeamQuick} disabled={viewOnly}>אישור</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* סוג רכישה */}
          <Card>
            <CardHeader>
              <CardTitle>סוג רכישה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "subscription", label: "רכישת מנוי", icon: purchaseIcons.subscription },
                  { key: "free", label: "חינם", icon: purchaseIcons.free },
                  { key: "one_time", label: "חד פעמי", icon: purchaseIcons.one_time },
                  { key: "other", label: "אחר", icon: purchaseIcons.other }].
                  map((opt) =>
                    <Button
                      type="button"
                      key={opt.key}
                      variant={formData.purchase_type === opt.key ? "default" : "outline"}
                      onClick={() => !viewOnly && handleFieldChange("purchase_type", opt.key)}
                      className={formData.purchase_type === opt.key ? "bg-cyan-600 hover:bg-cyan-700" : ""}
                      disabled={viewOnly}>
                      <span className="ml-2">{opt.icon}</span>
                      {opt.label}
                    </Button>
                  )}
              </div>

              {/* קישורים כלליים - תמיד מוצגים */}
              <div className="space-y-3 pt-4 border-t">
                <div className="text-sm font-medium text-slate-700 mb-2">קישורים</div>
                <Input
                  placeholder="קישור לעמוד המנוי (אם רלוונטי)"
                  value={formData.subscription_store_link}
                  onChange={(e) => handleFieldChange("subscription_store_link", e.target.value)}
                  disabled={viewOnly} />
                <Input
                  placeholder="קישור לעמוד החנות (כללי)"
                  value={formData.store_link}
                  onChange={(e) => handleFieldChange("store_link", e.target.value)}
                  disabled={viewOnly} />
                <Input
                  placeholder="קישור לאתר החברה"
                  value={formData.website_link || ""}
                  onChange={(e) => handleFieldChange("website_link", e.target.value)}
                  disabled={viewOnly} />
              </div>

              {/* Subscription flow */}
              {formData.purchase_type === "subscription" &&
                <div className="space-y-4">
                  {/* Subscription type chooser dialog trigger */}
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => { if (!viewOnly) { setTempSubType(formData.subscription_type || ""); setTempStartDate(formData.subscription_start_date || null); setOpenSubTypeDialog(true); } }} disabled={viewOnly}>
                      סוג מנוי
                    </Button>
                    {formData.subscription_type &&
                      <div className="text-sm text-slate-600 flex flex-wrap items-center gap-2">
                        <span className="font-medium">נבחר:</span>
                        <span className="px-2 py-1 bg-slate-100 rounded">
                          {formData.subscription_type === "monthly" ? "חודשי" : formData.subscription_type === "semi_annual" ? "סמסטריאלי" : formData.subscription_type}
                        </span>
                        {formData.subscription_start_date &&
                          <>
                            <span>• התחילה:</span>
                            <span className="px-2 py-1 bg-slate-100 rounded">
                              {format(new Date(formData.subscription_start_date), "dd/MM/yyyy")}
                            </span>
                          </>
                        }
                        {formData.subscription_end_date &&
                          <>
                            <span>• סיום:</span>
                            <span className="px-2 py-1 bg-slate-100 rounded">
                              {format(new Date(formData.subscription_end_date), "dd/MM/yyyy")}
                            </span>
                          </>
                        }
                      </div>
                    }
                  </div>

                  {/* Team button moved here (under subscription type) */}
                  <div className="flex justify-start">
                    <Button type="button" variant="outline" onClick={() => { if (!viewOnly) setOpenTeamQuick(true); }} disabled={viewOnly}>
                      צוות
                    </Button>
                  </div>

                  {/* Price + currency toggle */}
                  <div className="space-y-2">
                    <div className="text-sm text-slate-600">מחיר מנוי</div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="מחיר מנוי"
                        type="number"
                        value={formData.subscription_price}
                        onChange={(e) => handleFieldChange("subscription_price", e.target.value)}
                        disabled={viewOnly} />
                      <div className="flex border rounded-md overflow-hidden">
                        <Button type="button" size="sm" variant={formData.subscription_currency === "₪" ? "default" : "outline"} onClick={() => !viewOnly && handleFieldChange("subscription_currency", "₪")} disabled={viewOnly}>
                          ₪
                        </Button>
                        <Button type="button" size="sm" variant={formData.subscription_currency === "$" ? "default" : "outline"} onClick={() => !viewOnly && handleFieldChange("subscription_currency", "$")} disabled={viewOnly}>
                          $
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              }

              {/* One-time purchase */}
              {formData.purchase_type === "one_time" &&
                <div className="space-y-3">
                  {/* Team button moved to top of one-time section */}
                  <div className="flex justify-start">
                    <Button type="button" variant="outline" onClick={() => { if (!viewOnly) setOpenTeamQuick(true); }} disabled={viewOnly}>
                      צוות
                    </Button>
                  </div>

                  {/* Price + currency toggle */}
                  <div className="space-y-2">
                    <div className="text-sm text-slate-600">מחיר</div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="מחיר אפליקציה"
                        type="number"
                        value={formData.purchase_price}
                        onChange={(e) => handleFieldChange("purchase_price", e.target.value)}
                        disabled={viewOnly} />
                      <div className="flex border rounded-md overflow-hidden">
                        <Button type="button" size="sm" variant={formData.purchase_currency === "₪" ? "default" : "outline"} onClick={() => !viewOnly && handleFieldChange("purchase_currency", "₪")} disabled={viewOnly}>
                          ₪
                        </Button>
                        <Button type="button" size="sm" variant={formData.purchase_currency === "$" ? "default" : "outline"} onClick={() => !viewOnly && handleFieldChange("purchase_currency", "$")} disabled={viewOnly}>
                          $
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start" disabled={viewOnly}>
                        {formData.purchased_on ?
                          format(formData.purchased_on, "dd/MM/yyyy") :
                          <span>תאריך רכישה</span>
                        }
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar
                        mode="single"
                        selected={formData.purchased_on}
                        onSelect={(date) => !viewOnly && handleFieldChange("purchased_on", date)} />
                    </PopoverContent>
                  </Popover>
                </div>
              }

              {/* Free purchase */}
              {formData.purchase_type === "free" &&
                <div className="space-y-3">
                  {/* Team button moved above download date */}
                  <div className="flex justify-start">
                    <Button type="button" variant="outline" onClick={() => { if (!viewOnly) setOpenTeamQuick(true); }} disabled={viewOnly}>
                      צוות
                    </Button>
                  </div>

                  {/* Download date */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start" disabled={viewOnly}>
                        {formData.downloaded_on ?
                          format(formData.downloaded_on, "dd/MM/yyyy") :
                          <span>תאריך הורדה</span>
                        }
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar
                        mode="single"
                        selected={formData.downloaded_on}
                        onSelect={(date) => !viewOnly && handleFieldChange("downloaded_on", date)} />
                    </PopoverContent>
                  </Popover>
                </div>
              }

              {/* Other purchase */}
              {formData.purchase_type === "other" &&
                <div className="space-y-3">
                  <Input
                    placeholder="פרטי רכישה"
                    value={formData.other_purchase_text}
                    onChange={(e) => handleFieldChange("other_purchase_text", e.target.value)}
                    disabled={viewOnly} />
                </div>
              }
            </CardContent>
          </Card>

          {/* NEW: Device Selection Card - shown ALWAYS (not just in edit/view mode) */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>משקפות</CardTitle>
                {!viewOnly &&
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenDeviceSelector}>
                    הוסף/הסר משקפת
                  </Button>
                }
              </div>
            </CardHeader>
            <CardContent>
              {(editIdParam ? currentAppDevices : Array.from(selectedDeviceNumbers).sort((a,b) => a-b)).length > 0 ?
                <div className="flex flex-wrap gap-2">
                  {(editIdParam ? currentAppDevices : Array.from(selectedDeviceNumbers).sort((a,b) => a-b)).map((num) =>
                    <Badge key={num} className="bg-cyan-100 text-cyan-800 px-3 py-1 text-sm">
                      #{String(num).padStart(3, '0')}
                    </Badge>
                  )}
                </div> :
                <div className="text-sm text-slate-500 text-center py-4">
                  לא נבחרו משקפות. לחץ על "הוסף/הסר משקפת" כדי לבחור.
                </div>
              }
            </CardContent>
          </Card>


          {/* Subscription Type Dialog: choose type → pick start date → auto end */}
          <Dialog open={openSubTypeDialog} onOpenChange={setOpenSubTypeDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>הגדרת מנוי</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={tempSubType === "monthly" ? "default" : "outline"} onClick={() => !viewOnly && setTempSubType("monthly")} disabled={viewOnly}>חודשי</Button>
                  <Button type="button" variant={tempSubType === "semi_annual" ? "default" : "outline"} onClick={() => !viewOnly && setTempSubType("semi_annual")} disabled={viewOnly}>סמסטריאלי</Button>
                  <Button type="button" variant={tempSubType === "yearly" ? "default" : "outline"} onClick={() => !viewOnly && setTempSubType("yearly")} disabled={viewOnly}>שנתי</Button>
                </div>

                {tempSubType &&
                  <div className="space-y-2">
                    <div className="text-sm text-slate-600">תאריך התחלה</div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start" disabled={viewOnly}>
                          {tempStartDate ? format(tempStartDate, "dd/MM/yyyy") : "בחר תאריך התחלה"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar
                        mode="single"
                        selected={tempStartDate}
                        onSelect={(date) => !viewOnly && setTempStartDate(date)} />
                    </PopoverContent>
                  </Popover>
                  {tempStartDate &&
                    <div className="text-sm text-slate-600">
                      תאריך סיום מחושב:{" "}
                      <span className="font-medium">
                        {format(computeSubEnd(tempStartDate, tempSubType), "dd/MM/yyyy")}
                      </span>
                    </div>
                  }
                </div>
                }
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" type="button" onClick={() => setOpenSubTypeDialog(false)}>ביטול</Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (viewOnly) return; // Defensive check
                    const end = computeSubEnd(tempStartDate, tempSubType);
                    handleFieldChange("subscription_type", tempSubType);
                    handleFieldChange("subscription_start_date", tempStartDate || null);
                    handleFieldChange("subscription_end_date", end || null);
                    setOpenSubTypeDialog(false);
                  }}
                  disabled={!tempSubType || !tempStartDate || viewOnly}>
                  שמור
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Summary Dialog - replaces previous inline preview card */}
          <Dialog open={openSummary} onOpenChange={setOpenSummary}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>פרטי אפליקציה</DialogTitle>
              </DialogHeader>

              <div className="space-y-6" dir="rtl">
                {/* מידע כללי */}
                <div>
                  <h3 className="text-base font-semibold text-slate-800">מידע כללי</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <div><span className="text-slate-500">שם:</span> <span className="font-medium">{formData.name || "—"}</span></div>
                    <div><span className="text-slate-500">תיאור:</span> <span>{formData.description || "—"}</span></div>
                    <div><span className="text-slate-500">דירוג:</span> <span className="font-medium">{formData.rating !== null && formData.rating !== undefined ? `${formData.rating} / 5` : "—"}</span></div>
                    {/* Internet required status with succinct label */}
                    <div className="flex items-center gap-2">
                      {formData.internet_required ?
                        <span className="flex items-center gap-1 font-medium text-green-700">
                          <Wifi className="w-4 h-4" /> דורש אינטרנט
                        </span> :
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <WifiOff className="w-4 h-4" /> לא דורש אינטרנט
                        </span>
                      }
                    </div>
                    {/* Hand Tracking status */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">
                        {formData.hand_tracking ? "תומך ב-Hand Tracking" : "לא תומך ב-Hand Tracking"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* מאפייני אפליקציה */}
                <div>
                  <h3 className="text-base font-semibold text-slate-800">מאפייני אפליקציה</h3>
                  <div className="mt-2 grid sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-sm text-slate-500 mb-1">ז'אנרים</div>
                      <div className="flex flex-wrap gap-1">
                        {(formData.genre || []).length ? formData.genre.map((item) =>
                          <Badge key={`sum-genre-${item}`} variant="secondary">{item}</Badge>
                        ) : <span className="text-sm text-slate-400">—</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 mb-1">תחומים חינוכיים</div>
                      <div className="flex flex-wrap gap-1">
                        {(formData.education_field || []).length ? formData.education_field.map((item) =>
                          <Badge key={`sum-edu-${item}`} variant="secondary">{item}</Badge>
                        ) : <span className="text-sm text-slate-400">—</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 mb-1">פלטפורמות נתמכות</div>
                      <div className="flex flex-wrap gap-1">
                        {(formData.supported_platforms || []).length ? formData.supported_platforms.map((item) =>
                          <Badge key={`sum-plat-${item}`} variant="secondary">{item}</Badge>
                        ) : <span className="text-sm text-slate-400">—</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* פרטי מספר השחקנים */}
                <div>
                  <h3 className="text-base font-semibold text-slate-800">פרטי מספר השחקנים</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(formData.player_count_details || []).length ? formData.player_count_details.map((p, idx) =>
                      <Badge key={`sum-player-${p.mode}-${p.count}-${idx}`} className="bg-blue-100 text-blue-800">
                        {(p.mode || "").trim()}{p.count ? `: ${p.count}` : ""}
                      </Badge>
                    ) : <span className="text-sm text-slate-400">—</span>}
                  </div>
                </div>

                {/* פרטי הצוות */}
                <div>
                  <h3 className="text-base font-semibold text-slate-800">פרטי הצוות</h3>
                  <div className="mt-2 grid sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-slate-500 mb-1">מחקר</div>
                      <div>
                        {(() => {
                          const names = (formData.research_by || []).map((id) => users.find((u) => u.id === id)?.name).filter(Boolean);
                          return names.length ? names.join(", ") : "—";
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">רכש</div>
                      <div>
                        {(() => {
                          const names = (formData.purchased_by || []).map((id) => users.find((u) => u.id === id)?.name).filter(Boolean);
                          return names.length ? names.join(", ") : "—";
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">התקנה</div>
                      <div>
                        {(() => {
                          const names = (formData.installed_by || []).map((id) => users.find((u) => u.id === id)?.name).filter(Boolean);
                          return names.length ? names.join(", ") : "—";
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* פרטי הרכישה */}
                <div>
                  <h3 className="text-base font-semibold text-slate-800">פרטי הרכישה</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <div>
                      <span className="text-slate-500">סוג רכישה:</span>{" "}
                      <span className="font-medium">
                        {formData.purchase_type === "subscription" ? "מנוי" :
                          formData.purchase_type === "one_time" ? "חד פעמי" :
                            formData.purchase_type === "free" ? "חינם" :
                              formData.purchase_type === "other" ? "אחר" : "—"}
                      </span>
                    </div>

                    {/* Subscription details */}
                    {formData.purchase_type === "subscription" &&
                      <div className="grid sm:grid-cols-3 gap-2">
                        <div>
                          <span className="text-slate-500">סוג מנוי:</span>{" "}
                          <span className="font-medium">
                            {formData.subscription_type === "monthly" ? "חודשי" :
                              formData.subscription_type === "semi_annual" ? "סמסטריאלי" :
                                formData.subscription_type === "yearly" ? "שנתי" : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">מחיר:</span>{" "}
                          <span className="font-medium">
                            {formData.subscription_price ? `${formData.subscription_price} ${formData.subscription_currency || ""}` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">תאריכים:</span>{" "}
                          <span className="font-medium">
                            {formData.subscription_start_date ? `${format(new Date(formData.subscription_start_date), "dd/MM/yyyy")}` : "—"}
                            {formData.subscription_end_date ? ` → ${format(new Date(formData.subscription_end_date), "dd/MM/yyyy")}` : ""}
                          </span>
                        </div>
                      </div>
                    }

                    {/* One-time details */}
                    {formData.purchase_type === "one_time" &&
                      <div className="grid sm:grid-cols-3 gap-2">
                        <div>
                          <span className="text-slate-500">מחיר:</span>{" "}
                          <span className="font-medium">
                            {formData.purchase_price ? `${formData.purchase_price} ${formData.purchase_currency || ""}` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">תאריך רכישה:</span>{" "}
                          <span className="font-medium">
                            {formData.purchased_on ? format(formData.purchased_on, "dd/MM/yyyy") : "—"}
                          </span>
                        </div>
                      </div>
                    }

                    {/* Free details */}
                    {formData.purchase_type === "free" &&
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-500">תאריך הורדה:</span>{" "}
                          <span className="font-medium">
                            {formData.downloaded_on ? format(formData.downloaded_on, "dd/MM/yyyy") : "—"}
                          </span>
                        </div>
                      </div>
                    }

                    {/* Other details */}
                    {formData.purchase_type === "other" &&
                      <div>
                        <span className="text-slate-500">פרטי רכישה:</span>{" "}
                        <span className="font-medium">{formData.other_purchase_text || "—"}</span>
                      </div>
                    }
                  </div>
                </div>

                {/* NEW: Link buttons preview (store / company / subscription) */}
                <div>
                  <h3 className="text-base font-semibold text-slate-800">קישורים</h3>
                  <div className="mt-3">
                    <AppLinkButtons
                      storeLink={formData.store_link || ""}
                      websiteLink={formData.website_link || ""}
                      subscriptionLink={formData.subscription_store_link || ""} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button type="button" onClick={() => setOpenSummary(false)}>
                  המשך
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bottom actions */}
          {!viewOnly &&
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenSummary(true)}>
                תצוגה מקדימה
              </Button>
              <Button type="submit">שמור אפליקציה</Button>
            </div>
          }
        </form>
      </div>

      {/* Device Selector Modal */}
      {showDeviceSelector &&
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" dir="rtl">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-auto">
            <CardHeader className="sticky top-0 bg-white z-10 border-b">
              <div className="flex justify-between items-center">
                <CardTitle>בחר משקפות להתקנה/הסרה</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowDeviceSelector(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-sm text-slate-600 mb-4">
                סמן משקפות להתקנת האפליקציה, בטל סימון כדי להסיר
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                {allDevices.
                  map((d) => Number(d.binocular_number)).
                  filter((n) => Number.isFinite(n)).
                  sort((a, b) => a - b).
                  map((num) => {
                    const isSelected = selectedDeviceNumbers.has(num);
                    // If an associated device exists and this is its number, make it unselectable for removal
                    const isAssociatedAndRequired = associatedDevice && showAssociation && Number(associatedDevice.binocular_number) === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => toggleDeviceNumber(num)}
                        className={`h-10 rounded-md border text-sm font-semibold transition
                          ${isSelected ? "bg-cyan-600 text-white border-cyan-700" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"}
                          ${isAssociatedAndRequired ? "cursor-not-allowed opacity-70" : ""}`}
                        title={`משקפת ${num}`}
                        disabled={isAssociatedAndRequired}>
                        {num}
                      </button>);
                  })}
              </div>
              {selectedDeviceNumbers.size > 0 &&
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    נבחרו {selectedDeviceNumbers.size} משקפות
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newSelection = new Set();
                      // Keep the associated device selected if it's required
                      if (associatedDevice && showAssociation) {
                        const associatedBinocularNumber = Number(associatedDevice.binocular_number);
                        if (Number.isFinite(associatedBinocularNumber)) {
                          newSelection.add(associatedBinocularNumber);
                        }
                      }
                      setSelectedDeviceNumbers(newSelection);
                    }}>
                    נקה בחירה
                  </Button>
                </div>
              }
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeviceSelector(false)}>
                  ביטול
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowDeviceSelector(false)}
                  className="bg-cyan-600 hover:bg-cyan-700">
                  אישור
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    </div>);

  function setField(currentValue, fieldName, newValue) {
    if (viewOnly) return;
    if (currentValue === newValue) return;
    handleFieldChange(fieldName, newValue);
  }
}