import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from "lucide-react";

const DynamicBreadcrumb = ({ moduleName, activeSubmodule }) => {
    return (
        <div className="w-full flex items-center space-x-2 text-sm md:text-base font-medium text-black py-2 px-0">
            <span className="text-[#20305D] font-semibold">{moduleName}</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-black font-medium">{activeSubmodule?.name || 'Loading...'}</span>
        </div>
    );
};

export default DynamicBreadcrumb; 