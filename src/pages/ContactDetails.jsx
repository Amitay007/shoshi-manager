import React, { useState, useEffect } from "react";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { Contact } from "@/entities/Contact";
import { InteractionLog } from "@/entities/InteractionLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, Mail, MessageCircle, Calendar, Plus, 
  ArrowRight, MapPin, Building2, Clock, CheckCircle, AlertCircle 
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { with429Retry } from "@/components/utils/retry";
import { format } from "date-fns";
import InteractionLogModal from "@/components/crm/InteractionLogModal";
import { Link } from "react-router-dom";
import BackHomeButtons from "@/components/common/BackHomeButtons";

export default function ContactDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const contactId = urlParams.get("id");
  const mode = urlParams.get("mode") || "manager";
  const isManager = mode === 'manager';

  const [contact, setContact] = useState(null);
  const [school, setSchool] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    if (contactId) loadData();
  }, [contactId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const contactData = await with429Retry(() => Contact.get(contactId));
      setContact(contactData);

      if (contactData.institution_id) {
        const schoolData = await with429Retry(() => EducationInstitution.get(contactData.institution_id));
        setSchool(schoolData);
      }

      // Load logs
      const logsData = await with429Retry(() => InteractionLog.filter({ contact_id: contactId }));
      setLogs((logsData || []).sort((a, b) => new Date(b.date) - new Date(a.date)));

    } catch (error) {
      console.error("Error loading contact details:", error);
    }
    setLoading(false);
  };

  const handleSaveLog = async (logData) => {
    try {
      await with429Retry(() => InteractionLog.create({
        ...logData,
        contact_id: contactId
      }));
      setShowLogModal(false);
      loadData(); // Refresh logs
    } catch (error) {
      console.error("Error saving log:", error);
      alert("שגיאה בשמירת התיעוד");
    }
  };

  const getActionIcon = (type) => {
    switch (type) {
      case 'call': return <Phone className="w-4 h-4" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      case 'meeting': return <Users className="w-4 h-4" />; // Fixed: Users icon
      case 'video': return <Video className="w-4 h-4" />; // Fixed: Video icon needed? lucide-react has Video
      case 'note': return <FileText className="w-4 h-4" />; // Fixed: FileText
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };
  
  // Quick fix for icons used above
  const Users = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  const Video = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
  const FileText = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;


  if (loading) return <div className="p-8 text-center">טוען פרטי איש קשר...</div>;
  if (!contact) return <div className="p-8 text-center">איש קשר לא נמצא</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Top Navigation */}
        <div className="flex justify-between items-center">
          <Link to={createPageUrl(`CRMHub?mode=${mode}`)}>
            <Button variant="ghost" className="gap-2 text-slate-600">
              <ArrowRight className="w-4 h-4" /> חזרה ל{isManager ? "קשרי לקוחות" : "מרכז תקשורת"}
            </Button>
          </Link>
          <BackHomeButtons showBack={false} />
        </div>

        {/* Header Card */}
        <Card className="border-0 shadow-lg bg-white overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              
              {/* Personal Details */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl font-bold shadow-inner">
                  {contact.full_name?.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{contact.full_name}</h1>
                  <p className="text-slate-500 font-medium text-lg">{contact.title || "ללא תפקיד"}</p>
                  
                  {school ? (
                    <Link to={createPageUrl(`SchoolDetails?id=${school.id}&mode=${mode}`)}>
                      <Button variant="link" className="p-0 h-auto text-purple-600 gap-1 mt-1 font-semibold">
                        <Building2 className="w-4 h-4" />
                        {school.name}
                      </Button>
                    </Link>
                  ) : (
                    <p className="text-slate-400 text-sm mt-1">לא משוייך למוסד</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3">
                {contact.phone && (
                  <a href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                    <Button className="bg-green-500 hover:bg-green-600 text-white rounded-full w-12 h-12 p-0 shadow-md">
                      <MessageCircle className="w-5 h-5" />
                    </Button>
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`}>
                    <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-12 h-12 p-0 shadow-md">
                      <Phone className="w-5 h-5" />
                    </Button>
                  </a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`}>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-12 h-12 p-0 shadow-md">
                      <Mail className="w-5 h-5" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Log Section */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock className="w-5 h-5 text-purple-600" />
                יומן מעקב ותיעוד
              </CardTitle>
              <Button onClick={() => setShowLogModal(true)} className="gap-2 bg-purple-600 hover:bg-purple-700 shadow-sm">
                <Plus className="w-4 h-4" /> הוסף תיעוד חדש
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p>אין תיעוד אינטראקציות עדיין.</p>
                  <Button variant="link" onClick={() => setShowLogModal(true)} className="text-purple-600">התחל לתעד</Button>
                </div>
              ) : (
                <div className="relative border-r border-slate-200 mr-3 space-y-8">
                  {logs.map((log) => (
                    <div key={log.id} className="relative pr-8 group">
                      {/* Timeline Dot */}
                      <div className={`absolute -right-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                        log.type === 'call' ? 'bg-blue-500' : 
                        log.type === 'whatsapp' ? 'bg-green-500' :
                        log.type === 'meeting' ? 'bg-purple-500' : 'bg-slate-400'
                      }`}></div>
                      
                      {/* Content */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-white p-4 rounded-lg border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 gap-1">
                              {getActionIcon(log.type)}
                              {log.type === 'call' ? 'שיחה' : log.type === 'whatsapp' ? 'וואטסאפ' : log.type === 'meeting' ? 'פגישה' : log.type === 'video' ? 'וידאו' : 'הערה'}
                            </Badge>
                            <span className="text-xs text-slate-400 font-mono">
                              {format(new Date(log.date), "dd/MM/yyyy HH:mm")}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{log.content}</p>
                        </div>

                        {/* Follow Up Badge */}
                        {log.follow_up_date && (
                          <div className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border ${
                            log.status === 'done' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'
                          }`}>
                            {log.status === 'done' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            <div className="text-xs">
                              <div className="font-bold">המשך טיפול</div>
                              <div>{format(new Date(log.follow_up_date), "dd/MM/yyyy HH:mm")}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      <InteractionLogModal 
        isOpen={showLogModal} 
        onClose={() => setShowLogModal(false)} 
        onSave={handleSaveLog} 
      />
    </div>
  );
}