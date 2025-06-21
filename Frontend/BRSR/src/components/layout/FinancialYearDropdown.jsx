import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";

// Export a hook to get the current financial year
export function useCurrentFinancialYear() {
  const [searchParams] = useSearchParams();
  return searchParams.get("financialYear") || "";
}

// Accept company as a prop
const FinancialYearDropdown = ({ company }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFY = searchParams.get("financialYear") || "";
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Use company.financialYear if available, else fallback to empty array
  const financialYears = useMemo(() => {
    if (company && company.financialYear) {
      return [company.financialYear];
    }
    return [];
  }, [company]);

  // Set the latest financial year by default if none is selected
  useEffect(() => {
    if (!currentFY && financialYears.length > 0) {
      searchParams.set("financialYear", financialYears[0]);
      setSearchParams(searchParams, { replace: true });
    }
  }, [currentFY, financialYears, searchParams, setSearchParams]);

  const handleSelect = (fy) => {
    searchParams.set("financialYear", fy);
    setSearchParams(searchParams, { replace: true });
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center gap-2 text-sm border border-white rounded-md px-2 py-1 bg-[#000D30] text-white hover:scale-102 hover:bg-[#001A60] transition-transform transition-colors duration-300"
      >
        {currentFY || financialYears[0] || "Financial Year"}
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
