import React from 'react';

const SubmoduleSidebar = ({ moduleName, submodules, activeSubmodule, setActiveSubmodule }) => {
  return (
    <div className="w-64 bg-white p-5 shadow-lg rounded-lg mr-5 flex-shrink-0">
      <h2 className="text-xl font-bold text-gray-800 mb-5">{moduleName} Modules</h2>
      <ul className="space-y-2">
        {submodules.map((submodule) => (
          <li key={submodule.id}>
            <button
              onClick={() => setActiveSubmodule(submodule.id)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${activeSubmodule === submodule.id
                ? 'bg-[#20305D] text-white'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              {submodule.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SubmoduleSidebar;