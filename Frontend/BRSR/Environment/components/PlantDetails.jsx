import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumb from './Breadcrumb';
import SubHeader from './SubHeader';
import Layout from '../../src/components/layout/Layout';
import QuestionCategory from './QuestionCategory';
import moduleData from '../data/moduleData.json';
import { useGetCommonFieldsQuery } from '../../src/store/api/apiSlice';

const PlantDetails = () => {
    const { plantId } = useParams();
    const [activeSubmodule, setActiveSubmodule] = useState('Energy Management');

    // Fetch company-level common fields (no plant_id)
    const currentFY = localStorage.getItem('financial_year');
    const { data: commonFields } = useGetCommonFieldsQuery(
        { plant_id: '', financial_year: currentFY },
        { skip: !currentFY }
    );
    let turnover = undefined;
    if (Array.isArray(commonFields) && commonFields.length > 0) {
        turnover = commonFields[0]?.financials?.turnover;
    } else if (commonFields && typeof commonFields === 'object') {
        turnover = commonFields.financials?.turnover;
    }
    console.log('[PlantDetails] extracted turnover:', turnover);

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
                                    <QuestionCategory 
                                        key={category.id}
                                        category={category}
                                        financialYear={currentFY}
                                        plantId={plantId}
                                        turnover={turnover}
                                    />
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