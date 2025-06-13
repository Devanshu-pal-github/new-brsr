import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectUserRole, selectCompanyDetails } from '../store/slices/authSlice';
import Navbar from '../components/layout/Navbar';
import { useGetReportModulesQuery } from '../store/api/apiSlice';
import { Loader2 } from 'lucide-react';

// Import icons for modules
import {
  LayoutDashboard,
  Building,
  Leaf,
  Users,
  ShieldCheck,
  FileText,
  X
} from 'lucide-react';

const ModuleView = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const userRole = useSelector(selectUserRole);
  const companyDetails = useSelector(selectCompanyDetails);
  
  // State for sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Get modules for the selected report
  const { data: reportModules, isLoading, error } = useGetReportModulesQuery(
    {
      reportId: reportId,
      companyId: user?.company_id
    },
    { 
      skip: !reportId || !user?.company_id,
      refetchOnMountOrArgChange: true
    }
  );

  // Filter modules based on user role
  const [filteredModules, setFilteredModules] = useState([]);

  useEffect(() => {
    if (reportModules) {
      // Filter modules based on user role
      if (userRole === 'company_admin') {
        // Company admins have access to all modules
        setFilteredModules(reportModules);
      } else if (userRole === 'plant_admin') {
        // Plant admins have access to calc modules only
        const calcModules = reportModules.filter(module => module.module_type === 'calc');
        setFilteredModules(calcModules);
      } else {
        // Default case - no modules
        setFilteredModules([]);
      }
    }
  }, [reportModules, userRole]);

  // Function to get icon component based on module name
  const getModuleIcon = (moduleName) => {
    const name = moduleName.toLowerCase();
    if (name.includes('environment')) return <Leaf className="w-4 h-4 flex-shrink-0" />;
    if (name.includes('social')) return <Users className="w-4 h-4 flex-shrink-0" />;
    if (name.includes('governance')) return <ShieldCheck className="w-4 h-4 flex-shrink-0" />;
    if (name.includes('report')) return <FileText className="w-4 h-4 flex-shrink-0" />;
    return <Building className="w-4 h-4 flex-shrink-0" />;
  };

  const handleModuleClick = (moduleId) => {
    navigate(`/plants/${moduleId}`);
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar with report selection dropdown */}
      <Navbar />
      
      <div className="flex">
        {/* Sidebar */}
        <div className={`fixed left-0 top-[48px] h-[calc(100vh-48px)] w-64 bg-[#000D30] text-[#E5E7EB] transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="pt-3 pb-3 flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-300">
            {/* Header */}
            <div className="flex items-center gap-3 pl-5 mb-5">
              <Building className="w-5 h-5 text-green-300 flex-shrink-0" />
              <h2 className="text-[1rem] font-bold text-[#E5E7EB]">
                {companyDetails?.company_name || 'BRSR'}
              </h2>
            </div>

            {/* Navigation */}
            <nav className="flex-1">
              <ul className="space-y-1 flex flex-col items-start pl-0">
                {/* Dashboard */}
                <li className="w-full">
                  <button
                    onClick={() => navigate('/home')}
                    className="flex items-center gap-3 w-full h-[32px] text-[0.92rem] font-medium pl-10 rounded-none transition-colors justify-start
                      text-[#E5E7EB] hover:bg-[#20305D] hover:text-white"
                  >
                    <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                    <span className="text-left">Home</span>
                  </button>
                </li>

                {/* Module List */}
                {isLoading ? (
                  <li className="w-full flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  </li>
                ) : error ? (
                  <li className="w-full px-5 py-2 text-red-300 text-sm">
                    Error loading modules
                  </li>
                ) : filteredModules.length === 0 ? (
                  <li className="w-full px-5 py-2 text-gray-400 text-sm">
                    No modules available
                  </li>
                ) : (
                  filteredModules.map((module) => (
                    <li key={module.id} className="w-full">
                      <button
                        onClick={() => handleModuleClick(module.id)}
                        className="flex items-center gap-3 w-full h-[32px] text-[0.92rem] font-medium pl-10 rounded-none transition-colors justify-start
                          text-[#E5E7EB] hover:bg-[#20305D] hover:text-white"
                      >
                        {getModuleIcon(module.name)}
                        <span className="text-left">{module.name}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </nav>

            {/* Logout Button */}
            <div className="mt-auto px-5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 text-[0.92rem] font-medium text-[#E5E7EB] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">
                {reportId ? 'Select a Module' : 'No Report Selected'}
              </h1>
              <p className="text-gray-600">
                {reportId 
                  ? 'Please select a module from the sidebar to view its content.'
                  : 'Please select a report from the navbar dropdown first.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleView;