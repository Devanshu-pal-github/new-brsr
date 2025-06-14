import React from 'react';
import QuestionItem from './QuestionItem';

const QuestionList = ({ category }) => {
  return (
    <div className="space-y-8 px-4">
      {category.questions && category.questions.length > 0 ? (
        category.questions.map((question) => (
          <QuestionItem key={question.id} question={question} />
        ))
      ) : (
        <p className="text-gray-500 text-center py-4">No questions found in this category.</p>
      )}
    </div>
  );
};

export default QuestionList;