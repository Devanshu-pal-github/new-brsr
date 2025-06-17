import React, { useState, useRef } from "react";
import { useSelector } from "react-redux";
import {
  useDeletePlantMutation,
  useCreatePlantMutation,
  useGetCompanyPlantsQuery,
} from "../../store/api/apiSlice";
import { X, Plus, Trash2, Search } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { DataGrid } from "@mui/x-data-grid";
import Select from "react-select";
import EmployeeManagementModal from "./EmployeeManagementModal";

/* -------------------------------------------------------------------------- */
/*                             Create Plant Modal                             */
/* -------------------------------------------------------------------------- */

export const CreatePlantModal = ({ isOpen, onClose }) => {
  const user = useSelector((state) => state.auth.user);
  const [createPlant, { isLoading: isCreating }] = useCreatePlantMutation();
  const modalRef = useRef(null);



  const handleCreatePlant = async (e) => {
    e.preventDefault();
    const formData = {
      name: e.target.plantName.value,
      code: e.target.plantCode.value,
      type: "regular",
      address: e.target.address.value,
      contact_email: e.target.email.value,
      contact_phone: e.target.phone.value,
      company_id: user.company_id,
      metadata: {},
    };

    try {
      await createPlant(formData).unwrap();
      toast.success("Plant created successfully");
      onClose();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to create plant");
      /* eslint-disable-next-line no-console */
      console.error("Failed to create plant:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[9999] transition-opacity duration-300">
      <div
        ref={modalRef}
        className="bg-white rounded-lg p-6 w-full max-w-lg transform transition-transform duration-300 scale-100"
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold">Create New Plant</h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleCreatePlant} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Plant Name
            </label>
            <input
              type="text"
              name="plantName"
              placeholder="Enter plant name"
              className="mt-1 block w-full px-3 py-2.5 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Plant Code
            </label>
            <input
              type="text"
              name="plantCode"
              placeholder="Enter unique plant code"
              className="mt-1 block w-full px-3 py-2.5 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Address
            </label>
            <input
              type="text"
              name="address"
              placeholder="Enter plant address"
              className="mt-1 block w-full px-3 py-2.5 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter contact email"
                className="mt-1 block w-full px-3 py-2.5 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone
              </label>
              <input
                type="text"
                name="phone"
                placeholder="Enter contact phone"
                className="mt-1 block w-full px-3 py-2.5 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
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
              {isCreating ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                         Plant Management Main Modal                        */
/* -------------------------------------------------------------------------- */

const PlantManagementModal = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ plant_type: "" });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const popupRef = useRef(null);

  const user = useSelector((state) => state.auth.user);
  const [deletePlant] = useDeletePlantMutation();

  const { data: plants = [] } = useGetCompanyPlantsQuery(user?.company_id, {
    skip: !user?.company_id,
  });

  const handleDeletePlant = async (plantId) => {
    try {
      await deletePlant(plantId).unwrap();
      toast.success("Plant deleted successfully");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete plant");
    }
  };

  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "plant_name", headerName: "Name", width: 200 },
    { field: "plant_code", headerName: "Code", width: 120 },
    { field: "plant_type", headerName: "Type", width: 120 },
    {
      field: "actions",
      headerName: "Actions",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="flex items-center justify-center w-full h-full gap-3">
          <button
            onClick={(e) => { e.stopPropagation();
              toast((t) => (
                <div className="flex flex-col gap-2">
                  <p className="font-medium">Delete Plant?</p>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete this plant?
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation();
                        handleDeletePlant(params.row.id);
                        toast.dismiss(t.id);
                      }}
                      className="bg-red-600 text-white px-3 py-1 text-sm rounded-md hover:bg-red-700 transition"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="bg-gray-300 text-gray-700 px-3 py-1 text-sm rounded-md hover:bg-gray-400 transition"
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
            onClick={(e) => { e.stopPropagation();
              setSelectedPlantId(params.row.id);
              setIsEmployeeModalOpen(true);
            }}
            className="bg-[#1A2341] text-white px-3 py-1.5 text-sm rounded-md hover:bg-[#1A2341]/80 transition cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            Manage
          </button>
        </div>
      ),
    },
  ];

  const filteredRows = plants.filter((plant) => {
    const matchesSearch = plant.plant_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType =
      !filters.plant_type || plant.plant_type === filters.plant_type;
    return matchesSearch && matchesType;
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
      <div
        ref={popupRef}
        className="bg-white rounded-lg shadow-lg max-w-3xl w-full h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Manage Plants</h2>
          <button onClick={onClose} className="hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-6 overflow-auto flex flex-col gap-4">
          <div className="flex justify-between items-center mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by plant name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md focus:ring-[#1A2341] focus:border-[#1A2341] w-72 text-sm"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[#1A2341] text-white flex items-center gap-1.5 px-4 py-2 text-sm rounded-md hover:bg-[#1A2341]/80 transition"
              >
                <Plus size={14} />
                Add Plant
              </button>
              <div className="w-48">
                <Select
                  options={[
                    { value: "", label: "All Types" },
                    { value: "regular", label: "Regular" },
                    { value: "main", label: "Main" },
                  ]}
                  value={[
                    { value: filters.plant_type, label: filters.plant_type || "All Types" },
                  ]}
                  onChange={(selected) =>
                    setFilters((prev) => ({
                      ...prev,
                      plant_type: selected.value,
                    }))
                  }
                  classNamePrefix="react-select"
                />
              </div>
            </div>
          </div>
          {/* DataGrid */}
          <div className="flex-1 min-h-0">
            <DataGrid
              rows={filteredRows}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              autoHeight={false}
              className="!text-sm"
            />
          </div>
        </div>
      </div>

      {/* local toaster to ensure toast is above modal overlay */}
      <Toaster
        position="top-center"
        toastOptions={{ className: "z-[99999]" }}
      />

      {/* nested create plant modal */}
      <CreatePlantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* nested employee management */}
      {isEmployeeModalOpen && (
        <EmployeeManagementModal
          plantId={selectedPlantId}
          onClose={() => setIsEmployeeModalOpen(false)}
        />
      )}
    </div>
  );
};

export default PlantManagementModal;
