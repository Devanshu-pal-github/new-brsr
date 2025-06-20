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
import { selectCurrentUser } from '../../store/slices/authSlice';
import {
  useGetCompanyReportsQuery,
  useGetReportModulesQuery,
  useGetCompanyPlantsQuery,
  useGetPlantEmployeesQuery,
  useGetAuditLogQuery
} from '../../store/api/apiSlice';
import DashboardCard from './DashboardCard';
import CircularProgress from './charts/CircularProgress';
import ProgressBar from './charts/ProgressBar';
import PlantLocationMap from './charts/PlantLocationMap';

const Dashboard = ({ dynamicModules = [] }) => {
  const user = useSelector(selectCurrentUser);
  const companyId = user?.company_id;
  const plantId = user?.plant_id;
  const financialYear = "2024-2025"; // Default financial year

  // Fetch data from API with plantId
  const { data: reports = [], isLoading: isLoadingReports } = useGetCompanyReportsQuery(
    plantId ? { plantId, financialYear } : undefined,
    { skip: !plantId }
  );
  
  console.log("Dashboard Reports Query:", { plantId, financialYear, reports });

  const { data: plants = [], isLoading: isLoadingPlants } = useGetCompanyPlantsQuery(companyId);
  const { data: employees = [], isLoading: isLoadingEmployees } = useGetPlantEmployeesQuery({}, { 
    skip: !companyId 
  });
  const { data: modules = [], isLoading: isLoadingModules } = useGetReportModulesQuery({ 
    reportId: reports[0]?.id, 
    companyId 
  }, { skip: !reports.length || !companyId });
  const { data: auditData, isLoading: isLoadingAudit } = useGetAuditLogQuery();

  console.log(reports);
  console.log(plants);
  console.log(employees);
  console.log(modules);
  
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

  return (
    <div className="p-3 sm:p-4 lg:p-5 bg-slate-50 min-h-screen">
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
            onClick={() => {/* TODO: Implement AI chat */}}
          >
            <MessageSquareText className="w-4 h-4" />
            <span>Ask AI Assistant</span>
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-[#1A2341] text-white rounded-lg hover:bg-[#2A3351] transition-colors text-sm"
            onClick={() => {/* TODO: Implement documentation */}}
          >
            <BookOpen className="w-4 h-4" />
            <span>View Documentation</span>
          </button>
        </div>
      </div>
      
      {isLoadingReports || isLoadingPlants || isLoadingEmployees || isLoadingModules ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2341]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Reports Overview Card */}
          <DashboardCard 
            title="Reports" 
            icon={FileText}
            className="lg:col-span-1"
          >
            <div className="space-y-2.5 p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Total Plants</span>
                <span className="text-sm font-semibold text-[#1A2341]">{stats.reports.total}</span>
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
                <span className="text-sm font-medium text-blue-600">{stats.reports.inProgress}</span>
              </div>
              {!plantId && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 italic">
                    Select a plant to view detailed report status
                  </p>
                </div>
              )}
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
            <div className="space-y-2 p-3 max-h-[280px] overflow-y-auto">
              {isLoadingAudit ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              ) : auditData?.actions?.slice(-3).reverse().map((audit, index) => (
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
                    {audit.action === "Plant Created" && audit.details?.plant_code && (
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        Plant ID: {audit.details.plant_code} • {audit.details.plant_name || 'Unnamed Plant'}
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