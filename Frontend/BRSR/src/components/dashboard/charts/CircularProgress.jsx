import React from 'react';

const CircularProgress = ({ percentage, size = 120, label, sublabel }) => {
  const strokeWidth = size * 0.067; // Makes stroke width proportional to size
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="#E5E7EB"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="url(#progressGradient)"
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 0.5s ease'
            }}
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#000D30" />
              <stop offset="100%" stopColor="#20305D" />
            </linearGradient>
          </defs>
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${
            size < 100 ? 'text-lg' : 
            size < 150 ? 'text-xl' : 
            'text-2xl'
          } text-[#1A2341]`}>{percentage}%</span>
          {sublabel && (
            <span className={`${
              size < 100 ? 'text-[10px]' : 
              size < 150 ? 'text-xs' : 
              'text-sm'
            } text-gray-500`}>{sublabel}</span>
          )}
        </div>
      </div>
      {label && (
        <div className={`mt-2 ${
          size < 100 ? 'text-xs' : 
          size < 150 ? 'text-sm' : 
          'text-base'
        } font-medium text-gray-600 text-center`}>{label}</div>
      )}
    </div>
  );
};

export default CircularProgress; 