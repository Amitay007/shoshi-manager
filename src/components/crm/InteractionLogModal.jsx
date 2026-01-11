import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function InteractionLogModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    type: "call",
    date: new Date().toISOString().slice(0, 16),
    content: "",
    hasFollowUp: false,
    follow_up_date: "",
    status: "done"
  });

  const handleSubmit = () => {
    onSave({
      ...formData,
      status: formData.hasFollowUp ? "open" : "done",
      follow_up_date: formData.hasFollowUp ? formData.follow_up_date : null
    });
    // Reset form after save
    setFormData({
      type: "call",
      date: new Date().toISOString().slice(0, 16),
      content: "",
      hasFollowUp: false,
      follow_up_date: "",
      status: "done"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>הוספת תיעוד חדש</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>סוג אינטראקציה</Label>
              <Select 
                value={formData.type} 
                onValueChange={(val) => setFormData({...formData, type: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">שיחה יוצאת/נכנסת</SelectItem>
                  <SelectItem value="whatsapp">וואטסאפ</SelectItem>
                  <SelectItem value="meeting">פגישה פרונטלית</SelectItem>
                  <SelectItem value="video">וידאו / זום</SelectItem>
                  <SelectItem value="note">הערה כללית</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תאריך</Label>
              <div className="flex gap-2">
                <Input 
                  type="date" 
                  value={formData.date.split('T')[0]}
                  onChange={(e) => {
                    const time = formData.date.split('T')[1] || "00:00";
                    setFormData({...formData, date: `${e.target.value}T${time}`})
                  }}
                />
                <Input 
                  type="time" 
                  value={formData.date.split('T')[1]}
                  onChange={(e) => {
                    const date = formData.date.split('T')[0];
                    setFormData({...formData, date: `${date}T${e.target.value}`})
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>סיכום דברים</Label>
            <Textarea 
              rows={4}
              placeholder="למשל: דיברנו על הקדמת השיעור..."
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
            />
          </div>

          <div className="flex items-center space-x-2 space-x-reverse bg-slate-50 p-3 rounded-lg border">
            <Checkbox 
              id="followup" 
              checked={formData.hasFollowUp}
              onCheckedChange={(checked) => setFormData({...formData, hasFollowUp: checked})}
            />
            <Label htmlFor="followup" className="cursor-pointer">נדרש המשך טיפול / תזכורת</Label>
          </div>

          {formData.hasFollowUp && (
            <div className="bg-slate-50 p-3 rounded-lg border border-t-0 mt-0">
              <Label>תאריך ושעה לתזכורת</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  type="date" 
                  value={formData.follow_up_date ? formData.follow_up_date.split('T')[0] : ""}
                  onChange={(e) => {
                    const current = formData.follow_up_date || new Date().toISOString().slice(0, 16);
                    const time = current.split('T')[1] || "09:00";
                    setFormData({...formData, follow_up_date: `${e.target.value}T${time}`})
                  }}
                />
                <Input 
                  type="time" 
                  value={formData.follow_up_date ? formData.follow_up_date.split('T')[1] : ""}
                  onChange={(e) => {
                    const current = formData.follow_up_date || new Date().toISOString().slice(0, 16);
                    const date = current.split('T')[0];
                    setFormData({...formData, follow_up_date: `${date}T${e.target.value}`})
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">שמור תיעוד</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}