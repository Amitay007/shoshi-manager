import React, { useEffect, useState, useMemo, useRef } from "react";
import { VRApp } from "@/entities/VRApp";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { Trash2, Users, Wifi, WifiOff, Pencil, MoreVertical, Tags, X, Plus, Filter, AppWindow, Grid, List, Search } from "lucide-react";
import { format } from "date-fns";
import { DeviceApp } from "@/entities/DeviceApp";
import AppFilterBar from "@/components/filters/AppFilterBar";
import AppLinkButtons from "@/components/common/AppLinkButtons";
import { with429Retry } from "@/components/utils/retry";
import { Checkbox } from "@/components/ui/checkbox";
import { VRDevice } from "@/entities/VRDevice";
import DeviceSelector from "@/components/DeviceSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export default function GeneralApps() {
  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    genres: [],
    education_fields: [],
    platforms: [],
    purchase_types: [],
    internet_required: null,
    hand_tracking: null,
    players_count: null
  });
  
  const [tagFilters, setTagFilters] = useState({
    free: false,
    installed: false,
    research: false,
    not_installed: false,
    in_onboarding: false,
    customTags: []
  });

  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [selectedAppForModal, setSelectedAppForModal] = useState(null);
  
  const [allDevices, setAllDevices] = useState([]);
  const [currentDeviceApps, setCurrentDeviceApps] = useState([]); // All relationships
  const [appDeviceNumbers, setAppDeviceNumbers] = useState({}); // Map: AppID -> [BinocularNumbers]
  const [showInstallationsFor, setShowInstallationsFor] = useState(null);

  const [smartTagMode, setSmartTagMode] = useState(false);
  const [selectedApps, setSelectedApps] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("add");
  const [selectedTags, setSelectedTags] = useState({
    free: false,
    research: false,
    in_onboarding: false,
    remove_all: false
  });
  
  const [newCustomTag, setNewCustomTag] = useState("");
  const [customTagsToApply, setCustomTagsToApply] = useState([]);

  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState(new Set());
  const [viewMode, setViewMode] = useState("cards");

  const navigate = useNavigate();
  const { toast } = useToast();

  // Search Logic
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const searchOptions = useMemo(() => {
    if (!filters.search || filters.search.length < 1) return [];
    return apps
      .filter(app => (app.name || "").toLowerCase().includes(filters.search.toLowerCase()))
      .slice(0, 5);
  }, [apps, filters.search]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const [allAppList, allDeviceApps, allDevicesList] = await Promise.all([
        with429Retry(() => VRApp.list()),
        with429Retry(() => DeviceApp.list(null, 10000)), // Ensure we get all installations
        with429Retry(() => VRDevice.list())
      ]);

      // Calculate counts
      const counts = {};
      (allDeviceApps || []).forEach((rel) => {
        counts[rel.app_id] = (counts[rel.app_id] || 0) + 1;
      });

      const withCounts = (allAppList || []).map((a) => ({
        ...a,
        __installCount: counts[a.id] || 0,
        __installedBadge: Boolean(a.is_installed) || (counts[a.id] || 0) > 0
      }));

      setApps(withCounts);
      setAllDevices(allDevicesList || []);
      setCurrentDeviceApps(allDeviceApps || []);

      // Map App -> Device Numbers
      const deviceIdToNumber = new Map((allDevicesList || []).map((d) => [d.id, Number(d.binocular_number)]));
      const mapAppToNumbers = {};
      
      (allDeviceApps || []).forEach((rel) => {
        const num = deviceIdToNumber.get(rel.device_id);
        if (!Number.isFinite(num)) return;
        if (!mapAppToNumbers[rel.app_id]) mapAppToNumbers[rel.app_id] = [];
        mapAppToNumbers[rel.app_id].push(num);
      });

      Object.keys(mapAppToNumbers).forEach((appId) => {
        mapAppToNumbers[appId] = Array.from(new Set(mapAppToNumbers[appId])).sort((a, b) => a - b);
      });
      
      setAppDeviceNumbers(mapAppToNumbers);

    } catch (error) {
      console.error("Failed to load apps data", error);
      toast({ title: "שגיאה בטעינת נתונים", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteApp = async (id, name) => {
    if (confirm(`האם למחוק את "${name}"? פעולה זו בלתי הפיכה.`)) {
      try {
        await VRApp.delete(id);
        toast({ title: "האפלי