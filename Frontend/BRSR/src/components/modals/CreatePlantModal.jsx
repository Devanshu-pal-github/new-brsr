import React, { useRef, useEffect } from 'react';
import { useSelector } from "react-redux";
import { useCreatePlantMutation } from "../../store/api/apiSlice";
import { X } from "lucide-react";
import toast from "react-hot-toast";

const CreatePlantModal = ({ isOpen, onClose }) => {
  const user = useSelector((state) => state.auth.user);
  const [createPlant, { isLoading: isCreating }] = useCreatePlantMutation();
  const modalRef = useRef(null);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}>
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-[80%] md:w-[70%] lg:w-[60%] max-w-[800px] max-h-[90vh] h-auto overflow-y-auto p-3 sm:p-4 md:p-5 relative scrollbar-none"
        style={{ boxShadow: '0 8px 32px rgba(26,35,65,0.18), 0 2px 8px rgba(0,0,0,0.10)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-[#1A2341]">Create New Plant</h2>
          <button
            onClick={onClose}
            className="text-[#1A2341] hover:text-[#1A2341]/50 transition-all cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mb-4 rounded-xl shadow-inner border border-slate-200/60 p-4 sm:p-5">
          <form onSubmit={handleCreatePlant} className="max-w-3xl mx-auto space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Plant Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="plantName"
                  placeholder="Enter plant name (e.g., Main Manufacturing Unit)"
                  className="mt-1 block w-full px-3 py-2.5 bg-white text-gray-900 rounded-md border border-gray-300 shadow-sm focus:border-[#1A2341] focus:ring-2 focus:ring-[#1A2341]/20 text-sm placeholder:text-gray-400"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Plant Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="plantCode"
                  placeholder="Enter unique plant code (e.g., PLT001)"
                  className="mt-1 block w-full px-3 py-2.5 bg-white text-gray-900 rounded-md border border-gray-300 shadow-sm focus:border-[#1A2341] focus:ring-2 focus:ring-[#1A2341]/20 text-sm placeholder:text-gray-400"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="Enter complete plant address"
                  className="mt-1 block w-full px-3 py-2.5 bg-white text-gray-900 rounded-md border border-gray-300 shadow-sm focus:border-[#1A2341] focus:ring-2 focus:ring-[#1A2341]/20 text-sm placeholder:text-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="plant@company.com"
                  className="mt-1 block w-full px-3 py-2.5 bg-white text-gray-900 rounded-md border border-gray-300 shadow-sm focus:border-[#1A2341] focus:ring-2 focus:ring-[#1A2341]/20 text-sm placeholder:text-gray-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  placeholder="+91 XXXXX XXXXX"
                  className="mt-1 block w-full px-3 py-2.5 bg-white text-gray-900 rounded-md border border-gray-300 shadow-sm focus:border-[#1A2341] focus:ring-2 focus:ring-[#1A2341]/20 text-sm placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 text-sm font-medium text-white bg-[#1A2341] rounded-md hover:bg-[#1A2341]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#1A2341]/20"
              >
                {isCreating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Creating...
                  </div>
                ) : (
                  "Create Plant"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePlantModal; 