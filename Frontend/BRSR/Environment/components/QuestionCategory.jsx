import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CategoryRenderer from './CategoryRenderer';

const QuestionCategory = ({ category, financialYear }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!financialYear) {
        console.warn('QuestionCategory: financialYear prop is required');
    }

    return (
        <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-300 ease-in-out border-b border-gray-200"
            >
                <span className="flex-1 font-semibold text-base text-gray-800">
                    {category.name}
                </span>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                ) : (
                    <ChevronDown className="w-5 h-5" />
                )}
            </div>
            {isExpanded && (
                <div className="py-4">
                    <CategoryRenderer 
                        category={category} 
                        financialYear={financialYear}
                    />
                </div>
            )}
        </div>
    );
};

export default QuestionCategory;