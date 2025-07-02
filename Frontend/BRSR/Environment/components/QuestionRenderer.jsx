import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TableRenderer from './TableRenderer';
import MultiTableRenderer from './MultiTableRenderer';
import DynamicTableRenderer from './DynamicTableRenderer';
import { useUpdateTableAnswerEnvironmentMutation, useUpdateSubjectiveAnswerMutation, useUpdateAuditStatusMutation, useGetAuditStatusQuery } from '../../src/store/api/apiSlice';
import { toast } from 'react-toastify';
import SubjectiveQuestionRenderer from './SubjectiveQuestionRenderer';
import EditModalEnvironment from './EditModalEnvironment';
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

const QuestionRenderer = ({ question, financialYear, plantId, turnover }) => {
  console.log('[QuestionRenderer] Rendering Question:', question);
  console.log('[QuestionRenderer] turnover prop:', turnover);
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
  // Send the full question description (not just the title) as question_text
  const activeQuestion = {
    question_id: question.id,
    question_text: description || title || '', // Use full description for specificity
    question_title: title || '', // Optionally keep the title as a separate field
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

  // --- RAG Table Integration ---
  // State for showing RAG modal for tables
  const [ragTableModalOpen, setRagTableModalOpen] = useState(false);
  // Callback to receive RAG table values
  const handleRagTableValues = (ragValues) => {
    console.log('🔍 [QuestionRenderer] Received RAG values:', ragValues);
    console.log('🔍 [QuestionRenderer] Current tempData:', tempData);
    console.log('🔍 [QuestionRenderer] Metadata rows:', metadata?.rows);

    // ragValues: { rowIdx: { colKey: value, ... }, ... }
    // Only update editable fields (not auto-calculated)
    if (!metadata?.rows) {
      console.warn('🔍 [QuestionRenderer] No metadata rows found');
      return;
    }

    // More specific filtering for auto-calculated rows
    // Only exclude rows that are explicitly marked as calculated or contain specific auto-calc keywords
    const autoCalcRows = metadata.rows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => {
        const param = row.parameter?.toLowerCase() || '';
        // Only exclude rows that are truly auto-calculated (like "Total energy consumption (A+B+C)")
        return param.includes('(a+b+c)') || param.includes('total energy consumption') ||
          param.includes('auto-calculated') || row.isCalculated === true ||
          param.includes('total (a+b') || param.includes('sum of');
      })
      .map(({ idx }) => idx);

    console.log('🔍 [QuestionRenderer] Auto-calc rows to exclude:', autoCalcRows);

    // Deep copy
    const updated = JSON.parse(JSON.stringify(tempData?.data || {}));

    Object.entries(ragValues || {}).forEach(([rowIdx, rowData]) => {
      const numericRowIdx = Number(rowIdx);
      console.log(`🔍 [QuestionRenderer] Processing row ${rowIdx} (${numericRowIdx}):`, rowData);

      if (!autoCalcRows.includes(numericRowIdx)) {
        console.log(`🔍 [QuestionRenderer] Updating row ${rowIdx} with:`, rowData);
        updated[rowIdx] = { ...updated[rowIdx], ...rowData };
      } else {
        console.log(`🔍 [QuestionRenderer] Skipping auto-calc row ${rowIdx}`);
      }
    });

    console.log('🔍 [QuestionRenderer] Final updated data:', updated);
    setTempData({ ...tempData, data: updated });
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
            turnover={turnover}
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
          <SubjectiveQuestionRenderer
            question={question}
            answer={tempData}
            onAnswerChange={setTempData}
            isReadOnly={false}
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
            onAnswerChange={() => { }}
            isReadOnly={true}
          />
        );
      case 'table': {
        // Patch: If data is an array, convert to object for TableRenderer
        let tableData = questionData?.data || {};
        if (Array.isArray(tableData)) {
          // Convert array to object with row indices as keys
          const objData = {};
          tableData.forEach((row, idx) => {
            objData[idx] = row;
          });
          tableData = objData;
        }
        return (
          <TableRenderer
            metadata={metadata}
            data={tableData}
            isEditing={false}
            turnover={turnover}
          />
        );
      }
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
      <div className="bg-white rounded-lg p-4 mb-6">
        {/* Principle and Indicator display */}
        {/* {(question.principle || question.indicator) && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {question.principle && (
              <span className="inline-block bg-[#E0E7FF] text-[#3730A3] text-xs font-semibold px-2 py-1 rounded">Principle: {question.principle}</span>
            )}
            {question.indicator && (
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${question.indicator === 'Essential' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF9C3] text-[#92400E]'}`}>Indicator: {question.indicator}</span>
            )}
          </div>
        )} */}

        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            {/* Principle, Indicator, and Question ID */}
            <div className="flex flex-wrap items-center gap-2 mb-1">

              {question.id && (
                <span className="inline-block bg-gray-200 text-gray-700 text-xs font-semibold px-2 py-1 rounded">Q.No: {question.id}</span>
              )}

              {question.principle && (
                <span className="inline-block bg-[#E0E7FF] text-[#3730A3] text-xs font-semibold px-2 py-1 rounded">Principle: {question.principle}</span>
              )}
              {question.indicator && (
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${question.indicator === 'Essential' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF9C3] text-[#92400E]'}`}>Indicator: {question.indicator}</span>
              )}

            </div>
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
          <EditModalEnvironment
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
            metadata={metadata}
            ragTableModalOpen={ragTableModalOpen}
            setRagTableModalOpen={setRagTableModalOpen}
            handleRagTableValues={handleRagTableValues}
          >
            {renderEditableContent()}
          </EditModalEnvironment>
        )}

        {/* AI Chat Window */}
        {aiChatOpen && (
          <div className="fixed inset-0 z-[1000] flex items-end justify-end bg-opacity-50 transition-opacity duration-300">
            <div
              className="w-full h-full absolute top-0 left-0 bg-black/30"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  e.stopPropagation();
                  setAiChatOpen(false);
                }
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
