import React, { useState, useEffect } from 'react';
import moduleData from '../data/moduleData.json';
import QuestionCategory from './QuestionCategory';
import { useSearchParams } from 'react-router-dom';

const EnvironmentContent = () => {
  const [searchParams] = useSearchParams();
  const financialYear = searchParams.get('financialYear') || '2024-2025'; // Default value
  const [activeSubmodule, setActiveSubmodule] = useState(null);

  useEffect(() => {
    if (moduleData.submodules && moduleData.submodules.length > 0) {
      setActiveSubmodule(moduleData.submodules[0].name);
    }
  }, []);

  return (
    <div className="flex">
      {/* Submodule Sidebar */}
      <div className="w-64 bg-white p-5 shadow-lg rounded-lg mr-5 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-800 mb-5">{moduleData.name} Modules</h2>
        <ul className="space-y-2">
          {moduleData.submodules.map((submodule) => (
            <li key={submodule.name}>
              <button
                onClick={() => setActiveSubmodule(submodule.name)}
                className={`w-full text-left py-2 px-3 rounded-lg text-base font-medium transition-all duration-200 ease-in-out
                  ${activeSubmodule === submodule.name ? 'bg-[#000D30] text-white shadow-md' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                {submodule.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white p-6 shadow-lg rounded-lg">
        {activeSubmodule ? (
          moduleData.submodules.map((submodule) => (
            activeSubmodule === submodule.name && (
              <div key={submodule.name}>
                <h3 className="text-2xl font-extrabold text-gray-900 mb-5 border-b pb-3">{submodule.name}</h3>                {submodule.categories.map((category) => (
                  <QuestionCategory 
                    key={category.id} 
                    category={category} 
                    financialYear={financialYear}
                  />
                ))}
              </div>
            )
          ))
        ) : (
          <p>Select a submodule to view its content.</p>
        )}
      </div>
    </div>
  );
};

export default EnvironmentContent;