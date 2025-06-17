import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCreateEmployeeMutation } from '../../store/api/apiSlice';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  { value: 'plant_admin', label: 'Plant Admin' }
];

const CreateEmployeeModal = ({ isOpen, onClose, plantId }) => {
  const [createEmployee, { isLoading: isCreating }] = useCreateEmployeeMutation();
  const modalRef = useRef(null);
  
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
  
  if (!isOpen) return null;

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    
    // Validate password
    const password = e.target.password.value;
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    const formData = {
      email: e.target.email.value,
      full_name: e.target.fullName.value,
      password: password,
      role: e.target.role.value,
      plant_id: plantId  // Backend will get company_id from token
    };

    try {
      await createEmployee(formData).unwrap();
      toast.success('Employee created successfully');
      onClose();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to create employee');
      console.error('Failed to create employee:', error);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-[99999] transition-opacity duration-300 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg p-8 w-full max-w-xl transform transition-transform duration-300 scale-100"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Create New Employee</h2>
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
        
        <form onSubmit={handleCreateEmployee} className="space-y-6" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              name="fullName"
              placeholder="Enter employee's full name"
              className="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter employee's email address"
              className="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Minimum 6 characters required"
              className="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
              required
              minLength={6}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              name="role"
              className="mt-1 block w-full px-4 py-3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
              required
              defaultValue="plant_admin"
            >
              {ROLE_OPTIONS.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-6 py-2.5 text-sm font-medium text-white bg-[#20305D] rounded-md hover:bg-[#162442] disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEmployeeModal; 