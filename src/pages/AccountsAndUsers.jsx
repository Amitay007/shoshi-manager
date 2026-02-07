import React, { useState, useEffect, useMemo, useCallback } from "react";
import { DeviceLinkedAccount } from "@/entities/DeviceLinkedAccount";
import { VRDevice } from "@/entities/VRDevice";
import { DeviceApp } from "@/entities/DeviceApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { installationData } from "@/components/InstallationData";
import { Search, ArrowLeft, Plus, Users, Mail, KeyRound, Eye, EyeOff, Copy, Check, LayoutGrid, List } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { with429Retry } from "@/components/utils/retry";
import { useLoading } from "@/components/common/LoadingContext";
import BackHomeButtons from "@/components/common/BackHomeButtons";

export default function AccountsAndUsers() {
    const [accounts, setAccounts] = useState([]);
    const [devices, setDevices] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [formData, setFormData] = useState({
        binocular_number: "",
        account_type: "",
        email: "",
        username: "",
        password: "",
        link_url: ""
    });
    const [deviceNumberError, setDeviceNumberError] = useState("");

    const [filterType, setFilterType] = useState("ALL");
    const [filterNickname, setFilterNickname] = useState("");
    const [filterNumber, setFilterNumber] = useState("");
    const [filterDeviceId, setFilterDeviceId] = useState(null); // Added for URL filtering
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editData, setEditData] = useState({
        id: "",
        device_id: "",
        account_type: "",
        email: "",
        username: "",
        password: "",
        link_url: ""
    });
    const [showPasswords, setShowPasswords] = useState({});
    const [copiedPasswords, setCopiedPasswords] = useState({});
    const [viewMode, setViewMode] = useState("list"); // list, grid
    const { showLoader, hideLoader } = useLoading();

    useEffect(() => {
        const init = async () => {
            showLoader();
            try {
                const [accountsList, devicesList] = await Promise.all([
                    with429Retry(() => DeviceLinkedAccount.list()),
                    with429Retry(() => VRDevice.list())
                ]);
                
                setAccounts(accountsList);
                setDevices(devicesList.sort((a, b) => a.binocular_number - b.binocular_number));

                // Check URL for deviceId filter
                const params = new URLSearchParams(window.location.search);
                const devId = params.get("deviceId");
                if (devId) {
                    setFilterDeviceId(devId);
                }
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                hideLoader();
            }
        };
        init();
    }, []);

    const togglePasswordVisibility = (accountId) => {
        setShowPasswords(prev => ({
            ...prev,
            [accountId]: !prev[accountId]
        }));
    };

    const copyPassword = (accountId, password) => {
        if (password) {
            navigator.clipboard.writeText(password);
            setCopiedPasswords(prev => ({ ...prev, [accountId]: true }));
            setTimeout(() => {
                setCopiedPasswords(prev => ({ ...prev, [accountId]: false }));
            }, 2000);
        }
    };

    const getAccountIcon = (accountType) => {
        const iconClass = "w-6 h-6 font-bold text-white";
        switch (accountType) {
            case 'GMAIL':
                return <span className={iconClass}>G</span>;
            case 'Remio':
                return <span className={iconClass}>R</span>;
            case 'META':
                return <span className={iconClass}>M</span>;
            case 'Facebook':
                return <span className={iconClass}>F</span>;
            case 'Steam':
                return <span className={iconClass}>S</span>;
            case 'App Lab':
                return <span className={iconClass}>A</span>;
            case 'Mondly':
                return <span className={iconClass}>M</span>;
            case 'Immerse':
                return <span className={iconClass}>I</span>;
            case 'Microsoft':
                return <span className={iconClass}>M</span>;
            case 'SideQuest':
                return <span className={iconClass}>S</span>;
            default:
                return <span className={iconClass}>•</span>;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Map binocular_number -> device_id
        const numStr = String(formData.binocular_number || "").trim();
        const num = numStr === "" ? NaN : Number(numStr);
        const found = devices.find(d => Number(d.binocular_number) === num);
        if (!found) {
            setDeviceNumberError("מספר משקפת לא קיים במערכת");
            return;
        }
        setDeviceNumberError("");
        try {
            await with429Retry(() => DeviceLinkedAccount.create({
                device_id: found.id,
                account_type: formData.account_type,
                email: formData.email,
                username: formData.username,
                password: formData.password,
                link_url: formData.link_url || ""
            }));
            setFormData({
                binocular_number: "",
                account_type: "",
                email: "",
                username: "",
                password: "",
                link_url: ""
            });
            setShowForm(false);
            loadData();
        } catch (error) {
            console.error("Error creating account:", error);
        }
    };

    const openDelete = (account) => {
        setDeleteTarget(account);
        setShowDeleteDialog(true);
    };

    const removeDeviceFromAllInstalls = (binocularNumber) => {
        if (!binocularNumber) return;
        for (const key of Object.keys(installationData)) {
            installationData[key] = (installationData[key] || []).filter(n => n !== binocularNumber);
        }
    };

    const handleDeleteChoice = async (choice) => {
        if (!deleteTarget) return;
        const account = deleteTarget;
        setShowDeleteDialog(false);
        if (choice === "cancel") return;

        try {
            // Always delete the account itself
            await with429Retry(() => DeviceLinkedAccount.delete(account.id));

            if (choice === "yes") {
                // Also delete the device and its app relations
                const device = devices.find(d => d.id === account.device_id);
                if (device) {
                    // Delete DeviceApp relations for this device
                    const relations = await with429Retry(() => DeviceApp.filter({ device_id: device.id }));
                    for (const rel of relations) {
                        await with429Retry(() => DeviceApp.delete(rel.id));
                    }
                    // Remove from static installationData (UI source)
                    removeDeviceFromAllInstalls(device.binocular_number);
                    // Delete the device
                    await with429Retry(() => VRDevice.delete(device.id));
                }
            }
            await loadData();
        } catch (err) {
            console.error("Error deleting:", err);
        } finally {
            setDeleteTarget(null);
        }
    };

    const openEdit = (account) => {
        setEditData({
            id: account.id,
            device_id: account.device_id || "", // Kept for consistency/display in filtered accounts
            account_type: account.account_type || "",
            email: account.email || "",
            username: account.username || "",
            password: account.password || "",
            link_url: account.link_url || ""
        });
        setShowEditDialog(true);
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        try {
            const { id, ...payload } = editData;
            // The device_id is not editable through this dialog, so its original value will be sent
            // This is acceptable if the backend handles it as an idempotent update or ignores it if unchanged.
            await with429Retry(() => DeviceLinkedAccount.update(id, payload)); 
            setShowEditDialog(false);
            await loadData();
        } catch (err) {
            console.error("Error updating account:", err);
        }
    };

    const filteredAccounts = useMemo(() => 
        accounts.filter(account => {
            // Type filter (ALL/GMAIL/Remio)
            if (filterType !== "ALL" && account.account_type !== filterType) return false;

            const device = devices.find(d => d.id === account.device_id);
            const nickname = device?.device_name || "";
            const numberStr = device?.binocular_number ? String(device.binocular_number) : "";

            // Nickname filter
            if (filterNickname && !nickname.toLowerCase().includes(filterNickname.toLowerCase())) return false;
            // Number filter
            if (filterNumber && numberStr !== filterNumber.trim()) return false;

            // Device ID filter (from URL)
            if (filterDeviceId && account.device_id !== filterDeviceId) return false;

            // Free text search (kept)
            const deviceNameText = device ? `משקפת ${device.binocular_number}` : "";
            return (
                account.account_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                account.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                account.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                deviceNameText.includes(searchTerm)
            );
        }),
        [accounts, devices, filterType, filterNickname, filterNumber, searchTerm]
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 sm:p-6" dir="rtl">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                            <KeyRound className="w-7 h-7 text-white"/>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-cyan-900">חשבונות</h1>
                            <p className="text-slate-500 text-sm">ניהול חשבונות משתמשים למשקפות VR</p>
                        </div>
                    </div>
                    {/* Home button removed */}
                </div>

                {/* Management Card */}
                <Card className="mb-6 shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
                        <div className="flex flex-row items-center justify-between">
                            <CardTitle className="text-xl">ניהול חשבונות</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="חיפוש חשבון..."
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="סוג חשבון" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">הכל</SelectItem>
                                    <SelectItem value="GMAIL">Gmail</SelectItem>
                                    <SelectItem value="Remio">Remio</SelectItem>
                                    <SelectItem value="META">Meta</SelectItem>
                                    <SelectItem value="Facebook">Facebook</SelectItem>
                                    <SelectItem value="Steam">Steam</SelectItem>
                                    <SelectItem value="App Lab">App Lab</SelectItem>
                                    <SelectItem value="Mondly">Mondly</SelectItem>
                                    <SelectItem value="Immerse">Immerse</SelectItem>
                                    <SelectItem value="Microsoft">Microsoft</SelectItem>
                                    <SelectItem value="SideQuest">SideQuest</SelectItem>
                                    <SelectItem value="אחר">אחר</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                className="w-44"
                                placeholder="כינוי משקפת"
                                value={filterNickname}
                                onChange={(e) => setFilterNickname(e.target.value)}
                            />
                            <Input
                                className="w-32"
                                placeholder="מספר משקפת"
                                value={filterNumber}
                                onChange={(e) => setFilterNumber(e.target.value)}
                            />
                            <div className="mr-auto flex bg-slate-100 p-1 rounded-lg">
                                <Button 
                                    size="sm" 
                                    variant={viewMode === "list" ? "white" : "ghost"} 
                                    className={viewMode === "list" ? "bg-white shadow-sm text-purple-700" : "text-slate-500"}
                                    onClick={() => setViewMode("list")}
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant={viewMode === "grid" ? "white" : "ghost"} 
                                    className={viewMode === "grid" ? "bg-white shadow-sm text-purple-700" : "text-slate-500"}
                                    onClick={() => setViewMode("grid")}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Add Form */}
                {showForm && (
                    <Card className="mb-6 border-2 border-green-200 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                            <CardTitle>הוספת חשבון חדש</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* REPLACED: device Select -> numeric binocular input */}
                                    <div className="w-full">
                                        <Input
                                            type="number"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            placeholder="מספר משקפת"
                                            value={formData.binocular_number}
                                            onChange={(e) => {
                                                setFormData({ ...formData, binocular_number: e.target.value });
                                                if (deviceNumberError) setDeviceNumberError("");
                                            }}
                                        />
                                        {deviceNumberError && (
                                            <p className="text-red-600 text-sm mt-1">{deviceNumberError}</p>
                                        )}
                                    </div>

                                    <Select
                                        value={formData.account_type}
                                        onValueChange={(value) => setFormData({...formData, account_type: value})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="סוג חשבון" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="GMAIL">Gmail</SelectItem>
                                            <SelectItem value="META">Meta</SelectItem>
                                            <SelectItem value="Facebook">Facebook</SelectItem>
                                            <SelectItem value="Remio">Remio</SelectItem>
                                            <SelectItem value="Steam">Steam</SelectItem>
                                            <SelectItem value="App Lab">App Lab</SelectItem>
                                            <SelectItem value="Mondly">Mondly</SelectItem>
                                            <SelectItem value="Immerse">Immerse</SelectItem>
                                            <SelectItem value="Microsoft">Microsoft</SelectItem>
                                            <SelectItem value="SideQuest">SideQuest</SelectItem>
                                            <SelectItem value="אחר">אחר</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        type="email"
                                        placeholder="אימייל"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    />
                                    <Input
                                        placeholder="שם משתמש"
                                        value={formData.username}
                                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                                    />
                                    <Input
                                        type="password"
                                        placeholder="סיסמה"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    />
                                </div>

                                <Input
                                    placeholder="קישור לחשבון (URL)"
                                    value={formData.link_url || ""}
                                    onChange={(e) => setFormData({...formData, link_url: e.target.value})}
                                />

                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                        ביטול
                                    </Button>
                                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                                        הוסף חשבון
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Accounts List */}
                <Card className="shadow-lg border-0">
                    <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-t-lg">
                        <CardTitle>חשבונות קיימים ({filteredAccounts.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {filteredAccounts.length > 0 ? (
                            <div className="space-y-3">
                                {filteredAccounts.map(account => {
                                const device = devices.find(d => d.id === account.device_id);
                                return (
                                    <div key={account.id} className="flex items-start gap-4 p-6 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                                        <div className="bg-gradient-to-br from-purple-600 to-pink-600 w-12 h-12 rounded-lg flex items-center justify-center shadow-md shrink-0">
                                            {getAccountIcon(account.account_type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold">{account.account_type}</div>
                                            <div className="text-sm text-slate-600">
                                                {account.email || account.username}
                                                {account.link_url && (
                                                    <a href={account.link_url} target="_blank" rel="noreferrer" className="ml-2 text-cyan-700 underline">קישור</a>
                                                )}
                                            </div>
                                            {device && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="w-8 h-8 border-2 border-slate-200 rounded flex items-center justify-center font-bold text-slate-700 bg-slate-50 text-sm">
                                                        {device.binocular_number}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        <div>Gmail: <span className="font-medium">{device.primary_email}</span></div>
                                                    </div>
                                                </div>
                                            )}
                                            {account.password && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs text-slate-500">סיסמה:</span>
                                                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                                        <span className="text-sm font-mono">
                                                            {showPasswords[account.id] ? account.password : '••••••••'}
                                                        </span>
                                                        <button
                                                            onClick={() => togglePasswordVisibility(account.id)}
                                                            className="text-slate-500 hover:text-slate-700 p-1"
                                                        >
                                                            {showPasswords[account.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                        </button>
                                                        <button
                                                            onClick={() => copyPassword(account.id, account.password)}
                                                            className="text-slate-500 hover:text-slate-700 p-1"
                                                        >
                                                            {copiedPasswords[account.id] ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex gap-2 mt-3">
                                                <Button variant="outline" size="sm" onClick={() => openEdit(account)}>
                                                    עריכה
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => openDelete(account)}>
                                                    הסר חשבון
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <p>לא נמצאו חשבונות התואמים לחיפוש.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>הסר חשבון</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            <p>האם ברצונך להסיר גם את המשקפת ממאגר המשקפות וגם את האפליקציות ממאגר האפליקציות?</p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => handleDeleteChoice("no")}>לא</Button>
                                <Button variant="destructive" onClick={() => handleDeleteChoice("yes")}>כן</Button>
                                <Button variant="secondary" onClick={() => handleDeleteChoice("cancel")}>ביטול</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>עריכת חשבון</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEditSave} className="space-y-3">
                            {/* Removed device select - device_id is not editable from this dialog */}
                            <Select
                                value={editData.account_type}
                                onValueChange={(value) => setEditData({...editData, account_type: value})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="סוג חשבון" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GMAIL">Gmail</SelectItem>
                                    <SelectItem value="META">Meta</SelectItem>
                                    <SelectItem value="Facebook">Facebook</SelectItem>
                                    <SelectItem value="Remio">Remio</SelectItem>
                                    <SelectItem value="Steam">Steam</SelectItem>
                                    <SelectItem value="App Lab">App Lab</SelectItem>
                                    <SelectItem value="Mondly">Mondly</SelectItem>
                                    <SelectItem value="Immerse">Immerse</SelectItem>
                                    <SelectItem value="Microsoft">Microsoft</SelectItem>
                                    <SelectItem value="SideQuest">SideQuest</SelectItem>
                                    <SelectItem value="אחר">אחר</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <Input
                                    type="email"
                                    placeholder="אימייל"
                                    value={editData.email}
                                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                                />
                                <Input
                                    placeholder="שם משתמש"
                                    value={editData.username}
                                    onChange={(e) => setEditData({...editData, username: e.target.value})}
                                />
                                <Input
                                    type="password"
                                    placeholder="סיסמה"
                                    value={editData.password}
                                    onChange={(e) => setEditData({...editData, password: e.target.value})}
                                />
                            </div>

                            <Input
                                placeholder="קישור לחשבון (URL)"
                                value={editData.link_url}
                                onChange={(e) => setEditData({...editData, link_url: e.target.value})}
                            />

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>ביטול</Button>
                                <Button type="submit" className="bg-green-600 hover:bg-green-700">שמור</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}