import React, { useState, useEffect } from "react";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { Teacher } from "@/entities/Teacher";
import { Syllabus } from "@/entities/Syllabus";
import { InstitutionProgram } from "@/entities/InstitutionProgram";
import { VRDevice } from "@/entities/VRDevice";
import { Contact } from "@/entities/Contact";
import { ActivityLog } from "@/entities/ActivityLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/utils";
import { 
  Building2, Users, BookOpen, TrendingUp, 
  Phone, Mail, MapPin, Calendar, Plus,
  UserCircle, ClipboardList, Edit, Trash2, MessageCircle, Wallet
} from "lucide-react";
import VRIcon from "@/components/icons/VRIcon";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { with429Retry } from "@/components/utils/retry";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function CRMHub() {
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [instPrograms, setInstPrograms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("schools");

  // Contact dialog
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState({
    full_name: "",
    title: "",
    email: "",
    phone: "",
    mobile: "",
    institution_id: "",
    institution_name: "", // Will not be used directly in creation/update but helpful for displaying
    department: "",
    status: "פעיל",
    priority: "בינונית",
    notes: ""
  });

  // Activity dialog
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [activityForm, setActivityForm] = useState({
    contact_id: "",
    institution_id: "",
    activity_type: "שיחה",
    subject: "",
    description: "",
    activity_date: new Date().toISOString().slice(0, 16), // Format for datetime-local
    outcome: "",
    priority: "בינונית",
    next_action: "",
    next_action_date: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schoolsData, teachersData, programsData, instProgramsData, devicesData, contactsData, activitiesData] = await Promise.all([
        with429Retry(() => EducationInstitution.list()),
        with429Retry(() => Teacher.list()),
        with429Retry(() => Syllabus.list()),
        with429Retry(() => InstitutionProgram.list()),
        with429Retry(() => VRDevice.list()),
        with429Retry(() => Contact.list()),
        with429Retry(() => ActivityLog.list())
      ]);
      
      setSchools(schoolsData || []);
      setTeachers(teachersData || []);
      setPrograms(programsData || []);
      setInstPrograms(instProgramsData || []);
      setDevices(devicesData || []);
      setContacts(contactsData || []);
      setActivities(activitiesData || []);
    } catch (error) {
      console.error("Error loading CRM data:", error);
    }
    setLoading(false);
  };

  const getSchoolStats = (schoolId) => {
    const schoolPrograms = instPrograms.filter(ip => ip.institution_id === schoolId);
    const schoolTeachers = teachers.filter(t => t.institution_id === schoolId);
    
    return {
      programs: schoolPrograms.length,
      teachers: schoolTeachers.length
    };
  };

  const getTeacherStats = (teacherName) => {
    const teacherPrograms = programs.filter(p => p.teacher_name === teacherName);
    
    return {
      programs: teacherPrograms.length,
      sessions: teacherPrograms.reduce((sum, p) => sum + (p.meetings_count || 0), 0)
    };
  };

  const handleSaveContact = async () => {
    if (!contactForm.full_name) {
      alert("שם מלא הוא שדה חובה.");
      return;
    }

    try {
      if (editingContact) {
        await with429Retry(() => Contact.update(editingContact.id, contactForm));
      } else {
        await with429Retry(() => Contact.create(contactForm));
      }
      await loadData();
      setShowContactDialog(false);
      resetContactForm();
    } catch (error) {
      console.error("Error saving contact:", error);
      alert("שגיאה בשמירת איש הקשר");
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm("האם למחוק את איש הקשר?")) return;
    
    try {
      await with429Retry(() => Contact.delete(contactId));
      await loadData();
    } catch (error) {
      console.error("Error deleting contact:", error);
      alert("שגיאה במחיקת איש הקשר");
    }
  };

  const handleSaveActivity = async () => {
    if (!activityForm.subject && !activityForm.description) {
      alert("יש לציין נושא או תיאור לפעילות.");
      return;
    }

    try {
      await with429Retry(() => ActivityLog.create(activityForm));
      await loadData();
      setShowActivityDialog(false);
      resetActivityForm();
      alert("הפעילות נוספה ליומן בהצלחה");
    } catch (error) {
      console.error("Error saving activity:", error);
      alert("שגיאה בשמירת הפעילות");
    }
  };

  const resetContactForm = () => {
    setContactForm({
      full_name: "",
      title: "",
      email: "",
      phone: "",
      mobile: "",
      institution_id: "",
      institution_name: "",
      department: "",
      status: "פעיל",
      priority: "בינונית",
      notes: ""
    });
    setEditingContact(null);
  };

  const resetActivityForm = () => {
    setActivityForm({
      contact_id: "",
      institution_id: "",
      activity_type: "שיחה",
      subject: "",
      description: "",
      activity_date: new Date().toISOString().slice(0, 16),
      outcome: "",
      priority: "בינונית",
      next_action: "",
      next_action_date: ""
    });
  };

  const openEditContact = (contact) => {
    setEditingContact(contact);
    setContactForm({
      ...contact,
      institution_id: contact.institution_id || "" // Ensure it's not null for the Select component
    });
    setShowContactDialog(true);
  };

  const filteredSchools = schools.filter(s => 
    !searchTerm || 
    (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.city || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact_person || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeachers = teachers.filter(t =>
    !searchTerm ||
    (t.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContacts = contacts.filter(c =>
    !searchTerm ||
    (c.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (schools.find(s => s.id === c.institution_id)?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const recentActivities = activities
    .sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date))
    .slice(0, 20); // Show only the 20 most recent activities

  const stats = {
    totalSchools: schools.length,
    totalTeachers: teachers.length,
    totalPrograms: programs.length,
    activePrograms: instPrograms.filter(ip => ip.status === "פעילה").length,
    totalDevices: devices.length,
    totalContacts: contacts.length,
    totalActivities: activities.length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-indigo-900">מרכז ניהול</h1>
              <p className="text-slate-500 text-xs sm:text-sm">ניהול קשרי לקוחות - בתי ספר, מורים, אנשי קשר ויומן פעילות</p>
            </div>
          </div>
          <div className="hidden lg:block">
            <BackHomeButtons />
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3 mb-6">
          <Card 
            className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-lg cursor-pointer hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            onClick={() => setActiveTab("schools")}
          >
            <CardContent className="p-3">
              <div className="flex flex-col items-center">
                <Building2 className="w-8 h-8 text-blue-600 mb-1" />
                <p className="text-2xl font-bold text-blue-900">{stats.totalSchools}</p>
                <p className="text-xs text-slate-600">בתי ספר</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-cyan-50 to-teal-50 border-0 shadow-lg cursor-pointer hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            onClick={() => window.location.href = createPageUrl("TeachersList")}
          >
            <CardContent className="p-3">
              <div className="flex flex-col items-center">
                <Users className="w-8 h-8 text-cyan-600 mb-1" />
                <p className="text-2xl font-bold text-cyan-900">{stats.totalTeachers}</p>
                <p className="text-xs text-slate-600">מורים</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-orange-50 to-amber-50 border-0 shadow-lg cursor-pointer hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            onClick={() => window.location.href = createPageUrl("SilshuchCreator")}
          >
            <CardContent className="p-3">
              <div className="flex flex-col items-center">
                <Calendar className="w-8 h-8 text-orange-600 mb-1" />
                <p className="text-2xl font-bold text-orange-900">📅</p>
                <p className="text-xs text-slate-600">ניהול שיבוצים</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg">
            <CardContent className="p-3">
              <div className="flex flex-col items-center">
                <Calendar className="w-8 h-8 text-green-600 mb-1" />
                <p className="text-2xl font-bold text-green-900">{stats.activePrograms}</p>
                <p className="text-xs text-slate-600">תוכניות פעילות</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-cyan-50 border-0 shadow-lg">
            <CardContent className="p-3">
              <div className="flex flex-col items-center">
                <VRIcon className="w-8 h-8 text-purple-600 mb-1" />
                <p className="text-2xl font-bold text-purple-900">{stats.totalDevices}</p>
                <p className="text-xs text-slate-600">משקפות</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-indigo-50 to-purple-50 border-0 shadow-lg cursor-pointer hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            onClick={() => setActiveTab("contacts")}
          >
            <CardContent className="p-3">
              <div className="flex flex-col items-center">
                <UserCircle className="w-8 h-8 text-indigo-600 mb-1" />
                <p className="text-2xl font-bold text-indigo-900">{stats.totalContacts}</p>
                <p className="text-xs text-slate-600">אנשי קשר</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-purple-50 to-indigo-50 border-0 shadow-lg cursor-pointer hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            onClick={() => window.location.href = createPageUrl("CashFlow")}
          >
            <CardContent className="p-3">
              <div className="flex flex-col items-center">
                <Wallet className="w-8 h-8 text-purple-600 mb-1" />
                <p className="text-2xl font-bold text-purple-900">₪</p>
                <p className="text-xs text-slate-600">תזרים</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-rose-50 to-pink-50 border-0 shadow-lg cursor-pointer hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            onClick={() => setActiveTab("activities")}
          >
            <CardContent className="p-3">
              <div className="flex flex-col items-center">
                <ClipboardList className="w-8 h-8 text-rose-600 mb-1" />
                <p className="text-2xl font-bold text-rose-900">{stats.totalActivities}</p>
                <p className="text-xs text-slate-600">יומן קשרי לקוחות</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-4">
            <Input
              placeholder="חיפוש בתי ספר, מורים, אנשי קשר..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-right"
            />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="schools" className="gap-2">
              <Building2 className="w-4 h-4" />
              בתי ספר
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <UserCircle className="w-4 h-4" />
              אנשי קשר
            </TabsTrigger>
            <TabsTrigger value="activities" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              יומן קשרי לקוחות
            </TabsTrigger>
          </TabsList>

          {/* Schools Tab */}
          <TabsContent value="schools">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchools.map(school => {
                const stats = getSchoolStats(school.id);
                
                return (
                  <motion.div
                    key={school.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      className="bg-white hover:shadow-xl transition-all duration-300 border-0 cursor-pointer"
                      onClick={() => window.location.href = createPageUrl(`SchoolDetails?id=${school.id}`)}
                    >
                    <div className="h-1.5 bg-gradient-to-r from-blue-600 to-cyan-600"></div>
                    
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-start justify-between">
                        <span className="line-clamp-2">{school.name}</span>
                        <Building2 className="w-5 h-5 text-blue-600 shrink-0 mr-2" />
                      </CardTitle>
                      <Badge className="bg-blue-100 text-blue-800 w-fit">
                        {school.type}
                      </Badge>
                    </CardHeader>

                    <CardContent className="space-y-2 text-sm">
                      {school.city && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>{school.city}</span>
                        </div>
                      )}

                      {school.contact_person && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span>{school.contact_person}</span>
                        </div>
                      )}

                      {school.contact_email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="truncate">{school.contact_email}</span>
                        </div>
                      )}

                      {school.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{school.phone}</span>
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <div className="text-xs text-purple-600">תוכניות</div>
                          <div className="text-lg font-bold text-purple-900">{stats.programs}</div>
                        </div>
                        <div className="text-center p-2 bg-cyan-50 rounded">
                          <div className="text-xs text-cyan-600">מורים</div>
                          <div className="text-lg font-bold text-cyan-900">{stats.teachers}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                );
              })}
            </div>

            {filteredSchools.length === 0 && (
              <Card className="shadow-lg border-0">
                <CardContent className="text-center py-12">
                  <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">לא נמצאו בתי ספר</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>



          {/* Contacts Tab */}
          <TabsContent value="contacts">
            <div className="mb-4 flex justify-end">
              <Button onClick={() => { resetContactForm(); setShowContactDialog(true); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4" />
                איש קשר חדש
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map(contact => {
                const school = schools.find(s => s.id === contact.institution_id);
                const contactActivities = activities.filter(a => a.contact_id === contact.id);
                
                return (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="bg-white hover:shadow-xl transition-all duration-300 border-0">
                    <div className="h-1.5 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
                    
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                            <UserCircle className="w-6 h-6 text-indigo-700" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{contact.full_name}</CardTitle>
                            {contact.title && (
                              <p className="text-xs text-slate-500">{contact.title}</p>
                            )}
                          </div>
                        </div>
                        <Badge className={
                          contact.status === "לקוח" ? "bg-green-100 text-green-800" :
                          contact.status === "פוטנציאלי" ? "bg-yellow-100 text-yellow-800" :
                          "bg-blue-100 text-blue-800"
                        }>
                          {contact.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-2 text-sm">
                      {school && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="truncate">{school.name}</span>
                        </div>
                      )}

                      {contact.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}

                      {contact.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{contact.phone}</span>
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-100">
                        <div className="text-xs text-slate-500 mb-1">פעילויות: {contactActivities.length}</div>
                        {contact.last_contact_date && (
                          <div className="text-xs text-slate-500">
                            יצירת קשר אחרונה: {format(new Date(contact.last_contact_date), "dd/MM/yyyy")}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEditContact(contact); }} className="flex-1 gap-1">
                          <Edit className="w-3 h-3" />
                          ערוך
                        </Button>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setActivityForm({...activityForm, contact_id: contact.id, institution_id: contact.institution_id || ""}); setShowActivityDialog(true); }} className="flex-1 gap-1">
                          <MessageCircle className="w-3 h-3" />
                          יומן
                        </Button>
                        <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact.id); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                );
              })}
            </div>

            {filteredContacts.length === 0 && (
              <Card className="shadow-lg border-0">
                <CardContent className="text-center py-12">
                  <UserCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">לא נמצאו אנשי קשר</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities">
            <div className="mb-4 flex justify-end">
              <Button onClick={() => { resetActivityForm(); setShowActivityDialog(true); }} className="gap-2 bg-rose-600 hover:bg-rose-700">
                <Plus className="w-4 h-4" />
                יומן קשרי לקוחות
              </Button>
            </div>

            <div className="space-y-3">
              {recentActivities.map(activity => {
                const contact = contacts.find(c => c.id === activity.contact_id);
                const school = schools.find(s => s.id === activity.institution_id);
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="bg-white hover:shadow-md transition-all border-0">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                          <ClipboardList className="w-5 h-5 text-rose-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-slate-800">{activity.subject || activity.activity_type}</h3>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                <Badge className="bg-rose-100 text-rose-800 text-[10px]">
                                  {activity.activity_type}
                                </Badge>
                                <span>{format(new Date(activity.activity_date), "dd/MM/yyyy HH:mm")}</span>
                              </div>
                            </div>
                            {activity.outcome && (
                              <Badge className={
                                activity.outcome === "מוצלח" ? "bg-green-100 text-green-800" :
                                activity.outcome === "דורש מעקב" ? "bg-yellow-100 text-yellow-800" :
                                "bg-slate-100 text-slate-800"
                              }>
                                {activity.outcome}
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-slate-600 mb-2">{activity.description}</p>

                          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                            {contact && (
                              <span className="flex items-center gap-1">
                                <UserCircle className="w-3 h-3" />
                                {contact.full_name}
                              </span>
                            )}
                            {school && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {school.name}
                              </span>
                            )}
                          </div>

                          {activity.next_action && (
                            <div className="mt-2 pt-2 border-t border-slate-100 text-xs">
                              <span className="text-slate-600">פעולה הבאה:</span> <span className="font-medium">{activity.next_action}</span>
                              {activity.next_action_date && (
                                <span className="text-slate-500"> • {format(new Date(activity.next_action_date), "dd/MM/yyyy")}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                );
              })}
            </div>

            {recentActivities.length === 0 && (
              <Card className="shadow-lg border-0">
                <CardContent className="text-center py-12">
                  <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">אין פעילויות ביומן</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={(open) => { if (!open) resetContactForm(); setShowContactDialog(open); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingContact ? "עריכת איש קשר" : "איש קשר חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">שם מלא *</label>
                <Input
                  value={contactForm.full_name}
                  onChange={(e) => setContactForm({...contactForm, full_name: e.target.value})}
                  placeholder="שם מלא"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">תפקיד</label>
                <Input
                  value={contactForm.title}
                  onChange={(e) => setContactForm({...contactForm, title: e.target.value})}
                  placeholder="תפקיד"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">אימייל</label>
                <Input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">טלפון</label>
                <Input
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                  placeholder="טלפון"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">מוסד חינוך</label>
                <Select value={contactForm.institution_id} onValueChange={(v) => setContactForm({...contactForm, institution_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מוסד" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">סטטוס</label>
                <Select value={contactForm.status} onValueChange={(v) => setContactForm({...contactForm, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="פעיל">פעיל</SelectItem>
                    <SelectItem value="לא פעיל">לא פעיל</SelectItem>
                    <SelectItem value="פוטנציאלי">פוטנציאלי</SelectItem>
                    <SelectItem value="לקוח">לקוח</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">הערות</label>
              <Textarea
                value={contactForm.notes}
                onChange={(e) => setContactForm({...contactForm, notes: e.target.value})}
                placeholder="הערות נוספות..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowContactDialog(false); resetContactForm(); }}>ביטול</Button>
            <Button onClick={handleSaveContact} className="bg-indigo-600 hover:bg-indigo-700">שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={(open) => { if (!open) resetActivityForm(); setShowActivityDialog(open); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת פעילות ליומן</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">סוג פעילות</label>
                <Select value={activityForm.activity_type} onValueChange={(v) => setActivityForm({...activityForm, activity_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="שיחה">שיחה</SelectItem>
                    <SelectItem value="פגישה">פגישה</SelectItem>
                    <SelectItem value="אימייל">אימייל</SelectItem>
                    <SelectItem value="הודעת SMS">הודעת SMS</SelectItem>
                    <SelectItem value="הודעת WhatsApp">הודעת WhatsApp</SelectItem>
                    <SelectItem value="הערה">הערה</SelectItem>
                    <SelectItem value="משימה">משימה</SelectItem>
                    <SelectItem value="אחר">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">תאריך ושעה</label>
                <Input
                  type="datetime-local"
                  value={activityForm.activity_date}
                  onChange={(e) => setActivityForm({...activityForm, activity_date: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">איש קשר</label>
                <Select value={activityForm.contact_id} onValueChange={(v) => setActivityForm({...activityForm, contact_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר איש קשר" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>-- ללא --</SelectItem>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">מוסד חינוך</label>
                <Select value={activityForm.institution_id} onValueChange={(v) => setActivityForm({...activityForm, institution_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מוסד" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>-- ללא --</SelectItem>
                    {schools.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">נושא</label>
              <Input
                value={activityForm.subject}
                onChange={(e) => setActivityForm({...activityForm, subject: e.target.value})}
                placeholder="נושא הפעילות"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">תיאור</label>
              <Textarea
                value={activityForm.description}
                onChange={(e) => setActivityForm({...activityForm, description: e.target.value})}
                placeholder="תיאור מפורט..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">תוצאה</label>
                <Select value={activityForm.outcome} onValueChange={(v) => setActivityForm({...activityForm, outcome: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר תוצאה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>-- ללא --</SelectItem>
                    <SelectItem value="מוצלח">מוצלח</SelectItem>
                    <SelectItem value="לא מוצלח">לא מוצלח</SelectItem>
                    <SelectItem value="דורש מעקב">דורש מעקב</SelectItem>
                    <SelectItem value="ממתין לתשובה">ממתין לתשובה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">עדיפות</label>
                <Select value={activityForm.priority} onValueChange={(v) => setActivityForm({...activityForm, priority: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="גבוהה">גבוהה</SelectItem>
                    <SelectItem value="בינונית">בינונית</SelectItem>
                    <SelectItem value="נמוכה">נמוכה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">פעולה הבאה</label>
              <Input
                value={activityForm.next_action}
                onChange={(e) => setActivityForm({...activityForm, next_action: e.target.value})}
                placeholder="מה הפעולה הבאה?"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">תאריך לפעולה הבאה</label>
              <Input
                type="date"
                value={activityForm.next_action_date}
                onChange={(e) => setActivityForm({...activityForm, next_action_date: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowActivityDialog(false); resetActivityForm(); }}>ביטול</Button>
            <Button onClick={handleSaveActivity} className="bg-rose-600 hover:bg-rose-700">שמור ביומן</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}