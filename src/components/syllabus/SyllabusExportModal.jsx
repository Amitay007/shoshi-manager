import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown, Loader2, FileText, Gift, Layers, AppWindow, List, StickyNote, Eye, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function SyllabusExportModal({ open, onOpenChange, syllabus }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    
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
            
            if (response.data && response.data.file_base64) {
                // Handle Base64 response
                const binaryString = atob(response.data.file_base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
                
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.data.filename || `Syllabus_Proposal.docx`;
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
            } else {
                throw new Error("Invalid response from server");
            }

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

    const PreviewContent = () => {
        const selectedSessionData = (syllabus.sessions || [])
            .filter((_, idx) => selectedSessions.includes(idx))
            .sort((a, b) => a.number - b.number);

        return (
            <div className="space-y-6 font-sans text-right" dir="rtl">
                <div className="text-center border-b pb-4">
                    <h1 className="text-2xl font-bold">{syllabus.title || "הצעת תוכן - סילבוס VR"}</h1>
                </div>

                {general && (
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-800 border-b pb-1">פרטים כלליים</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div><span className="font-bold">שם המורה/מחבר:</span> {syllabus.teacher_name}</div>
                            <div><span className="font-bold">נושא הקורס:</span> {syllabus.course_topic}</div>
                            <div><span className="font-bold">תחום דעת:</span> {syllabus.subject}</div>
                            <div><span className="font-bold">קהל יעד:</span> {(syllabus.target_audience || []).join(", ")}</div>
                            <div><span className="font-bold">סוג פעילות:</span> {syllabus.activity_type}</div>
                        </div>
                    </div>
                )}

                {gifts && (
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-800 border-b pb-1">מתנות הלמידה</h2>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            {syllabus.gift_knowledge && <li><span className="font-bold">ידע:</span> {syllabus.gift_knowledge}</li>}
                            {syllabus.gift_skill && <li><span className="font-bold">מיומנות:</span> {syllabus.gift_skill}</li>}
                            {syllabus.gift_understanding && <li><span className="font-bold">הבנה:</span> {syllabus.gift_understanding}</li>}
                            {syllabus.final_product && <li><span className="font-bold">תוצר סופי:</span> {syllabus.final_product}</li>}
                        </ul>
                    </div>
                )}

                {(selectedSessionData.length > 0) && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-800 border-b pb-1">פירוט המפגשים</h2>
                        {selectedSessionData.map((session, i) => (
                            <div key={i} className="bg-slate-50 p-4 rounded-lg border">
                                <h3 className="font-bold text-lg mb-2">מפגש {session.number}: {session.topic || "ללא נושא"}</h3>
                                <div className="space-y-2 text-sm">
                                    {sessionContent.apps && session.app_ids?.length > 0 && (
                                        <div><span className="font-bold">אפליקציות:</span> {session.app_ids.length} נבחרו</div>
                                    )}
                                    {sessionContent.experiences && session.experience_ids?.length > 0 && (
                                        <div><span className="font-bold">חוויות:</span> {session.experience_ids.length} נבחרו</div>
                                    )}
                                    {sessionContent.steps && session.steps?.length > 0 && (
                                        <div>
                                            <span className="font-bold">מהלך השיעור:</span>
                                            <ol className="list-decimal list-inside mt-1 pr-4">
                                                {session.steps.map((step, idx) => (
                                                    <li key={idx}>{step}</li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}
                                    {sessionContent.worksheets && session.worksheet_urls?.length > 0 && (
                                        <div>
                                            <span className="font-bold">דפי עבודה:</span>
                                            <ul className="list-disc list-inside mt-1 pr-4 text-blue-600">
                                                {session.worksheet_urls.map((ws, idx) => (
                                                    <li key={idx}>{ws.name || ws.url}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (!syllabus) return null;

    return (
        <>
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

                <DialogFooter className="p-4 bg-gray-50 border-t rounded-b-lg gap-2 sm:gap-0 justify-between sm:justify-between flex-row">
                     <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
                        <Button 
                            variant="outline"
                            onClick={() => setShowPreview(true)}
                            className="gap-2"
                        >
                            <Eye className="w-4 h-4" />
                            תצוגה מקדימה
                        </Button>
                    </div>
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

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 bg-white" dir="rtl">
                <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-blue-600" />
                        תצוגה מקדימה להצעה
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 p-6 bg-slate-50">
                    <div className="bg-white p-8 shadow-sm rounded-lg min-h-[500px] max-w-[21cm] mx-auto border">
                        <PreviewContent />
                    </div>
                </ScrollArea>
                <DialogFooter className="p-4 border-t bg-gray-50">
                    <Button onClick={() => setShowPreview(false)}>סגור תצוגה מקדימה</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}