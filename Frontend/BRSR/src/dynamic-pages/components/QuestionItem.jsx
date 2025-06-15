import React, { useState } from 'react';
import DynamicQuestionRenderer from './DynamicQuestionRenderer';
import { useUpdateTableAnswerMutation } from '../../store/api/apiSlice';

const AuditBadge = ({ isAuditRequired }) => (
  <div className={`inline-block px-3 py-1 rounded-full text-xs ${isAuditRequired ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
    {isAuditRequired ? 'Audit Required' : 'No Audit Required'}
  </div>
);

const QuestionItem = ({ question, financialYear }) => {
  console.log('🔍 Rendering question:', question);
  console.log('🔍 Financial year:', financialYear);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [questionData, setQuestionData] = useState(question.data || {});
  const [updateTableAnswer, { isLoading: isSaving }] = useUpdateTableAnswerMutation();

  // Determine the question title using priority: question_text > title > human_readable_id
  const questionTitle = question.question_text || question.title || question.human_readable_id;

  const handleSave = async (data) => {
    console.log(`💾 Saving data for question: ${questionTitle}`, data);
    
    try {
      // Call the API to save the data
      const payload = {
        questionId: question.id,
        questionTitle: questionTitle,
        updatedData: data,
        financialYear: financialYear
      };
      
      console.log('📤 Sending payload to API:', payload);
      
      const response = await updateTableAnswer(payload).unwrap();
      console.log('✅ API response:', response);
      
      // Update local state
      setQuestionData(data);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('❌ Error saving answer:', error);
      // You could show an error message to the user here
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-[#20305D]">
            {questionTitle}
          </h3>
          {question.description && (
            <p className="text-sm text-gray-600 mt-1">{question.description}</p>
          )}
        </div>
        {question.is_audit && (
          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Audit
          </span>
        )}
      </div>

      <DynamicQuestionRenderer
        question={question}
        questionData={questionData}
        onSave={handleSave}
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
      />

      <div className="mt-4">
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="px-4 py-2 bg-[#20305D] text-white rounded hover:bg-[#162442] text-sm"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Edit Response'}
        </button>
      </div>
    </div>
  );
};

export default QuestionItem;