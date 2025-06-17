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
        bg-white rounded-xl border border-slate-100 overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:border-slate-200 hover:scale-[1.02]
        ${fullWidth ? 'col-span-full' : 'col-span-1'} 
        ${className}
      `}
    >
      <div className="flex items-center gap-2 p-3 border-b border-slate-100">
        {Icon && (
          <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-[#000D30] to-[#20305D]">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
        )}
        <h2 className="text-sm font-medium text-[#1A2341]">{title}</h2>
      </div>
      <div className="space-y-3 sm:space-y-4">
        {children}
      </div>
    </div>
  );
};

export default DashboardCard; 