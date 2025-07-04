import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import { Building, MapPin, Users, Calendar } from 'lucide-react';
import { useGetCompanyPlantsQuery, useGetCommonFieldsQuery } from '../store/api/apiSlice';
import EnvironmentContent from '../../Environment/components/EnvironmentContent';

const PlantsPage = ({ moduleId }) => {
    const navigate = useNavigate();
    const user = useSelector(selectCurrentUser);

    console.log('PlantsPage moduleId:', moduleId);

    const { 
        data: plants = [], 
        isLoading, 
        error 
    } = useGetCompanyPlantsQuery(user?.company_id, {
        skip: !user?.company_id
    });

    // Fetch turnover for energy intensity calculations
    const currentFY = localStorage.getItem('financial_year');
    const { data: commonFields } = useGetCommonFieldsQuery(
        { plant_id: '', financial_year: currentFY },
        { skip: !currentFY }
    );
    const turnover = commonFields?.financials?.turnover;
    console.log('[PlantsPage] fetched turnover:', turnover);

    console.log("plants", plants); 

    const LoadingState = () => (
        <div className="flex-1 p-8">
            <div className="text-center text-gray-600">Loading plants...</div>
        </div>
    );

    const ErrorState = () => (
        <div className="flex-1 p-8">
            <div className="text-center text-red-600">Error: {error?.data?.detail || 'Failed to fetch plants'}</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="flex">

                {/* Main Content */}
                <div className="flex-1">
                    {isLoading ? (
                        <LoadingState />
                    ) : error ? (
                        <ErrorState />
                    ) : (
                        <div className="p-8">
                            <div className="max-w-7xl mx-auto">
                                <div className="flex justify-between items-center mb-8">
                                    <h1 className="text-2xl font-bold text-gray-800">
                                        {moduleId === 'environment' ? 'Environment' : 'Plants'}
                                    </h1>
                                    <div className="text-sm text-gray-500">
                                        Module: {moduleId === 'environment' ? 'Environment' : 'Plants'}
                                    </div>
                                </div>

                                {moduleId === 'environment' ? (
                                    <EnvironmentContent turnover={turnover} />
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {plants.map((plant) => (
                                            <div
                                                key={plant.id}
                                                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
                                            >
                                                <div className="p-6">
                                                    <div className="flex items-center mb-4">
                                                        <Building className="w-6 h-6 text-[#20305D] mr-3" />
                                                        <h3 className="text-lg font-semibold text-gray-800">
                                                            {plant.plant_name}
                                                        </h3>
                                                    </div>
                                                    <div className="text-sm text-gray-600 mb-4">
                                                        Plant Code: {plant.plant_code}
                                                    </div>
                                                    <div className="mt-6">
                                                        <button
                                                            onClick={() => navigate(`/plants/${plant.id}/details`)}
                                                            className="w-full bg-[#000D30] hover:bg-[#20305D] text-white py-2 px-4 rounded-md transition-colors duration-300"
                                                        >
                                                            View Details
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlantsPage;