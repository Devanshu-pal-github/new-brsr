import React, { useState, useEffect } from 'react';
import DynamicSubHeader from './DynamicSubHeader';
import SubmoduleContent from './SubmoduleContent';
import DynamicBreadcrumb from './DynamicBreadcrumb';


const ModuleRenderer = ({ module }) => {
  console.log('🧩 ModuleRenderer received module:', module);
  const [activeSubmodule, setActiveSubmodule] = useState(null);
  const [currentSubmodule, setCurrentSubmodule] = useState(null);

  useEffect(() => {
    if (module && module.submodules && module.submodules.length > 0) {
      console.log('🧩 Setting initial submodule from module:', module.submodules[0]);
      setActiveSubmodule(module.submodules[0].id);
      setCurrentSubmodule(module.submodules[0]);
    }
  }, [module]);

  // Update currentSubmodule when activeSubmodule changes
  useEffect(() => {
    if (module?.submodules && activeSubmodule) {
      const foundSubmodule = module.submodules.find(sub => sub.id === activeSubmodule);
      if (foundSubmodule) {
        console.log('🧩 Updating current submodule:', foundSubmodule);
        setCurrentSubmodule(foundSubmodule);
      }
    }
  }, [activeSubmodule, module]);

  return (
    <div className="min-h-screen p-2 md:p-3 w-[75%]">
      <div className="mb-4">
        <DynamicBreadcrumb 
          moduleName={module.name}
          activeSubmodule={currentSubmodule}
        />
      </div>

      <div className="mt-4 mx-2">
        <div className="w-full">
          <div className="mb-4">
            <DynamicSubHeader 
              submodules={module.submodules || []} 
              activeSubmodule={activeSubmodule}
              setActiveSubmodule={setActiveSubmodule}
            />
          </div>
          
          <div className="mt-4">
            {currentSubmodule ? (
              <SubmoduleContent submodule={currentSubmodule} />
            ) : (
              <p className="text-gray-500">Select a submodule to view its content.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleRenderer;