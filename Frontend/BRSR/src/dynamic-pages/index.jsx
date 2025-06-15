import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import { useGetReportModulesQuery } from '../store/api/apiSlice';
import ModuleRenderer from './components/ModuleRenderer';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import DynamicProgressSidebar from './components/DynamicProgressSidebar';

const DynamicPageRenderer = ({ reportId, moduleId, module }) => {
  // If module is provided directly, use it; otherwise, fetch it
  const user = useSelector(selectCurrentUser);
  const params = useParams();
  
  // Use props if provided, otherwise use params from URL
  const actualReportId = reportId || params.reportId;
  const actualModuleId = moduleId || params.moduleId;
  
  // Fetch modules data for the selected report if module is not provided directly
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

  // Find the selected module if not provided directly
  const selectedModule = module || modules.find(m => m.id === actualModuleId);

  // Get current submodule for progress tracking
  const currentSubmodule = selectedModule?.submodules?.[0] || null;

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
            <ModuleRenderer module={selectedModule} />
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
      />
    </div>
  );
};

export default DynamicPageRenderer;