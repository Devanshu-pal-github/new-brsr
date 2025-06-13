import { useState } from "react";

const SubHeader = ({ tabs, onTabChange, activeTab }) => {
  return (
    <div className="bg-white text-[11px] sm:text-[12px] font-medium flex items-center h-[36px] rounded-[6px] shadow-sm w-full min-w-0 overflow-x-auto pt-1 pl-0.5 relative">
      <div className="flex items-center justify-start px-1 sm:px-2 h-full overflow-x-auto w-full">
        <div className="flex space-x-2 sm:space-x-3 h-full w-full">
          {tabs?.map((tab) => (
            <button
              key={`tab-${tab}`}
              onClick={() => onTabChange(tab)}
              className={`relative flex items-center h-full px-2 py-1 whitespace-nowrap text-[11px] sm:text-[12px] transition-colors duration-200 ${
                activeTab === tab
                  ? "text-[#20305D] font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={{ background: "none", border: "none", outline: "none" }}
            >
              <span className="flex items-center h-full">{tab}</span>
              {activeTab === tab && (
                <span
                  className="absolute left-0 right-0 bottom-0 h-[2.5px] bg-[#20305D] rounded-b"
                  style={{ width: "100%" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubHeader; 