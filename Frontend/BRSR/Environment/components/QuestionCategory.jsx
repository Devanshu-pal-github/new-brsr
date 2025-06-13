import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CategoryRenderer from './CategoryRenderer';

const QuestionCategory = ({ category }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white rounded-lg shadow-sm p-3">
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center h-[44px] px-6 cursor-pointer select-none border-b border-gray-200 bg-white"
                style={{marginTop: '-12px'}}
            >
                <span className="flex-1 flex items-center h-full font-semibold text-[1rem] text-[#000D30] hover:text-[#20305D] transition-colors leading-none" style={{paddingTop: '2px'}}>
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
                    <CategoryRenderer category={category} />
                </div>
            )}
        </div>
    );
};

export default QuestionCategory; 