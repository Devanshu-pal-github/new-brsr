import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logout, selectCurrentUser, selectCompanyDetails } from '../../store/slices/authSlice';
import { useGetReportModulesQuery, useGetCompanyPlantsQuery, useCreatePlantMutation } from '../../store/api/apiSlice';
import { Menu, ChevronDown, X, Search, Trash2, Plus, Settings } from 'lucide-react';
import { DataGrid } from '@mui/x-data-grid';
import Select from 'react-select';
import toast, { Toaster } from 'react-hot-toast';

const CreatePlantModal = ({ isOpen, onClose }) => {
  const user = useSelector((state) => state.auth.user);
  const [createPlant, { isLoading: isCreating }] = useCreatePlantMutation();
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleCreatePlant = async (e) => {
    e.preventDefault();
    const formData = {
      name: e.target.plantName.value,
      code: e.target.plantCode.value,
      type: 'regular',
      address: e.target.address.value,
      contact_email: e.target.email.value,
      contact_phone: e.target.phone.value,
      company_id: user.company_id,
      metadata: {}
    };

    try {
      await createPlant(formData).unwrap();
      toast.success('Plant created successfully');
      onClose();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to create plant');
      console.error('Failed to create plant:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[60] transition-opacity duration-300">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg p-6 w-full max-w-md transform transition-transform duration-300 scale-100"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create New Plant</h2>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleCreatePlant} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Plant Name</label>
            <input
              type="text"
              name="plantName"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Plant Code</label>
            <input
              type="text"
              name="plantCode"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              name="address"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Email</label>
            <input
              type="email"
              name="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
            <input
              type="tel"
              name="phone"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-white bg-[#20305D] rounded-md hover:bg-[#162442] disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Plant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PlantManagementModal = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ plant_type: "" });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const popupRef = useRef(null);
  
  // Get user from Redux store
  const user = useSelector((state) => state.auth.user);

  // Fetch plants using the API
  const { 
    data: plants = [], 
    isLoading: plantsLoading, 
    error: plantsError 
  } = useGetCompanyPlantsQuery(user?.company_id, {
    skip: !user?.company_id,
  });

  console.log(plants);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const plantTypeOptions = useMemo(() => {
    if (!plants) return [{ value: "", label: "All Plant Types" }];
    const types = [...new Set(plants.map(plant => plant.plant_type))];
    return [
      { value: "", label: "All Plant Types" },
      ...types.map(type => ({ value: type, label: `Type ${type}` }))
    ];
  }, [plants]);

  const filteredRows = useMemo(() => {
    if (!plants) return [];
    return plants.map((plant) => ({
      id: plant.id,
      ...plant,
    })).filter(row => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        (row.plant_code?.toLowerCase().includes(searchLower) || '') ||
        (row.plant_name?.toLowerCase().includes(searchLower) || '') ||
        (row.address?.toLowerCase().includes(searchLower) || '');
      const matchesType = !filters.plant_type || row.plant_type === filters.plant_type;
      return matchesSearch && matchesType;
    });
  }, [plants, searchQuery, filters]);

  const columns = [
    { 
      field: "plant_name", 
      headerName: "Plant Name", 
      flex: 2,
      renderCell: (params) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{params.value}</span>
          <span className="text-xs text-gray-500">{params.row.plant_type}</span>
        </div>
      )
    },
    {
      field: "plant_code",
      headerName: "Plant Code",
      flex: 1,
      renderCell: (params) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-[#2c3e50] to-[#1A2341] text-white">
          {params.value}
        </span>
      )
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.2,
      sortable: false,
      renderCell: (params) => (
        <div className="flex items-center justify-center w-full h-full gap-3">
          <button
            onClick={() => {
              // Show confirmation toast before deleting
              toast((t) => (
                <div className="flex flex-col gap-2">
                  <p className="font-medium">Delete Plant?</p>
                  <p className="text-sm text-gray-600">Are you sure you want to delete this plant?</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        // TODO: Handle plant deletion
                        toast.dismiss(t.id);
                        toast.success('Plant deleted successfully');
                      }}
                      className="px-3 py-1 text-sm text-white bg-[#4A5D4B] rounded-md hover:bg-[#3E4E3F]"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ));
            }}
            className="bg-gray-500 text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition cursor-pointer"
            title="Delete Plant"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => handleManagePlant(params.row.id)}
            className="bg-[#1A2341] text-white px-3 py-1.5 text-sm rounded-md hover:bg-[#1A2341]/80 transition cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            Manage
          </button>
        </div>
      )
    }
  ];

  if (plantsLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2341]"></div>
        </div>
      </div>
    );
  }

  if (plantsError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl p-8">
          <div className="text-red-500">Error loading plants: {plantsError?.data?.message || 'Please try again later'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        ref={popupRef}
        className="bg-white rounded-xl w-[90vw] max-w-[1000px] max-h-[90vh] overflow-auto p-5 relative scrollbar-none"
      >
        <Toaster position="top-right" />
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[1.2vw] font-semibold text-[#1A2341]">Plant Management</h1>
          <button
            onClick={onClose}
            className="text-[#1A2341] hover:text-[#1A2341]/50 transition-all cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mb-6 rounded-xl shadow-inner border border-slate-200/60 p-4 w-full">
          <div className="flex flex-wrap items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[250px] max-w-[400px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search by Code or Name"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A2341] text-sm"
                />
              </div>

              {/* Plant Type Filter */}
              <div className="w-[200px]">
                <select
                  value={filters.plant_type}
                  onChange={(e) => handleFilterChange("plant_type", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A2341] text-sm"
                >
                  {plantTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Create Plant Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-[#1A2341] text-white rounded-md hover:bg-[#1A2341]/80 transition-all flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              Create Plant
            </button>
          </div>
        </div>

        <div style={{ height: 500, width: "100%" }} className="mb-5">
          <DataGrid
            rows={filteredRows}
            columns={columns}
            pageSize={6}
            rowsPerPageOptions={[6]}
            disableRowSelectionOnClick
            hideFooter
            sortingOrder={["asc", "desc"]}
            sx={{
              fontSize: "0.875rem",
              ".MuiDataGrid-columnHeaders": {
                backgroundColor: "#F5F6FA",
                color: "#1A2341",
                fontWeight: "bold",
              },
              ".MuiDataGrid-cell": { alignItems: "center" },
            }}
          />
        </div>
      </div>
      <CreatePlantModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
};

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(() => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem('selectedReport');
    return stored ? JSON.parse(stored) : null;
  });
  const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);
  
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

  const handleManagePlant = (plantId) => {
    console.log('Managing plant:', plantId);
    // Add plant management logic here
    setIsPlantModalOpen(false);
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

          {/* Right side - Manage Plants, User Profile & Logout */}
          <div className="flex items-center gap-4">
            {/* Manage Plants Button */}
            <button
              onClick={() => setIsPlantModalOpen(true)}
              className="px-3 py-2 rounded-md text-[12px] text-[#FFFFFF] font-medium bg-[#20305D] border border-gray-200 shadow-sm hover:bg-[#345678] transition-colors"
            >
              Manage Plants
            </button>

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
            <button
              onClick={() => {
                setIsPlantModalOpen(true);
                setIsMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-[12px] text-white hover:bg-[#345678] transition-colors"
            >
              Manage Plants
            </button>
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

      {/* Plant Management Modal */}
      {isPlantModalOpen && <PlantManagementModal onClose={() => setIsPlantModalOpen(false)} />}
    </nav>
  );
};

export default Navbar;