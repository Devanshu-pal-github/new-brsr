import React, { useState, useEffect } from 'react';
import { Tab, TabGroup, TabList, TabPanels, TabPanel } from '@headlessui/react';
import SubmoduleContent from './SubmoduleContent';


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
    <div className="flex">
      {/* Submodule Sidebar */}
      <TabGroup className="flex flex-grow">
        <Tab.Group
          selectedIndex={module?.submodules.findIndex(sub => sub.id === activeSubmodule) || 0}
          onChange={(index) => {
            const newActiveSubmodule = module?.submodules[index];
            if (newActiveSubmodule) {
              setActiveSubmodule(newActiveSubmodule.id);
            }
          }}
        >
          <Tab.List className="flex flex-col p-4 space-y-2 bg-gray-100 rounded-l-lg shadow-md w-64">
            {module?.submodules.map((submodule) => (
              <Tab
                key={submodule.id}
                className={({ selected }) =>
                  `w-full text-left px-4 py-2 rounded-md text-sm font-medium
                  ${selected
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'}`
                }
              >
                {submodule.name}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="flex-1 bg-white p-6 shadow-lg rounded-r-lg">
            {module?.submodules.map((submodule) => (
              <Tab.Panel key={submodule.id}>
                <SubmoduleContent submodule={submodule} />
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </TabGroup>
    </div>
  );
};

export default ModuleRenderer;