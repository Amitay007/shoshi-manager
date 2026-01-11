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
import { Link, useSearchParams } from "react-router-dom";
import { 
  Building2, Users, BookOpen, TrendingUp, 
  Phone, Mail, MapPin, Calendar, Plus,
  UserCircle, ClipboardList, Edit, Trash2, MessageCircle, Wallet, ArrowRight, Briefcase
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
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'manager'; // 'hr' or 'manager'
  const isManager = mode === 'manager';

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

  // Activity dialog removed

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
    // Placeholder for stats since we are only loading schools and contacts now
    return {
      programs: 0,
      teachers: 0
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

  // handleSaveActivity removed

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

  // resetActivityForm removed

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

  // Teachers filtering removed
  const filteredTeachers = [];

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !searchTerm ||
      (c.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (schools.find(s => s.id === c.institution_id)?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesSchool = schoolFilter === "all" || c.institution_id === schoolFilter;
    
    return matchesSearch && matchesSchool;
  });

  // Stats and recent activities removed as they are no longer displayed

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${isManager ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-purple-600 to-pink-600'}`}>
              {isManager ? <Briefcase className="w-7 h-7 text-white" /> : <UserCircle className="w-7 h-7 text-white" />}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-indigo-900">{isManager ? "קשרי לקוחות (CRM)" : "מרכז תקשורת"}</h1>
              <p className="text-slate-500 text-xs sm:text-sm">{isManager ? "ניהול מלא ומעקב פיננסי" : "ניהול קשר ותפעול שוטף"}</p>
            </div>
          </div>
          <div className="hidden lg:block">
            {/* Custom Back Button based on Mode */}
            <div className="flex gap-2">
                <Link to={createPageUrl(isManager ? "Management" : "Humanmanagement")}>
                    <Button variant="outline" className="gap-2">
                        <ArrowRight className="w-4 h-4" />
                        חזרה ל{isManager ? "ניהול" : "יחסי אנוש"}
                    </Button>
                </Link>
                <Link to={createPageUrl("Dashboard")}>
                    <Button variant="ghost" size="icon">
                        <Home className="w-4 h-4" />
                    </Button>
                </Link>
            </div>
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
                <Link to={createPageUrl(`ContactDetails?id=${contact.id}&mode=${mode}`)}>
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

      {/* Activity Dialog Removed */}
    </div>
  );
}