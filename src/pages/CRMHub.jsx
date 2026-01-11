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
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("all");

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
      const [schoolsData, contactsData] = await Promise.all([
        with429Retry(() => EducationInstitution.list()),
        with429Retry(() => Contact.list())
      ]);
      
      setSchools(schoolsData || []);
      setContacts(contactsData || []);
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

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !searchTerm ||
      (c.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (schools.find(s => s.id === c.institution_id)?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesSchool = schoolFilter === "all" || c.institution_id === schoolFilter;
    
    return matchesSearch && matchesSchool;
  });

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <UserCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-indigo-900">מרכז תקשורת</h1>
              <p className="text-slate-500 text-xs sm:text-sm">ניהול אנשי קשר ומוסדות</p>
            </div>
          </div>
          <div className="hidden lg:block">
            <BackHomeButtons />
          </div>
        </div>

        {/* Filters Bar */}
        <Card className="mb-6 shadow-lg border-0 bg-white">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <Input
                placeholder="חיפוש לפי שם, אימייל או תפקיד..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-right"
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="סינון לפי בית ספר" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל בתי הספר</SelectItem>
                  {schools.map(school => (
                    <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { resetContactForm(); setShowContactDialog(true); }} className="gap-2 bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto">
              <Plus className="w-4 h-4" />
              איש קשר חדש
            </Button>
          </CardContent>
        </Card>

        {/* Contacts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredContacts.map(contact => {
            const school = schools.find(s => s.id === contact.institution_id);
            
            return (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <Link to={createPageUrl(`ContactDetails?id=${contact.id}`)}>
                  <Card className="bg-white hover:shadow-xl transition-all duration-300 border-0 cursor-pointer h-full">
                    <div className="h-1.5 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
                    
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-lg font-bold">
                          {contact.full_name?.charAt(0)}
                        </div>
                        <Badge variant="outline" className="bg-slate-50">
                          {contact.title || "ללא תפקיד"}
                        </Badge>
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-900 mb-1">{contact.full_name}</h3>
                      
                      <div className="space-y-2 text-sm text-slate-600 mb-4 min-h-[60px]">
                        {school ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-500" />
                            <span className="line-clamp-1 font-medium">{school.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Building2 className="w-4 h-4" />
                            <span>לא משוייך</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-indigo-500" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-xs text-slate-400">לחץ לפרטים מלאים</span>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {filteredContacts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCircle className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-700">לא נמצאו אנשי קשר</h3>
            <p className="text-slate-500">נסה לשנות את הסינון או צור איש קשר חדש</p>
          </div>
        )}
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