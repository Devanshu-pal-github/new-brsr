import React, { useState, useEffect } from 'react';
import TableRenderer from './TableRenderer';
import MultiTableRenderer from './MultiTableRenderer';
import DynamicTableRenderer from './DynamicTableRenderer';
import { useUpdateTableAnswerEnvironmentMutation, useUpdateSubjectiveAnswerMutation, useUpdateAuditStatusMutation, useGetAuditStatusQuery } from '../../src/store/api/apiSlice';
import { toast } from 'react-toastify';
import SubjectiveQuestionRenderer from './SubjectiveQuestionRenderer';
import ChatbotWindow from '../../src/AICHATBOT/ChatbotWindow';
import { AppProvider } from '../../src/AICHATBOT/AppProvider';

const AuditBadge = ({ isAuditRequired }) => (
  <div className={`inline-block px-3 py-1 rounded text-xs ${isAuditRequired ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
    }`}>
    {isAuditRequired ? 'Audit Required' : 'No Audit Required'}
  </div>
);

const AuditStatusBox = ({ status }) => {
  let color = 'bg-gray-200 text-gray-700 border-gray-300';
  let label = 'Not Audited';
  if (status === true) {
    color = 'bg-green-100 text-green-800 border-green-400';
    label = 'Audited';
  } else if (status === false) {
    color = 'bg-red-100 text-red-700 border-red-400';
    label = 'Not Audited';
  }
  return (
    <span className={`inline-block px-2 py-1 rounded border text-xs font-semibold ${color}`}>{label}</span>
  );
};

const EditModal = ({ isOpen, onClose, children, title, onSave, tempData, question, plantId, financialYear, updateAuditStatus, refetchAuditStatus }) => {
  // Use auditStatus from audit_statuses if available, fallback to undefined
  const [localAuditStatus, setLocalAuditStatus] = useState(undefined);
  useEffect(() => {
    if (typeof question.auditStatus !== 'undefined') {
      setLocalAuditStatus(question.auditStatus);
    }
  }, [question.auditStatus]);

  const [showAuditConfirm, setShowAuditConfirm] = useState(false);
  const [pendingAuditStatus, setPendingAuditStatus] = useState(null);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  if (!isOpen) return null;

  const handleOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      onClose();
    }
  };

  // When user clicks Yes/No, show confirm popup
  const handleAuditStatusClick = (value) => {
    setPendingAuditStatus(value);
    setShowAuditConfirm(true);
  };

  // On confirm, call API and update local state
  const handleAuditConfirm = async () => {
    setIsAuditLoading(true);
    try {
      await updateAuditStatus({
        financialYear,
        questionId: question.id,
        audit_status: pendingAuditStatus,
        plantId
      }).unwrap();
      setLocalAuditStatus(pendingAuditStatus);
      toast.success('Audit status updated!');
      if (refetchAuditStatus) refetchAuditStatus();
    } catch (err) {
      toast.error('Failed to update audit status');
    }
    setIsAuditLoading(false);
    setShowAuditConfirm(false);
    setPendingAuditStatus(null);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50" onClick={handleOutsideClick}>
      <div className="bg-white rounded-lg w-11/12 max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-[#20305D]">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
          <div className="flex flex-col">
            <div className="flex justify-end">
              {question?.isAuditRequired && (
                <div className="mt-4 flex items-center space-x-4 pt-4">
                  <span className="text-sm text-gray-600">Audit Done :</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`audit-status-${question.id}`}
                      checked={localAuditStatus === true}
                      onChange={() => handleAuditStatusClick(true)}
                      disabled={showAuditConfirm || isAuditLoading}
                      className="accent-green-600"
                    />
                    <span className="text-green-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`audit-status-${question.id}`}
                      checked={localAuditStatus === false}
                      onChange={() => handleAuditStatusClick(false)}
                      disabled={showAuditConfirm || isAuditLoading}
                      className="accent-red-600"
                    />
                    <span className="text-red-700">No</span>
                  </label>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onSave(tempData)}
                className="px-4 py-2 bg-[#20305D] text-white rounded hover:bg-[#162442]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Audit Status Confirmation Modal */}
      {showAuditConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
          onClick={e => {
            if (e.target === e.currentTarget) setShowAuditConfirm(false);
          }}
        >
          <div className="bg-white p-6 rounded shadow-lg">
            <p className="mb-4">
              Are you sure you want to set audit status to <b>{pendingAuditStatus ? 'Yes' : 'No'}</b>?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowAuditConfirm(false)}
                disabled={isAuditLoading}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAuditConfirm}
                disabled={isAuditLoading}
                className="px-4 py-2 bg-[#20305D] hover:bg-[#162442] text-white rounded"
              >
                {isAuditLoading ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>

      )}
    </div>
  );
};

