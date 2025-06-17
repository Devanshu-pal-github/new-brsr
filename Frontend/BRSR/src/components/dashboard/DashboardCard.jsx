import React from 'react';

const DashboardCard = ({ 
  title, 
  icon: Icon, 
  children, 
  className = "",
  fullWidth = false 
}) => {
  return (
    <div 
      className={`
        bg-white rounded-xl shadow-sm border border-slate-200/60 
        transition-all duration-300 ease-in-out
        hover:shadow-md
        ${fullWidth ? 'col-span-full' : 'col-span-1'} 
        ${className}
      `}
    >
      <div className="p-3 sm:p-4 lg:p-5">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          {Icon && (
            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-[#000D30] to-[#20305D]">
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          )}
          <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-[#1A2341]">{title}</h3>
        </div>
        <div className="space-y-3 sm:space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardCard; 