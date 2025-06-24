import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { X, Search, Plus } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useGetPlantEmployeesQuery, useDeleteEmployeeMutation, useSendNotificationMutation } from '../../store/api/apiSlice';
import CreateEmployeeModal from './CreateEmployeeModal';
import { useSearchParams } from "react-router-dom";

const EmployeeManagementModal = ({ onClose, plantId, financialYear }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ role: "" });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, employee: null });
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationDesc, setNotificationDesc] = useState("");
  const popupRef = useRef(null);
  
  // Add click outside handler - Updated to include notifyModalOpen
  useEffect(() => {
    // Don't attach handler if any modal/dialog is open
    if (deleteDialog.open || isCreateModalOpen || notifyModalOpen) return;
    
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, isCreateModalOpen, deleteDialog.open, notifyModalOpen]); // Added notifyModalOpen to dependencies

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

  console.log("Employees from API:", employees);

  const [searchParams] = useSearchParams();
  const financialYearFromParams = searchParams.get("financialYear") || financialYear;

  // Delete employee mutation
  const [deleteEmployee, { isLoading: isDeleting }] = useDeleteEmployeeMutation();
  const [sendNotification, { isLoading: isNotifying }] = useSendNotificationMutation();

  // Handler for deleting an employee
  const handleDeleteEmployee = async (employee_id) => {
    if (!plantId || !employee_id) return;
    try {
      await deleteEmployee({ employee_id, plant_id: plantId }).unwrap();
      toast.success('Employee deleted successfully');
    } catch (err) {
      toast.error(err?.data?.detail || 'Failed to delete employee');
    }
  };

  // Handler for delete button click (opens dialog)
  const handleDeleteClick = (employee) => {
    setDeleteDialog({ open: true, employee });
  };

  // Handler for confirming deletion
  const handleConfirmDelete = async () => {
    if (!plantId || !deleteDialog.employee) return;
    try {
      await deleteEmployee({ employee_id: deleteDialog.employee.id, plant_id: plantId }).unwrap();
      toast.success('Employee deleted successfully');
      setDeleteDialog({ open: false, employee: null });
    } catch (err) {
      toast.error(err?.data?.detail || 'Failed to delete employee');
    }
  };

  // Handler for canceling deletion
  const handleCancelDelete = () => {
    setDeleteDialog({ open: false, employee: null });
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const roleOptions = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [{ value: "", label: "All Roles" }];
    const roles = [...new Set(employees.map(employee => employee.role).filter(Boolean))];
    return [
      { value: "", label: "All Roles" },
      ...roles.map(role => ({ value: role, label: role.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') }))
    ];
  }, [employees]);

  const filteredRows = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    
    return employees
      .filter(employee => {
        if (!employee) return false;
        
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          (employee.email && employee.email.toLowerCase().includes(searchLower)) ||
          (employee.full_name && employee.full_name.toLowerCase().includes(searchLower));
        const matchesRole = !filters.role || employee.role === filters.role;
        return matchesSearch && matchesRole;
      })
      .map((employee, index) => ({
        id: employee.id || employee._id || `employee-${index}`,
        full_name: employee.full_name || '',
        email: employee.email || '',
        role: employee.role || '',
        is_active: Boolean(employee.is_active),
        company_id: employee.company_id || '',
        plant_id: employee.plant_id || '',
        created_at: employee.created_at || '',
        updated_at: employee.updated_at || '',
        access_modules: employee.access_modules || []
      }));
  }, [employees, searchQuery, filters]);

  // Handle individual checkbox selection
  const handleCheckboxChange = (employeeId, checked) => {
    if (checked) {
      setSelectedEmployeeIds(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployeeIds(prev => prev.filter(id => id !== employeeId));
    }
  };

  // Handle select all checkbox
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedEmployeeIds(filteredRows.map(row => row.id));
    } else {
      setSelectedEmployeeIds([]);
    }
  };

  const isAllSelected = filteredRows.length > 0 && selectedEmployeeIds.length === filteredRows.length;
  const isIndeterminate = selectedEmployeeIds.length > 0 && selectedEmployeeIds.length < filteredRows.length;

  // Handler for notification
  const handleNotify = () => setNotifyModalOpen(true);
  const handleSendNotification = async () => {
    if (!selectedEmployeeIds.length) return;
    const recipients = filteredRows.filter(emp => selectedEmployeeIds.includes(emp.id)).map(emp => ({
      id: emp.id,
      name: emp.full_name,
      role: emp.role
    }));
    try {
      await sendNotification({
        plantId,
        financialYear: financialYearFromParams, // Use the value from params or prop
        notificationTo: recipients,
        notificationMessage: { title: notificationTitle, description: notificationDesc }
      }).unwrap();
      toast.success('Notification sent!');
      setNotifyModalOpen(false);
      setNotificationTitle("");
      setNotificationDesc("");
      setSelectedEmployeeIds([]);
    } catch (err) {
      toast.error(err?.data?.detail || 'Failed to send notification');
    }
  };

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
            <div className="flex gap-2 sm:w-auto">
              <button
                type="button"
                onClick={handleNotify}
                className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  selectedEmployeeIds.length === 0 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-[#1A2341] text-white hover:bg-[#1A2341]/80'
                }`}
                disabled={selectedEmployeeIds.length === 0}
              >
                Notify ({selectedEmployeeIds.length})
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2 bg-[#1A2341] text-white rounded-md hover:bg-[#1A2341]/80 transition-all flex items-center justify-center sm:justify-start gap-2 text-sm"
              >
                <Plus size={16} />
                Create Employee
              </button>
            </div>
          </div>
        </div>
        
        <div className="h-[calc(80vh-220px)] w-full">
          {filteredRows.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-[#F5F6FA] px-4 py-3 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 items-center text-sm font-bold text-[#1A2341]">
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={input => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-[#1A2341] bg-gray-100 border-gray-300 rounded focus:ring-[#1A2341] focus:ring-2"
                    />
                  </div>
                  <div className="col-span-4">Employee Name</div>
                  <div className="col-span-3">Role</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Actions</div>
                </div>
              </div>
              
              {/* Table Body */}
              <div className="max-h-[calc(80vh-300px)] overflow-y-auto">
                {filteredRows.map((employee) => (
                  <div key={employee.id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-1 flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.includes(employee.id)}
                          onChange={(e) => handleCheckboxChange(employee.id, e.target.checked)}
                          className="w-4 h-4 text-[#1A2341] bg-gray-100 border-gray-300 rounded focus:ring-[#1A2341] focus:ring-2"
                        />
                      </div>
                      <div className="col-span-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{employee.full_name || 'N/A'}</span>
                          <span className="text-xs text-gray-500">{employee.email || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-[#2c3e50] to-[#1A2341] text-white">
                          {employee.role ? employee.role.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'N/A'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-red-200 to-red-400 text-[#1A2341] cursor-pointer hover:from-red-300 hover:to-red-500 transition-all"
                          onClick={() => handleDeleteClick(employee)}
                          style={{ userSelect: 'none' }}
                        >
                          Delete
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 border border-gray-200 rounded-lg">
              No employees found
            </div>
          )}
        </div>
      </div>

      {/* Create Employee Modal */}
      <CreateEmployeeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        plantId={plantId}
      />

      {/* Delete Confirmation Dialog */}
      {deleteDialog.open && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
          onClick={e => {
            if (e.target === e.currentTarget) handleCancelDelete();
          }}
        >
          <div
            className="bg-white rounded-xl shadow-lg p-6 min-w-[320px] max-w-[90vw] border-1 border-[#1A2341] flex flex-col items-center"
            style={{ position: 'relative' }}
          >
            <div className="text-lg font-semibold text-[#1A2341] mb-2">Confirm Deletion</div>
            <div className="text-gray-700 mb-4 text-center">
              Are you sure you want to delete <span className="font-bold text-[#1A2341]">{deleteDialog.employee?.full_name}</span>?
              <br />This action cannot be undone.
            </div>
            <div className="flex gap-4 mt-2 w-full justify-between">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-[#1A2341] font-semibold hover:bg-gray-300 transition-all"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-gradient-to-r from-[#1A2341] to-[#2c3e50] text-white font-semibold hover:from-[#2c3e50] hover:to-[#1A2341] transition-all"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notify Modal - Improved click handling */}
      {notifyModalOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
          onClick={e => {
            // Only close if clicking on the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              setNotifyModalOpen(false);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 min-w-[400px] max-w-[98vw] w-full sm:w-[450px] md:w-[520px] border-2 border-[#1A2341] flex flex-col items-center relative animate-fadeIn"
            style={{ boxShadow: '0 8px 32px rgba(26,35,65,0.18)' }}
            onClick={e => e.stopPropagation()} // Prevent modal close when clicking inside
          >
            <div className="text-2xl font-bold text-[#1A2341] mb-4 w-full text-center">Send Notification</div>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base focus:outline-none focus:ring-2 focus:ring-[#1A2341] placeholder:text-gray-400 text-black"
              placeholder="Enter notification title (e.g. 'Policy Update for Employees')"
              value={notificationTitle}
              onChange={e => setNotificationTitle(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <textarea
              className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base focus:outline-none focus:ring-2 focus:ring-[#1A2341] placeholder:text-gray-400 resize-none min-h-[120px] text-black"
              placeholder="Enter notification details (e.g. 'Please review the updated company policy attached below...')"
              value={notificationDesc}
              onChange={e => setNotificationDesc(e.target.value)}
              rows={5}
              maxLength={500}
            />
            <div className="flex gap-4 mt-2 w-full justify-between">
              <button
                className="px-5 py-2 rounded bg-gray-200 text-[#1A2341] font-semibold hover:bg-gray-300 transition-all w-1/2"
                onClick={() => setNotifyModalOpen(false)}
                disabled={isNotifying}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2 rounded bg-gradient-to-r from-[#1A2341] to-[#2c3e50] text-white font-semibold hover:from-[#2c3e50] hover:to-[#1A2341] transition-all w-1/2"
                onClick={handleSendNotification}
                disabled={isNotifying || !notificationTitle || !notificationDesc}
              >
                {isNotifying ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagementModal;