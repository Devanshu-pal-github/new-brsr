import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { X, Search, Plus } from 'lucide-react';
import { DataGrid } from '@mui/x-data-grid';
import toast, { Toaster } from 'react-hot-toast';
import { useGetPlantEmployeesQuery } from '../../store/api/apiSlice';
import CreateEmployeeModal from './CreateEmployeeModal';

const EmployeeManagementModal = ({ onClose, plantId }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ role: "" });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const popupRef = useRef(null);
  
  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target) && !isCreateModalOpen) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, isCreateModalOpen]);

  // Get user from Redux store for company_id
  const user = useSelector((state) => state.auth.user);

  // Fetch employees using the API
  const { 
    data: employees = [], 
    isLoading: employeesLoading, 
    error: employeesError 
  } = useGetPlantEmployeesQuery({
    plant_id: plantId
  }, {
    skip: !plantId,
  });

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const roleOptions = useMemo(() => {
    if (!employees) return [{ value: "", label: "All Roles" }];
    const roles = [...new Set(employees.map(employee => employee.role))];
    return [
      { value: "", label: "All Roles" },
      ...roles.map(role => ({ value: role, label: role.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') }))
    ];
  }, [employees]);

  const filteredRows = useMemo(() => {
    if (!employees) return [];
    return employees.filter(employee => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        employee.email?.toLowerCase().includes(searchLower) ||
        employee.full_name?.toLowerCase().includes(searchLower);
      const matchesRole = !filters.role || employee.role === filters.role;
      return matchesSearch && matchesRole;
    });
  }, [employees, searchQuery, filters]);

  const columns = [
    { 
      field: "full_name", 
      headerName: "Employee Name", 
      flex: 2,
      renderCell: (params) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{params.value}</span>
          <span className="text-xs text-gray-500">{params.row.email}</span>
        </div>
      )
    },
    {
      field: "role",
      headerName: "Role",
      flex: 1,
      renderCell: (params) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-[#2c3e50] to-[#1A2341] text-white">
          {params.value.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </span>
      )
    },
    {
      field: "is_active",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          params.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {params.value ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  if (employeesLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2341]"></div>
        </div>
      </div>
    );
  }

  if (employeesError) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl p-8">
          <div className="text-red-500">Error loading employees: {employeesError?.data?.message || 'Please try again later'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        ref={popupRef}
        className="bg-white rounded-xl w-[80%] md:w-[75%] lg:w-[70%] max-w-[1000px] h-[80vh] overflow-auto p-3 sm:p-4 md:p-5 relative scrollbar-none"
      >
        <Toaster position="top-right" />
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base sm:text-lg md:text-xl font-semibold text-[#1A2341]">Employee Management</h1>
          <button
            onClick={onClose}
            className="text-[#1A2341] hover:text-[#1A2341]/50 transition-all cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mb-4 md:mb-6 rounded-xl shadow-inner border border-slate-200/60 p-2 sm:p-3 md:p-4 w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 w-full sm:min-w-[250px] sm:max-w-[400px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search by employee name or email..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A2341] text-sm placeholder:text-gray-400"
                />
              </div>

              {/* Role Filter */}
              <div className="w-full sm:w-[200px]">
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange("role", e.target.value)}
                  className="w-full px-3 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A2341] text-sm"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value} className="text-gray-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Create Employee Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-[#1A2341] text-white rounded-md hover:bg-[#1A2341]/80 transition-all flex items-center justify-center sm:justify-start gap-2 text-sm"
            >
              <Plus size={16} />
              Create Employee
            </button>
          </div>
        </div>

        <div className="h-[calc(80vh-220px)] w-full">
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
              height: "100%",
              width: "100%",
              border: "none",
              "& .MuiDataGrid-virtualScroller": {
                overflowX: "hidden"
              }
            }}
          />
        </div>
      </div>

      {/* Create Employee Modal */}
      <CreateEmployeeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        plantId={plantId}
      />
    </div>
  );
};

export default EmployeeManagementModal; 