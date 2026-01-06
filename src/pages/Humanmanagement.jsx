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
import { Search, Building2, Users, FileText, Calendar, Plus, Trash2, Eye, Mail, Phone, MapPin, BookOpen } from "lucide-react";
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
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">מרכז ניהול</h1>
            <p className="text-slate-600">ניהול קשרי לקוחות - בתי ספר, מורים, אנשי קשר ופעילות</p>
          </div>
          <BackHomeButtons />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                בתי ספר
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{stats.activeSchools}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                <Users className="w-4 h-4" />
                מורים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{stats.activeTeachers}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                תוכניות פעילות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{stats.activePrograms}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                אנשי קשר
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900">{stats.totalContacts}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="חיפוש בתי ספר, מורים, אנשי קשר..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="schools" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="schools">בתי ספר</TabsTrigger>
            <TabsTrigger value="teachers">מורים</TabsTrigger>
            <TabsTrigger value="contacts">אנשי קשר</TabsTrigger>
            <TabsTrigger value="activities">פעילות</TabsTrigger>
          </TabsList>

          {/* Schools Tab */}
          <TabsContent value="schools" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">בתי ספר ({filteredSchools.length})</h3>
              <Link to={createPageUrl("SchoolDetails")}>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  הוסף בית ספר
                </Button>
              </Link>
            </div>
            <div className="grid gap-4">
              {filteredSchools.map((school) => (
                <Card key={school.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{school.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {school.type} • {school.city}
                        </CardDescription>
                      </div>
                      <Link to={createPageUrl("SchoolDetails") + `?id=${school.id}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Eye className="w-4 h-4" />
                          צפייה
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {school.contact_person && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Users className="w-4 h-4" />
                          {school.contact_person}
                        </div>
                      )}
                      {school.contact_email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4" />
                          {school.contact_email}
                        </div>
                      )}
                      {school.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4" />
                          {school.phone}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">מורים ({filteredTeachers.length})</h3>
            </div>
            <div className="grid gap-4">
              {filteredTeachers.map((teacher) => (
                <Card key={teacher.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{teacher.name}</CardTitle>
                        {teacher.subjects && teacher.subjects.length > 0 && (
                          <CardDescription className="mt-1">
                            {teacher.subjects.join(", ")}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {teacher.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4" />
                          {teacher.email}
                        </div>
                      )}
                      {teacher.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4" />
                          {teacher.phone}
                        </div>
                      )}
                      {teacher.specialty && (
                        <div className="text-slate-600">
                          התמחות: {teacher.specialty}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">אנשי קשר ({filteredContacts.length})</h3>
              <Button onClick={() => { setShowAddContact(true); setEditingContact(null); }} className="gap-2">
                <Plus className="w-4 h-4" />
                הוסף איש קשר
              </Button>
            </div>
            <div className="grid gap-4">
              {filteredContacts.map((contact) => (
                <Card key={contact.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{contact.name}</CardTitle>
                        {contact.role && (
                          <CardDescription className="mt-1">{contact.role}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingContact(contact);
                            setNewContact(contact);
                            setShowAddContact(true);
                          }}
                        >
                          ערוך
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {contact.organization && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Building2 className="w-4 h-4" />
                          {contact.organization}
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4" />
                          {contact.email}
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4" />
                          {contact.phone}
                        </div>
                      )}
                      {contact.notes && (
                        <div className="text-slate-600 mt-2">{contact.notes}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">פעילות אחרונה</h3>
              <Button onClick={() => setShowAddActivity(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                הוסף פעילות
              </Button>
            </div>
            <div className="grid gap-4">
              {recentActivities.map((activity) => (
                <Card key={activity.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{activity.title}</CardTitle>
                        {activity.activity_type && (
                          <CardDescription className="mt-1">{activity.activity_type}</CardDescription>
                        )}
                      </div>
                      {activity.activity_date && (
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Calendar className="w-4 h-4" />
                          {new Date(activity.activity_date).toLocaleDateString('he-IL')}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  {activity.description && (
                    <CardContent>
                      <p className="text-sm text-slate-600">{activity.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
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