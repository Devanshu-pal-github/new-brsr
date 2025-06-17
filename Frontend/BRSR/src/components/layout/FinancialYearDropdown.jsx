import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useGetCompanyReportsQuery } from "../../store/api/apiSlice";

// Financial years will be derived dynamically from backend reports

const FinancialYearDropdown = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFY = searchParams.get("financialYear") || "";
  const [open, setOpen] = useState(false);

  // Fetch company reports to derive available financial years dynamically
  const { data: reports = [] } = useGetCompanyReportsQuery();

  const financialYears = useMemo(() => {
    const years = reports
      .map((r) => r.financial_year || r.financialYear || r.year)
      .filter(Boolean);

    // Return unique years sorted descending (latest first)
    return [...new Set(years)].sort().reverse();
  }, [reports]);

  const handleSelect = (fy) => {
    searchParams.set("financialYear", fy);
    setSearchParams(searchParams, { replace: true });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium hover:opacity-80"
      >
        {currentFY || "Financial Year"}
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <ul className="absolute mt-2 bg-[#000D30] border border-gray-700 rounded-md shadow-lg w-36 text-sm z-50">
          {financialYears.map((fy) => (
            <li
              key={fy}
              onClick={() => handleSelect(fy)}
              className={`px-4 py-2 cursor-pointer hover:bg-[#20305D] transition-colors ${
                fy === currentFY ? "bg-[#20305D]" : ""
              }`}
            >
              {fy}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FinancialYearDropdown;