const QuestionRenderer = ({ question, financialYear, plantId }) => {
  console.log('Rendering Question:', question);
  const { title, description, metadata, isAuditRequired } = question;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [questionData, setQuestionData] = useState(() => {
    if (metadata?.type === 'subjective') {
      return question.answer || null;
    } else if (metadata?.type === 'table' || metadata?.type === 'multi-table' || metadata?.type === 'dynamic-table') {
      // For table types, ensure we have the correct structure
      return question.answer || { data: {} };
    }
    return question.answer || {};
  });
  const [tempData, setTempData] = useState(questionData);
  const [updateTableAnswer, { isLoading: isTableLoading }] = useUpdateTableAnswerEnvironmentMutation();
  const [updateSubjectiveAnswer, { isLoading: isSubjectiveLoading }] = useUpdateSubjectiveAnswerMutation();
  const [updateAuditStatus] = useUpdateAuditStatusMutation();

  // Fetch audit status for this question/plant/year
  const {
    data: auditStatusData,
    error: auditStatusError,
    refetch: refetchAuditStatus,
    isFetching: isAuditStatusFetching
  } = useGetAuditStatusQuery(
    { financialYear, questionId: question.id, plantId },
    { skip: !question.id || !plantId || !financialYear }
  );
  // If 404, treat as unset
  const auditStatus = auditStatusError && auditStatusError.status === 404
    ? undefined
    : (typeof auditStatusData?.audit_status !== 'undefined'
      ? auditStatusData.audit_status
      : question.auditStatus);

  // Add these new states for ChatbotWindow
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [showAuditConfirm, setShowAuditConfirm] = useState(false);
  const [pendingAuditStatus, setPendingAuditStatus] = useState(null);

  // Create an activeQuestion object for the chatbot
  const activeQuestion = {
    question_id: question.id,
    question_text: title,
    guidance_text: description || 'No guidance provided',
    metadata: metadata,
    type: metadata?.type,
    has_string_value: metadata?.type === 'subjective',
    has_decimal_value: false,
    has_boolean_value: false,
    has_link: false,
    has_note: !!metadata?.note,
    string_value_required: metadata?.type === 'subjective',
    decimal_value_required: false,
    boolean_value_required: false,
    link_required: false,
    note_required: false,
  };

  // Update questionData when question.answer changes
  useEffect(() => {
    if (question.answer) {
      if (metadata?.type === 'subjective') {
        setQuestionData(question.answer);
        setTempData(question.answer);
      } else if (metadata?.type === 'table' || metadata?.type === 'multi-table' || metadata?.type === 'dynamic-table') {
        // For table types, ensure we have the correct structure
        const tableData = question.answer.data || {};
        setQuestionData(question.answer);
        setTempData(question.answer);
      } else {
        setQuestionData(question.answer);
        setTempData(question.answer);
      }
    }
  }, [question.answer, metadata?.type]);

  const handleSave = async (data) => {
    // Prevent accidental passing of event or button objects
    if (data && (typeof data === 'object') && (data instanceof Event || data.nativeEvent || data.tagName === 'BUTTON')) {
      toast.error('Invalid data passed to save.');
      return;
    }
    try {
      if (!question.id || !title) {
        console.error('Missing required data:', { questionId: question.id, questionTitle: title });
        toast.error('Missing required question information');
        return;
      }
      if (!plantId) {
        console.error('Missing required plantId');
        toast.error('Plant ID is required');
        return;
      }
      if (metadata?.type === 'subjective') {
        // Handle subjective questions
        const textValue = typeof data === 'string' ? data : data?.data?.text || data?.text || '';
        const payload = {
          questionId: question.id,
          questionTitle: title,
          type: 'subjective',
          data: {
            text: textValue
          },
          plantId,
          financialYear
        };
        console.log('Submitting subjective answer:', payload);
        await updateSubjectiveAnswer(payload).unwrap();
        setQuestionData({ ...payload });
        setIsEditModalOpen(false);
        toast.success('Answer saved successfully');
      } else if (metadata?.type === 'table' || metadata?.type === 'multi-table' || metadata?.type === 'dynamic-table') {
        // Handle table questions
        let formattedData;
        // Only stringify the answer data, not the whole event or React object
        const answerData = data?.data || data;
        let dataCopy;
        if (typeof answerData === 'object' && answerData !== null && !Array.isArray(answerData)) {
          dataCopy = JSON.parse(JSON.stringify(answerData));
        } else {
          dataCopy = answerData;
        }
        // Convert object format to array format for API
        formattedData = Object.entries(dataCopy).map(([rowIndex, rowData]) => ({
          row_index: parseInt(rowIndex),
          ...rowData
        }));
        console.log('Submitting table answer:', formattedData);
        await updateTableAnswer({
          financialYear,
          questionId: question.id,
          questionTitle: title,
          updatedData: formattedData,
          plantId
        }).unwrap();
        const newData = {
          questionId: question.id,
          questionTitle: title,
          type: metadata.type,
          data: dataCopy
        };
        setQuestionData(newData);
        setIsEditModalOpen(false);
        toast.success('Answer saved successfully');
      }
    } catch (error) {
      console.error('Failed to save answer:', error);
      toast.error(error.data?.detail || 'Failed to save answer');
    }
  };

  const handleDataChange = (newData) => {
    // Create a deep copy before setting state
    setTempData(JSON.parse(JSON.stringify(newData)));
  };

  const renderEditableContent = () => {
    switch (metadata?.type) {
      case 'table':
        return (
          <TableRenderer
            metadata={metadata}
            data={tempData?.data || {}}
            isEditing={true}
            onSave={(newData) => setTempData({ ...tempData, data: newData })}
          />
        );
      case 'multi-table':
        return (
          <MultiTableRenderer
            metadata={metadata}
            data={tempData?.data || {}}
            isEditing={true}
            onSave={(newData) => setTempData({ ...tempData, data: newData })}
          />
        );
      case 'dynamic-table':
        return (
          <DynamicTableRenderer
            metadata={metadata}
            data={tempData?.data || {}}
            isEditing={true}
            onSave={(newData) => setTempData({ ...tempData, data: newData })}
          />
        );
      case 'subjective':
        return (
          <textarea
            className="w-full p-3 border border-gray-300 rounded-md min-h-[200px]"
            placeholder="Enter your response here..."
            value={tempData?.data?.text || ''}
            onChange={(e) => setTempData({
              questionId: question.id,
              questionTitle: title,
              type: 'subjective',
              data: { text: e.target.value }
            })}
          />
        );
      default:
        return null;
    }
  };

  const renderQuestion = () => {
    console.log('Rendering Question:', question);

    switch (metadata?.type) {
      case 'subjective':
        return (
          <SubjectiveQuestionRenderer
            question={question}
            answer={questionData}
            onAnswerChange={(newData) => {
              handleSave(newData);
            }}
            isReadOnly={!isEditModalOpen}
          />
        );
      case 'table':
        return (
          <TableRenderer
            metadata={metadata}
            data={questionData?.data || {}}
            isEditing={false}
          />
        );
      case 'multi-table':
        return (
          <MultiTableRenderer
            metadata={metadata}
            data={questionData?.data || {}}
            isEditing={false}
          />
        );
      case 'dynamic-table':
        return (
          <DynamicTableRenderer
            metadata={metadata}
            data={questionData?.data || {}}
            isEditing={false}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppProvider>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        {/* Principle and Indicator display */}
        {(question.principle || question.indicator) && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {question.principle && (
              <span className="inline-block bg-[#E0E7FF] text-[#3730A3] text-xs font-semibold px-2 py-1 rounded">Principle: {question.principle}</span>
            )}
            {question.indicator && (
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${question.indicator === 'Essential' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF9C3] text-[#92400E]'}`}>Indicator: {question.indicator}</span>
            )}
          </div>
        )}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            {/* <div className="font-semibold text-base text-[#20305D]">{title}</div> */}
            {description && (
              <div
                className="text-sm font-semibold text-gray-700 mb-2"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            )}
          </div>
          <div className="flex items-center space-x-3 ml-4 ">
            <AuditBadge isAuditRequired={isAuditRequired} />
            {/* Audit Status Box */}
            {isAuditRequired && (
              <div className="flex items-center gap-1  ">
                <AuditStatusBox status={auditStatus} />
                {isAuditStatusFetching && <span className="text-xs text-gray-400 ml-1">...</span>}
              </div>
            )}
            <button
              onClick={() => setAiChatOpen(true)}
              className="px-3 py-1 bg-[#4F46E5] text-white text-sm rounded hover:bg-[#4338CA] transition-colors flex items-center gap-1"
              aria-label="AI Assist"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>AI</span>
            </button>
            <button
              onClick={() => {
                setTempData(JSON.parse(JSON.stringify(questionData)));
                setIsEditModalOpen(true);
              }}
              className="px-3 py-1 bg-[#20305D] text-white text-sm rounded hover:bg-[#162442] transition-colors"
            >
              Edit Response
            </button>
          </div>
        </div>

        {/* Content Display */}
        {renderQuestion()}

        {(isTableLoading || isSubjectiveLoading) && (
          <div className="text-sm text-gray-500 mt-2">Saving changes...</div>
        )}
        {metadata?.note && (
          <div
            className="text-xs text-gray-500 mt-2"
            dangerouslySetInnerHTML={{ __html: metadata.note }}
          />
        )}

        {/* Edit Modal */}
        {isEditModalOpen && (
          <EditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            title={title}
            onSave={handleSave}
            tempData={tempData}
            question={question}
            plantId={plantId}
            financialYear={financialYear}
            updateAuditStatus={updateAuditStatus}
            refetchAuditStatus={refetchAuditStatus}
          >
            {renderEditableContent()}
          </EditModal>
        )}

        {/* AI Chat Window */}
        {aiChatOpen && (
          <div className="fixed inset-0 z-[1000] flex items-end justify-end bg-opacity-50 transition-opacity duration-300">
            <div
              className="w-full h-full absolute top-0 left-0 bg-black/30"
              onClick={(e) => {
                e.stopPropagation();
                setAiChatOpen(false);
              }}
            />
            <div className="relative z-10 w-full max-w-md m-4 md:m-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white rounded-lg shadow-2xl p-0 overflow-hidden border border-gray-200">
                <ChatbotWindow
                  onClose={() => setAiChatOpen(false)}
                  initialMode="question"
                  activeQuestion={activeQuestion}
                  currentAnswer={{
                    text: questionData?.data?.text || '',
                    updatedData: {
                      text: questionData?.data?.text || ''
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppProvider>
  );
};

export default QuestionRenderer;
