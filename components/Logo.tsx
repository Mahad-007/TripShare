import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 32, className = '', showText = false }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Teal circle background */}
        <circle cx="50" cy="50" r="50" fill="#0D9488" />
        {/* White location pin */}
        <path
          d="M50 18C38.95 18 30 26.95 30 38C30 52.5 50 74 50 74C50 74 70 52.5 70 38C70 26.95 61.05 18 50 18Z"
          fill="white"
        />
        {/* Teal navigation arrow */}
        <path
          d="M50 30L42 46H50H58L50 30Z"
          fill="#0D9488"
        />
      </svg>
      {showText && (
        <span className="text-xl font-bold text-teal-700 tracking-tight">TripShare</span>
      )}
    </div>
  );
};

export default Logo;
