import React, { useEffect } from 'react';
import QuestionItem from './QuestionItem';

const QuestionList = ({ category }) => {
  useEffect(() => {
    console.log('📋 QuestionList rendering with category:', category);
    console.log('📋 Questions available:', category.questions);
  }, [category]);

  return (
    <div className="space-y-8 px-4">
      {category.questions && category.questions.length > 0 ? (
        category.questions.map((question) => {
          console.log('🔖 Rendering question:', question);
          return <QuestionItem key={question.id} question={question} />;
        })
      ) : (
        <p className="text-gray-500 text-center py-4">
          No questions found in this category. 
          {category.question_ids && category.question_ids.length > 0 ? 
            `(${category.question_ids.length} question IDs available but no question data)` : 
            '(No question IDs available)'
          }
        </p>
      )}
    </div>
  );
};

export default QuestionList;