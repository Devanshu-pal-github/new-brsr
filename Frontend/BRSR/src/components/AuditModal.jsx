import React, { useState, useRef, useEffect, useMemo } from "react";
import { useGetAuditLogQuery } from '../store/api/apiSlice';
import { X, Search } from "lucide-react";
import { DataGrid } from "@mui/x-data-grid";

const AuditModal = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ action_type: "" });
  const popupRef = useRef(null);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const { data: auditData, isLoading: auditLoading, error: auditError } = useGetAuditLogQuery();

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const actionTypeOptions = useMemo(() => {
    if (!auditData?.actions) return [{ value: "", label: "All Actions" }];
    const types = [...new Set(auditData.actions.map(action => action.action))];
    return [
      { value: "", label: "All Actions" },
      ...types.map(type => ({ value: type, label: type }))
    ];
  }, [auditData]);

  const filteredRows = useMemo(() => {
    if (!auditData?.actions) return [];
    return auditData.actions.map((audit, index) => ({
      id: audit.target_id,
      serialNumber: index + 1,
      ...audit,
    })).filter(row => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        (row.action?.toLowerCase().includes(searchLower) || '') ||
        (row.user_role?.toLowerCase().includes(searchLower) || '') ||
        (row.target_id?.toLowerCase().includes(searchLower) || '');
      const matchesType = !filters.action_type || row.action === filters.action_type;
      return matchesSearch && matchesType;
    });
  }, [auditData, searchQuery, filters]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const columns = [
    {
      field: "serialNumber",
      headerName: "S.No.",
      flex: 0.5,
      renderCell: (params) => (
        <span className="text-sm text-gray-900">
          {params.value}
        </span>
      )
    },
    {
      field: "action",
      headerName: "Action Performed",
      flex: 1.2,
      renderCell: (params) => (
        <div className="flex items-center h-full w-full">
          <span className="text-sm font-medium text-gray-900">{params.value}</span>
        </div>
      )
    },
    {
      field: "user_role",
      headerName: "Performed By",
      flex: 0.8,
      renderCell: (params) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-[#2c3e50] to-[#1A2341] text-white">
          {params.value === 'c' ? 'Company' : params.value === 'a' ? 'Admin' : params.value}
        </span>
      )
    },
    {
      field: "target_id",
      headerName: "Target ID",
      flex: 1.2,
      renderCell: (params) => (
        <span className="text-sm text-gray-500 truncate" title={params.value}>
          {params.value}
        </span>
      )
    },
    {
      field: "performed_at",
      headerName: "Performed At",
      flex: 1,
      renderCell: (params) => (
        <span className="text-sm text-gray-900">
          {formatDate(params.value)}
        </span>
      )
    },
    {
      field: "details",
      headerName: "Details",
      flex: 1.2,
      renderCell: (params) => {
        const detailsStr = Object.entries(params.value)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        const truncatedDetails = detailsStr.length > 30 ? 
          detailsStr.substring(0, 30) + '...' : 
          detailsStr;
        
        return (
          <div className="flex items-center h-full w-full">
            <div className="text-sm text-gray-900 cursor-pointer truncate" title={detailsStr}>
              {truncatedDetails}
            </div>
          </div>
        );
      }
    }
  ];

  if (auditLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2341]"></div>
        </div>
      </div>
    );
  }

  if (auditError) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl p-8">
          <div className="text-red-500">Error loading audit log: {auditError?.data?.message || 'Please try again later'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        ref={popupRef}
        className="bg-white rounded-xl w-[95%] md:w-[90%] lg:w-[85%] max-w-[1200px] h-[90vh] overflow-auto p-3 sm:p-4 md:p-5 relative scrollbar-none"
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-base sm:text-lg md:text-xl font-semibold text-[#1A2341]">Audit Log</h1>
          <button
            onClick={onClose}
            className="text-[#1A2341] hover:text-[#1A2341]/50 transition-all cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mb-4 rounded-xl shadow-inner border border-slate-200/60 p-2 sm:p-3 md:p-4 w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
              {/* Search */}
              <div className="relative flex-1 w-full sm:min-w-[250px] sm:max-w-[400px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search by action or role..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A2341] text-sm placeholder:text-gray-400"
                />
              </div>

              {/* Action Type Filter */}
              <div className="w-full sm:w-[200px]">
                <select
                  value={filters.action_type}
                  onChange={(e) => handleFilterChange("action_type", e.target.value)}
                  className="w-full px-3 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A2341] text-sm"
                >
                  {actionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value} className="text-gray-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 'calc(90vh - 250px)', width: '100%' }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10]}
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
              border: "none",
              "& .MuiDataGrid-virtualScroller": {
                overflowX: "hidden"
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AuditModal; 