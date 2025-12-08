import React from "react";
import { Toaster } from "@/components/ui/toaster";
import ChatBot from "@/components/ChatBot";

export default function Layout({ children, currentPageName }) {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&display=swap');
        
        body { 
          font-family: 'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
      `}</style>
      {children}
      <ChatBot />
      <Toaster />
    </div>
  );
}