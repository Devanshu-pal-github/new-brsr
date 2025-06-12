import React from 'react';

const SubHeader = ({ tabs, activeTab, onTabChange }) => {
    return (
        <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex space-x-4 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                            ${activeTab === tab
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SubHeader; 