import React, { useState, useRef, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  useDeletePlantMutation,
  useGetCompanyPlantsQuery,
} from "../../store/api/apiSlice";
import { X, Plus, Trash2, Search } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { DataGrid } from "@mui/x-data-grid";
import CreatePlantModal from "./CreatePlantModal";
import EmployeeManagementModal from "./EmployeeManagementModal";

/* -------------------------------------------------------------------------- */
/*                         Plant Management Main Modal                        */
/* -------------------------------------------------------------------------- */

const PlantManagementModal = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ plant_type: "" });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, plantId: null });
  const popupRef = useRef(null);

  // Add click outside handler
  useEffect(() => {
    // Only attach click outside handler if no child modal is open
    if (isCreateModalOpen || isEmployeeModalOpen || deleteConfirmation.isOpen) return;
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, isCreateModalOpen, isEmployeeModalOpen, deleteConfirmation.isOpen]);

  const user = useSelector((state) => state.auth.user);
  const [deletePlant] = useDeletePlantMutation();

  const {
    data: plants = [],
    isLoading: plantsLoading,
    error: plantsError
  } = useGetCompanyPlantsQuery(user?.company_id, {
    skip: !user?.company_id,
  });

  const handleDeletePlant = async (plantId) => {
    try {
      await deletePlant(plantId).unwrap();
      toast.success('Plant deleted successfully');
      setDeleteConfirmation({ isOpen: false, plantId: null });
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to delete plant');
      console.error('Failed to delete plant:', error);
      setDeleteConfirmation({ isOpen: false, plantId: null });
    }
  };

  const handleDeleteClick = (plantId) => {
    setDeleteConfirmation({ isOpen: true, plantId });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ isOpen: false, plantId: null });
  };

  const handleManagePlant = (plantId) => {
    setSelectedPlantId(plantId);
    setIsEmployeeModalOpen(true);
  };

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
            onClick={() => handleDeleteClick(params.row.id)}
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
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}>
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2341]"></div>
        </div>
      </div>
    );
  }

  if (plantsError) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
        onClick={onClose} // Close popup when clicking outside
      >
        <div
          className="bg-white rounded-xl p-8 relative"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition"
          >
            &times;
          </button>
          <div className="text-red-500">Error loading plants: {plantsError?.data?.message || 'Please try again later'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}>
      <div
        ref={popupRef}
        className="bg-white rounded-xl w-[95%] md:w-[90%] lg:w-[85%] max-w-[1200px] h-[90vh] overflow-auto p-3 sm:p-4 md:p-5 relative scrollbar-none border-1 border-[#1A2341]"
      >
        <Toaster position="top-right" />
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base sm:text-lg md:text-xl font-semibold text-[#1A2341]">Plant Management</h1>
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
                  placeholder="Search by plant name, code or address..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A2341] text-sm placeholder:text-gray-400"
                />
              </div>

              {/* Plant Type Filter */}
              <div className="w-full sm:w-[200px]">
                <select
                  value={filters.plant_type}
                  onChange={(e) => handleFilterChange("plant_type", e.target.value)}
                  className="w-full px-3 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A2341] text-sm"
                >
                  {plantTypeOptions.map((option) => (
                    <option key={option.value} value={option.value} className="text-gray-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Create Plant Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-[#1A2341] text-white rounded-md hover:bg-[#1A2341]/80 transition-all flex items-center justify-center sm:justify-start gap-2 text-sm"
            >
              <Plus size={16} />
              Create Plant
            </button>
          </div>
        </div>

        <div className="h-[calc(90vh-220px)] w-full">
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

        {/* Create Plant Modal */}
        <CreatePlantModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />

        {/* Employee Management Modal */}
        {isEmployeeModalOpen && (
          <EmployeeManagementModal
            plantId={selectedPlantId}
            onClose={() => {
              setIsEmployeeModalOpen(false);
              setSelectedPlantId(null);
            }}
          />
        )}

        {/* Centered Delete Confirmation Modal */}
        {deleteConfirmation.isOpen && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
            onClick={handleDeleteCancel}
          >
            <div
              className="bg-white rounded-xl p-6 max-w-md w-[90%] mx-4 shadow-2xl border-1 border-[#1A2341]"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the popup
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1A2341]">Delete Plant?</h3>
                    <p className="text-sm text-gray-600">This action cannot be undone.</p>
                  </div>
                </div>

                <p className="text-gray-700">
                  Are you sure you want to delete this plant?
                </p>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleDeleteCancel}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => handleDeletePlant(deleteConfirmation.plantId)}
                    className="flex-1 px-4 py-2.5 bg-[#1A2341] text-white rounded-md hover:bg-[#1A2341]/90 transition-colors font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantManagementModal;