import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CategoryContainer from './CategoryContainer';

const DynamicQuestionCategory = ({ category, financialYear, moduleId, answers }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!financialYear) {
    console.warn('DynamicQuestionCategory: financialYear prop is required');
  }

  return (
    <div className="bg-white rounded-lg shadow-md mb-2 overflow-hidden border border-gray-100">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3 py-2 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-200 border-b border-gray-200"
      >
        <span className="flex-1 font-semibold text-[15px] text-gray-800">
          {category.name}
          {category.question_ids && (
            <span className="ml-2 text-xs text-gray-500">
              ({category.question_ids.length} questions)
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </div>
      {isExpanded && (
        <div className="py-2 px-3">
          <CategoryContainer 
            category={category}
            financialYear={financialYear}
            moduleId={moduleId}
            answers={answers}
          />
        </div>
      )}
    </div>
  );
};

export default DynamicQuestionCategory;