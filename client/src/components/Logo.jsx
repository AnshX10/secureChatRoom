import React from 'react';

const Logo = ({ variant = "shield", className = "w-10 h-10" }) => {
  
  // Option 1: The "Secure Pulse" (Shield + Signal) - Fits your HUD theme perfectly
  if (variant === "shield") {
    return (
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
      >
        <path 
          d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="square" 
          strokeLinejoin="miter"
        />
        <path 
          d="M7 12H9L11 9L13 15L15 12H17" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="square" 
          strokeLinejoin="miter"
        />
      </svg>
    );
  }

  // Option 2: The "Encrypted Box" (Abstract/Minimalist)
  if (variant === "box") {
    return (
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
      >
        <rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeWidth="2" />
        <path d="M7 7L17 17" stroke="currentColor" strokeWidth="2" />
        <path d="M17 7L7 17" stroke="currentColor" strokeWidth="2" />
        <rect x="10" y="10" width="4" height="4" fill="currentColor" />
      </svg>
    );
  }

  // Option 3: The "Uplink" (WiFi/Connectivity style)
  if (variant === "uplink") {
    return (
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
      >
        <path d="M12 20V10" stroke="currentColor" strokeWidth="2" />
        <path d="M5 20L12 4L19 20" stroke="currentColor" strokeWidth="2" strokeLinejoin="bevel" />
        <circle cx="12" cy="10" r="2" fill="currentColor" />
      </svg>
    );
  }

  return null;
};

export default Logo;