import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import BackHomeButtons from "@/components/common/BackHomeButtons";
import { MapPin, Phone, ExternalLink, Save, Clock, Calendar, School } from "lucide-react";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";

export default function AssignmentDetails() {
  const [assignment, setAssignment] = useState(null);
  const [notes, setNotes] = useState("");
  const [attendanceLink, setAttendanceLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Mock fetching data based on ID (in real app, use useParams and fetch from DB)
  useEffect(() => {
    // Simulating fetch
    const mockData = {
      id: "evt_upcoming_1",
      school_name: "חטיבת ביניים שז\"ר",
      address: "העצמאות 40, קריית אונו",
      contact_phone: "052-9876543",
      contact_person: "רינה המנהלת",
      program_name: "מסע בחלל",
      class_name: "כיתה ח'2",
      start_time: new Date(new Date().setDate(new Date().getDate() + 1)).setHours(9, 0, 0, 0),
      end_time: new Date(new Date().setDate(new Date().getDate() + 1)).setHours(11, 0, 0, 0),
      notes: "",
      attendance_link: ""
    };
    
    setAssignment(mockData);
    setNotes(mockData.notes);
    setAttendanceLink(mockData.attendance_link);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    // Simulate save
    setTimeout(() => {
      setIsSaving(false);
      // alert("נשמר בהצלחה");
    }, 1000);
  };

  if (!assignment) return <div className="p-8 text-center">טוען פרטי שיבוץ...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">פרטי שיבוץ</h1>
            <p className="text-slate-500">צפייה ועריכת פרטי השיעור</p>
          </div>
          <BackHomeButtons backTo="TeacherAgenda" backLabel="חזרה ללוח" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Info Card */}
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader className="bg-slate-100/50 border-b border-slate-100 pb-4">
              <div className="flex justify-between items-start">
                <div>
                   <CardTitle className="text-xl text-indigo-900">{assignment.school_name}</CardTitle>
                   <div className="flex items-center gap-2 mt-2 text-slate-600">
                     <MapPin className="w-4 h-4" />
                     <span>{assignment.address}</span>
                   </div>
                </div>
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-0">
                  {assignment.program_name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">תאריך ושעה</span>
                  <div className="flex items-center gap-2 text-slate-800 font-medium">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    {format(new Date(assignment.start_time), "dd/MM/yyyy")}
                  </div>
                  <div className="flex items-center gap-2 text-slate-800 font-medium mt-1">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    {format(new Date(assignment.start_time), "HH:mm")} - {format(new Date(assignment.end_time), "HH:mm")}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">כיתה ואיש קשר</span>
                  <div className="flex items-center gap-2 text-slate-800 font-medium">
                    <School className="w-4 h-4 text-indigo-500" />
                    {assignment.class_name}
                  </div>
                  <div className="flex items-center gap-2 text-slate-800 font-medium mt-1">
                    <Phone className="w-4 h-4 text-indigo-500" />
                    {assignment.contact_person} ({assignment.contact_phone})
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <Label htmlFor="attendance">קישור לניהול נוכחות (Google Drive/Docs)</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="attendance" 
                      placeholder="הדבק כאן קישור..." 
                      value={attendanceLink}
                      onChange={(e) => setAttendanceLink(e.target.value)}
                      className="text-left ltr"
                    />
                    {attendanceLink && (
                      <Button variant="outline" size="icon" onClick={() => window.open(attendanceLink, '_blank')}>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">הערות לשיעור</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="הערות חשובות, ציוד נדרש, דגשים..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Actions / Side Panel */}
          <div className="space-y-4">
             <Card className="bg-indigo-50 border-indigo-100 shadow-sm">
               <CardContent className="p-4 space-y-4">
                 <h3 className="font-bold text-indigo-900">פעולות</h3>
                 <Button className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2" onClick={handleSave} disabled={isSaving}>
                   <Save className="w-4 h-4" />
                   {isSaving ? "שומר..." : "שמור שינויים"}
                 </Button>
                 <Button variant="outline" className="w-full bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                   צור קשר עם {assignment.contact_person}
                 </Button>
               </CardContent>
             </Card>
          </div>

        </div>
      </div>
    </div>
  );
}