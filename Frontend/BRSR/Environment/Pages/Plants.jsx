import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetCompanyPlantsQuery, useGetCompanyReportsQuery , useCreatePlantMutation } from '../../src/store/api/apiSlice';
import Layout from '../../src/components/layout/Layout';
import Breadcrumb from '../components/Breadcrumb';
import SubHeader from '../components/SubHeader';
import { Building2, Factory, AlertCircle, Plus, X } from 'lucide-react';

const Plants = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Main Facilities');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'regular',
        address: '',
        contact_email: '',
        contact_phone: '',
        metadata: {}
    });
    
    const user = useSelector((state) => state.auth.user);
    const [createPlant, { isLoading: isCreating }] = useCreatePlantMutation();

    // Fetch plants using the API
    const { data: plants = [], isLoading: plantsLoading, error: plantsError } = useGetCompanyPlantsQuery(user?.company_id, {
        skip: !user?.company_id,
    });

    // Fetch environment reports
    const { data: environmentReports = [], isLoading: reportsLoading } = useGetCompanyReportsQuery();

    // Separate main plants (C001, P001) from other plants
    const mainPlants = plants.filter(plant => 
        plant.plant_code === 'C001' || plant.plant_code === 'P001'
    );

    const otherPlants = plants.filter(plant => 
        plant.plant_code !== 'C001' && plant.plant_code !== 'P001'
    );

    const handlePlantClick = (plantId) => {
        navigate(`/environment/${plantId}`, {
            state: {
                plantId,
                environmentReports,
                selectedPlant: plants.find(p => p.id === plantId)
            }
        });
    };

    const handleCreatePlant = async (formData) => {
        try {
            await createPlant({
                ...formData,
                company_id: user.company_id
            }).unwrap();
            setIsModalOpen(false);
            setFormData({
                name: '',
                code: '',
                type: 'regular',
                address: '',
                contact_email: '',
                contact_phone: '',
                metadata: {}
            });
        } catch (error) {
            console.error('Failed to create plant:', error);
        }
    };

    const CreatePlantCard = () => (
        <div
            onClick={() => setIsModalOpen(true)}
            className="cursor-pointer rounded-lg p-6 bg-gray-100 hover:bg-gray-200
                hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200
                flex flex-col items-center justify-center gap-4 text-gray-600 border-2 border-dashed border-gray-300
                min-h-[200px]"
        >
            <Plus className="w-12 h-12" />
            <span className="text-lg font-semibold">Create New Plant</span>
        </div>
    );

    const CreatePlantModal = () => (
        <div 
            className={`fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 transition-opacity duration-300 ${isModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsModalOpen(false)}
        >
            <div 
                className="bg-white rounded-lg p-6 w-full max-w-md transform transition-transform duration-300 scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Create New Plant</h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = {
                        name: e.target.plantName.value,
                        code: e.target.plantCode.value,
                        address: e.target.address.value,
                        contact_email: e.target.email.value,
                        contact_phone: e.target.phone.value
                    };
                    handleCreatePlant(formData);
                }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Plant Name</label>
                        <input
                            type="text"
                            name="plantName"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                            autoFocus={isModalOpen}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Plant Code</label>
                        <input
                            type="text"
                            name="plantCode"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <input
                            type="text"
                            name="address"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                        <input
                            type="email"
                            name="email"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                        <input
                            type="tel"
                            name="phone"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="px-4 py-2 text-sm font-medium text-white bg-[#20305D] rounded-md hover:bg-[#162442] disabled:opacity-50"
                        >
                            {isCreating ? 'Creating...' : 'Create Plant'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

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

    const ErrorMessage = () => (
        <div className="flex flex-col items-center justify-center h-64 text-red-500">
            <AlertCircle className="w-12 h-12 mb-2" />
            <p className="text-lg font-medium">Error loading plants</p>
            <p className="text-sm opacity-75">{plantsError?.data?.message || 'Please try again later'}</p>
        </div>
    );

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
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <CreatePlantCard />
                                            {otherPlants.map(plant => (
                                                <PlantCard key={plant.id} plant={plant} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <CreatePlantModal />
        </Layout>
    );
};

export default Plants; 