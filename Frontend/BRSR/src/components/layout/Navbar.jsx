import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logout, selectCurrentUser, selectCompanyDetails } from '../../store/slices/authSlice';
import { Menu, ChevronDown } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState('BRSR');
  const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [reportTypes, setReportTypes] = useState([]);
  
  const user = useSelector(selectCurrentUser);
  const companyDetails = useSelector(selectCompanyDetails);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get user name from user object in Redux store
  const userName = user?.user_name || 'User';

  // Process company details to extract report names when companyDetails changes
  useEffect(() => {
    if (companyDetails && companyDetails.active_reports && companyDetails.active_reports.length > 0) {
      const reports = companyDetails.active_reports.map(report => ({
        id: report.report_id,
        name: report.report_name || 'Report'
      }));
      setReportTypes(reports);
      
      // Set the first report as selected if we have reports and none is selected yet
      if (reports.length > 0 && selectedReport === 'BRSR') {
        setSelectedReport(reports[0].name);
      }
    } else {
      // Fallback to default reports if no company details available
      setReportTypes([
        { id: 'brsr', name: 'BRSR' },
        { id: 'cge', name: 'CGE' }
      ]);
    }
  }, [companyDetails, selectedReport]);

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

  const selectReport = (reportName) => {
    setSelectedReport(reportName);
    setIsReportDropdownOpen(false);
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
                className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] text-[#FFFFFF] font-medium bg-[#20305D] border border-gray-200 shadow-sm hover:bg-[#345678] transition-colors"
              >
                <span>{selectedReport}</span>
                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isReportDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isReportDropdownOpen && (
                <ul className="absolute top-12 left-0 w-32 bg-white rounded-[8px] shadow-lg z-50 overflow-hidden">
                  {reportTypes.map((report) => (
                    <li
                      key={report.id}
                      onClick={() => selectReport(report.name)}
                      className={`px-4 py-2 text-[#000D30] text-[12px] cursor-pointer hover:bg-[#20305D] hover:text-white font-medium transition-colors ${selectedReport === report.name ? 'bg-[#FFFFFF]' : ''}`}
                    >
                      {report.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => {
                  selectReport(report.name);
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-[12px] text-white hover:bg-[#345678] transition-colors"
              >
                {report.name}
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