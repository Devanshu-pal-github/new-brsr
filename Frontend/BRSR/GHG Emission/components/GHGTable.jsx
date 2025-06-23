import React, { useState, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { GHG_TABLE_COLUMNS, GHG_CATEGORIES } from "../ghgConfig";
import { Search } from "lucide-react";

const GHGTable = ({ scope, rows }) => {
    // Category filter options
    const categoryOptions = useMemo(() => {
        const cats = GHG_CATEGORIES[scope] || [];
        return ["All", ...cats.map((cat) => cat.category_name)];
    }, [scope]);

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");

    // Dynamically generate columns from config
    const columns = useMemo(() =>
        GHG_TABLE_COLUMNS.map((col) => ({
            field: col.key,
            headerName: col.label,
            flex: 1,
            minWidth: 120,
            renderCell: (params) => (
                <span className="text-sm text-gray-900" title={params.value ? String(params.value) : ""}>
                    {String(params.value ?? "")}
                </span>
            ),
        })),
        []
    );

    // Filtered rows by category and search
    const filteredRows = useMemo(() => {
        let filtered = rows;
        if (categoryFilter !== "All") {
            filtered = filtered.filter((row) => row.category_name === categoryFilter);
        }
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter((row) =>
                columns.some((col) =>
                    String(row[col.field] ?? "").toLowerCase().includes(searchLower)
                )
            );
        }
        return filtered;
    }, [rows, columns, search, categoryFilter]);

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row items-center mb-3 gap-2 md:gap-4">
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A2341] text-sm placeholder:text-gray-400"
                    />
                </div>
                <div className="w-full max-w-xs">
                    <select
                        className="w-full px-3 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A2341] text-sm"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        {categoryOptions.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div
                className="w-full responsive-ghg-table"
                style={{ minHeight: 200, maxHeight: '60vh', height: 'auto' }}
            >
                <DataGrid
                    rows={filteredRows}
                    columns={columns}
                    pageSize={10}
                    rowsPerPageOptions={[10]}
                    disableRowSelectionOnClick
                    hideFooter
                    sx={{
                        fontSize: "0.95rem",
                        backgroundColor: "#F5F6FA",
                        border: "1.5px solid #d1d5db",
                        borderRadius: "10px",
                        ".MuiDataGrid-columnHeaders": {
                            backgroundColor: "#E5E7EB",
                            color: "#1A2341",
                            fontWeight: "bold",
                        },
                        ".MuiDataGrid-cell": { alignItems: "center" },
                        "& .MuiDataGrid-virtualScroller": {
                            overflowX: "hidden",
                            scrollbarWidth: "none",
                            msOverflowStyle: "none"
                        },
                        "& .MuiDataGrid-virtualScroller::-webkit-scrollbar": {
                            display: "none"
                        }
                    }}
                />
            </div>
            <style jsx global>{`
              .responsive-ghg-table {
                min-height: 200px;
                max-height: 60vh;
                height: auto;
                overflow: auto;
              }
              .responsive-ghg-table::-webkit-scrollbar {
                display: none;
              }
              .responsive-ghg-table {
                scrollbar-width: none;
                -ms-overflow-style: none;
              }
            `}</style>
        </div>
    );
};

export default GHGTable;
