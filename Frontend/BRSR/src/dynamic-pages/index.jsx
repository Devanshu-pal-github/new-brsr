import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import { useGetReportModulesQuery, useLazyGetModuleAnswerQuery } from '../store/api/apiSlice';
import ModuleRenderer from './components/ModuleRenderer';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import DynamicProgressSidebar from './components/DynamicProgressSidebar';

const DynamicPageRenderer = ({ reportId, moduleId, module }) => {
  const user = useSelector(selectCurrentUser);
  const params = useParams();
  
  const actualReportId = reportId || params.reportId;
  const actualModuleId = moduleId || params.moduleId;
  
  const { 
    data: modules = [], 
    isLoading, 
    error 
  } = useGetReportModulesQuery(
    {
      reportId: actualReportId,
      companyId: user?.company_id
    },
    { 
      skip: !actualReportId || !user?.company_id || !!module,
      refetchOnMountOrArgChange: true
    }
  );

  const selectedModule = module || modules.find(m => m.id === actualModuleId);
  const currentSubmodule = selectedModule?.submodules?.[0] || null;

  // Fetch module answers ONCE for this module/company/financialYear
  // Assume financialYear is in the URL or default to '2024-2025'
  const searchParams = new URLSearchParams(window.location.search);
  const financialYear = searchParams.get('financialYear') || '2024-2025';
  const companyId = user?.company_id;
  // Defensive: ensure selectedModule.id is always present
  const moduleIdForQuery = selectedModule?.id || selectedModule?._id || null;
  const [fetchModuleAnswers, { data: moduleAnswerData, isLoading: isAnswersLoading }] = useLazyGetModuleAnswerQuery();
  
  useEffect(() => {
    if (moduleIdForQuery && companyId && financialYear) {
      fetchModuleAnswers({ moduleId: moduleIdForQuery, companyId, financialYear });
    }
  }, [moduleIdForQuery, companyId, financialYear, fetchModuleAnswers]);

  const answers = moduleAnswerData?.answers || {};

  // Defensive: always pass moduleId to ModuleRenderer
  return (
    <div className="relative flex">
      <div className="flex-1  rounded-lg ">
        {isLoading ? (
          <LoadingState message="Loading module data..." />
        ) : error ? (
          <ErrorState message={error?.data?.detail || 'Failed to fetch module data'} />
        ) : selectedModule ? (
          <>
            <div className="flex justify-between items-center ">
              {/* <h1 className="text-2xl font-bold text-gray-800">
                {selectedModule.name}
              </h1> */}
              {/* <div className="text-sm text-gray-500">
                Module: {selectedModule.name}
              </div> */}
            </div>
            <ModuleRenderer module={{...selectedModule, id: selectedModule.id || selectedModule._id}} answers={answers} financialYear={financialYear} />
          </>
        ) : (
          <div className="text-center text-gray-600 ">
            No module found with ID: {actualModuleId}
          </div>
        )}
      </div>
      
      {/* Progress Sidebar */}
      <DynamicProgressSidebar 
        submodules={selectedModule?.submodules || []}
        currentSubmodule={currentSubmodule}
        module={selectedModule}
        answers={answers}
        financialYear={financialYear}
      />
    </div>
  );
};

export default DynamicPageRenderer;