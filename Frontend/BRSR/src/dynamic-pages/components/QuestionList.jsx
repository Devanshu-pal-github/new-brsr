import React from 'react';
import QuestionItem from './QuestionItem';

const QuestionList = ({ category, financialYear }) => {
  console.log('📋 Rendering category:', category);
  console.log('📋 Category questions:', category.questions);
  console.log('📋 Financial year:', financialYear);

  if (!category || !category.questions || category.questions.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <p className="text-gray-500">
          {category && category.question_ids && category.question_ids.length > 0
            ? 'Loading questions...'
            : 'No questions found for this category.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {category.questions.map((question) => (
        <QuestionItem 
          key={question.id} 
          question={question} 
          financialYear={financialYear}
        />
      ))}
    </div>
  );
};

export default QuestionList;