import React from "react";
import { Toaster } from "@/components/ui/toaster";
import ChatBot from "@/components/ChatBot";

export default function Layout({ children, currentPageName }) {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-purple-50 via-cyan-50 to-blue-50 text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap');
        
        :root {
          --yoya-purple-dark: #4a2c6f;
          --yoya-purple: #6b46c1;
          --yoya-purple-light: #9f7aea;
          --yoya-cyan: #00d4ff;
          --yoya-cyan-light: #7dd3fc;
          --yoya-pink: #ec4899;
        }
        
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