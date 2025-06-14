import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import { useGetReportModulesQuery } from '../store/api/apiSlice';
import ModuleRenderer from './components/ModuleRenderer';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';

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

  return (
    <div className="bg-white rounded-lg shadow-md">
      {isLoading ? (
        <LoadingState message="Loading module data..." />
      ) : error ? (
        <ErrorState message={error?.data?.detail || 'Failed to fetch module data'} />
      ) : selectedModule ? (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">
              {selectedModule.name}
            </h1>
            <div className="text-sm text-gray-500">
              Module: {selectedModule.name}
            </div>
          </div>
          <ModuleRenderer module={selectedModule} />
        </>
      ) : (
        <div className="text-center text-gray-600 p-8">
          No module found with ID: {actualModuleId}
        </div>
      )}
    </div>
  );
};

export default DynamicPageRenderer;