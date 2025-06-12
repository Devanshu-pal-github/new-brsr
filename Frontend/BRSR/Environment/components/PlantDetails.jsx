import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumb from './Breadcrumb';
import SubHeader from './SubHeader';
import Layout from '../../src/components/layout/Layout';

const PlantDetails = () => {
    const { plantId } = useParams();
    const [activeSubmodule, setActiveSubmodule] = useState('Energy Management');

    // Hardcoded module data
    const moduleData = {
        name: "Environment",
        submodules: [
            {
                name: "Energy Management",
                categories: [
                    {
                        name: "Energy Consumption",
                        id: "energy-consumption"
                    },
                    {
                        name: "Energy Efficiency Schemes",
                        id: "energy-efficiency"
                    }
                ]
            },
            {
                name: "Water Management",
                categories: [
                    {
                        name: "Water Usage",
                        id: "water-usage"
                    },
                    {
                        name: "Water Discharge",
                        id: "water-discharge"
                    }
                ]
            },
            {
                name: "Emissions Management",
                categories: [
                    {
                        name: "Air Emissions",
                        id: "air-emissions"
                    },
                    {
                        name: "Greenhouse Gas Emissions",
                        id: "ghg-emissions"
                    },
                    {
                        name: "Emission Reduction Initiatives",
                        id: "emission-reduction"
                    }
                ]
            },
            {
                name: "Waste Management",
                categories: [
                    {
                        name: "Waste Generation and Management",
                        id: "waste-management"
                    }
                ]
            },
            {
                name: "Environmental Compliance and Impact",
                categories: [
                    {
                        name: "Ecologically Sensitive Areas",
                        id: "sensitive-areas"
                    },
                    {
                        name: "Environmental Impact Assessments",
                        id: "eia"
                    },
                    {
                        name: "Regulatory Compliance",
                        id: "compliance"
                    }
                ]
            },
            {
                name: "Value Chain and Disaster Management",
                categories: [
                    {
                        name: "Value Chain Environmental Impact",
                        id: "value-chain"
                    },
                    {
                        name: "Business Continuity and Disaster Management",
                        id: "disaster-management"
                    }
                ]
            }
        ]
    };

    // Get current submodule
    const currentSubmodule = moduleData.submodules.find(
        submodule => submodule.name === activeSubmodule
    );

    return (
        <Layout>
        <div className="module-layout min-h-screen p-2 md:p-3">
            <div className="w-full">
                <div className="mb-4">
                    <Breadcrumb 
                        section={moduleData.name} 
                        activeTab={activeSubmodule} 
                    />
                </div>
            </div>

            <div className="mt-4 mx-2">
                <div className="w-full">
                    <div className="mb-4">
                        <SubHeader 
                            tabs={moduleData.submodules.map(sm => sm.name)} 
                            activeTab={activeSubmodule} 
                            onTabChange={setActiveSubmodule} 
                        />
                    </div>
                    <div className="mt-4">
                        {currentSubmodule && (
                            <div className="space-y-4">
                                {currentSubmodule.categories.map((category) => (
                                    <div 
                                        key={category.id}
                                        className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                                    >
                                        <h3 className="text-lg font-semibold text-[#000D30]">
                                            {category.name}
                                        </h3>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </Layout>
    );
};

export default PlantDetails; 