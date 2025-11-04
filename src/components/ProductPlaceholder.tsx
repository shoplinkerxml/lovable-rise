import React from 'react';

interface ProductPlaceholderProps {
  className?: string;
}

export const ProductPlaceholder: React.FC<ProductPlaceholderProps> = ({ className = "" }) => {
  return (
    <div 
      className={`flex items-center justify-center rounded-lg w-full h-full min-h-[12rem] bg-emerald-50 border border-emerald-200/50 shadow-sm ${className}`}
      data-testid="product_placeholder"
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-1/2 h-1/2 max-w-[7.5rem] max-h-[7.5rem] text-emerald-700/40"
        data-testid="product_placeholder_icon"
      >
        {/* Основа коробки */}
        <rect
          x="20"
          y="35"
          width="80"
          height="65"
          rx="4"
          fill="currentColor"
          fillOpacity="0.1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        
        {/* Крышка коробки */}
        <path
          d="M20 35 L60 20 L100 35 L60 50 Z"
          fill="currentColor"
          fillOpacity="0.15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        
        {/* Боковая грань */}
        <path
          d="M100 35 L100 100 L60 85 L60 50 Z"
          fill="currentColor"
          fillOpacity="0.08"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        
        {/* Иконка изображения в центре */}
        <rect
          x="45"
          y="55"
          width="30"
          height="25"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        
        {/* Горы в иконке */}
        <path
          d="M50 70 L55 65 L60 70 L65 62 L70 70"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Солнце в иконке */}
        <circle
          cx="52"
          cy="60"
          r="2"
          fill="currentColor"
          fillOpacity="0.6"
        />
      </svg>
    </div>
  );
};