import React, { useState, useEffect } from 'react';
import { useLazyGetQuestionsByIdsQuery } from '../../store/api/apiSlice';
import QuestionList from './QuestionList';

const CategoryContainer = ({ category, financialYear, moduleId, answers }) => {
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded since parent is already handling expansion
  const [categoryWithQuestions, setCategoryWithQuestions] = useState(category);
  
  const [fetchQuestions, { data: fetchedQuestions, isLoading, isError, error }] = 
    useLazyGetQuestionsByIdsQuery();

  // Determine if we need to fetch questions
  useEffect(() => {
    const shouldFetchQuestions = 
      isExpanded && 
      category.question_ids && 
      category.question_ids.length > 0 && 
      (!categoryWithQuestions.questions || categoryWithQuestions.questions.length === 0);

    if (shouldFetchQuestions) {
      console.log('🔄 Fetching questions for category:', category.id, 'with financial year:', financialYear);
      fetchQuestions({
        questionIds: category.question_ids,
        categoryId: category.id,
        include_category: true,
        financialYear: financialYear
      });
    }
  }, [isExpanded, category, categoryWithQuestions, fetchQuestions, financialYear]);

  // Update local state when questions are fetched
  useEffect(() => {
    if (fetchedQuestions && fetchedQuestions.length > 0) {
      console.log('✅ Questions fetched successfully:', fetchedQuestions);
      setCategoryWithQuestions({
        ...category,
        questions: fetchedQuestions
      });
    }
  }, [fetchedQuestions, category]);

  // No need for toggle function since parent is handling expansion

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {isLoading ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Loading questions...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-4">
          <p className="text-red-500">Error loading questions: {error?.data?.message || 'Unknown error'}</p>
        </div>
      ) : (
        <QuestionList 
          category={categoryWithQuestions} 
          financialYear={financialYear}
          moduleId={moduleId}
          answers={answers}
        />
      )}
    </div>
  );
};

export default CategoryContainer;