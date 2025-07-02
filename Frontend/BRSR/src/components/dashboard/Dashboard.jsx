import React, { useMemo } from 'react';
import { 
  BarChart3, 
  Users, 
  Factory, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Leaf,
  MapPin,
  FileText,
  Building2,
  Shield,
  Boxes,
  Activity,
  Download,
  MessageSquareText,
  BookOpen
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useSearchParams } from "react-router-dom";
import { selectCurrentUser } from '../../store/slices/authSlice';
import {
  useGetCompanyReportsQuery,
  useGetReportModulesQuery,
  useGetCompanyPlantsQuery,
  useGetPlantEmployeesQuery,
  useGetAuditLogQuery,
  useGetTotalCO2ByScopeMutation,
  useGetCompanyDetailsQuery
} from '../../store/api/apiSlice';
import DashboardCard from './DashboardCard';
import CircularProgress from './charts/CircularProgress';
import ProgressBar from './charts/ProgressBar';
import PlantLocationMap from './charts/PlantLocationMap';
import MCPModal from '../MCPModal';

const Dashboard = ({ dynamicModules = [] }) => {
  const user = useSelector(selectCurrentUser);
  const companyId = user?.company_id;
  const plantId = user?.plant_id;
  const [searchParams, setSearchParams] = useSearchParams();
  const financialYear = searchParams.get("financialYear") || "2024-2025"; // Default value

  // Fetch data from API with plantId
  const { data: reports = [], isLoading: isLoadingReports } = useGetCompanyReportsQuery(
    plantId ? { plantId, financialYear } : undefined,
    { skip: !plantId }
  );




  
 

  const { data: plants = [], isLoading: isLoadingPlants } = useGetCompanyPlantsQuery(companyId);
  const { data: employees = [], isLoading: isLoadingEmployees } = useGetPlantEmployeesQuery({}, { 
    skip: !companyId 
  });
  const { data: modules = [], isLoading: isLoadingModules } = useGetReportModulesQuery({ 
    reportId: reports[0]?.id, 
    companyId 
  }, { skip: !reports.length || !companyId });
  const { data: auditData, isLoading: isLoadingAudit } = useGetAuditLogQuery();
  const [getTotalCO2ByScope, { data: co2Data, isLoading: isLoadingCO2 }] = useGetTotalCO2ByScopeMutation();
  const { data: companyDetails, isLoading: isLoadingCompanyDetails } = useGetCompanyDetailsQuery(user?.id, { skip: !user?.id });

  console.log("Company Details:", companyDetails);

  React.useEffect(() => {
    // Only fetch if financialYear is available
    if (financialYear) {
      getTotalCO2ByScope({
        financial_year: financialYear,
        // No plantId or companyId needed
      });
    }
  }, [financialYear, getTotalCO2ByScope]);

  // Robustly extract Scope 1 and Scope 2 keys (case/whitespace insensitive)
  let scope1CO2 = 0;
  let scope2CO2 = 0;
  if (co2Data) {
    if (Array.isArray(co2Data)) {
      const scope1 = co2Data.find(item => String(item.scope) === '1');
      const scope2 = co2Data.find(item => String(item.scope) === '2');
      scope1CO2 = scope1 ? scope1.total_co2 || 0 : 0;
      scope2CO2 = scope2 ? scope2.total_co2 || 0 : 0;
    } else if (typeof co2Data === 'object') {
      // Prefer exact key match first
      if (Object.prototype.hasOwnProperty.call(co2Data, 'Scope 1')) {
        scope1CO2 = Number(co2Data['Scope 1']) || 0;
      }
      if (Object.prototype.hasOwnProperty.call(co2Data, 'Scope 2')) {
        scope2CO2 = Number(co2Data['Scope 2']) || 0;
      }
      // Fallback to robust search if not found
      if (!scope1CO2) {
        const keys = Object.keys(co2Data);
        const scope1Key = keys.find(k => k.replace(/\s+/g, '').toLowerCase() === 'scope1');
        if (scope1Key) scope1CO2 = Number(co2Data[scope1Key]) || 0;
      }
      if (!scope2CO2) {
        const keys = Object.keys(co2Data);
        const scope2Key = keys.find(k => k.replace(/\s+/g, '').toLowerCase() === 'scope2');
        if (scope2Key) scope2CO2 = Number(co2Data[scope2Key]) || 0;
      }
    }
  }
  const combinedCO2 = scope1CO2 + scope2CO2;
  const combinedTarget = 5000; // Example target for combined
  const percent = (val) => Math.min(100, Math.round((val / combinedTarget) * 100));
  const noCO2Data = (!co2Data || (scope1CO2 === 0 && scope2CO2 === 0));

  // Helper function to check if a question is answered
  const isQuestionAnswered = (answer) => {
    if (!answer) return false;

    // Handle subjective answers
    if (answer.type === 'subjective') {
      const text = answer.data?.text;
      return text !== undefined && text !== null && text.trim() !== '';
    }

    // Handle table answers
    if (Array.isArray(answer.data)) {
      return answer.data.some(row => {
        if (typeof row === 'object') {
          return Object.values(row).some(value => 
            value !== undefined && 
            value !== null && 
            value !== '' && 
            value !== '0'
          );
        }
        return false;
      });
    }

    // For any other type of answer, check if data exists
    return answer.data !== undefined && 
           answer.data !== null && 
           Object.keys(answer.data).length > 0;
  };

  // Helper function to calculate module completion based on answers
  const calculateModuleCompletion = (reportData, moduleType) => {
    if (!reportData || !reportData[0]?.answers) {
      console.debug(`No report data for ${moduleType} module`);
      return 0;
    }
    
    const answers = reportData[0].answers;
    let totalQuestions = 0;
    let answeredQuestions = 0;

    // Map module types to their question prefixes
    const moduleMap = {
      'environment': ['EC', 'EES', 'ERI', 'ESA', 'VCEI', 'WD', 'WM', 'WU', 'BCDM'], // Environment module prefixes
      'social': ['SH', 'SE', 'SC'], // Social module prefixes
      'governance': ['GE', 'GC', 'GP']  // Governance module prefixes
    };

    // Count questions based on prefix
    Object.entries(answers).forEach(([questionId, answer]) => {
      const prefix = questionId.split('-')[0];
      
      if (moduleMap[moduleType]?.includes(prefix)) {
        totalQuestions++;
        if (isQuestionAnswered(answer)) {
          answeredQuestions++;
          console.debug(`Question ${questionId} is answered`);
        } else {
          console.debug(`Question ${questionId} is NOT answered`);
        }
      }
    });

    console.debug(`Module ${moduleType} completion:`, {
      totalQuestions,
      answeredQuestions,
      percentage: totalQuestions === 0 ? 0 : Math.round((answeredQuestions / totalQuestions) * 100)
    });

    return totalQuestions === 0 ? 0 : Math.round((answeredQuestions / totalQuestions) * 100);
  };

  // Calculate statistics and completion percentages
  const stats = useMemo(() => {
    if (isLoadingReports || isLoadingPlants || isLoadingEmployees || isLoadingModules) {
      return {
        reports: { total: 0, completed: 0, inProgress: 0 },
        plants: { 
          total: 0, 
          byAccessLevel: {
            all_modules: 0,
            calc_modules_only: 0
          },
          byType: {
            regular: 0,
            special: 0
          }
        },
        employees: { 
          total: 0, 
          active: 0 
        },
        modules: { 
          total: 3,
          completion: { 
            environment: 0, 
            social: 0, 
            governance: 0 
          }
        }
      };
    }

    // Get the latest report data
    const latestReport = reports[0];
    
    // Calculate report statistics based on plants
    const reportStats = {
      total: plants.length, // Each plant should have a report
      completed: reports.filter(r => r.status === 'completed').length,
      inProgress: plants.length - reports.filter(r => r.status === 'completed').length // Remaining are in progress
    };



    console.log('Report Statistics:', {
      totalPlants: plants.length,
      reports,
      reportStats
    });

    return {
      reports: reportStats,
      plants: {
        total: plants.length,
        byAccessLevel: {
          all_modules: plants.filter(p => p.access_level === 'all_modules').length,
          calc_modules_only: plants.filter(p => p.access_level === 'calc_modules_only').length
        },
        byType: {
          regular: plants.filter(p => p.plant_type === 'regular').length,
          special: plants.filter(p => ['C001', 'P001'].includes(p.plant_type)).length
        }
      },
      employees: {
        total: employees.length,
        active: employees.length
      },
      modules: {
        total: 3,
        completion: {
          environment: calculateModuleCompletion(reports, 'environment'),
          social: calculateModuleCompletion(reports, 'social'),
          governance: calculateModuleCompletion(reports, 'governance')
        }
      }
    };
  }, [reports, plants, employees, modules, isLoadingReports, isLoadingPlants, isLoadingEmployees, isLoadingModules]);

  // Calculate overall completion based on total modules
  const overallCompletion = useMemo(() => {
    // Count total modules (environment + dynamic modules)
    const totalModules = 1 + dynamicModules.length; // 1 for environment module
    
    // For now, environment module is 100% and dynamic modules are 0%
    const environmentProgress = 100; // Environment module is static for now
    const dynamicModulesProgress = 0; // Dynamic modules progress will be implemented later
    
    // Calculate total progress
    const totalProgress = (environmentProgress + (dynamicModulesProgress * dynamicModules.length)) / totalModules;
    
    return Math.round(totalProgress);
  }, [dynamicModules]);

  // Add a debug log to see the module completion calculations
  console.log('Module Completion Stats:', {
    overall: overallCompletion,
    modules: stats.modules.completion,
    reports: reports
  });

  // Format date helper function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Extract active report count and names from companyDetails
  const activeReportCount = companyDetails?.active_reports?.length || 0;
  const activeReportNames = companyDetails?.active_reports?.map(r => r.report_name).join(', ');


  // Add state for MCP modal
  const [isMCPModalOpen, setIsMCPModalOpen] = React.useState(false);

  return (
    <div className="p-3 sm:p-4 lg:p-5 bg-white min-h-screen ">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#1A2341] tracking-tight">Dashboard Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">Monitor your sustainability reporting progress</p>
          {/* {!plantId && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-700">
                No plant selected. Please select a plant to view the dashboard data.
              </p>
            </div>
          )} */}
        </div>
        
        {/* Quick Actions Section - Moved to top right */}
        <div className="flex gap-3 sm:gap-4">
          <button 
            className={`flex items-center gap-2 px-4 py-2 bg-[#1A2341] text-white rounded-lg hover:bg-[#2A3351] transition-colors text-sm ${!plantId ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => {/* TODO: Implement report generation */}}
            disabled={!plantId}
          >
            <Download className="w-4 h-4" />
            <span>Generate Report</span>
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-[#1A2341] text-white rounded-lg hover:bg-[#2A3351] transition-colors text-sm"
            onClick={() => setIsMCPModalOpen(true)}
          >
            <MessageSquareText className="w-4 h-4" />
            <span>MCP</span>
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-[#1A2341] text-white rounded-lg hover:bg-[#2A3351] transition-colors text-sm opacity-50 cursor-not-allowed"
            onClick={() => {/* TODO: Implement documentation */}}
          >
            <BookOpen className="w-4 h-4" />
            <span>View Documentation</span>
          </button>
        </div>
        {/* MCP Modal */}
        {isMCPModalOpen && (
          <MCPModal onClose={() => setIsMCPModalOpen(false)} />
        )}
      </div>
      
      {isLoadingReports || isLoadingPlants || isLoadingEmployees || isLoadingModules ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2341]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Scope 1 CO2 Card */}
          <DashboardCard
            title="Scope 1 CO₂ Emissions"
            icon={Leaf}
            className="lg:col-span-1"
          >
            <div className="flex flex-col items-center justify-center p-3">
              {isLoadingCO2 ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2341]" />
                </div>
              ) : noCO2Data ? (
                <div className="text-gray-400 text-sm">No data</div>
              ) : (
                <CircularProgress
                  percentage={percent(scope1CO2)}
                  label={`${scope1CO2.toLocaleString()} tons`}
                  sublabel="Scope 1"
                  size={90}
                />
              )}
            </div>
          </DashboardCard>
          {/* Scope 2 CO2 Card */}
          <DashboardCard
            title="Scope 2 CO₂ Emissions"
            icon={Leaf}
            className="lg:col-span-1"
          >
            <div className="flex flex-col items-center justify-center p-3">
              {isLoadingCO2 ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2341]" />
                </div>
              ) : noCO2Data ? (
                <div className="text-gray-400 text-sm">No data</div>
              ) : (
                <CircularProgress
                  percentage={percent(scope2CO2)}
                  label={`${scope2CO2.toLocaleString()} tons`}
                  sublabel="Scope 2"
                  size={90}
                />
              )}
            </div>
          </DashboardCard>
          {/* Combined Progress Bar for Scope 1 + 2 */}
          <DashboardCard
            title="Scope 1 + 2 CO₂ Progress"
            icon={BarChart3}
            className="lg:col-span-2"
          >
            <div className="flex flex-col items-center justify-center p-4 gap-3">
              {isLoadingCO2 ? (
                <div className="flex items-center justify-center h-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2341]" />
                </div>
              ) : noCO2Data ? (
                <div className="text-gray-400 text-sm">No data</div>
              ) : (
                <>
                  {/* Large combined value and percent badge */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl sm:text-xl font-extrabold text-[#1A2341]">
                      {combinedCO2.toLocaleString()} <span className="text-lg font-medium text-slate-500">tons</span>
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200">
                      {percent(combinedCO2)}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full max-w-md">
                    <ProgressBar
                      percentage={percent(combinedCO2)}
                      label={<span className="font-medium text-[#1A2341]">Combined CO₂</span>}
                      sublabel={<span className="text-xs text-slate-500">Target: {combinedTarget.toLocaleString()} tons</span>}
                    />
                  </div>
                  {/* Scope 1 & 2 breakdown pills */}
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 shadow-sm">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-semibold text-[#1A2341]">Scope 1:</span>
                      <span className="text-xs font-bold text-emerald-700">{scope1CO2.toLocaleString()} t</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 shadow-sm">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="text-xs font-semibold text-[#1A2341]">Scope 2:</span>
                      <span className="text-xs font-bold text-blue-700">{scope2CO2.toLocaleString()} t</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DashboardCard>

          {/* Reports Overview Card */}
          <DashboardCard 
            title="Reports" 
            icon={FileText}
            className="lg:col-span-1"
          >
            <div className="space-y-2.5 p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Active Reports</span>
                <span className="text-sm font-semibold text-[#1A2341]">{activeReportCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Report Name</span>
                <span className="text-xs font-medium text-emerald-700 truncate max-w-[120px]">{activeReportNames || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-600">Completed Reports</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
                <span className="text-sm font-medium text-emerald-600">{stats.reports.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-600">In Progress</span>
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>
                <span className="text-sm font-medium text-blue-600">{activeReportCount}</span>
              </div>
            </div>
          </DashboardCard>

          {/* Overall Progress Card */}
          <DashboardCard 
            title="Progress" 
            icon={BarChart3}
            className="lg:col-span-1"
          >
            <div className="flex justify-center p-2">
              <CircularProgress 
                percentage={overallCompletion}
                label="Complete"
                sublabel={`${1 + dynamicModules.length} ${dynamicModules.length + 1 === 1 ? 'Module' : 'Modules'}`}
                size={80}
              />
            </div>
          </DashboardCard>

          {/* Team Activity Card */}
          <DashboardCard 
            title="Team" 
            icon={Users}
            className="lg:col-span-1"
          >
            <div className="space-y-2.5 p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Total Employees</span>
                <span className="text-sm font-semibold text-[#1A2341]">{stats.employees.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Active</span>
                <span className="text-sm font-medium text-emerald-600">{stats.employees.active}</span>
              </div>
            </div>
          </DashboardCard>

          {/* Plant Statistics Card */}
          <DashboardCard 
            title="Plants" 
            icon={Factory}
            className="lg:col-span-1"
          >
            <div className="space-y-2.5 p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Total Plants</span>
                <span className="text-sm font-semibold text-[#1A2341]">{stats.plants.total}</span>
              </div>
              <div className="border-t border-slate-100 pt-2 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Regular Plants</span>
                  <span className="text-xs font-medium text-emerald-600">{stats.plants.byType.regular}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Special Plants</span>
                  <span className="text-xs font-medium text-orange-500">{stats.plants.byType.special}</span>
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Module Progress Card */}
          <DashboardCard 
            title="Module Progress" 
            icon={CheckCircle2}
            className="sm:col-span-2 lg:col-span-2"
          >
            <div className="space-y-3 p-3">
              {/* Environment Module - Static */}
              <ProgressBar 
                percentage={stats.modules.completion.environment}
                label="Environment"
                sublabel="Environmental metrics and compliance"
              />
              
              {/* Dynamic Modules */}
              {dynamicModules.map((module) => (
                <ProgressBar 
                  key={module.id}
                  percentage={0} // We'll update this later when progress calculation is implemented
                  label={module.name}
                  sublabel={`${module.question_count || 0} questions`}
                />
              ))}
            </div>
          </DashboardCard>

          {/* Audit Activity Card */}
          <DashboardCard 
            title="Recent Audit Activity" 
            icon={Activity}
            className="sm:col-span-2"
          >
            <div className="space-y-2 p-3 max-h-[40] overflow-y-auto">
              {isLoadingAudit ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              ) : auditData?.actions?.slice(-5).reverse().map((audit, index) => (
                <div 
                  key={`${audit.target_id}-${index}`}
                  className="flex items-center gap-2.5 p-2 rounded-md bg-white border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <Activity className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-700">
                        {audit.action}
                      </span>
                    </div>
                    {/* Show plant details if Plant Created */}
                    {audit.action === "Plant Created" && audit.details?.plant_code && (
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        Plant ID: {audit.details.plant_code} • {audit.details.plant_name || 'Unnamed Plant'}
                      </div>
                    )}
                    {/* Show table question if Table Answer Updated and question_title exists */}
                    {((audit.action?.toLowerCase().includes('table answer updated') || audit.action?.toLowerCase().includes('table updated')) && audit.details?.question_title) && (
                      <div className="text-[10px] text-indigo-600 mt-0.5 truncate font-semibold">
                        {audit.details.question_title}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {formatDate(audit.performed_at)}
                    </div>
                  </div>
                  <div className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {audit.user_role === 'c' ? 'Company' : audit.user_role === 'a' ? 'Admin' : audit.user_role}
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      )}
    </div>
  );
};

export default Dashboard;