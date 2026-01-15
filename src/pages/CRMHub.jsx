import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Phone, Mail, User, Building2, Calendar, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CRMHub() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "",
    organization: "", // Keeping for backward compatibility or custom text
    institution_id: "", // New field
    type: "other",
    status: "active"
  });

  const queryClient = useQueryClient();

  // Fetch Contacts & Institutions
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-created_date', 100)
  });

  const { data: institutions } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => base44.entities.EducationInstitution.list()
  });

  // Create Contact Mutation
  const createContact = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contacts']);
      setIsAddOpen(false);
      setNewContact({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        role: "",
        organization: "",
        type: "other",
        status: "active"
      });
      toast.success("איש קשר נוצר בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת איש קשר")
  });

  const filteredContacts = contacts?.filter(contact => 
    (contact.first_name + " " + contact.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.organization?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreate = (e) => {
    e.preventDefault();
    createContact.mutate(newContact);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">אנשי קשר</h1>
          <p className="text-slate-500">ניהול אנשי קשר ואינטראקציות</p>
        </div>
        <div className="flex gap-2">
           <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 ml-2" />
                איש קשר חדש
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>הוספת איש קשר חדש</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    placeholder="שם פרטי" 
                    value={newContact.first_name}
                    onChange={e => setNewContact({...newContact, first_name: e.target.value})}
                    required
                  />
                  <Input 
                    placeholder="שם משפחה" 
                    value={newContact.last_name}
                    onChange={e => setNewContact({...newContact, last_name: e.target.value})}
                  />
                </div>
                <Input 
                  placeholder="אימייל" 
                  type="email"
                  value={newContact.email}
                  onChange={e => setNewContact({...newContact, email: e.target.value})}
                />
                <Input 
                  placeholder="טלפון" 
                  value={newContact.phone}
                  onChange={e => setNewContact({...newContact, phone: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select 
                    value={newContact.institution_id} 
                    onValueChange={val => {
                        const inst = institutions?.find(i => i.id === val);
                        setNewContact({
                            ...newContact, 
                            institution_id: val, 
                            organization: inst ? inst.name : "" // Auto-fill text for display
                        });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="בחר מוסד" /></SelectTrigger>
                    <SelectContent>
                        {institutions?.map(i => (
                            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="תפקיד" 
                    value={newContact.role}
                    onChange={e => setNewContact({...newContact, role: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <Select value={newContact.type} onValueChange={val => setNewContact({...newContact, type: val})}>
                    <SelectTrigger><SelectValue placeholder="סוג" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">מורה</SelectItem>
                      <SelectItem value="principal">מנהל</SelectItem>
                      <SelectItem value="admin">אדמין</SelectItem>
                      <SelectItem value="other">אחר</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newContact.status} onValueChange={val => setNewContact({...newContact, status: val})}>
                    <SelectTrigger><SelectValue placeholder="סטטוס" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">פעיל</SelectItem>
                      <SelectItem value="inactive">לא פעיל</SelectItem>
                      <SelectItem value="lead">ליד</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">שמור איש קשר</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Search className="w-5 h-5 text-slate-400" />
            <Input 
              placeholder="חיפוש לפי שם, אימייל או ארגון..." 
              className="border-0 bg-transparent focus-visible:ring-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם מלא</TableHead>
                  <TableHead className="text-right">תפקיד/ארגון</TableHead>
                  <TableHead className="text-right">פרטי קשר</TableHead>
                  <TableHead className="text-right">סוג</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">טוען נתונים...</TableCell>
                  </TableRow>
                ) : filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">לא נמצאו אנשי קשר</TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((contact) => (
                    <TableRow key={contact.id} className="group hover:bg-slate-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                            {contact.first_name?.[0]}{contact.last_name?.[0]}
                          </div>
                          {contact.first_name} {contact.last_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{contact.organization}</div>
                          <div className="text-slate-500 text-xs">{contact.role}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm text-slate-600">
                           {contact.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {contact.phone}</div>}
                           {contact.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> {contact.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50">{contact.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={contact.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>
                          {contact.status === 'active' ? 'פעיל' : contact.status === 'lead' ? 'ליד' : 'לא פעיל'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                         <Link to={createPageUrl(`ContactDetails?id=${contact.id}`)}>
                           <Button variant="ghost" size="sm">פרטים</Button>
                         </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}