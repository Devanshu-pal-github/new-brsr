import React, { useEffect } from 'react';
import QuestionRenderer from './QuestionRenderer';
import { useGetCompanyReportsQuery } from '../../src/store/api/apiSlice';

const CategoryRenderer = ({ category, financialYear }) => {
  const { data: reports, isLoading, error } = useGetCompanyReportsQuery();
  
  if (!financialYear) {
    console.warn('CategoryRenderer: financialYear prop is required');
  }

  // Find the report for the current financial year
  const currentReport = reports?.find(report => report.financialYear === financialYear);
  
  // Process questions with answers from the report
  const questionsWithAnswers = category.questions?.map(question => {
    if (currentReport?.answers && currentReport.answers[question.id]) {
      return {
        ...question,
        answer: currentReport.answers[question.id].updatedData
      };
    }
    return question;
  });

  if (isLoading) {
    return <div className="p-4 text-center">Loading report data...</div>;
  }

  if (error) {
    console.error('Error loading reports:', error);
    return <div className="p-4 text-center text-red-500">Error loading report data</div>;
  }

  return (
    <div className="space-y-8">
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