import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumb from './Breadcrumb';
import SubHeader from './SubHeader';
import Layout from '../../src/components/layout/Layout';
import QuestionCategory from './QuestionCategory';
import moduleData from '../data/moduleData.json';

const PlantDetails = () => {
    const { plantId } = useParams();
    const [activeSubmodule, setActiveSubmodule] = useState('Energy Management');

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
                                        categoryName={category.name}
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