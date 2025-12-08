import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ExternalLink } from "lucide-react";

export default function LinkInput({ value = [], onChange, label }) {
  const [showDialog, setShowDialog] = React.useState(false);
  const [linkName, setLinkName] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");

  const handleAdd = () => {
    const name = (linkName || "").trim();
    const url = (linkUrl || "").trim();
    if (!name || !url) return;

    onChange?.([...(value || []), { name, url }]);
    setLinkName("");
    setLinkUrl("");
    setShowDialog(false);
  };

  const handleRemove = (idx) => {
    const arr = [...(value || [])];
    arr.splice(idx, 1);
    onChange?.(arr);
  };

  return (
    <div>
      <div className="text-sm text-slate-600 mb-2">{label}</div>
      <div className="space-y-2 mb-3">
        {(value || []).map((link, idx) => (
          <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded border">
            <a
              href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-cyan-700 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              {link.name}
            </a>
            <Button size="sm" variant="destructive" onClick={() => handleRemove(idx)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={() => setShowDialog(true)} className="gap-2">
        <Plus className="w-4 h-4" />
        הוסף קישור
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>הוסף קישור</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">שם</label>
              <Input
                placeholder="לדוגמה: מצגת על אנטומיה"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">קישור</label>
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleAdd} className="bg-cyan-600 hover:bg-cyan-700">
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}