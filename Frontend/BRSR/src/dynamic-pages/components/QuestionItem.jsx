import React, { useState, useEffect } from 'react';
import DynamicQuestionRenderer from './DynamicQuestionRenderer';
import * as apiSlice from '../../store/api/apiSlice';
import { useUpdateTableAnswerMutation, useLazyGetModuleAnswerQuery, useSubmitQuestionAnswerMutation } from '../../store/api/apiSlice';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';

// Debug imports and environment
console.log('🔍 [QuestionItem] All exports from apiSlice:', Object.keys(apiSlice));
console.log('🔍 [QuestionItem] Imported useUpdateTableAnswerMutation:', useUpdateTableAnswerMutation);
console.log('🔍 [QuestionItem] Imported useLazyGetModuleAnswerQuery:', useLazyGetModuleAnswerQuery);
console.log('🔍 [QuestionItem] Imported useSubmitQuestionAnswerMutation:', useSubmitQuestionAnswerMutation);
console.log('🔍 [QuestionItem] Environment:', {
  nodeEnv: process.env.NODE_ENV,
  buildTool: import.meta.env?.VITE ? 'Vite' : 'Other',
});

const AuditBadge = ({ isAuditRequired }) => (
  <div className={`inline-block px-3 py-1 rounded-full text-xs ${isAuditRequired ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
    {isAuditRequired ? 'Audit Required' : 'No Audit Required'}
  </div>
);

const QuestionItem = ({ question, financialYear, moduleId }) => {
  console.log('🔍 [QuestionItem] Rendering question:', question);
  console.log('🔍 [QuestionItem] Financial year:', financialYear);
  console.log('🔍 [QuestionItem] Module ID:', moduleId);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [questionData, setQuestionData] = useState({});
  
  // Normalize question ID (handle both _id and question_id formats)
  const questionId = question?.question_id || question?._id;
  
  // Check hook validity
  const isUpdateTableMutationValid = typeof useUpdateTableAnswerMutation === 'function';
  const isSubmitQuestionMutationValid = typeof useSubmitQuestionAnswerMutation === 'function';
  
  if (!isUpdateTableMutationValid) {
    console.error('❌ [QuestionItem] useUpdateTableAnswerMutation is invalid:', useUpdateTableAnswerMutation);
    console.error('❌ [QuestionItem] Possible causes: module resolution failure, caching issue, missing export in apiSlice.js, or RTK Query hook generation failure');
  }
  
  if (!isSubmitQuestionMutationValid) {
    console.error('❌ [QuestionItem] useSubmitQuestionAnswerMutation is invalid:', useSubmitQuestionAnswerMutation);
  }
  
  const [updateTableAnswer, { isLoading: isTableSaving } = {}] = isUpdateTableMutationValid 
    ? useUpdateTableAnswerMutation() 
    : [() => Promise.reject(new Error('Table mutation hook unavailable')), {}];
    
  const [submitQuestionAnswer, { isLoading: isSubjectiveSaving } = {}] = isSubmitQuestionMutationValid 
    ? useSubmitQuestionAnswerMutation() 
    : [() => Promise.reject(new Error('Subjective mutation hook unavailable')), {}];
    
  // Combined loading state
  const isSaving = isTableSaving || isSubjectiveSaving;
  
  // Get user info from Redux store
  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const plantId = user?.plant_id || 'default';
  
  // Fetch module answer data
  const [fetchModuleAnswer, { data: moduleAnswerData, isLoading: isLoadingAnswer }] = useLazyGetModuleAnswerQuery();
  
  // Fetch the answer data when the component mounts
  useEffect(() => {
    if (moduleId && companyId && financialYear) {
      console.log('🔍 [QuestionItem] Fetching module answer data for:', { moduleId, companyId, financialYear });
      fetchModuleAnswer({ moduleId, companyId, financialYear }).catch(err => 
        console.error('❌ [QuestionItem] Error fetching module answer:', err)
      );
    } else {
      console.warn('⚠️ [QuestionItem] Missing required params for fetch:', { moduleId, companyId, financialYear });
    }
  }, [moduleId, companyId, financialYear, fetchModuleAnswer]);
  
  // Update the question data when the module answer data changes
  useEffect(() => {
    console.log('📥 [QuestionItem] Module answer data received:', moduleAnswerData);
    if (moduleAnswerData && moduleAnswerData.answers && moduleAnswerData.answers[questionId]) {
      console.log('📥 [QuestionItem] Received answer data for question:', questionId, moduleAnswerData.answers[questionId]);
      const answerValue = moduleAnswerData.answers[questionId].value || {};
      console.log('📥 [QuestionItem] Setting question data to:', answerValue);
      console.log('📥 [QuestionItem] Answer value types:', Object.entries(answerValue).map(([key, value]) => `${key}: ${typeof value}`));
      setQuestionData(answerValue);
    } else {
      console.log('📥 [QuestionItem] No answer data found for question:', questionId);
      setQuestionData({});
    }
  }, [moduleAnswerData, questionId]);

  // Determine the question title using priority: question_text > title > human_readable_id
  const questionTitle = question?.question_text || question?.title || question?.human_readable_id || 'Untitled Question';

  const handleSave = async (updatedData) => {
    // Validate required parameters
    if (!questionId) {
      console.error('❌ [QuestionItem] Missing question ID:', question);
      toast.error('Cannot save: Invalid question ID.');
      return false;
    }
    if (!moduleId) {
      console.error('❌ [QuestionItem] Missing module ID');
      toast.error('Cannot save: Module ID is required.');
      return false;
    }
    if (!financialYear) {
      console.error('❌ [QuestionItem] Missing financial year');
      toast.error('Cannot save: Financial year is required.');
      return false;
    }
    
    // Store company_id and financial_year in localStorage for API calls
    if (companyId) localStorage.setItem('company_id', companyId);
    localStorage.setItem('financial_year', financialYear);
    
    try {
      console.log('💾 [QuestionItem] Saving data for question:', questionId, 'in module:', moduleId);
      console.log('💾 [QuestionItem] Question type:', question.question_type);
      console.log('💾 [QuestionItem] Updated data:', updatedData);
      
      // Ensure updatedData is not null or undefined
      if (!updatedData) {
        console.warn('⚠️ [QuestionItem] No data to save, using empty object');
      }
      
      const dataToSave = updatedData || {};
      let response;
      
      // Choose the appropriate mutation based on question type
      if (question.question_type === 'table' || question.question_type === 'table_with_additional_rows') {
        // For table questions
        if (!isUpdateTableMutationValid) {
          toast.error('Cannot save: Table mutation hook is unavailable. Please refresh the page.');
          return false;
        }
        
        console.log('🔄 [QuestionItem] Using updateTableAnswer for table question');
        response = await updateTableAnswer({
          questionId: questionId,
          questionTitle: questionTitle,
          updatedData: dataToSave,
          financialYear,
          moduleId
        }).unwrap();
      } else if (question.question_type === 'subjective') {
        // For subjective questions
        if (!isSubmitQuestionMutationValid) {
          toast.error('Cannot save: Subjective mutation hook is unavailable. Please refresh the page.');
          return false;
        }
        
        console.log('🔄 [QuestionItem] Using submitQuestionAnswer for subjective question');
        response = await submitQuestionAnswer({
          moduleId,
          questionId: questionId,
          answerData: dataToSave
        }).unwrap();
      } else {
        // For other question types - fallback to submitQuestionAnswer
        if (!isSubmitQuestionMutationValid) {
          toast.error(`Cannot save: Mutation hook for ${question.question_type} questions is unavailable.`);
          return false;
        }
        
        console.log(`🔄 [QuestionItem] Using submitQuestionAnswer for ${question.question_type} question`);
        response = await submitQuestionAnswer({
          moduleId,
          questionId: questionId,
          answerData: dataToSave
        }).unwrap();
      }
      
      console.log('✅ [QuestionItem] API response:', response);
      
      // Update the local state with the saved data
      if (response && response.answers && response.answers[questionId]) {
        const savedData = response.answers[questionId].value || {};
        console.log('📥 [QuestionItem] Setting question data from API response:', savedData);
        setQuestionData(savedData);
      } else {
        console.log('📥 [QuestionItem] Setting question data directly from updatedData:', dataToSave);
        setQuestionData(dataToSave);
      }
      
      toast.success('Answer saved successfully!');
      // Modal will be closed by DynamicQuestionRenderer after onSave completes
      return true; // Indicate success to the caller
    } catch (error) {
      console.error('❌ [QuestionItem] Error saving answer:', error);
      console.error('❌ [QuestionItem] Error details:', {
        status: error?.status,
        data: error?.data,
        message: error?.message
      });
      toast.error(error?.data?.detail || error?.message || 'Failed to save answer. Please try again.');
      return false; // Indicate failure to the caller
    }
  };

  if (!isUpdateTableMutationValid && !isSubmitQuestionMutationValid) {
    return (
      <div className="border border-red-200 rounded-lg p-4 mb-4 bg-red-50 shadow-sm">
        <p className="text-red-800">Error: Unable to load question due to invalid mutation hooks. Please refresh the page or contact support.</p>
      </div>
    );
  }

  if (!question || !questionId) {
    console.error('❌ [QuestionItem] Invalid question prop:', question);
    return (
      <div className="border border-red-200 rounded-lg p-4 mb-4 bg-red-50 shadow-sm">
        <p className="text-red-800">Error: Invalid question data. Please contact support.</p>
      </div>
    );
  }

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
          <AuditBadge isAuditRequired={question.is_audit} />
        )}
      </div>

      <DynamicQuestionRenderer
        question={question}
        questionData={questionData}
        onSave={handleSave}
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        moduleId={moduleId}
      />

      <div className="mt-4">
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="px-4 py-2 bg-[#20305D] text-white rounded hover:bg-[#162442] text-sm"
          disabled={isSaving || isLoadingAnswer}
        >
          {isSaving ? 'Saving...' : isLoadingAnswer ? 'Loading...' : 'Edit Response'}
        </button>
      </div>
    </div>
  );
};

export default QuestionItem;