import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown, Loader2, FileText, Gift, Layers, AppWindow, List, StickyNote } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function SyllabusExportModal({ open, onOpenChange, syllabus }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    
    // Selection States
    const [general, setGeneral] = useState(true);
    const [gifts, setGifts] = useState(true);
    
    // Sessions Selection (indices)
    const [selectedSessions, setSelectedSessions] = useState(
        (syllabus?.sessions || []).map((_, idx) => idx)
    );
    
    // Session Content Selection
    const [sessionContent, setSessionContent] = useState({
        apps: true,
        experiences: true,
        steps: true,
        worksheets: true
    });

    const toggleSession = (index) => {
        setSelectedSessions(prev => 
            prev.includes(index) 
                ? prev.filter(i => i !== index) 
                : [...prev, index].sort((a,b) => a-b)
        );
    };

    const toggleAllSessions = () => {
        if (selectedSessions.length === (syllabus?.sessions || []).length) {
            setSelectedSessions([]);
        } else {
            setSelectedSessions((syllabus?.sessions || []).map((_, idx) => idx));
        }
    };

    const handleExport = async () => {
        if (!syllabus) return;
        setLoading(true);

        try {
            const options = {
                general,
                gifts,
                sessions: selectedSessions,
                sessionContent
            };

            const response = await base44.functions.invoke("generateSyllabusWord", {
                syllabusId: syllabus.id,
                options
            });
            
            // Handle binary response
            const blob = new Blob([response.data], { 
                type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
            });
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Syllabus_Proposal_${syllabus.title || "Draft"}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            
            toast({
                title: "הייצוא הושלם בהצלחה",
                description: "קובץ ה-Word ירד למחשב שלך",
                variant: "success"
            });
            onOpenChange(false);

        } catch (error) {
            console.error("Export failed:", error);
            toast({
                title: "שגיאה בייצוא",
                description: "לא הצלחנו לייצר את הקובץ. נסה שוב מאוחר יותר.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (!syllabus) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 bg-gray-50/95 backdrop-blur-sm rtl" dir="rtl">
                <DialogHeader className="p-6 pb-2 border-b bg-white rounded-t-lg">
                    <DialogTitle className="flex items-center gap-2 text-xl text-slate-800">
                        <FileDown className="w-6 h-6 text-blue-600" />
                        צור הצעת תוכן (Word)
                    </DialogTitle>
                    <DialogDescription>
                        בחר אילו חלקים מהסילבוס לכלול במסמך ההצעה שיופק.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                        
                        {/* 1. General Sections */}
                        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> פרקים ראשיים
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2 space-x-reverse bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <Checkbox id="opt-general" checked={general} onCheckedChange={setGeneral} />
                                    <Label htmlFor="opt-general" className="cursor-pointer font-medium">פתיחה ופרטים כלליים</Label>
                                </div>
                                <div className="flex items-center space-x-2 space-x-reverse bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <Checkbox id="opt-gifts" checked={gifts} onCheckedChange={setGifts} />
                                    <Label htmlFor="opt-gifts" className="cursor-pointer font-medium">מתנות הלמידה</Label>
                                </div>
                            </div>
                        </div>

                        {/* 2. Session Content Settings (Global) */}
                        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Layers className="w-4 h-4" /> תכולת מפגשים
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { key: 'apps', label: 'אפליקציות', icon: AppWindow },
                                    { key: 'experiences', label: 'חוויות', icon: Gift },
                                    { key: 'steps', label: 'מהלך', icon: List },
                                    { key: 'worksheets', label: 'דפי עבודה', icon: StickyNote }
                                ].map((item) => (
                                    <div key={item.key} className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                                         onClick={() => setSessionContent(p => ({...p, [item.key]: !p[item.key]}))}>
                                        <item.icon className={`w-5 h-5 ${sessionContent[item.key] ? 'text-blue-600' : 'text-slate-400'}`} />
                                        <span className={`text-xs font-medium ${sessionContent[item.key] ? 'text-slate-900' : 'text-slate-500'}`}>{item.label}</span>
                                        <Checkbox checked={sessionContent[item.key]} className="mt-1" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Session Selection */}
                        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <List className="w-4 h-4" /> בחירת מפגשים לייצוא
                                </h3>
                                <Button variant="ghost" size="sm" onClick={toggleAllSessions} className="text-xs h-7">
                                    {selectedSessions.length === (syllabus.sessions?.length || 0) ? 'בטל בחירה' : 'בחר הכל'}
                                </Button>
                            </div>
                            
                            {(!syllabus.sessions || syllabus.sessions.length === 0) ? (
                                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed">
                                    לא קיימים מפגשים בסילבוס זה
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {syllabus.sessions.map((session, idx) => (
                                        <div key={idx} className="flex items-center space-x-3 space-x-reverse p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all">
                                            <Checkbox 
                                                id={`sess-${idx}`} 
                                                checked={selectedSessions.includes(idx)} 
                                                onCheckedChange={() => toggleSession(idx)} 
                                            />
                                            <div className="flex-1">
                                                <Label htmlFor={`sess-${idx}`} className="cursor-pointer flex items-center gap-2 font-medium text-slate-700">
                                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold w-6 text-center">{session.number || idx+1}</span>
                                                    {session.topic || "מפגש ללא נושא"}
                                                </Label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 bg-gray-50 border-t rounded-b-lg gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
                    <Button 
                        onClick={handleExport} 
                        disabled={loading || (!general && !gifts && selectedSessions.length === 0)}
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <FileDown className="w-4 h-4 ml-2" />}
                        {loading ? "מייצר קובץ..." : "הורד קובץ Word"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}