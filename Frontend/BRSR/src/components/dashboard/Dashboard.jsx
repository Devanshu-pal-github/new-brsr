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
  Activity
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

  // Fetch data from API
  const { data: reports = [], isLoading: isLoadingReports } = useGetCompanyReportsQuery();
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
  
  // Helper function to calculate module completion based on answers
  const calculateModuleCompletion = (reportData, moduleType) => {
    if (!reportData || !reportData[0]?.answers) return 0;
    
    const answers = reportData[0].answers;
    let totalQuestions = 0;
    let answeredQuestions = 0;

    // Count questions based on prefix
    Object.keys(answers).forEach(questionId => {
      const prefix = questionId.split('-')[0];
      
      // Map module types to their question prefixes
      const moduleMap = {
        'environment': ['AE', 'EC', 'EW', 'EB'], // Air Emissions, Energy Consumption, Water, Biodiversity
        'social': ['SH', 'SE', 'SC'], // Human Rights, Employees, Communities
        'governance': ['GE', 'GC', 'GP']  // Ethics, Compliance, Policies
      };

      if (moduleMap[moduleType]?.includes(prefix)) {
        totalQuestions++;
        const answer = answers[questionId];
        // Consider a question answered if it has updatedData with content
        if (answer?.updatedData && 
            Array.isArray(answer.updatedData) && 
            answer.updatedData.length > 0 &&
            answer.updatedData.some(data => 
              Object.values(data).some(value => value && value.toString().trim() !== '')
            )) {
          answeredQuestions++;
        }
      }
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

    return {
      reports: {
        total: reports.length,
        completed: reports.filter(r => r.status === 'completed').length,
        inProgress: reports.filter(r => r.status === 'in_progress').length
      },
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
        active: employees.length // Since we're not tracking inactive employees anymore
      },
      modules: {
        total: 3, // Environment, Social, Governance
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
      <div className="mb-4">
        <h1 className="text-lg sm:text-xl font-semibold text-[#1A2341] tracking-tight">Dashboard Overview</h1>
        <p className="text-xs text-slate-500 mt-0.5">Monitor your sustainability reporting progress</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Reports Overview Card */}
        <DashboardCard 
          title="Reports" 
          icon={FileText}
          className="lg:col-span-1"
        >
          <div className="space-y-2.5 p-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Total Reports</span>
              <span className="text-sm font-semibold text-[#1A2341]">{stats.reports.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Completed</span>
              <span className="text-sm font-medium text-emerald-600">{stats.reports.completed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">In Progress</span>
              <span className="text-sm font-medium text-blue-600">{stats.reports.inProgress}</span>
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
          <div className="space-y-2 p-3 max-h-[200px] overflow-y-auto">
            {isLoadingAudit ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            ) : auditData?.actions?.slice(0, 3).map((audit, index) => (
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

        {/* Manufacturing Divisions Card */}
        <DashboardCard 
          title="Manufacturing Divisions" 
          icon={Building2}
          className="col-span-full"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 p-3 max-h-[280px] overflow-y-auto">
            {plants.map((plant) => (
              <div 
                key={plant.id}
                className="bg-white rounded-md border border-slate-100 p-2.5 transition-all duration-300 ease-in-out hover:shadow-lg hover:border-slate-200 hover:scale-[1.02] hover:bg-slate-50/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-[#1A2341] text-xs leading-tight line-clamp-2 flex-1 mr-2">
                    {plant.plant_name}
                  </h3>
                  <div className={`px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                    plant.plant_type === 'regular' 
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-orange-50 text-orange-700'
                  }`}>
                    {plant.plant_type === 'regular' ? 'Regular' : 'Special'}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-xs text-slate-500">
                    <Boxes className="w-3 h-3 mr-1.5 flex-shrink-0" />
                    <span>Plant ID: </span>
                    
                    <span className="truncate"> {plant.plant_code}</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-500">
                    
                  </div>
                </div>
                
                <div className="mt-2 pt-2 border-t border-slate-50">
                  <div className="text-xs text-slate-400">
                    Updated {new Date(plant.updated_at).toLocaleDateString('en-US', { 
                      day: 'numeric', 
                      month: 'short',
                      year: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};

export default Dashboard;