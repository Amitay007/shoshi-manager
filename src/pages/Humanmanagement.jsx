import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Search, Building2, Users, FileText, Calendar, Plus, Trash2, Eye, Mail, Phone, MapPin, BookOpen, BrainCircuit, Clock, Stamp, Hourglass, Rocket, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useLoading } from "@/components/common/LoadingContext";
import { with429Retry } from "@/components/utils/retry";
import BackHomeButtons from "@/components/common/BackHomeButtons";

export default function Humanmanagement() {
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [syllabi, setSyllabi] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  
  const [newContact, setNewContact] = useState({
    name: "", email: "", phone: "", organization: "", role: "", notes: ""
  });
  const [newActivity, setNewActivity] = useState({
    title: "", description: "", activity_type: "", related_entity: "", activity_date: ""
  });

  const { toast } = useToast();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    showLoader();
    setLoading(true);
    try {
      const [schoolsData, teachersData, programsData, devicesData, contactsData, activitiesData, syllabiData] = await Promise.all([
        with429Retry(() => base44.entities.EducationInstitution.list()),
        with429Retry(() => base44.entities.Teacher.list()),
        with429Retry(() => base44.entities.InstitutionProgram.list()),
        with429Retry(() => base44.entities.VRDevice.list()),
        with429Retry(() => base44.entities.Contact.list()),
        with429Retry(() => base44.entities.ActivityLog.list()),
        with429Retry(() => base44.entities.Syllabus.list())
      ]);
      
      setSchools(schoolsData || []);
      setTeachers(teachersData || []);
      setPrograms(programsData || []);
      setDevices(devicesData || []);
      setContacts(contactsData || []);
      setActivities(activitiesData || []);
      setSyllabi(syllabiData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את הנתונים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const stats = useMemo(() => {
    const activeSchools = schools.filter(s => s.active !== false).length;
    const activeTeachers = teachers.filter(t => t.active !== false).length;
    const activePrograms = programs.filter(p => p.status === "פעילה").length;
    const totalContacts = contacts.length;
    
    return { activeSchools, activeTeachers, activePrograms, totalContacts };
  }, [schools, teachers, programs, contacts]);

  const filteredSchools = useMemo(() => {
    if (!searchTerm) return schools;
    const term = searchTerm.toLowerCase();
    return schools.filter(s => 
      s.name?.toLowerCase().includes(term) || 
      s.city?.toLowerCase().includes(term) ||
      s.type?.toLowerCase().includes(term)
    );
  }, [schools, searchTerm]);

  const filteredTeachers = useMemo(() => {
    if (!searchTerm) return teachers;
    const term = searchTerm.toLowerCase();
    return teachers.filter(t => 
      t.name?.toLowerCase().includes(term) || 
      t.email?.toLowerCase().includes(term) ||
      t.subjects?.some(s => s.toLowerCase().includes(term))
    );
  }, [teachers, searchTerm]);

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts;
    const term = searchTerm.toLowerCase();
    return contacts.filter(c => 
      c.name?.toLowerCase().includes(term) || 
      c.email?.toLowerCase().includes(term) ||
      c.organization?.toLowerCase().includes(term)
    );
  }, [contacts, searchTerm]);

  const recentActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => new Date(b.activity_date || b.created_date) - new Date(a.activity_date || a.created_date))
      .slice(0, 10);
  }, [activities]);

  const handleSaveContact = async () => {
    try {
      if (editingContact) {
        await with429Retry(() => base44.entities.Contact.update(editingContact.id, newContact));
        toast({ title: "הצלחה", description: "איש הקשר עודכן בהצלחה" });
      } else {
        await with429Retry(() => base44.entities.Contact.create(newContact));
        toast({ title: "הצלחה", description: "איש הקשר נוסף בהצלחה" });
      }
      setShowAddContact(false);
      setEditingContact(null);
      setNewContact({ name: "", email: "", phone: "", organization: "", role: "", notes: "" });
      loadAllData();
    } catch (error) {
      toast({ title: "שגיאה", description: "לא הצלחנו לשמור את איש הקשר", variant: "destructive" });
    }
  };

  const handleDeleteContact = async (id) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק איש קשר זה?")) return;
    try {
      await with429Retry(() => base44.entities.Contact.delete(id));
      toast({ title: "הצלחה", description: "איש הקשר נמחק בהצלחה" });
      loadAllData();
    } catch (error) {
      toast({ title: "שגיאה", description: "לא הצלחנו למחוק את איש הקשר", variant: "destructive" });
    }
  };

  const handleSaveActivity = async () => {
    try {
      await with429Retry(() => base44.entities.ActivityLog.create(newActivity));
      toast({ title: "הצלחה", description: "הפעילות נוספה בהצלחה" });
      setShowAddActivity(false);
      setNewActivity({ title: "", description: "", activity_type: "", related_entity: "", activity_date: "" });
      loadAllData();
    } catch (error) {
      toast({ title: "שגיאה", description: "לא הצלחנו לשמור את הפעילות", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="p-8 text-center">טוען נתונים...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <Brain className="w-10 h-10 text-purple-600" />
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">מרכז יחסי אנוש</h1>
              <p className="text-slate-600">מעקב וניהול למורה הנחוש</p>
            </div>
          </div>
        </div>



        {/* Info Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to={createPageUrl("CRMHub")}>
            <Card className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center hover:shadow-lg transition-shadow cursor-pointer h-full">
              <Users className="w-10 h-10 text-blue-600" />
              <CardTitle className="text-lg font-semibold text-slate-900">קשרי לקוחות</CardTitle>
              <p className="text-sm text-slate-500">נהל אנשי קשר</p>
            </Card>
          </Link>

          <Link to={createPageUrl("MasterSchedule")}>
            <Card className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center hover:shadow-lg transition-shadow cursor-pointer h-full">
              <Calendar className="w-10 h-10 text-green-600" />
              <CardTitle className="text-lg font-semibold text-slate-900">יומן</CardTitle>
              <p className="text-sm text-blue-600 font-medium">הבא: פגישת צוות 10:00</p>
            </Card>
          </Link>

          <Link to={createPageUrl("HoursReport")}>
            <Card className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center hover:shadow-lg transition-shadow cursor-pointer h-full">
              <Clock className="w-10 h-10 text-purple-600" />
              <CardTitle className="text-lg font-semibold text-slate-900">שעות</CardTitle>
              <p className="text-sm text-purple-600 font-bold">נוכחי: 142 שעות</p>
            </Card>
          </Link>

          <Link to={createPageUrl("DeviceAssignments")}>
            <Card className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center hover:shadow-lg transition-shadow cursor-pointer h-full">
              <FileText className="w-10 h-10 text-orange-600" />
              <CardTitle className="text-lg font-semibold text-slate-900">שיבוצים</CardTitle>
              <p className="text-sm text-slate-500">תכנון ושיבוץ</p>
            </Card>
          </Link>

          <Link to={createPageUrl("Schools")}>
            <Card className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center hover:shadow-lg transition-shadow cursor-pointer h-full">
              <Building2 className="w-10 h-10 text-indigo-600" />
              <CardTitle className="text-lg font-semibold text-slate-900">בתי ספר</CardTitle>
              <p className="text-sm text-slate-500">ניהול מוסדות</p>
            </Card>
          </Link>

          <Link to={createPageUrl("MySchedule")}>
            <Card className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center hover:shadow-lg transition-shadow cursor-pointer h-full">
              <Stamp className="w-10 h-10 text-pink-600" />
              <CardTitle className="text-lg font-semibold text-slate-900">שלישוך</CardTitle>
              <p className="text-sm text-red-600 font-bold">2 בקשות ממתינות</p>
            </Card>
          </Link>

          <Card className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center hover:shadow-lg transition-shadow cursor-pointer">
            <Rocket className="w-10 h-10 text-cyan-600" />
            <CardTitle className="text-lg font-semibold text-slate-900">בקרוב</CardTitle>
            <p className="text-sm text-slate-400">תכונה חדשה</p>
          </Card>

          <Card className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center hover:shadow-lg transition-shadow cursor-pointer">
            <Hourglass className="w-10 h-10 text-amber-600" />
            <CardTitle className="text-lg font-semibold text-slate-900">עוד מעט</CardTitle>
            <p className="text-sm text-slate-400">בפיתוח</p>
          </Card>
        </div>

        {/* Bottom Widget */}
        <Card className="bg-gradient-to-r from-slate-50 to-white border-purple-100 border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Rocket className="w-5 h-5 text-purple-600" />
              הפעילות הבאה שלי
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">סדנת VR - כיתה ט'3</h3>
                  <p className="text-sm text-slate-500">מחר, 10:00 - 11:30 • תיכון עירוני ד'</p>
                </div>
              </div>
              <Button variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                לפרטים מלאים
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Contact Dialog */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContact ? "עריכת איש קשר" : "הוספת איש קשר חדש"}</DialogTitle>
            <DialogDescription>מלא את פרטי איש הקשר</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם מלא</Label>
              <Input
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                placeholder="הכנס שם מלא"
              />
            </div>
            <div>
              <Label>אימייל</Label>
              <Input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                placeholder="example@email.com"
              />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                placeholder="050-1234567"
              />
            </div>
            <div>
              <Label>ארגון</Label>
              <Input
                value={newContact.organization}
                onChange={(e) => setNewContact({ ...newContact, organization: e.target.value })}
                placeholder="שם הארגון"
              />
            </div>
            <div>
              <Label>תפקיד</Label>
              <Input
                value={newContact.role}
                onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                placeholder="למשל: מנהל/ת"
              />
            </div>
            <div>
              <Label>הערות</Label>
              <Textarea
                value={newContact.notes}
                onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                placeholder="הערות נוספות..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddContact(false)}>ביטול</Button>
            <Button onClick={handleSaveContact}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>הוספת פעילות חדשה</DialogTitle>
            <DialogDescription>תעד פעילות או אירוע</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת</Label>
              <Input
                value={newActivity.title}
                onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                placeholder="כותרת הפעילות"
              />
            </div>
            <div>
              <Label>סוג פעילות</Label>
              <Select
                value={newActivity.activity_type}
                onValueChange={(value) => setNewActivity({ ...newActivity, activity_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג פעילות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">פגישה</SelectItem>
                  <SelectItem value="call">שיחת טלפון</SelectItem>
                  <SelectItem value="email">מייל</SelectItem>
                  <SelectItem value="workshop">סדנה</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תאריך</Label>
              <Input
                type="date"
                value={newActivity.activity_date}
                onChange={(e) => setNewActivity({ ...newActivity, activity_date: e.target.value })}
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                placeholder="תיאור הפעילות..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddActivity(false)}>ביטול</Button>
            <Button onClick={handleSaveActivity}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}