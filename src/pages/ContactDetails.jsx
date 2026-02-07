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
        <div className="flex justify-start items-center">
          <Link to={createPageUrl(`CRMHub?mode=${mode}`)}>
            <Button className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md">
              <ArrowRight className="w-4 h-4" /> חזרה ל{isManager ? "קשרי לקוחות" : "מרכז תקשורת"}
            </Button>
          </Link>
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

        {/* Activity Log Section Removed for Simplicity */}
        {/* <div className="grid grid-cols-1 gap-6"> ... </div> */}

      </div>

      <InteractionLogModal 
        isOpen={showLogModal} 
        onClose={() => setShowLogModal(false)} 
        onSave={handleSaveLog} 
      />
    </div>
  );
}