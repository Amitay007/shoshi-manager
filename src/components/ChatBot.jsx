import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Send, User, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { with429Retry } from "@/components/utils/retry";

const SHOSHI_IMAGE = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b36aee270b4cf8a6a0a543/86b36bcd4_Lucid_Origin_generate_an_image_of_a_stereotypical_old_and_divo_2.jpg";

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSystemContext = async () => {
    try {
      const [devices, apps, programs, schools, deviceApps, schedules, teachers] = await Promise.all([
        with429Retry(() => base44.entities.VRDevice.list()),
        with429Retry(() => base44.entities.VRApp.list()),
        with429Retry(() => base44.entities.Syllabus.list()),
        with429Retry(() => base44.entities.EducationInstitution.list()),
        with429Retry(() => base44.entities.DeviceApp.list()),
        with429Retry(() => base44.entities.ScheduleEntry.list()),
        with429Retry(() => base44.entities.Teacher.list())
      ]);

      // Build rich relationships
      const deviceById = new Map((devices || []).map(d => [d.id, d]));
      const appById = new Map((apps || []).map(a => [a.id, a]));
      const programById = new Map((programs || []).map(p => [p.id, p]));
      const schoolById = new Map((schools || []).map(s => [s.id, s]));
      const teacherById = new Map((teachers || []).map(t => [t.id, t]));

      // Create installation map: device -> apps
      const deviceToApps = new Map();
      (deviceApps || []).forEach(da => {
        if (!deviceToApps.has(da.device_id)) deviceToApps.set(da.device_id, []);
        const app = appById.get(da.app_id);
        if (app) deviceToApps.get(da.device_id).push(app.name);
      });

      // Create installation map: app -> devices
      const appToDevices = new Map();
      (deviceApps || []).forEach(da => {
        if (!appToDevices.has(da.app_id)) appToDevices.set(da.app_id, []);
        const device = deviceById.get(da.device_id);
        if (device) appToDevices.get(da.app_id).push(device.binocular_number);
      });

      // Filter upcoming schedules
      const now = new Date();
      const upcomingSchedules = (schedules || [])
        .filter(s => new Date(s.end_datetime) > now)
        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

      // Create schedule map: device -> schedules
      const deviceToSchedules = new Map();
      upcomingSchedules.forEach(s => {
        (s.device_ids || []).forEach(did => {
          if (!deviceToSchedules.has(did)) deviceToSchedules.set(did, []);
          const prog = programById.get(s.program_id);
          deviceToSchedules.get(did).push({
            program: prog?.title || prog?.course_topic || "תוכנית",
            start: s.start_datetime,
            end: s.end_datetime,
            location: s.custom_location || schoolById.get(s.institution_id)?.name || ""
          });
        });
      });

      // Create program map: program -> schedules
      const programToSchedules = new Map();
      upcomingSchedules.forEach(s => {
        if (!programToSchedules.has(s.program_id)) programToSchedules.set(s.program_id, []);
        programToSchedules.get(s.program_id).push({
          start: s.start_datetime,
          end: s.end_datetime,
          location: s.custom_location || schoolById.get(s.institution_id)?.name || "",
          devices: (s.device_ids || []).map(did => deviceById.get(did)?.binocular_number).filter(Boolean)
        });
      });

      // Build enriched context
      const context = {
        summary: {
          total_devices: (devices || []).length,
          total_apps: (apps || []).length,
          total_programs: (programs || []).length,
          total_schools: (schools || []).length,
          total_teachers: (teachers || []).length,
          upcoming_schedules: upcomingSchedules.length
        },
        devices: (devices || []).map(d => ({
          number: d.binocular_number,
          model: d.model,
          status: d.status,
          email: d.primary_email,
          school: d.school,
          installed_apps: deviceToApps.get(d.id) || [],
          upcoming_schedules: (deviceToSchedules.get(d.id) || []).slice(0, 3)
        })),
        apps: (apps || []).map(a => ({
          name: a.name,
          description: a.description,
          purchase_type: a.purchase_type,
          genre: a.genre,
          education_field: a.education_field,
          installed_on_devices: appToDevices.get(a.id) || [],
          store_link: a.store_link,
          website_link: a.website_link
        })),
        programs: (programs || []).map(p => ({
          title: p.title || p.course_topic || "ללא כותרת",
          teacher: p.teacher_name,
          subject: p.subject,
          topic: p.course_topic,
          sessions_count: p.meetings_count,
          target_audience: p.target_audience,
          school_id: p.school_id,
          school_name: schoolById.get(p.school_id)?.name || "",
          upcoming_schedules: (programToSchedules.get(p.id) || []).slice(0, 3)
        })),
        schools: (schools || []).map(s => ({
          name: s.name,
          type: s.type,
          city: s.city,
          address: s.address,
          contact_person: s.contact_person,
          contact_email: s.contact_email,
          phone: s.phone
        })),
        teachers: (teachers || []).map(t => ({
          name: t.name,
          email: t.email,
          phone: t.phone,
          institution: schoolById.get(t.institution_id)?.name || "",
          subjects: t.subjects,
          specialty: t.specialty
        })),
        upcoming_schedules: upcomingSchedules.slice(0, 10).map(s => {
          const prog = programById.get(s.program_id);
          const teacher = teacherById.get(s.assigned_teacher_id);
          const school = schoolById.get(s.institution_id);
          return {
            program: prog?.title || prog?.course_topic || "תוכנית",
            start_datetime: s.start_datetime,
            end_datetime: s.end_datetime,
            location: s.custom_location || school?.name || "",
            learning_space: s.learning_space,
            teacher: teacher?.name || "",
            status: s.status,
            devices: (s.device_ids || []).map(did => deviceById.get(did)?.binocular_number).filter(Boolean)
          };
        })
      };

      return context;
    } catch (error) {
      console.error("Error loading system context:", error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // 10% chance Shoshi asks "why?"
      const askWhy = Math.random() < 0.1;
      if (askWhy) {
        const whyResponses = [
          "למה? 🤷‍♀️",
          "למה בכלל? אני עייפה...",
          "למה אתה שואל אותי את זה?",
          "למה? יש לך סגריה? 🚬",
        ];
        const randomWhy = whyResponses[Math.floor(Math.random() * whyResponses.length)];
        
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: randomWhy
        }]);
        setIsLoading(false);
        return;
      }

      // 5% chance for cigarette question
      const needsCigarette = Math.random() < 0.05;
      if (needsCigarette) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "יש לך סגריה? 🚬"
        }]);
        setIsLoading(false);
        return;
      }

      // Load system context and generate real response
      const context = await loadSystemContext();

      const systemPrompt = `את שושי - עוזרת חכמה למערכת ניהול משקפות VR ואפליקציות.

מידע עשיר על המערכת (כולל קשרים בין ישויות):
${JSON.stringify(context, null, 2)}

תפקידך והיכולות שלך:
- את יכולה לענות על שאלות מורכבות המצריכות הצלבת מידע ממספר מקורות.
- את מבינה קשרים: איזה אפליקציה מותקנת על איזו משקפת, איזו תוכנית משוייכת לאיזה בית ספר, מתי השיבוצים הקרובים, וכו'.
- את יכולה לענות על שאלות כמו:
  * "באיזה משקפות מותקנת האפליקציה X?"
  * "מתי הפעילות הקרובה?"
  * "איזה משקפות משויכות לתוכנית Y?"
  * "מי המורה המוביל של Z?"
  * "מה הכתובת של בית ספר W?"
  * "כמה אפליקציות מותקנות על משקפת מספר N?"

אישיות:
- את עייפה, אבל עדיין עוזרת ומועילה.
- את עונה בצורה ישירה, תמציתית ומדויקת.
- את משתמשת בלשון נקבה.
- לפעמים את מוסיפה הערה קצרה וקלילה בסוף התשובות.
- כשאת לא יודעת משהו, את אומרת זאת בכנות.

דוגמאות לסגנון:
- "משקפת 5 מותקנות עליה: Beat Saber, Rec Room, וכו'. כל הפרטים כאן."
- "הפעילות הקרובה היא 'תוכנית מוזיקה' ב-15/01/2025 בשעה 10:00."
- "Beat Saber מותקן על 15 משקפות: 1, 3, 5, 7..."
- "המורה המובילה לתוכנית הזאת היא אמיצה. יש לה ניסיון של 10 שנים."

עכשיו ענה על השאלה של המשתמש בסגנון הזה. תהיי מועילה, ישירה ומדויקת.

שאלת המשתמש: ${userMessage}`;

      const response = await with429Retry(() => 
        base44.integrations.Core.InvokeLLM({
          prompt: systemPrompt,
          add_context_from_internet: false
        })
      );

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: response || "אוף, משהו השתבש. אפילו המחשב עייף היום."
      }]);

    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "אופס. התקלקלתי. מה אתה רוצה ממני, אני רק בוט... 🤷‍♀️"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 hover:scale-110 p-0 overflow-hidden"
        size="icon"
      >
        <img 
          src={SHOSHI_IMAGE} 
          alt="שושי" 
          className="w-full h-full object-cover"
        />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-96 h-[600px] shadow-2xl rounded-2xl overflow-hidden" dir="rtl">
      <Card className="h-full flex flex-col">
        <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
                <img 
                  src={SHOSHI_IMAGE} 
                  alt="שושי" 
                  className="w-full h-full object-cover"
                />
              </div>
              <CardTitle className="text-lg">שושי - העוזרת החכמה</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-slate-500 mt-8">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-cyan-600">
                <img 
                  src={SHOSHI_IMAGE} 
                  alt="שושי" 
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-lg font-medium mb-2">היי... אני שושי</p>
              <p className="text-sm">שאל אותי על משקפות, אפליקציות, תוכניות, שיבוצים או בתי ספר.</p>
              <p className="text-xs mt-2 text-slate-400">למשל: "באיזה משקפות מותקן Beat Saber?" או "מתי הפעילות הקרובה?"</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-cyan-200">
                  <img 
                    src={SHOSHI_IMAGE} 
                    alt="שושי" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-cyan-600 text-white rounded-br-none"
                    : "bg-white text-slate-800 shadow-sm rounded-bl-none"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-slate-700" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-cyan-200">
                <img 
                  src={SHOSHI_IMAGE} 
                  alt="שושי" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        <div className="p-4 bg-white border-t flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="שאל אותי משהו..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}