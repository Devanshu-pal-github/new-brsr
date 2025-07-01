import React, { useState, useMemo, useEffect } from "react";
import SubHeader from "../../Environment/components/SubHeader";
import Breadcrumb from "../../Environment/components/Breadcrumb";
import { GHG_SCOPES, GHG_CATEGORIES } from "../../GHG Emission/ghgConfig";
import GHGTable from "../components/GHGTable";
import GHGAddModal from "../components/GHGAddModal";
import { useSelector } from "react-redux";
import { useLazyGetGHGReportQuery, useUpsertGHGReportMutation } from "../../src/store/api/apiSlice";
import { useSearchParams } from "react-router-dom";

const GHGMainPage = ({ hideBreadcrumb = false, smallSubHeader = false, plantId: propPlantId, financialYear: propFinancialYear, tableHeight = '60vh', onTotalCO2e }) => {
  const [activeScope, setActiveScope] = useState(GHG_SCOPES[0]);
  const [addOpen, setAddOpen] = useState(false);
  const [ghgData, setGhgData] = useState({ "Scope 1": [], "Scope 2": [], "Scope 3": [] });
  const [reportMeta, setReportMeta] = useState({});

  // Use propPlantId/propFinancialYear if provided (for popup), else fallback to redux/searchParams
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFY = searchParams.get("financialYear") || "";
  const companyId = useSelector((state) => state.auth.companyId);
  const plantId = propPlantId || useSelector((state) => state.selectedPlant?.id || null);
  const financialYear = propFinancialYear || currentFY || "2024-2025";

  // API hooks
  const [getGHGReport, { data: fetchedReport }] = useLazyGetGHGReportQuery();
  const [upsertGHGReport] = useUpsertGHGReportMutation();

  // Fetch report on mount/scope/plant/year change
  useEffect(() => {
    if (financialYear && activeScope) {
      getGHGReport({ financial_year: financialYear, plant_id: plantId, scope: activeScope });
    }
  }, [financialYear, plantId, activeScope, getGHGReport]);

  // Update table data when fetched
  useEffect(() => {
    if (fetchedReport && fetchedReport.categories) {
      // Flatten categories/subcategories for table
      let id = 0;
      const rows = fetchedReport.categories.flatMap((cat) =>
        (cat.subcategories || []).map((sub) => ({
          id: `${cat.category_name}-${sub.subcategory_name}-${id++}`,
          category_name: cat.category_name,
          ...sub,
        }))
      );
      setGhgData((prev) => ({ ...prev, [activeScope]: rows }));
      setReportMeta((prev) => ({ ...prev, [activeScope]: fetchedReport }));
      if (onTotalCO2e) onTotalCO2e(fetchedReport.total_scope_emissions_co2e || 0);
    } else {
      setGhgData((prev) => ({ ...prev, [activeScope]: [] }));
      setReportMeta((prev) => ({ ...prev, [activeScope]: null }));
      if (onTotalCO2e) onTotalCO2e(0);
    }
  }, [fetchedReport, activeScope, onTotalCO2e]);

  // Add new entry handler
  const handleAdd = async (entry) => {
    // Ensure all required fields are present and correct types
    const numericEntry = {
      ...entry,
      quantity: entry.quantity !== undefined ? Number(entry.quantity) : undefined,
      emission_factor: entry.emission_factor !== undefined ? Number(entry.emission_factor) : undefined,
      emissions_co2e: entry.emissions_co2e !== undefined ? Number(entry.emissions_co2e) : undefined,
    };
    const prevReport = reportMeta[activeScope] || {
      company_id: companyId,
      plant_id: plantId,
      financial_year: financialYear,
      scope: activeScope,
      categories: [],
      total_scope_emissions_co2e: 0,
    };
    let categories = [...(prevReport.categories || [])];
    let catIdx = categories.findIndex((c) => c.category_name === numericEntry.category_name);
    if (catIdx === -1) {
      categories.push({
        category_name: numericEntry.category_name,
        subcategories: [numericEntry],
        total_category_emissions_co2e: numericEntry.emissions_co2e || 0,
      });
    } else {
      categories[catIdx] = {
        ...categories[catIdx],
        subcategories: [...(categories[catIdx].subcategories || []), numericEntry],
        total_category_emissions_co2e:
          (categories[catIdx].total_category_emissions_co2e || 0) + (numericEntry.emissions_co2e || 0),
      };
    }
    // Always recalculate total_scope_emissions_co2e
    const total_scope_emissions_co2e = categories.reduce(
      (sum, cat) => sum + (cat.total_category_emissions_co2e || 0),
      0
    );
    const upsertPayload = {
      ...prevReport,
      company_id: companyId,
      plant_id: plantId,
      financial_year: financialYear,
      scope: activeScope,
      categories,
      total_scope_emissions_co2e,
    };
    await upsertGHGReport(upsertPayload);
    // Refetch after upsert
    getGHGReport({ financial_year: financialYear, plant_id: plantId, scope: activeScope });
  };

  return (
    <div className="min-w-full h-full overflow-hidden flex flex-col">
      {/* Breadcrumb for GHG > Scope - Fixed */}
      {!hideBreadcrumb && (
        <div className="mb-4 flex-shrink-0">
          <Breadcrumb section="GHG Emission" activeTab={activeScope} />
        </div>
      )}
      
      {/* SubHeader for Scope 1, 2, 3 - Fixed */}
      <div className={`mb-6 mt-4 flex-shrink-0${smallSubHeader ? ' scale-100' : ''}`}>
        <SubHeader
          tabs={GHG_SCOPES}
          activeTab={activeScope}
          onTabChange={setActiveScope}
        />
      </div>
      
      {/* Header with title and Add button - Fixed */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="text-lg font-semibold">
          {activeScope}
          {reportMeta[activeScope]?.total_scope_emissions_co2e !== undefined && (
            <span className="ml-4 text-base font-semibold text-[#1A2341]">
              {/* (Total CO₂e: {reportMeta[activeScope].total_scope_emissions_co2e.toLocaleString()}) */}
            </span>
          )}
        </div>
        <button
          className="bg-[#1A2341] text-white px-4 py-2 rounded hover:bg-[#2c3e50]"
          onClick={() => setAddOpen(true)}
        >
          + Add
        </button>
      </div>
      
      {/* Table container - Scrollable with hidden scrollbar */}
      <div className="flex-1 bg-white rounded shadow p-4 overflow-hidden">
        <div 
          className="h-full overflow-y-auto scrollbar-hide"
          style={{
            scrollbarWidth: 'none', /* Firefox */
            msOverflowStyle: 'none', /* Internet Explorer 10+ */
          }}
        >
          <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none; /* Safari and Chrome */
            }
          `}</style>
          <GHGTable scope={activeScope} rows={ghgData[activeScope]} />
        </div>
      </div>
      
      <GHGAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
        scope={activeScope}
      />
    </div>
  );
};

export default GHGMainPage;