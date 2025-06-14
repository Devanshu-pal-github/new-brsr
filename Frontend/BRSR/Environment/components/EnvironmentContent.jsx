import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import moduleData from '../data/moduleData.json';
import QuestionCategory from './QuestionCategory';
import Breadcrumb from './Breadcrumb';
import SubHeader from './SubHeader';
import Layout from '../../src/components/layout/Layout';
import ProgressSidebar from './ProgressSidebar';

const EnvironmentContent = () => {
  const location = useLocation();
  const { plantId, environmentReports } = location.state || {};
  const [searchParams] = useSearchParams();
  const financialYear = searchParams.get('financialYear') || '2024-2025'; // Default value
  const [activeSubmodule, setActiveSubmodule] = useState(null);
  const [answers, setAnswers] = useState({});



  useEffect(() => {
    if (moduleData.submodules && moduleData.submodules.length > 0) {
      setActiveSubmodule(moduleData.submodules[0].name);
    }
  }, []);

  // Get current submodule
  const currentSubmodule = moduleData.submodules.find(
    submodule => submodule.name === activeSubmodule
  );

  console.log("currentSubmodule", moduleData);

  return (
    <Layout>
      <div className="module-layout min-h-screen p-2 md:p-3 w-[80vw]">
        <div className="w-full">
          <div className="mb-4">
            <Breadcrumb 
              section={moduleData.name} 
              activeTab={activeSubmodule}
            />
          </div>
        </div>

        <div className="mt-4 mx-2">
          <div className="w-full">
            <div className="mb-4">
              <SubHeader 
                tabs={moduleData.submodules.map(sm => sm.name)}
                activeTab={activeSubmodule}
                onTabChange={setActiveSubmodule}
              />
            </div>
            <div className="mt-4">
              {currentSubmodule && (
                <div className="space-y-4">
                  {currentSubmodule.categories.map((category) => (
                    <QuestionCategory 
                      key={category.id}
                      category={category}
                      financialYear={financialYear}
                      plantId={plantId}
                      environmentReports={environmentReports}
                      onAnswerUpdate={(questionId, answer) => {
                        setAnswers(prev => ({
                          ...prev,
                          [questionId]: answer
                        }));
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Sidebar */}
        <ProgressSidebar 
          submodules={moduleData.submodules}
          answers={answers}
          currentSubmodule={currentSubmodule}
        />
      </div>
    </Layout>
  );
};

export default EnvironmentContent;