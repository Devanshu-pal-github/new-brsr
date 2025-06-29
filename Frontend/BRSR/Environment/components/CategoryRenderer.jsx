import React from 'react';
import QuestionRenderer from './QuestionRenderer';
import { useGetCompanyReportsQuery } from '../../src/store/api/apiSlice';

const CategoryRenderer = ({ category, financialYear, plantId, turnover }) => {

  // Only fetch if we have a plantId
  const { data: reports = [], isLoading, error } = useGetCompanyReportsQuery(
    plantId ? { plantId, financialYear } : undefined,
    { skip: !plantId }
  );
  // turnover is now passed as a prop from Plants.jsx
  // Remove local fetching of common fields
  // (If you want per-plant turnover, restore the fetch logic)
  // Accept turnover as a prop
  console.log('[CategoryRenderer] turnover prop:', turnover);

  if (!financialYear) {
    console.warn('CategoryRenderer: financialYear prop is required');
  }
  if (!plantId) {
    console.warn('CategoryRenderer: plantId prop is required');
  }

  // Find the report for the current financial year
  const currentReport = reports?.find(report => report.financialYear === financialYear);
  // Process questions with answers from the report
  const questionsWithAnswers = category.questions?.map(question => {
    const answer = currentReport?.answers?.[question.id];
    // If we have an answer, ensure it has the correct structure
    let processedAnswer = null;
    if (answer) {
      const type = answer.type || question.metadata?.type || 'subjective';
      if (type === 'subjective') {
        processedAnswer = {
          questionId: answer.questionId || question.id,
          questionTitle: answer.questionTitle || question.title,
          type: type,
          data: answer.updatedData || answer.data || { text: '' }
        };
      } else if (type === 'table' || type === 'multi-table' || type === 'dynamic-table') {
        // For table types, transform the data into the expected format
        const tableData = {};
        const data = answer.updatedData || answer.data || [];
        // Convert array of objects to object with row indices
        if (Array.isArray(data)) {
          data.forEach((row, index) => {
            if (row.row_index !== undefined) {
              tableData[row.row_index] = { ...row };
              delete tableData[row.row_index].row_index;
            } else {
              tableData[index] = row;
            }
          });
        }
        processedAnswer = {
          questionId: answer.questionId || question.id,
          questionTitle: answer.questionTitle || question.title,
          type: type,
          data: tableData
        };
      }
    }
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
          plantId={plantId}
          turnover={turnover}
        />
      ))}
    </div>
  );
};

export default CategoryRenderer;