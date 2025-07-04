import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useSelector } from 'react-redux';
import {
  useGetCompanyPlantsQuery,
  useGetCompanyReportsQuery,
  useGetCommonFieldsQuery,
} from '../../src/store/api/apiSlice';
import Layout from '../../src/components/layout/Layout';
import Breadcrumb from '../components/Breadcrumb';
import SubHeader from '../components/SubHeader';
import { Building2, Factory, AlertCircle, Plus } from 'lucide-react';
import CreatePlantModal from '../../src/components/modals/CreatePlantModal';

/*
  NOTE: The previous version of this file accidentally duplicated the entire
  component implementation, which produced errors such as
  "Cannot redeclare block-scoped variable 'Plants'" and duplicate helper
  constants.  This cleaned-up version keeps just ONE implementation of every
  item while preserving all existing behaviour.  No unrelated code has been
  touched.
*/

const Plants = ({ renderBare = false, onPlantSelect = null }) => {
  /* ──────────────────────────── STATE & HOOKS ─────────────────────────── */
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Main Facilities');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const [searchParams] = useSearchParams();
  const currentFY = searchParams.get('financialYear') || '';

  // State to hold common fields globally in this component (or lift to context if needed)
  const [commonFields, setCommonFields] = useState(null);

  const {
    data: plants = [],
    isLoading: plantsLoading,
    error: plantsError,
  } = useGetCompanyPlantsQuery(user?.company_id, {
    skip: !user?.company_id,
  });

  // Fetch common fields for the company and current financial year (plant_id is optional/null)
  const {
    data: fetchedCommonFields,
    isLoading: commonFieldsLoading,
    error: commonFieldsError,
  } = useGetCommonFieldsQuery(
    { plant_id: '', financial_year: currentFY },
    { skip: !user?.company_id || !currentFY }
  );

  // Save to state when fetched (even if empty array)
  useEffect(() => {
    setCommonFields(fetchedCommonFields);
    console.log('[Plants.jsx] fetchedCommonFields:', fetchedCommonFields);
  }, [fetchedCommonFields]);

  // Extract turnover from commonFields (company-wide)
  let turnover = undefined;
  if (Array.isArray(commonFields) && commonFields.length > 0) {
    turnover = commonFields[0]?.financials?.turnover;
  } else if (commonFields && typeof commonFields === 'object') {
    turnover = commonFields.financials?.turnover;
  }
  console.log('[Plants.jsx] extracted turnover:', turnover);

  // Skip fetching reports until we have a company ID
  const { data: environmentReports = [] } = useGetCompanyReportsQuery(undefined, {
    skip: true // We'll fetch reports when a specific plant is selected
  });

  // You can now use `commonFields` anywhere in this component or pass it to context/provider
  // Example: const turnover = commonFields?.[0]?.financials?.turnover;

  /* ────────────────────────────── HELPERS ─────────────────────────────── */
  const tabs = ['Main Facilities', 'Other Plants'];

  const mainPlants = plants.filter(
    (plant) => plant.plant_code === 'C001' || plant.plant_code === 'P001'
  );
  const otherPlants = plants.filter(
    (plant) => plant.plant_code !== 'C001' && plant.plant_code !== 'P001'
  );

  const handlePlantClick = (plantId) => {
    if (typeof onPlantSelect === 'function') {
      onPlantSelect(plantId, environmentReports, plants.find((p) => p.id === plantId));
      return;
    }
    navigate(`/environment/${plantId}?financialYear=${currentFY}`, {
      state: {
        plantId,
        environmentReports,
        selectedPlant: plants.find((p) => p.id === plantId),
        renderBare: true,
      },
    });
  };

  /* ────────────────────────── SMALL COMPONENTS ────────────────────────── */
  const CreatePlantCard = () => (
    <div
      onClick={() => setIsModalOpen(true)}
      className="cursor-pointer rounded-lg p-6 bg-gray-100 hover:bg-gray-200 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 flex flex-col items-center justify-center gap-4 text-gray-600 border-2 border-dashed border-gray-300"
    >
      <Plus className="w-12 h-12" />
      <span className="text-lg font-semibold">Create New Plant</span>
    </div>
  );

  const PlantCard = ({ plant }) => (
    <div
      onClick={() => handlePlantClick(plant.id)}
      className={`cursor-pointer rounded-lg p-6 ${
        plant.plant_code === 'C001' ? 'bg-[#20305D]' : 'bg-[#000D30]'
      } hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 flex flex-col gap-4 text-white`}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">{plant.plant_name}</span>
        {plant.plant_code === 'C001' ? (
          <Building2 className="w-6 h-6" />
        ) : (
          <Factory className="w-6 h-6" />
        )}
      </div>
      <div className="text-sm opacity-80">Plant Code: {plant.plant_code}</div>
      <div className="text-sm opacity-80">Plant Type: {plant.plant_type}</div>
    </div>
  );

  const ErrorMessage = () => (
    <div className="flex flex-col items-center justify-center h-64 text-red-500">
      <AlertCircle className="w-12 h-12 mb-2" />
      <p className="text-lg font-medium">Error loading plants</p>
      <p className="text-sm opacity-75">
        {plantsError?.data?.message || 'Please try again later'}
      </p>
    </div>
  );

  const EmptyState = ({ type }) => (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
      <Factory className="w-12 h-12 mb-2 opacity-50" />
      <p className="text-lg font-medium">No {type} Found</p>
      <p className="text-sm opacity-75">
        There are no plants to display in this category.
      </p>
    </div>
  );

  /* ──────────────────────────── RENDERING ─────────────────────────────── */
  // Height of header (Breadcrumb + SubHeader) for sticky offset
  const Content = (
    <div className="module-layout min-h-screen w-[98%] relative flex flex-col">
      {/* Sticky Header Container (not fixed, so it stays within content area) */}
      <div className="sticky top-0 z-30 bg-white">
        <div className="mb-4 px-2 md:px-3 pt-4">
          <Breadcrumb section="Environment" activeTab="Plants" />
        </div>
        <div className="mx-2 pb-4">
          <SubHeader
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1">
        <div className="mt-4 mx-2 w-[99%]">
          <div className="mt-4">
            {plantsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#000D30]" />
              </div>
            ) : plantsError ? (
              <ErrorMessage />
            ) : (
              <div className="space-y-8">
                {activeTab === 'Main Facilities' ? (
                  mainPlants.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {mainPlants.map((plant) => (
                        <PlantCard key={plant.id} plant={plant} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState type="Main Facilities" />
                  )
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <CreatePlantCard />
                    {otherPlants.map((plant) => (
                      <PlantCard key={plant.id} plant={plant} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Using our reusable CreatePlantModal component */}
      <CreatePlantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );

  if (renderBare) return <>{Content}</>;

  return <Layout>{Content}</Layout>;
};

export default Plants;
