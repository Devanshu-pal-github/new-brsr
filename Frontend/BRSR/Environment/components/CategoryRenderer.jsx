import React from 'react';
import QuestionRenderer from './QuestionRenderer';
import { useGetCompanyReportsQuery } from '../../src/store/api/apiSlice';

const CategoryRenderer = ({ category, financialYear }) => {
  const { data: reports, isLoading, error } = useGetCompanyReportsQuery();
  console.log("Reports from API:", reports);
  
  if (!financialYear) {
    console.warn('CategoryRenderer: financialYear prop is required');
  }

  // Find the report for the current financial year
  const currentReport = reports?.find(report => report.financialYear === financialYear);
  console.log("Current Report:", currentReport);
  
  // Process questions with answers from the report
  const questionsWithAnswers = category.questions?.map(question => {
    const answer = currentReport?.answers?.[question.id];
    console.log(`Processing question ${question.id}:`, { question, answer });
    
    // If we have an answer, ensure it has the correct structure
    const processedAnswer = answer ? {
      questionId: answer.questionId || question.id,
      questionTitle: answer.questionTitle || question.title,
      type: answer.type || 'subjective',
      data: answer.updatedData || answer.data || { text: '' }
    } : null;

    return {
      ...question,
      answer: processedAnswer
    };
  });

  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (error) {
    console.error('Error fetching reports:', error);
    return <div className="p-4 text-center text-red-500">Error loading reports</div>;
  }

  return (
    <div className="space-y-4">
      {questionsWithAnswers?.map((question) => (
        <QuestionRenderer
          key={question.id}
          question={question}
          financialYear={financialYear}
        />
      ))}
    </div>
  );
};

export default CategoryRenderer;