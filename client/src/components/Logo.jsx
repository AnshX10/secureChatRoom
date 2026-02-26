import React from 'react';

const Logo = ({ variant = "shield", className = "w-10 h-10" }) => {
  
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
  return null;
};

export default Logo;