import React from 'react';

const ProgressBar = ({ percentage, label, sublabel }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <span className="text-sm font-semibold text-[#1A2341]">{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#000D30] to-[#20305D] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {sublabel && (
        <span className="text-xs text-gray-500">{sublabel}</span>
      )}
    </div>
  );
};

export default ProgressBar; 