import { PropTypes } from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import DynamicQuestionRenderer from './DynamicQuestionRenderer';
import { useUpdateTableAnswerMutation, useSubmitQuestionAnswerMutation } from '../../store/api/apiSlice';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';

const QuestionItem = ({ question, financialYear, moduleId, answers = {} }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [questionData, setQuestionData] = useState({});
  const rendererRef = useRef(null);

  const questionId = question?.question_id || question?._id;

  const isUpdateTableMutationValid = typeof useUpdateTableAnswerMutation === 'function';
  const isSubmitQuestionMutationValid = typeof useSubmitQuestionAnswerMutation === 'function';

  if (!isUpdateTableMutationValid) {
    console.error('CRITICAL: useUpdateTableAnswerMutation is not a function.');
  }
  
  if (!isSubmitQuestionMutationValid) {
    console.error('CRITICAL: useSubmitQuestionAnswerMutation is not a function.');
  }

  const [updateTableAnswer, { isLoading: isTableSaving } = {}] = isUpdateTableMutationValid 
    ? useUpdateTableAnswerMutation() 
    : [() => Promise.reject(new Error('Table mutation hook unavailable')), {}];
    
  const [submitQuestionAnswer, { isLoading: isSubjectiveSaving } = {}] = isSubmitQuestionMutationValid 
    ? useSubmitQuestionAnswerMutation() 
    : [() => Promise.reject(new Error('Subjective mutation hook unavailable')), {}];
    
  const isSaving = isTableSaving || isSubjectiveSaving;

  const user = useSelector(state => state.auth.user);
  const companyId = user?.company_id;
  const plantId = user?.plant_id || 'default';

  useEffect(() => {
    if (answers && answers[questionId]) {
      const answerValue = answers[questionId].value || {};
      setQuestionData(answerValue);
    } else {
      setQuestionData({});
    }
  }, [answers, questionId]);

  const handleSave = async (updatedData) => {
    if (!questionId) {
      toast.error('Cannot save: Invalid question ID.');
      return false;
    }
    if (!moduleId) {
      toast.error('Cannot save: Module ID is required.');
      return false;
    }
    if (!companyId) {
      toast.error('Cannot save: Company ID is required.');
      return false;
    }

    const questionType = question?.question_type || question?.metadata?.type;
    const dataToSave = JSON.parse(JSON.stringify(updatedData));

    if (questionType === 'table' || questionType === 'table_with_additional_rows') {
      if (!dataToSave.rows) {
        dataToSave.rows = [];
      }
    }

    const payload = {
      moduleId,
      questionId,
      companyId,
      plantId,
      financialYear,
      answer: {
        type: questionType,
        value: dataToSave,
      },
    };

    try {
      let response;
      if (questionType === 'table' || questionType === 'table_with_additional_rows') {
        response = await updateTableAnswer(payload).unwrap();
      } else {
        response = await submitQuestionAnswer(payload).unwrap();
      }
      
      if (response && response.answers && response.answers[questionId]) {
        const savedData = response.answers[questionId].value || {};
        setQuestionData(savedData);
      } else {
        setQuestionData(dataToSave);
      }
      
      toast.success('Answer saved successfully!');
      return true;
    } catch (error) {
      console.error('Error saving answer:', error);
      toast.error(error?.data?.detail || error?.message || 'Failed to save answer. Please try again.');
      return false;
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
    return (
      <div className="border border-red-200 rounded-lg p-4 mb-4 bg-red-50 shadow-sm">
        <p className="text-red-800">Error: Invalid question data. Please contact support.</p>
      </div>
    );
  }

  return (
    <div className=" rounded-lg p-2 mb-2 bg-white shadow-sm hover:shadow-md transition-shadow relative text-[14px] leading-[1.45]">
      <DynamicQuestionRenderer
        ref={rendererRef}
        question={question}
        questionData={questionData}
        onSave={handleSave}
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        moduleId={moduleId}
        isSaving={isSaving}
      />
    </div>
  );
};

QuestionItem.propTypes = {
  question: PropTypes.object.isRequired,
  financialYear: PropTypes.string.isRequired,
  moduleId: PropTypes.string.isRequired,
  answers: PropTypes.object,
};

export default QuestionItem;