import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { 
    AlertTriangle, 
    Users, 
    AppWindow, 
    Calendar as CalendarIcon, 
    Brain, 
    Bell, 
    Layers,
    Activity,
    ArrowLeft,
    Zap,
    Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ShoshiBrainChat from "@/components/home/ShoshiBrainChat";

// Helper for Hebrew Date
const getHebrewDate = () => {
    return new Intl.DateTimeFormat('he-IL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date());
};

const MetricCard = ({ title, value, icon: Icon, color, subtext }) => (
    <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden relative group">
        <div className={`absolute top-0 right-0 w-1.5 h-full ${color}`} />
        <CardContent className="p-5 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
                    {subtext && <span className="text-xs text-slate-400">{subtext}</span>}
                </div>
            </div>
            <div className={`p-3 rounded-full bg-slate-50 group-hover:bg-slate-100 transition-colors`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
        </CardContent>
    </Card>
);

const AlertItem = ({ title, time, type }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50/50 border border-red-100 mb-2 last:mb-0">
        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
        <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{time}</p>
        </div>
    </div>
);

const UpdateItem = ({ title, date, tag }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group mb-2 last:mb-0">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs group-hover:bg-blue-100 transition-colors">
                {date.split(' ')[0]}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700 transition-colors">{title}</p>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border">{tag}</span>
            </div>
        </div>
        <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
    </div>
);

export default function Home() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
            } catch (e) {
                console.error("Error loading user", e);
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    const firstName = user?.full_name?.split(' ')[0] || "אורח";

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* 1. Top Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard 
                        title="תקלות פתוחות" 
                        value="3" 
                        icon={AlertTriangle} 
                        color="bg-red-500" 
                        subtext="דחוף: 1"
                    />
                    <MetricCard 
                        title="משפחות פעילות" 
                        value="128" 
                        icon={Users} 
                        color="bg-purple-500" 
                        subtext="+12 החודש"
                    />
                    <MetricCard 
                        title="אפליקציות" 
                        value="45" 
                        icon={AppWindow} 
                        color="bg-cyan-500"
                    />
                    <MetricCard 
                        title="תוכניות לימוד" 
                        value="12" 
                        icon={Layers} 
                        color="bg-blue-500"
                    />
                </div>

                {/* 2. Greeting Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-lg relative overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute bottom-0 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                        
                        <CardContent className="p-6 flex items-center h-full relative z-10">
                            <div>
                                <h1 className="text-2xl font-bold mb-1">ברוך הבא, {firstName} 👋</h1>
                                <p className="text-blue-100 text-sm">המערכת מוכנה לעבודה. כל המדדים נראים תקינים הבוקר.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-0 shadow-md flex items-center justify-center">
                        <CardContent className="p-6 text-center">
                            <p className="text-sm text-slate-500 mb-1">היום יום {new Intl.DateTimeFormat('he-IL', { weekday: 'long' }).format(new Date())}</p>
                            <h2 className="text-xl font-bold text-slate-800">{getHebrewDate()}</h2>
                            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-400">
                                <Clock className="w-3 h-3" />
                                {new Date().toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. Main Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
                    
                    {/* Left Column - Shoshi's Brain (Larger) */}
                    <Card className="lg:col-span-7 flex flex-col border-0 shadow-lg overflow-hidden h-full">
                        <CardHeader className="bg-slate-900 text-white p-4 py-3 shrink-0 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-purple-400" />
                                <CardTitle className="text-base">המוח של שושי</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-xs text-slate-400">Active</span>
                            </div>
                        </CardHeader>
                        
                        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
                            {/* Top Part: Alerts (Fixed height) */}
                            <div className="h-1/3 p-4 border-b bg-white overflow-hidden flex flex-col">
                                <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                                    <Bell className="w-3 h-3" /> התראות אחרונות
                                </div>
                                <ScrollArea className="flex-1 -mr-3 pr-3">
                                    <AlertItem title="זוהה עומס בייצוא סילבוס (Latency > 2s)" time="לפני 10 דקות" type="warning" />
                                    <AlertItem title="שגיאת התחברות למשקפת #2611" time="לפני 45 דקות" type="error" />
                                    <div className="text-center text-xs text-slate-400 mt-2">אין התראות נוספות</div>
                                </ScrollArea>
                            </div>

                            {/* Bottom Part: Chat (Remaining height) */}
                            <div className="flex-1 min-h-0 p-4 bg-slate-100/50">
                                <ShoshiBrainChat />
                            </div>
                        </div>
                    </Card>

                    {/* Right Column - Yoya Updates */}
                    <Card className="lg:col-span-5 flex flex-col border-0 shadow-lg h-full">
                        <CardHeader className="bg-white border-b p-4 py-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-600" />
                                <CardTitle className="text-base text-slate-800">יויה עידכונים</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 min-h-0 bg-slate-50/30">
                            <ScrollArea className="h-full p-4">
                                <div className="space-y-1">
                                    <UpdateItem title="שיבוץ חדש: תיכון גולדווטר" date="15 ינו" tag="שיבוצים" />
                                    <UpdateItem title="נוספה אפליקציה: Dance Guru" date="12 ינו" tag="תוכן" />
                                    <UpdateItem title="סילבוס אושר: מיומנויות חברתיות" date="10 ינו" tag="פדגוגיה" />
                                    <UpdateItem title="עדכון גרסה למשקפות Quest 3" date="08 ינו" tag="טכני" />
                                    <UpdateItem title="מורה חדש הצטרף: אמיתי" date="05 ינו" tag="צוות" />
                                    <UpdateItem title="כנס חינוך עתידי - תזכורת" date="01 ינו" tag="אירוע" />
                                </div>
                            </ScrollArea>
                        </CardContent>
                        <div className="p-3 border-t bg-white text-center">
                            <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 w-full">
                                לכל העדכונים <ArrowLeft className="w-3 h-3 mr-1" />
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}