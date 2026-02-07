import React from "react";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { InstitutionProgram } from "@/entities/InstitutionProgram";
import { Syllabus } from "@/entities/Syllabus";
import { Contact } from "@/entities/Contact";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Save, ArrowRight, Plus, Trash2, Eye, Calendar, AlertCircle, MapPin, Navigation, UserCircle, Phone, Mail, Wallet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPageUrl } from "@/utils";
import { Link, useNavigate } from "react-router-dom";
import { with429Retry } from "@/components/utils/retry";
import { format } from "date-fns";

export default function SchoolDetails() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const schoolId = urlParams.get("id");
  const isNew = urlParams.get("new") === "true";
  const mode = urlParams.get("mode") || "manager"; // 'hr' or 'manager'
  const isManager = mode === 'manager';

  const [loading, setLoading] = React.useState(!isNew);
  const [saving, setSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(isNew); // Edit mode state
  const [school, setSchool] = React.useState({
    name: "",
    type: "יסודי",
    city: "",
    address: "",
    phone: "",
    contact_person: "",
    contact_email: "",
    contact_role: "", // NEW
    notes: "",
    teacher_notes: "",
    manager_notes: ""
  });

  const [programs, setPrograms] = React.useState([]);
  const [contacts, setContacts] = React.useState([]);
  const [allSyllabi, setAllSyllabi] = React.useState([]);
  const [showAddProgramDialog, setShowAddProgramDialog] = React.useState(false);
  const [selectedSyllabusId, setSelectedSyllabusId] = React.useState("");
  const [newProgramDates, setNewProgramDates] = React.useState({
    start_date: "",
    end_date: "",
    status: "פעילה"
  });
  const [showWebOnlyAlert, setShowWebOnlyAlert] = React.useState(false);

  const loadPrograms = React.useCallback(async (instId) => {
    try {
      const institutionPrograms = await with429Retry(() => 
        InstitutionProgram.filter({ institution_id: instId })
      );
      
      const enrichedPrograms = [];
      
      for (const ip of (institutionPrograms || [])) {
        let syllabusFound = false;
        
        // Try to load syllabus, silently skip if not found
        try {
          // Changed: Removed with429Retry from Syllabus.get
          const syllabus = await Syllabus.get(ip.program_id);
          if (syllabus) {
            enrichedPrograms.push({
              ...ip,
              syllabusName: syllabus?.title || syllabus?.course_topic || "תוכנית ללא שם",
              syllabusData: syllabus
            });
            syllabusFound = true;
          }
        } catch (err) {
          // Changed: Simplified error message for not found syllabus
          console.warn(`Syllabus ${ip.program_id} not found, will delete orphan relation ${ip.id}`);
        }
        
        // If syllabus wasn't found, delete the orphan relation
        if (!syllabusFound) {
          try {
            // Changed: Removed with429Retry from InstitutionProgram.delete
            await InstitutionProgram.delete(ip.id);
            console.log(`Deleted orphan InstitutionProgram relation ${ip.id}`);
          } catch (delErr) {
            console.error(`Failed to delete orphan InstitutionProgram ${ip.id}:`, delErr);
          }
        }
      }
      
      setPrograms(enrichedPrograms);
    } catch (error) {
      console.error("Error loading programs:", error);
      setPrograms([]);
    }
  }, []);

  const loadSchoolData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [inst, schoolContacts] = await Promise.all([
        with429Retry(() => EducationInstitution.get(schoolId)),
        with429Retry(() => Contact.filter({ institution_id: schoolId }))
      ]);
      
      if (inst) {
        setSchool(inst);
        await loadPrograms(schoolId);
      }
      setContacts(schoolContacts || []);
    } catch (error) {
      console.error("Error loading school data:", error);
    }
    setLoading(false);
  }, [schoolId, loadPrograms]);

  const loadAllSyllabi = React.useCallback(async () => {
    try {
      const list = await with429Retry(() => Syllabus.list());
      setAllSyllabi(list || []);
    } catch (error) {
      console.error("Error loading syllabi:", error);
      setAllSyllabi([]);
    }
  }, []);

  React.useEffect(() => {
    if (!isNew && schoolId) {
      loadSchoolData();
    }
    loadAllSyllabi();
  }, [schoolId, isNew, loadSchoolData, loadAllSyllabi]);

  const handleSave = async () => {
    if (!school.name || !school.type || !school.city) {
      alert("נא למלא את כל השדות החובה");
      return;
    }

    setSaving(true);
    try {
      if (schoolId) { // If schoolId exists, it's an update
        await with429Retry(() => EducationInstitution.update(schoolId, school));
      } else { // If schoolId doesn't exist, it's a new creation
        await with429Retry(() => EducationInstitution.create(school));
      }
      navigate(createPageUrl(`Schools?mode=${mode}`)); // Navigate to Schools page after successful save
    } catch (error) {
      console.error("Error saving school:", error);
      alert("שגיאה בשמירת הנתונים");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchool = async () => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את המוסד? פעולה זו אינה הפיכה.")) return;
    
    setSaving(true);
    try {
      await with429Retry(() => EducationInstitution.delete(schoolId));
      navigate(createPageUrl(`Schools?mode=${mode}`));
    } catch (error) {
      console.error("Error deleting school:", error);
      alert("שגיאה במחיקת המוסד");
      setSaving(false);
    }
  };

  const handleAddProgram = async () => {
    if (!selectedSyllabusId) return;
    
    try {
      await with429Retry(() => InstitutionProgram.create({
        institution_id: schoolId,
        program_id: selectedSyllabusId,
        ...newProgramDates
      }));
      
      setShowAddProgramDialog(false);
      setSelectedSyllabusId("");
      setNewProgramDates({ start_date: "", end_date: "", status: "פעילה" });
      await loadPrograms(schoolId);
    } catch (error) {
      console.error("Error adding program:", error);
    }
  };

  const handleRemoveProgram = async (programId) => {
    if (!confirm("האם למחוק את השיוך לתוכנית?")) return;
    try {
      await with429Retry(() => InstitutionProgram.delete(programId));
      await loadPrograms(schoolId);
    } catch (error) {
      console.error("Error removing program:", error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center" dir="rtl">טוען פרטי מוסד...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-cyan-900 flex items-center justify-center gap-3">
            <Building2 className="w-10 h-10" />
            {isNew ? "הוספת מוסד חינוך חדש" : school.name}
          </h1>
          <div className="flex items-center justify-center gap-2">
            {isManager ? (
               <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 gap-2">
                 <Save className="w-4 h-4" />
                 {saving ? "שומר..." : "שמור"}
               </Button>
            ) : (
               <Button disabled className="bg-slate-200 text-slate-400 gap-2 cursor-not-allowed hover:bg-slate-200">
                 <Save className="w-4 h-4" />
                 שמור
               </Button>
            )}

            {!isNew && (
                isManager ? (
                    <Button onClick={handleDeleteSchool} disabled={saving} variant="destructive" className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        מחק מוסד
                    </Button>
                ) : (
                    <Button disabled variant="outline" className="bg-slate-100 text-slate-300 border-slate-200 gap-2 cursor-not-allowed">
                        <Trash2 className="w-4 h-4" />
                        מחק מוסד
                    </Button>
                )
            )}

            <Link to={createPageUrl(`Schools?mode=${mode}`)}>
              <Button variant="outline" className="gap-2">
                חזרה <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Basic Information */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>פרטי המוסד</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">שם המוסד *</label>
                <Input
                  value={school.name}
                  onChange={(e) => setSchool({ ...school, name: e.target.value })}
                  placeholder="הזן שם מוסד"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">סוג מוסד *</label>
                <Select value={school.type} onValueChange={(v) => setSchool({ ...school, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="יסודי">יסודי</SelectItem>
                    <SelectItem value="חטיבת ביניים">חטיבת ביניים</SelectItem>
                    <SelectItem value="תיכון">תיכון</SelectItem>
                    <SelectItem value="חינוך מיוחד">חינוך מיוחד</SelectItem>
                    <SelectItem value="אחר">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">עיר *</label>
                <Input
                  value={school.city}
                  onChange={(e) => setSchool({ ...school, city: e.target.value })}
                  placeholder="הזן עיר"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">כתובת</label>
                <div className="flex gap-2">
                  <Input
                    value={school.address}
                    onChange={(e) => setSchool({ ...school, address: e.target.value })}
                    placeholder="הזן כתובת"
                  />
                  {school.address && (
                    <a 
                      href={`https://waze.com/ul?q=${encodeURIComponent(school.address)}`} 
                      target="_blank" 
                      rel="noreferrer"
                    >
                      <Button variant="outline" size="icon" className="shrink-0 text-blue-500 border-blue-200 bg-blue-50 hover:bg-blue-100">
                        <Navigation className="w-5 h-5" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">טלפון</label>
                <Input
                  value={school.phone}
                  onChange={(e) => setSchool({ ...school, phone: e.target.value })}
                  placeholder="הזן מספר טלפון"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">שם איש קשר</label>
                <Input
                  value={school.contact_person}
                  onChange={(e) => setSchool({ ...school, contact_person: e.target.value })}
                  placeholder="הזן שם איש קשר"
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">תפקיד איש קשר</label>
                <Input
                  value={school.contact_role}
                  onChange={(e) => setSchool({ ...school, contact_role: e.target.value })}
                  placeholder="הזן תפקיד"
                  disabled={!isEditing}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1 block">אימייל איש קשר</label>
                <Input
                  type="email"
                  value={school.contact_email}
                  onChange={(e) => setSchool({ ...school, contact_email: e.target.value })}
                  placeholder="הזן אימייל"
                  disabled={!isEditing}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1 block">הערות כלליות</label>
                <Textarea
                  value={school.notes}
                  onChange={(e) => setSchool({ ...school, notes: e.target.value })}
                  placeholder="הערות נוספות..."
                  rows={3}
                />
              </div>

              {/* Teacher Notes - Visible to Everyone */}
              <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
                <label className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-purple-600" />
                  הערות למורה / מדריך
                </label>
                <Textarea
                  value={school.teacher_notes}
                  onChange={(e) => setSchool({ ...school, teacher_notes: e.target.value })}
                  placeholder="הערות שיוצגו למורים ומדריכים..."
                  className="bg-white"
                  rows={3}
                  readOnly={!isManager} // Only managers can edit, but everyone can see
                />
              </div>

              {/* Manager Notes & Financial Info - Manager Only */}
              {isManager && (
                <>
                  <div className="md:col-span-2 bg-amber-50 p-4 rounded-lg border border-amber-200 mt-2">
                    <label className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                      <UserCircle className="w-4 h-4" />
                      הערות למנהל (חסוי)
                    </label>
                    <Textarea
                      value={school.manager_notes}
                      onChange={(e) => setSchool({ ...school, manager_notes: e.target.value })}
                      placeholder="הערות פנימיות למנהלים בלבד..."
                      className="bg-white border-amber-200"
                      rows={3}
                    />
                  </div>


                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Linked Contacts Section */}
        {!isNew && schoolId && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="w-5 h-5" />
                אנשי קשר משויכים
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>אין אנשי קשר משויכים למוסד זה</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contacts.map((contact) => (
                    <Link key={contact.id} to={createPageUrl(`ContactDetails?id=${contact.id}&mode=${mode}`)}>
                      <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors bg-white cursor-pointer group">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold shrink-0">
                          {contact.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                            {contact.full_name}
                          </h4>
                          <p className="text-xs text-slate-500 truncate">{contact.title || "ללא תפקיד"}</p>
                          <div className="flex gap-2 mt-1">
                            {contact.phone && <Phone className="w-3 h-3 text-slate-400" />}
                            {contact.email && <Mail className="w-3 h-3 text-slate-400" />}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Programs Section - Only show for existing schools */}
        {!isNew && schoolId && (
          <Card className="shadow-md">
            <CardHeader>
              {isManager && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowAddProgramDialog(true)}
                      className="bg-cyan-600 hover:bg-cyan-700 gap-2"
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                      הוסף תוכנית קיימת
                    </Button>
                    <Button 
                      onClick={() => setShowWebOnlyAlert(true)}
                      className="bg-gray-400 hover:bg-gray-500 gap-2 cursor-not-allowed" 
                      size="sm"
                      disabled
                    >
                      <Plus className="w-4 h-4" />
                      צור תוכנית
                    </Button>
                  </div>
                </div>
              )}
              <CardTitle>תוכניות משוייכות</CardTitle>
            </CardHeader>
            <CardContent>
              {programs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>אין תוכניות משויכות למוסד זה</p>
                  <p className="text-sm mt-1">לחץ על "הוסף תוכנית קיימת" או "צור תוכנית חדשה"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {programs.map((prog) => (
                    <div 
                      key={prog.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Link 
                            to={createPageUrl(`SyllabusWizard?id=${prog.program_id}`)}
                            className="font-semibold text-cyan-700 hover:underline"
                          >
                            {prog.syllabusName}
                          </Link>
                          <Badge className={
                            prog.status === "פעילה" ? "bg-green-100 text-green-800" :
                            prog.status === "הושלמה" ? "bg-blue-100 text-blue-800" :
                            prog.status === "מושהית" ? "bg-amber-100 text-amber-800" :
                            "bg-slate-100 text-slate-800"
                          }>
                            {prog.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          {prog.start_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>התחלה: {format(new Date(prog.start_date), "dd/MM/yyyy")}</span>
                            </div>
                          )}
                          {prog.end_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>סיום: {format(new Date(prog.end_date), "dd/MM/yyyy")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={createPageUrl(`SyllabusWizard?id=${prog.program_id}&viewOnly=true`)}>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Eye className="w-4 h-4" />
                            צפה
                          </Button>
                        </Link>
                        {isManager && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveProgram(prog.id)}
                              className="gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              נתק
                            </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Web Only Alert Dialog */}
      <Dialog open={showWebOnlyAlert} onOpenChange={setShowWebOnlyAlert}>
        <DialogContent dir="rtl" className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-6 h-6" />
              הודעה
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-center text-base font-medium text-slate-700">
                פעיל בגרסת WEB בלבד
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowWebOnlyAlert(false)}
              className="bg-cyan-600 hover:bg-cyan-700 w-full"
            >
              המשך
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Program Dialog */}
      <Dialog open={showAddProgramDialog} onOpenChange={setShowAddProgramDialog}>
        <DialogContent dir="rtl" className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>הוספת תוכנית קיימת למוסד</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">בחר תוכנית *</label>
              <Select value={selectedSyllabusId} onValueChange={setSelectedSyllabusId}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר תוכנית מהרשימה" />
                </SelectTrigger>
                <SelectContent>
                  {allSyllabi
                    .filter(s => !programs.some(p => p.program_id === s.id))
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title || s.course_topic || "תוכנית ללא שם"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">תאריך התחלה</label>
                <Input
                  type="date"
                  value={newProgramDates.start_date}
                  onChange={(e) => setNewProgramDates({ ...newProgramDates, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">תאריך סיום</label>
                <Input
                  type="date"
                  value={newProgramDates.end_date}
                  onChange={(e) => setNewProgramDates({ ...newProgramDates, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">סטטוס</label>
              <Select value={newProgramDates.status} onValueChange={(v) => setNewProgramDates({ ...newProgramDates, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="פעילה">פעילה</SelectItem>
                  <SelectItem value="הושלמה">הושלמה</SelectItem>
                  <SelectItem value="מושהית">מושהית</SelectItem>
                  <SelectItem value="בוטלה">בוטלה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddProgramDialog(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleAddProgram}
              disabled={!selectedSyllabusId}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              הוסף תוכנית
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}