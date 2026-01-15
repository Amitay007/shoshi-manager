import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, User, Building2, ArrowRight, Calendar, MessageSquare, Clock } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ContactDetails() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const contactId = params.get("id");

  const [newInteraction, setNewInteraction] = useState({
    type: "call",
    summary: "",
    date: new Date().toISOString(),
    next_action: ""
  });

  const { data: contact, isLoading: contactLoading } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => base44.entities.Contact.get(contactId),
    enabled: !!contactId
  });

  const { data: interactions, isLoading: interactionsLoading } = useQuery({
    queryKey: ['interactions', contactId],
    queryFn: () => base44.entities.InteractionLog.filter({ contact_id: contactId }, '-date', 50),
    enabled: !!contactId
  });

  const addInteraction = useMutation({
    mutationFn: (data) => base44.entities.InteractionLog.create({
      ...data,
      contact_id: contactId,
      date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['interactions']);
      setNewInteraction({ type: "call", summary: "", date: new Date().toISOString(), next_action: "" });
      toast.success("תיעוד נוסף בהצלחה");
    }
  });

  if (!contactId) return <div className="p-8 text-center">אנא בחר איש קשר</div>;
  if (contactLoading) return <div className="p-8 text-center">טוען פרטי איש קשר...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link to={createPageUrl("CRMHub")}>
        <Button variant="ghost" className="mb-4 pl-0 hover:pl-2 transition-all gap-2 text-slate-500">
          <ArrowRight className="w-4 h-4" /> חזרה למרכז תקשורת
        </Button>
      </Link>

      {/* Header Profile */}
      <Card className="bg-gradient-to-l from-purple-50 to-white border-purple-100">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="flex gap-4">
               <div className="w-16 h-16 rounded-full bg-purple-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
                  {contact.first_name?.[0]}{contact.last_name?.[0]}
               </div>
               <div>
                 <h1 className="text-2xl font-bold text-slate-900">{contact.first_name} {contact.last_name}</h1>
                 <div className="flex items-center gap-2 text-slate-500 mt-1">
                   <Building2 className="w-4 h-4" />
                   <span>{contact.organization}</span>
                   <span className="text-slate-300">•</span>
                   <span>{contact.role}</span>
                 </div>
                 <div className="flex gap-2 mt-3">
                   <Badge className="bg-purple-100 text-purple-700">{contact.type}</Badge>
                   <Badge variant="outline">{contact.status}</Badge>
                 </div>
               </div>
            </div>
            
            <div className="flex flex-col gap-2 min-w-[200px]">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Mail className="w-4 h-4" /></div>
                  <span className="text-sm font-medium">{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600">
                   <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Phone className="w-4 h-4" /></div>
                   <span className="text-sm font-medium">{contact.phone}</span>
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interaction Log */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>תיעוד אינטראקציות</CardTitle></CardHeader>
            <CardContent>
               <div className="space-y-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <h3 className="font-medium text-sm text-slate-700 mb-2">תיעוד חדש</h3>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Select value={newInteraction.type} onValueChange={v => setNewInteraction({...newInteraction, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">שיחה טלפונית</SelectItem>
                        <SelectItem value="meeting">פגישה</SelectItem>
                        <SelectItem value="email">מייל</SelectItem>
                        <SelectItem value="whatsapp">וואטסאפ</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      className="md:col-span-3"
                      placeholder="סיכום קצר..." 
                      value={newInteraction.summary}
                      onChange={e => setNewInteraction({...newInteraction, summary: e.target.value})}
                    />
                 </div>
                 <div className="flex justify-end mt-2">
                   <Button size="sm" onClick={() => addInteraction.mutate(newInteraction)} disabled={!newInteraction.summary}>
                     שמור תיעוד
                   </Button>
                 </div>
               </div>

               <div className="space-y-6 relative before:absolute before:right-6 before:top-4 before:bottom-4 before:w-px before:bg-slate-200">
                 {interactions?.map((log) => (
                   <div key={log.id} className="relative pr-12">
                     <div className="absolute right-3 top-1 w-6 h-6 rounded-full bg-white border-2 border-purple-200 flex items-center justify-center z-10">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                     </div>
                     <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{log.type}</Badge>
                            <span className="text-xs text-slate-400">{format(new Date(log.date), 'dd/MM/yyyy HH:mm')}</span>
                          </div>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed">{log.summary}</p>
                     </div>
                   </div>
                 ))}
                 {interactions?.length === 0 && <div className="text-center text-slate-500 py-4 pr-0">אין אינטראקציות מתועדות</div>}
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <Card>
             <CardHeader><CardTitle>הערות כלליות</CardTitle></CardHeader>
             <CardContent>
               <p className="text-slate-600 text-sm whitespace-pre-wrap">
                 {contact.notes || "אין הערות"}
               </p>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}