import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Send, User, Loader2, MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { with429Retry } from "@/components/utils/retry";
import { VRDevice } from "@/entities/VRDevice";
import { VRApp } from "@/entities/VRApp";
import { Syllabus } from "@/entities/Syllabus";
import { EducationInstitution } from "@/entities/EducationInstitution";
import { DeviceApp } from "@/entities/DeviceApp";
import { ScheduleEntry } from "@/entities/ScheduleEntry";
import { Teacher } from "@/entities/Teacher";

const SHOSHI_IMAGE = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b36aee270b4cf8a6a0a543/86b36bcd4_Lucid_Origin_generate_an_image_of_a_stereotypical_old_and_divo_2.jpg";

// Cache context outside component to prevent reloading on page navigation
let cachedContext = null;

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (!isContextLoaded && !cachedContext) {
        loadSystemContext();
      } else if (cachedContext) {
        setIsContextLoaded(true);
      }
    }
  }, [isOpen, messages, isContextLoaded]);

  const loadSystemContext = async () => {
    setIsLoading(true);
    try {
      const [devices, apps, programs, schools, deviceApps, schedules, teachers] = await Promise.all([
        with429Retry(() => VRDevice.list()),
        with429Retry(() => VRApp.list()),
        with429Retry(() => Syllabus.list()),
        with429Retry(() => EducationInstitution.list()),
        with429Retry(() => DeviceApp.list()),
        with429Retry(() => ScheduleEntry.list()),
        with429Retry(() => Teacher.list())
      ]);

      cachedContext = {
        devices,
        apps,
        programs,
        schools,
        deviceApps,
        schedules,
        teachers
      };

      setIsContextLoaded(true);

      if (messages.length === 0) {
        setMessages([
          {
            role: "assistant",
            content: "נו, מה עכשיו? אני שושי, ואני רואה את כל המערכת. דבר אליי קצר, אין לי את כל היום."
          }
        ]);
      }
    } catch (error) {
      console.error("Error loading context:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !cachedContext) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const contextStr = JSON.stringify({
        devicesSummary: `Total Devices: ${cachedContext.devices.length}`,
        appsSummary: `Total Apps: ${cachedContext.apps.length}`,
        activeSchedules: cachedContext.schedules.length
      });

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `System Context: ${contextStr}. User Question: ${input}`,
        add_context_from_internet: false
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response || "לא הבנתי, תנסה שוב." }
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "אויש, יש תקלה. תעזוב אותי." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-cyan-600 hover:bg-cyan-700 shadow-lg flex items-center justify-center"
        >
          <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
            <img src={SHOSHI_IMAGE} alt="Chat" className="w-full h-full object-cover" />
          </div>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-80 md:w-96 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">
      <Card className="border-cyan-200">
        <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-3 rounded-t-xl flex flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden">
              <img src={SHOSHI_IMAGE} alt="Shoshi" className="w-full h-full object-cover" />
            </div>
            <CardTitle className="text-base">שושי - מנהלת המערכת</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-3 h-96 overflow-y-auto bg-slate-50 flex flex-col gap-3">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === "user"
                    ? "bg-cyan-600 text-white rounded-br-none"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                <span className="text-xs text-slate-500">שושי מקלידה...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="p-3 bg-white border-t flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="שאל אותי משהו..."
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="bg-cyan-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}