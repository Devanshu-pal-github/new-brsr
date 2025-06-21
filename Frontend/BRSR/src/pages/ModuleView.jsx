import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  selectCurrentUser,
  selectUserRole,
  selectCompanyDetails,
} from "../store/slices/authSlice";
import Navbar from "../components/layout/ReportNavbar";
import { useGetReportModulesQuery } from "../store/api/apiSlice";
import { Loader2,Factory } from "lucide-react";
import DynamicPageRenderer from "../dynamic-pages";
import Plants from "../../../BRSR/Environment/Pages/Plants";
import EnvironmentContent from "../../../BRSR/Environment/components/EnvironmentContent";
import ChatbotWindow from "../AICHATBOT/ChatbotWindow";
import { AppProvider } from "../AICHATBOT/AppProvider";
import Dashboard from "../components/dashboard/Dashboard";
import GHGMainPage from "../../../BRSR/GHG Emission/Pages/GHGMainPage";

// Import icons for modules
import {
  LayoutDashboard,
  Building,
  Leaf,
  Users,
  ShieldCheck,
  FileText,
  X,
} from "lucide-react";

const ModuleView = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get module and plant from URL search params
  const searchParams = new URLSearchParams(location.search);
  const moduleFromUrl = searchParams.get('module') || 'dashboard';
  const plantIdFromUrl = searchParams.get('plantId');
  const plantReportsFromUrl = searchParams.get('plantReports');

  const [selectedModuleId, setSelectedModuleId] = useState(moduleFromUrl);
  const [selectedPlantData, setSelectedPlantData] = useState(
    plantIdFromUrl && plantReportsFromUrl 
      ? { 
          plantId: plantIdFromUrl, 
          environmentReports: JSON.parse(plantReportsFromUrl)
        }
      : null
  );

  const user = useSelector(selectCurrentUser);
  const userRole = useSelector(selectUserRole);
  const companyDetails = useSelector(selectCompanyDetails);

  // State for sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [chatbotInitialMode, setChatbotInitialMode] = useState("general");

  // Get modules for the selected report
  const {
    data: reportModules,
    isLoading,
    error,
  } = useGetReportModulesQuery(
    {
      reportId: reportId,
      companyId: user?.company_id,
    },
    {
      skip: !reportId || !user?.company_id,
      refetchOnMountOrArgChange: true,
    }
  );

  // Filter modules based on user role
  const [filteredModules, setFilteredModules] = useState([]);
  

  useEffect(() => {
    if (reportModules) {
      // Filter modules based on user role
      if (userRole === "company_admin") {
        // Company admins have access to all modules
        setFilteredModules(reportModules);
      } else if (userRole === "plant_admin") {
        // Plant admins have access to calc modules only
        const calcModules = reportModules.filter(
          (module) => module.module_type === "calc"
        );
        setFilteredModules(calcModules);
      } else {
        // Default case - no modules
        setFilteredModules([]);
      }
    }
  }, [reportModules, userRole]);

  console.log("filteredModules",filteredModules);

  // Function to get icon component based on module name
  const getModuleIcon = (moduleName) => {
    const name = moduleName.toLowerCase();
    if (name.includes("environment"))
      return <Leaf className="w-4 h-4 flex-shrink-0" />;
    if (name.includes("social"))
      return <Users className="w-4 h-4 flex-shrink-0" />;
    if (name.includes("governance"))
      return <ShieldCheck className="w-4 h-4 flex-shrink-0" />;
    if (name.includes("report"))
      return <FileText className="w-4 h-4 flex-shrink-0" />;
    return <Building className="w-4 h-4 flex-shrink-0" />;
  };

  const handleModuleClick = (moduleId) => {
    setSelectedModuleId(moduleId);
    setSelectedPlantData(null);
    
    // Update URL with new module
    const params = new URLSearchParams(location.search);
    params.set('module', moduleId);
    params.delete('plantId');
    params.delete('plantReports');
    navigate({ search: params.toString() }, { replace: true });
  };

  const handlePlantSelect = (plantId, environmentReports) => {
    setSelectedPlantData({ plantId, environmentReports });
    
    // Update URL with plant data
    const params = new URLSearchParams(location.search);
    params.set('plantId', plantId);
    params.set('plantReports', JSON.stringify(environmentReports));
    navigate({ search: params.toString() }, { replace: true });
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <AppProvider>
      <div className="h-screen flex flex-col">
        {/* Navbar with report selection dropdown - Fixed at top */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar />
        </div>

        <div className="flex pt-[48px] h-full">
          {/* Sidebar - Fixed */}
          <div
            className={`fixed left-0 top-[48px] h-[calc(100vh-48px)] bg-[#000D30] text-[#E5E7EB] transition-all duration-300 ease-in-out overflow-hidden
            ${isSidebarOpen
                ? "w-50 translate-x-0"
                : "w-0 -translate-x-full lg:w-16 lg:translate-x-0"
              }`}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center gap-3 pl-5 py-3">

                <h2
                  className={`text-[1rem] font-bold text-[#E5E7EB] transition-opacity duration-300
                  ${isSidebarOpen ? "opacity-100" : "opacity-0 lg:hidden"}`}
                >
                  {companyDetails?.company_name}
                </h2>
              </div>

              {/* Navigation - Scrollable */}
              <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-300">
                <ul className="space-y-1 flex flex-col items-start pl-0">
                  
              


                  {/* Dashboard */}
                  <li className="w-full">
                    <button
                      onClick={() => setSelectedModuleId("dashboard")}
                      className={`flex items-center gap-3 w-full h-[32px] text-[0.92rem] font-medium pl-10 rounded-none transition-colors justify-start
                        ${selectedModuleId === "dashboard"
                          ? "bg-[#20305D] text-white"
                          : "text-[#E5E7EB] hover:bg-[#20305D] hover:text-white"
                        }`}
                    >
                      <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                      <span className="text-left">Dashboard</span>
                    </button>
                  </li>

                  {/* Hardcoded Environment Module */}
                  <li className="w-full">
                    <button
                      onClick={() => handleModuleClick("environment")}
                      className={`flex items-center gap-3 w-full h-[32px] text-[0.92rem] font-medium pl-10 rounded-none transition-colors justify-start
                        ${selectedModuleId === "environment"
                          ? "bg-[#20305D] text-white"
                          : "text-[#E5E7EB] hover:bg-[#20305D] hover:text-white"
                        }`}
                    >
                      {getModuleIcon("environment")}
                      <span className="text-left">Environment</span>
                    </button>
                  </li>

                  {/* Greenhouse Gases Emission Module */}
                  <li className="w-full">
                    <button
                      onClick={() => handleModuleClick("ghg")}
                      className={`flex items-center gap-3 w-full h-[32px] text-[0.92rem] font-medium pl-10 rounded-none transition-colors justify-start
                        ${selectedModuleId === "ghg"
                          ? "bg-[#20305D] text-white"
                          : "text-[#E5E7EB] hover:bg-[#20305D] hover:text-white"
                        }`}
                    >
                      <Factory className="w-4 h-4 flex-shrink-0" />
                      <span className="text-left">GHG Emissions</span>
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
                          className={`flex items-center gap-3 w-full h-[32px] text-[0.92rem] font-medium pl-10 rounded-none transition-colors justify-start
                            ${selectedModuleId === module.id
                              ? "bg-[#20305D] text-white"
                              : "text-[#E5E7EB] hover:bg-[#20305D] hover:text-white"
                            }`}
                        >
                          {getModuleIcon(module.name)}
                          <span className="text-left">{module.name}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              {/* Logout Button */}
              </nav>
              <div className="p-5 border-t border-gray-700">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 text-[0.92rem] font-medium text-[#E5E7EB] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span
                    className={`${isSidebarOpen ? "opacity-100" : "opacity-0 lg:hidden"}`}
                  >
                    Logout
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content - Scrollable */}
          <div
            className={`flex-1 transition-all duration-300 ease-in-out overflow-x-hidden  
            ${isSidebarOpen ? "ml-55"  : "ml-0 lg:ml-16"}`}
          >
            {selectedModuleId === "dashboard" ? (
              <div className="h-[calc(100vh-48px)] overflow-y-auto">
                <Dashboard dynamicModules={filteredModules} />
              </div>
            ) : selectedModuleId === "environment" ? (
              selectedPlantData ? (
                <div className="h-[calc(100vh-48px)] overflow-y-auto ">
                  <EnvironmentContent
                    renderBare
                    plantId={selectedPlantData.plantId}
                    environmentReports={selectedPlantData.environmentReports}
                  />
                </div>
              ) : (
                <div className="h-[calc(100vh-48px)] overflow-y-auto">
                  <Plants
                    renderBare
                    onPlantSelect={handlePlantSelect}
                  />
                </div>
              )
            ) : selectedModuleId === "ghg" ? (
              <div className="h-[calc(100vh-48px)] overflow-y-auto">
                {/* GHG Main Page with SubHeader */}
                <GHGMainPage />
              </div>
            ) : selectedModuleId ? (
              <div className="h-[calc(100vh-48px)] overflow-y-auto">
                <div className="container mx-auto px-2">
                  {filteredModules.find((m) => m.id === selectedModuleId) && (
                    <DynamicPageRenderer
                      reportId={reportId}
                      moduleId={selectedModuleId}
                      module={filteredModules.find(
                        (m) => m.id === selectedModuleId
                      )}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6 lg:p-8 h-[calc(100vh-48px)] overflow-y-auto">
                <div className="container mx-auto">
                  <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
                      {reportId ? "Select a Module" : "No Report Selected"}
                    </h1>
                    <p className="text-gray-600">
                      {reportId
                        ? "Please select a module from the sidebar to view its content."
                        : "Please select a report from the navbar dropdown first."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Chat Button */}
        <button
          className="fixed z-[120] bottom-[3vh] right-[3vw] w-[6vw] h-[6vw] min-w-[48px] min-h-[48px] max-w-[80px] max-h-[80px] rounded-full bg-gradient-to-br from-[#0A2E87] to-[#4F46E5] shadow-xl flex items-center justify-center hover:scale-110 transition-transform border-4 border-white focus:outline-none"
          style={{ boxShadow: "0 8px 32px 0 rgba(10,46,135,0.25)" }}
          onClick={() => setAiChatOpen(true)}
          aria-label="Open AI Assistant Chat"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <line x1="12" y1="6" x2="12" y2="3" />
            <circle cx="12" cy="3" r="1" />
            <circle cx="9" cy="10" r="1" />
            <circle cx="15" cy="10" r="1" />
            <path d="M8 14h8" />
          </svg>
        </button>

        {/* AI Chat Window */}
        {aiChatOpen && (
          <div className="fixed inset-0 z-[1000] flex items-end justify-end bg-opacity-50 transition-opacity duration-300">
            <div
              className="w-full h-full absolute top-0 left-0"
              onClick={() => setAiChatOpen(false)}
            />
            <div className="relative z-10 w-full max-w-md m-4 md:m-8 animate-slide-up">
              <div className="bg-white rounded-lg shadow-2xl p-0 overflow-hidden border border-gray-200">
                <ChatbotWindow
                  onClose={() => setAiChatOpen(false)}
                  initialMode={chatbotInitialMode}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppProvider>
  );
};

export default ModuleView;
