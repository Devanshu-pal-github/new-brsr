import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logout, selectCurrentUser, selectCompanyDetails } from '../../store/slices/authSlice';
import { useGetReportModulesQuery } from '../../store/api/apiSlice';
import { Menu, ChevronDown } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(() => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem('selectedReport');
    return stored ? JSON.parse(stored) : null;
  });
  const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  
  const user = useSelector(selectCurrentUser);
  const companyDetails = useSelector(selectCompanyDetails);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Query for modules with proper skip condition
  const { data: reportModules, isLoading: isLoadingModules, error: modulesError } = useGetReportModulesQuery(
    {
      reportId: selectedReport?.id,
      companyId: user?.company_id
    },
    { 
      skip: !selectedReport?.id || !user?.company_id,
      refetchOnMountOrArgChange: true
    }
  );

  // Effect to log state changes
  useEffect(() => {
    console.log('🎯 Selected Report:', selectedReport);
    console.log('👤 User:', user);
    console.log('📦 Report Modules Data:', reportModules);
    console.log('⚠️ Modules Error:', modulesError);
    
    if (selectedReport?.id && user?.company_id) {
      console.log('🔍 Making API call with:', {
        reportId: selectedReport.id,
        companyId: user.company_id
      });
    }
  }, [reportModules, selectedReport, user, modulesError]);

  // Handle report selection
  const handleReportSelect = (report) => {
    console.log('🎯 Selecting Report:', report);
    setSelectedReport(report);
    localStorage.setItem('selectedReport', JSON.stringify(report));
    setIsReportDropdownOpen(false);
    
    if (report.id) {
      console.log('🚀 Navigating to report:', report.id);
      navigate(`/reports/${report.id}`);
    }
  };

  // Effect to handle modules data
  useEffect(() => {
    if (reportModules) {
      console.log('✅ Modules loaded successfully:', reportModules);
      // Here you can handle the modules data, e.g., store in state or Redux
    }
  }, [reportModules]);

  // Get user name from user object in Redux store
  const userName = user?.user_name || 'User';

  // Get available reports from company details
  const availableReports = companyDetails?.active_reports || [];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const getUserInitials = (name) => {
    if (!name || name === 'User') return 'U';
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <nav className="bg-[#000D30] shadow-md">
      <div className="w-full px-3 md:px-5">
        <div className="flex items-center justify-between h-[48px]">
          {/* Left side - Report Type and Logo */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <Link to="/dashboard" className="text-white text-xl font-bold">ESG</Link>
            </div>
            
            {/* Report Type Selector */}
            <div className="relative">
              <button
                onClick={() => setIsReportDropdownOpen(!isReportDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] text-[#FFFFFF] font-medium bg-[#20305D] border border-gray-200 shadow-sm hover:bg-[#345678] transition-colors min-w-[120px]"
              >
                <span>{selectedReport?.report_name || 'Select Report'}</span>
                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isReportDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isReportDropdownOpen && (
                <ul className="absolute top-12 left-0 w-48 bg-white rounded-[8px] shadow-lg z-50 overflow-hidden">
                  {availableReports.length > 0 ? (
                    availableReports.map((report) => (
                      <li
                        key={report.report_id}
                        onClick={() => handleReportSelect({
                          id: report.report_id,
                          report_name: report.report_name,
                          financial_year: report.financial_year
                        })}
                        className={`px-4 py-2 text-[#000D30] text-[12px] cursor-pointer hover:bg-[#20305D] hover:text-white font-medium transition-colors
                          ${selectedReport?.id === report.report_id ? 'bg-[#20305D] text-white' : ''}`}
                      >
                        <div>{report.report_name}</div>
                        <div className="text-[10px] opacity-75">{report.financial_year}</div>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-2 text-[#000D30] text-[12px]">
                      No reports available
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Loading indicator for modules */}
            {selectedReport && isLoadingModules && (
              <div className="text-white text-sm">Loading modules...</div>
            )}
          </div>

          {/* Right side - User Profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 focus:outline-none group"
              >
                <div className="w-8 h-8 bg-[#20305D] rounded-full flex items-center justify-center text-white text-[12px] font-semibold group-hover:bg-[#345678] transition-colors">
                  {getUserInitials(userName)}
                </div>
                <div className="hidden sm:flex items-center gap-1">
                  <span className="text-[#FFFFFF] text-[12px] font-medium">
                    {userName}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-[#FFFFFF] transition-transform duration-300 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              
              {isUserDropdownOpen && (
                <ul className="absolute right-0 mt-2 w-36 sm:w-44 bg-[#000D30] rounded-md shadow-md z-50 overflow-hidden">
                  <li
                    className="px-4 py-2 text-[12px] text-white cursor-pointer hover:bg-[#20305D] transition-colors"
                    onClick={() => {
                      navigate('/profile');
                      setIsUserDropdownOpen(false);
                    }}
                  >
                    Profile
                  </li>
                  <li
                    className="px-4 py-2 text-[12px] text-white cursor-pointer hover:bg-[#20305D] transition-colors"
                    onClick={() => {
                      handleLogout();
                      setIsUserDropdownOpen(false);
                    }}
                  >
                    Logout
                  </li>
                </ul>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-white focus:outline-none"
              >
                <Menu className={`w-5 h-5 transition-transform duration-300 ${isMenuOpen ? 'rotate-0' : 'rotate-180'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#20305D]">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {availableReports.map((report) => (
              <button
                key={report.report_id}
                onClick={() => {
                  handleReportSelect({
                    id: report.report_id,
                    report_name: report.report_name,
                    financial_year: report.financial_year
                  });
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-[12px] text-white hover:bg-[#345678] transition-colors"
              >
                {report.report_name}
              </button>
            ))}
            <button
              onClick={() => {
                handleLogout();
                setIsMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-[12px] text-white hover:bg-[#345678] transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;