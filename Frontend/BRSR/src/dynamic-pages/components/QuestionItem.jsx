import {PropTypes } from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import DynamicQuestionRenderer from './DynamicQuestionRenderer';
import * as apiSlice from '../../store/api/apiSlice';
import { useUpdateTableAnswerMutation, useSubmitQuestionAnswerMutation } from '../../store/api/apiSlice';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';

// Debug imports and environment
console.log('🔍 [QuestionItem] All exports from apiSlice:', Object.keys(apiSlice));
console.log('🔍 [QuestionItem] Imported useUpdateTableAnswerMutation:', useUpdateTableAnswerMutation);
console.log('🔍 [QuestionItem] Imported useSubmitQuestionAnswerMutation:', useSubmitQuestionAnswerMutation);
console.log('🔍 [QuestionItem] Environment:', {
  nodeEnv: process.env.NODE_ENV,
  buildTool: import.meta.env?.VITE_ENV ? 'Vite' : 'Other',
});

const AuditBadge = ({ isAuditRequired }) => (
  <div className={`inline-block px-3 py-1 rounded-full text-xs ${isAuditRequired ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
    {isAuditRequired ? 'Audit Required' : 'No Audit Required'}
  </div>
);

const QuestionItem = ({ question, financialYear, moduleId, answers = {} }) => {
  console.log('🔍 [QuestionItem] Rendering question:', question);
  console.log('🔍 [QuestionItem] Financial year:', financialYear);
  console.log('🔍 [QuestionItem] Module ID:', moduleId);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [questionData, setQuestionData] = useState({});
  const rendererRef = useRef(null);
  
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
  
  // Update the question data when the answers prop changes
  useEffect(() => {
    if (answers && answers[questionId]) {
      const answerValue = answers[questionId].value || {};
      setQuestionData(answerValue);
    } else {
      setQuestionData({});
    }
  }, [answers, questionId]);

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
    <div className=" rounded-lg p-2 mb-2 bg-white shadow-sm hover:shadow-md transition-shadow relative text-[14px] leading-[1.45]">
      <div className="flex items-start flex-wrap gap-1.5">
        <div className="flex-1 min-w-0">
          {/* Remove duplicate question text here */}
          {question.description && (
            <p className="text-[12px] text-gray-600 mt-0.5 mb-0">{question.description}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* AI Button (relocated) */}
          <button
            onClick={() => {
              if (rendererRef.current && typeof rendererRef.current.openAIChat === 'function') {
                rendererRef.current.openAIChat();
              }
            }}
            className="bg-[#4F46E5] text-white font-medium px-1.5 min-w-[26px] min-h-[18px] rounded text-[10px] shadow-sm focus:outline-none transition-all duration-200 hover:bg-[#4338CA] flex items-center gap-0.5"
            aria-label="AI Assist"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI
          </button>

          {/* Edit Response Button */}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-2 py-0.5 bg-[#20305D] text-white rounded hover:bg-[#162442] text-[11px] font-medium"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Edit Response'}
          </button>

          {question.is_audit && <AuditBadge isAuditRequired={question.is_audit} />}
        </div>
      </div>

      <DynamicQuestionRenderer
         ref={rendererRef}
        question={question}
        questionData={questionData}
        onSave={handleSave}
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        moduleId={moduleId}
        hideTopRightAIButton={true} // <--- Add this prop
      />
    </div>
  );
};

export default QuestionItem;