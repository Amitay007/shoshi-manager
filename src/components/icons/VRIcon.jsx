import React, { forwardRef } from "react";

const VRIcon = forwardRef(({ className = "", size = 24, ...props }, ref) => {
  return (
    <svg 
      ref={ref}
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path 
        d="M14 24C14 10 50 10 50 24" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      <path 
        d="M8 24H56C58.2091 24 60 25.7909 60 28V46C60 48.2091 58.2091 50 56 50H42C40 50 38 48 36 46H28C26 48 24 50 22 50H8C5.79086 50 4 48.2091 4 46V28C4 25.7909 5.79086 24 8 24Z" 
        fill="currentColor" 
        fillOpacity="0.2"
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinejoin="round"
      />
      
      <rect 
        x="14" 
        y="32" 
        width="36" 
        height="8" 
        rx="4" 
        fill="currentColor" 
        fillOpacity="0.4"
        stroke="currentColor" 
        strokeWidth="3"
      />
      
      <path 
        d="M4 32V42" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round"
      />
      <path 
        d="M60 32V42" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round"
      />
    </svg>
  );
});

export default VRIcon;