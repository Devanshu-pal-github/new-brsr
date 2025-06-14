import React, { useState, useEffect } from 'react';
import SubmoduleSidebar from './SubmoduleSidebar';
import SubmoduleContent from './SubmoduleContent';

const ModuleRenderer = ({ module }) => {
  const [activeSubmodule, setActiveSubmodule] = useState(null);

  useEffect(() => {
    // Set the first submodule as active by default when module data is loaded
    if (module?.submodules && module.submodules.length > 0) {
      setActiveSubmodule(module.submodules[0].id);
    }
  }, [module]);

  // Find the currently active submodule object
  const currentSubmodule = module?.submodules?.find(sub => sub.id === activeSubmodule);

  return (
    <div className="flex">
      {/* Submodule Sidebar */}
      <SubmoduleSidebar 
        moduleName={module.name} 
        submodules={module.submodules || []} 
        activeSubmodule={activeSubmodule}
        setActiveSubmodule={setActiveSubmodule}
      />

      {/* Main Content Area */}
      <div className="flex-1 bg-white p-6 shadow-lg rounded-lg">
        {currentSubmodule ? (
          <SubmoduleContent submodule={currentSubmodule} />
        ) : (
          <p className="text-gray-500">Select a submodule to view its content.</p>
        )}
      </div>
    </div>
  );
};

export default ModuleRenderer;