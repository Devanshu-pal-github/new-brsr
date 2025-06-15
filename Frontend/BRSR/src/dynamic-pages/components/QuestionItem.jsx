import React, { useState, useEffect } from 'react';
import DynamicQuestionRenderer from './DynamicQuestionRenderer';
import { useUpdateTableAnswerMutation, useLazyGetModuleAnswerQuery } from '../../store/api/apiSlice';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';

const AuditBadge = ({ isAuditRequired }) => (
  <div className={`inline-block px-3 py-1 rounded-full text-xs ${isAuditRequired ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
    {isAuditRequired ? 'Audit Required' : 'No Audit Required'}
  </div>
);

const QuestionItem = ({ question, financialYear, moduleId }) => {
  console.log('🔍 Rendering question:', question);
  console.log('🔍 Financial year:', financialYear);
  console.log('🔍 Module ID:', moduleId);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // Initialize questionData with an empty object
  const [questionData, setQuestionData] = useState({});
  const [updateTableAnswer, { isLoading: isSaving }] = useUpdateTableAnswerMutation();
  
  // Get user info from Redux store
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const plantId = user?.plant_id || 'default';
  
  // Fetch module answer data
  const [fetchModuleAnswer, { data: moduleAnswerData, isLoading: isLoadingAnswer }] = useLazyGetModuleAnswerQuery();
  
  // Fetch the answer data when the component mounts
  useEffect(() => {
    if (moduleId && companyId && financialYear) {
      console.log('🔍 Fetching module answer data for:', { moduleId, companyId, plantId, financialYear });
      fetchModuleAnswer({ moduleId, companyId, plantId, financialYear });
    }
  }, [moduleId, companyId, plantId, financialYear, fetchModuleAnswer]);
  
  // Update the question data when the module answer data changes
  useEffect(() => {
    console.log('📥 Module answer data received:', moduleAnswerData);
    if (moduleAnswerData && moduleAnswerData.answers && moduleAnswerData.answers[question.id]) {
      console.log('📥 Received answer data for question:', question.id, moduleAnswerData.answers[question.id]);
      const answerValue = moduleAnswerData.answers[question.id].value || {};
      console.log('📥 Setting question data to:', answerValue);
      console.log('📥 Answer value types:', Object.entries(answerValue).map(([key, value]) => `${key}: ${typeof value}`));
      setQuestionData(answerValue);
    } else {
      console.log('📥 No answer data found for question:', question.id);
      // Ensure we set an empty object when no data is found
      setQuestionData({});
    }
  }, [moduleAnswerData, question.id]);

  // Determine the question title using priority: question_text > title > human_readable_id
  const questionTitle = question.question_text || question.title || question.human_readable_id;

  const handleSave = async (updatedData) => {
    try {
      console.log('💾 Saving data for question:', question.id, 'with data:', updatedData);
      console.log('💾 Updated data types:', updatedData ? Object.entries(updatedData).map(([key, value]) => `${key}: ${typeof value}`) : 'No data');
      
      // Ensure updatedData is not null or undefined
      if (!updatedData) {
        console.warn('⚠️ No data to save, using empty object');
      }
      
      const dataToSave = updatedData || {};
      
      const response = await updateTableAnswer({
        questionId: question.id,
        questionTitle: questionTitle,
        updatedData: dataToSave,
        financialYear,
        moduleId
      }).unwrap();
      
      console.log('✅ API response:', response);
      
      // Update the local state with the saved data
      if (response && response.answers && response.answers[question.id]) {
        const savedData = response.answers[question.id].value || {};
        console.log('📥 Setting question data from API response:', savedData);
        console.log('📥 Saved data types:', Object.entries(savedData).map(([key, value]) => `${key}: ${typeof value}`));
        setQuestionData(savedData);
      } else {
        console.log('📥 Setting question data directly from updatedData:', dataToSave);
        setQuestionData(dataToSave);
      }
      
      toast.success('Answer saved successfully!');
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('❌ Error saving answer:', error);
      toast.error('Failed to save answer. Please try again.');
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