import React, { useState, useEffect } from "react";

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const increment = Math.random() * 15 + 10; // Much faster progression
        const newProgress = prev + increment;
        
        if (newProgress >= 100) {
          clearInterval(interval);
          if (onComplete) onComplete();
          return 100;
        }
        
        return newProgress;
      });
    }, 30); // Faster update rate

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="w-80">
        <div className="mb-4">
          <div className="text-black text-5xl font-bold tracking-[0.3em] mb-2 flex items-center" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
            YOYA
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b36aee270b4cf8a6a0a543/694da461e_Meta-Quest--Streamline-Sharp.png" 
              alt="VR Headset" 
              className="inline-block w-12 h-12 ml-2 animate-pulse object-contain"
            />
          </div>
        </div>
        
        <div className="w-full h-1 bg-gray-200 mb-3 relative">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="text-black text-right text-xl font-bold" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
          {Math.floor(progress)}%
        </div>
      </div>
    </div>
  );
}