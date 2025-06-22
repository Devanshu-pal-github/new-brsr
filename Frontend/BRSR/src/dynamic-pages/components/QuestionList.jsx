import React from 'react';
import QuestionItem from './QuestionItem';

class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <div className="p-3 bg-red-50 text-red-800 text-sm">Error loading question.</div>;
    }
    return this.props.children;
  }
}

const QuestionList = ({ category, financialYear, moduleId, answers }) => {
  console.log('📋 Rendering category:', category);
  console.log('📋 Category questions:', category.questions);
  console.log('📋 Financial year:', financialYear);

  if (!category || !category.questions || category.questions.length === 0) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <p className="text-gray-500 text-sm">
          {category && category.question_ids && category.question_ids.length > 0
            ? 'Loading questions...'
            : 'No questions found for this category.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {category.questions.map((question) => (
        <ErrorBoundary key={question.id}>
          <QuestionItem 
            question={question} 
            financialYear={financialYear}
            moduleId={moduleId}
            answers={answers}
          />
        </ErrorBoundary>
      ))}
    </div>
  );
};

export default QuestionList;