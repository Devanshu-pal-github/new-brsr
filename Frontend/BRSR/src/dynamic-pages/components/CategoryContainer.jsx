import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import QuestionList from './QuestionList';
import { useLazyGetQuestionsByIdsQuery } from '../../store/api/apiSlice';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

const CategoryContainer = ({ category }) => {
  console.log('🏁 CategoryContainer rendering with category:', category);
  const [isExpanded, setIsExpanded] = useState(false);
  const [categoryWithQuestions, setCategoryWithQuestions] = useState(category);
  const [needsFetching, setNeedsFetching] = useState(false);
  
  // Use the lazy query hook to fetch questions when needed
  const [fetchQuestions, { data: questionsData, isLoading, error, isFetching }] = useLazyGetQuestionsByIdsQuery();

  // Check if we need to fetch questions when the category is expanded
  useEffect(() => {
    // If the category already has questions, use them
    if (category.questions && category.questions.length > 0) {
      console.log('✅ Category already has questions:', category.questions);
      setCategoryWithQuestions(category);
      setNeedsFetching(false);
    } 
    // Otherwise, check if we need to fetch questions
    else if (isExpanded && category.question_ids && category.question_ids.length > 0) {
      console.log('🔍 Need to fetch questions for category:', category.name);
      setNeedsFetching(true);
    }
  }, [isExpanded, category]);

  // Fetch questions when needed
  useEffect(() => {
    if (needsFetching && !isFetching && !isLoading) {
      console.log('🔍 Fetching questions for category:', category.name, 'with IDs:', category.question_ids);
      fetchQuestions({ questionIds: category.question_ids, categoryId: category.id })
        .unwrap()
        .then(data => {
          console.log('🎯 Raw API response for questions:', data);
          setNeedsFetching(false);
        })
        .catch(err => {
          console.error('❌ Error fetching questions:', err);
          setNeedsFetching(false);
        });
    }
  }, [needsFetching, category, fetchQuestions, isFetching, isLoading]);

  // Update the category with fetched questions
  useEffect(() => {
    console.log('📊 Questions data state:', { questionsData, isLoading, error, isFetching });
    if (questionsData && questionsData.length > 0) {
      console.log('✅ Questions fetched successfully:', questionsData);
      setCategoryWithQuestions(prev => {
        const updated = {
          ...prev,
          questions: questionsData
        };
        console.log('🔄 Updated category with questions:', updated);
        return updated;
      });
    }
  }, [questionsData, isLoading, error, isFetching]);

  const toggleExpand = () => {
    console.log('🔄 Toggling category expansion for:', category.name);
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
      <div
        onClick={toggleExpand}
        className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-300 ease-in-out border-b border-gray-200"
      >
        <span className="flex-1 font-semibold text-base text-gray-800">
          {category.name}
          {category.question_ids && (
            <span className="ml-2 text-xs text-gray-500">
              ({category.question_ids.length} questions)
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </div>
      {isExpanded && (
        <div className="py-4">
          {isLoading || isFetching ? (
            <LoadingState message="Loading questions..." />
          ) : error ? (
            <ErrorState message={
              error?.data?.detail || 
              error?.error || 
              'Failed to fetch questions. Please try again later.'
            } />
          ) : (
            <QuestionList category={categoryWithQuestions} />
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryContainer;