import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetCompanyPlantsQuery, useGetCompanyReportsQuery } from '../../src/store/api/apiSlice';
import Layout from '../../src/components/layout/Layout';
import Breadcrumb from '../components/Breadcrumb';
import SubHeader from '../components/SubHeader';
import { Building2, Factory, AlertCircle } from 'lucide-react';

const Plants = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Main Facilities');
    const user = useSelector((state) => state.auth.user);

    // Fetch plants using the API
    const { data: plants = [], isLoading: plantsLoading, error: plantsError } = useGetCompanyPlantsQuery(user?.company_id, {
        skip: !user?.company_id,
    });

    // Fetch environment reports
    const { data: environmentReports = [], isLoading: reportsLoading } = useGetCompanyReportsQuery();

    console.log("plants", plants);
    console.log("environment reports", environmentReports);

    // Separate main plants (C001, P001) from other plants
    const mainPlants = plants.filter(plant => 
        plant.plant_code === 'C001' || plant.plant_code === 'P001'
    );

    const otherPlants = plants.filter(plant => 
        plant.plant_code !== 'C001' && plant.plant_code !== 'P001'
    );

    const handlePlantClick = (plantId) => {
        // Navigate to environment content with plant ID and reports
        navigate(`/environment/${plantId}`, {
            state: {
                plantId,
                environmentReports,
                selectedPlant: plants.find(p => p.id === plantId)
            }
        });
    };

    const PlantCard = ({ plant }) => (
        <div
            onClick={() => handlePlantClick(plant.id)}
            className={`
                cursor-pointer rounded-lg p-6 
                ${plant.plant_code === 'C001' ? 'bg-[#20305D]' : 'bg-[#000D30]'}
                hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200
                flex flex-col gap-4 text-white
            `}
        >
            <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{plant.plant_name}</span>
                {plant.plant_code === 'C001' ? (
                    <Building2 className="w-6 h-6" />
                ) : (
                    <Factory className="w-6 h-6" />
                )}
            </div>
            <div className="text-sm opacity-80">
                Plant Code: {plant.plant_code}
            </div>
            <div className="text-sm opacity-80">
                Plant Type: {plant.plant_type}
            </div>
            <div className="text-sm opacity-80">
                Access Level: {plant.access_level}
            </div>
        </div>
    );

    const tabs = ['Main Facilities', 'Other Plants'];

    // Error component
    const ErrorMessage = () => (
        <div className="flex flex-col items-center justify-center h-64 text-red-500">
            <AlertCircle className="w-12 h-12 mb-2" />
            <p className="text-lg font-medium">Error loading plants</p>
            <p className="text-sm opacity-75">{plantsError?.data?.message || 'Please try again later'}</p>
        </div>
    );

    // Empty state component
    const EmptyState = ({ type }) => (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Factory className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-lg font-medium">No {type} Found</p>
            <p className="text-sm opacity-75">There are no plants to display in this category.</p>
        </div>
    );

    return (
        <Layout>
            <div className="module-layout min-h-screen p-2 md:p-3">
                <div className="w-full">
                    <div className="mb-4">
                        <Breadcrumb 
                            section="Environment" 
                            activeTab="Plants"
                        />
                    </div>
                </div>

                <div className="mt-4 mx-2">
                    <div className="w-full">
                        <div className="mb-4">
                            <SubHeader 
                                tabs={tabs}
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                            />
                        </div>
                        
                        <div className="mt-4">
                            {plantsLoading ? (
                                <div className="flex justify-center items-center h-64">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#000D30]"></div>
                                </div>
                            ) : plantsError ? (
                                <ErrorMessage />
                            ) : (
                                <div className="space-y-8">
                                    {activeTab === 'Main Facilities' ? (
                                        mainPlants.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {mainPlants.map(plant => (
                                                    <PlantCard key={plant.id} plant={plant} />
                                                ))}
                                            </div>
                                        ) : (
                                            <EmptyState type="Main Facilities" />
                                        )
                                    ) : (
                                        otherPlants.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {otherPlants.map(plant => (
                                                    <PlantCard key={plant.id} plant={plant} />
                                                ))}
                                            </div>
                                        ) : (
                                            <EmptyState type="Other Plants" />
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Plants; 