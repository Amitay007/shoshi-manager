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
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="w-80">
        <div className="mb-4">
          <div className="text-white text-5xl font-bold tracking-[0.3em] mb-2 flex items-center" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
            YOYA
            <span className="inline-block w-4 h-12 bg-white ml-2 animate-pulse"></span>
          </div>
        </div>
        
        <div className="w-full h-1 bg-gray-800 mb-3 relative">
          <div 
            className="h-full bg-white transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="text-white text-right text-xl font-bold" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
          {Math.floor(progress)}%
        </div>
      </div>
    </div>
  );
}