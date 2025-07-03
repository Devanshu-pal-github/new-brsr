import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useSelector } from 'react-redux';
import QuestionEditPopup from '../../components/QuestionEditPopup';
import ChatbotWindow from '../../AICHATBOT/ChatbotWindow';
import { AppProvider } from '../../AICHATBOT/AppProvider';

// Import our custom renderers
import { 
  SubjectiveRenderer, 
  TableRenderer, 
  TableWithAdditionalRowsRenderer 
} from './renderers';

const DynamicQuestionRenderer = forwardRef(({ 
  question, 
  questionData, 
  onSave,
  isEditModalOpen,
  setIsEditModalOpen,
  moduleId,
  isSaving
}, ref) => {
  const [tempData, setTempData] = useState(questionData);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [chatbotInitialMode, setChatbotInitialMode] = useState('');
  const user = useSelector(state => state.auth.user);
  // Remove extraction of moduleId from question object
  // const moduleId = question.module_id;

  useEffect(() => {
    setTempData(questionData);
  }, [questionData]);

  const handleDataChange = (newData) => {
    setTempData(newData);
  };

  const handleSave = async (data) => {
    try {
      await onSave(data);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('❌ Error saving data:', error);
      // Keep modal open on error
    }
  };

  const handleAIClick = () => {
    // Get current answer for this question from state
    const currentAnswer = questionData || {};

    // Get question metadata when AI is clicked
    const metadata = {
      question_text: question.question_text || question.title || question.human_readable_id,
      has_string_value: question.has_string_value,
      has_decimal_value: question.has_decimal_value,
      has_boolean_value: question.has_boolean_value,
      has_link: question.has_link,
      has_note: question.has_note,
      string_value_required: question.string_value_required,
      decimal_value_required: question.decimal_value_required,
      boolean_value_required: question.boolean_value_required,
      link_required: question.link_required,
      note_required: question.note_required,
      type: question.type
    };

    // Store the current question data
    const questionContext = {
      metadata,
      currentAnswer: {
        string_value: currentAnswer.string_value,
        decimal_value: currentAnswer.decimal_value,
        bool_value: currentAnswer.bool_value,
        link: currentAnswer.link,
        note: currentAnswer.note,
        table: currentAnswer.table
      },
      timestamp: new Date().toISOString(),
      editCount: 1
    };

    // Store in localStorage
    try {
      const questionId = question.question_id || question._id;
      const storedQuestions = JSON.parse(localStorage.getItem('questionData') || '{}');
      storedQuestions[questionId] = questionContext;
      localStorage.setItem('questionData', JSON.stringify(storedQuestions));
      console.log('Stored questions data for question ID:', questionId);
      console.log('Stored question data:', questionContext);
    } catch (error) {
      console.error('Error storing question data:', error);
    }

    setChatbotInitialMode("question");
    setAiChatOpen(true);

    // expose method to parent via ref
    if (ref) {
      // useImperativeHandle will handle elsewhere
    }

  };

  const handleChatbotAccept = (answerText) => {
    // Set the AI-generated answer in tempData
    const updatedData = {
      ...questionData,
      string_value: answerText
    };
    setTempData(updatedData);
    
    // Open the edit popup
    setIsEditModalOpen(true);
    
    // Close the AI chat
    setAiChatOpen(false);
  };

  // Helper to get the correct value for a field (root, then metadata, then N/A)
  function getFieldValue(field, metaField) {
    if (question[field] !== undefined && question[field] !== null && question[field] !== "") return question[field];
    if (meta[metaField] !== undefined && meta[metaField] !== null && meta[metaField] !== "") return meta[metaField];
    return 'N/A';
  }
  const meta = question.metadata || {};
  const principle = getFieldValue('principle', 'principle');
  const indicator = getFieldValue('indicator', 'indicator');
  const section = getFieldValue('section', 'section');
  const auditRequired = getFieldValue('audit_required', 'audit_required');
  const audited = getFieldValue('audited', 'audited');

  // Capsule for question number
  const renderQuestionNumber = () => {
    const qNum = question.question_number || question.human_readable_id || question.question_id || question._id;
    if (!qNum) return null;
    return (
      <span className="inline-block bg-gray-200 text-gray-700 text-xs font-semibold px-2 py-1 rounded">Q.No: {qNum}</span>
    );
  };

  // Audit badges (right-aligned, Environment style)
  const renderAuditBadges = () => {
    // Audit Required capsule
    let auditRequiredCapsule = null;
    if (auditRequired === true) {
      auditRequiredCapsule = <span className="inline-block bg-blue-100 text-blue-800 text-xs  px-3 py-1 rounded">Audit Required</span>;
    } else if (auditRequired === false) {
      auditRequiredCapsule = <span className="inline-block bg-gray-100 text-gray-800 text-xs font-semibold px-3 py-1 rounded">No Audit Required</span>;
    }
    // Audited status capsule
    let auditedCapsule = null;
    if (auditRequired === true) {
      if (audited === true) {
        auditedCapsule = <span className="inline-block bg-green-100 text-green-800 border border-green-400 text-xs font-semibold px-2 py-1 rounded ml-2">Audited</span>;
      } else if (audited === false) {
        auditedCapsule = <span className="inline-block bg-red-100 text-red-700 border border-red-400 text-xs font-semibold px-2 py-1 rounded ml-2">Not Audited</span>;
      }
    }
    return (
      <div className="flex items-center gap-2 ml-2">
        {auditRequiredCapsule}
        {auditedCapsule}
      </div>
    );
  };

  const renderEditableContent = () => {
    const metadata = question.metadata;
    const questionType = questionData.question_type || (metadata && metadata.type);
    if (!question.metadata) {
      return <p className="text-gray-500">No metadata available for this question.</p>;
    }
    return (
      <>
        {renderMetaBadges()}
        <div
          className="text-sm font-semibold text-gray-700 mb-2 break-words"
          dangerouslySetInnerHTML={{ __html: question.question_text || question.title || question.human_readable_id }}
        />
        {(() => {
          switch (questionType) {
            case 'subjective':
              return (
                <SubjectiveRenderer 
                  metadata={metadata} 
                  data={tempData} 
                  isEditing={true} 
                  onSave={handleDataChange} 
                />
              );
            case 'table':
              return (
                <TableRenderer 
                  metadata={metadata} 
                  data={tempData} 
                  isEditing={true} 
                  onSave={handleDataChange} 
                />
              );
            case 'table_with_additional_rows':
              return (
                <>
                <TableWithAdditionalRowsRenderer 
                  metadata={metadata} 
                  data={tempData} 
                  isEditing={true} 
                  onSave={handleDataChange} 
                />
                </>
              );
            default:
              return <p className="text-gray-500">Unsupported question type: {questionType}</p>;
          }
        })()}
      </>
    );
  };

  const renderReadOnlyContent = () => {
    const metadata = question.metadata;
    const questionType = question.question_type || (metadata && metadata.type);
    return (
      <>
        <div className="flex flex-wrap justify-between items-start gap-4 mb-1">
          {/* Left: Question number and meta badges */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {renderQuestionNumber()}
            {principle && (
              <span className="inline-block bg-[#E0E7FF] text-[#3730A3] text-xs font-semibold px-2 py-1 rounded">Principle: {principle}</span>
            )}
            {indicator && (
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${indicator === 'Essential' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF9C3] text-[#92400E]'}`}>Indicator: {indicator}</span>
            )}
            {section && (
              <span className="inline-block bg-[#E5E7EB] text-gray-800 text-xs font-semibold px-2 py-1 rounded">Section: {section}</span>
            )}
          </div>
          {/* Right: Audit badges and action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {renderAuditBadges()}
            <button
              className="bg-[#4F46E5] text-white font-medium px-2 py-1 rounded-[4px] text-xs shadow-sm focus:outline-none transition-all duration-200 hover:bg-[#4338CA] flex items-center gap-1"
              onClick={handleAIClick}
              aria-label="AI Assist"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-2 py-1 bg-[#20305D] text-white rounded hover:bg-[#162442] text-xs font-medium"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Edit Response'}
            </button>
          </div>
        </div>
        {/* Question text */}
        <div className="flex-1">
          <div
            className="text-sm font-semibold text-gray-700 mb-2 break-words mt-2"
            style={{ maxWidth: '80%' }}
            dangerouslySetInnerHTML={{ __html: question.question_text || question.title || question.human_readable_id }}
          />
        </div>
        {/* Answer/response area */}
        {(!questionData || Object.keys(questionData).length === 0) ? (
          <p className="text-gray-500 italic">No response provided yet.</p>
        ) : (() => {
          switch (questionType) {
            case 'subjective':
              return (
                <SubjectiveRenderer 
                  metadata={metadata}
                  data={questionData}
                  isEditing={false}
                />
              );
            case 'table':
              return (
                <TableRenderer 
                  metadata={metadata} 
                  data={questionData} 
                  isEditing={false} 
                />
              );
            default:
              return <p className="text-gray-500">Unsupported question type: {questionType}</p>;
          }
        })()}
      </>
    );
  };

  useImperativeHandle(ref, () => ({
    openAIChat: handleAIClick,
  }));

  // Memoize question object to prevent unnecessary re-renders
  const memoizedQuestion = useMemo(() => ({
    ...question,
    question_id: question.question_id || question._id,
    question: question.question_text || question.title || question.human_readable_id,
    question_type: question.question_type || (question.metadata && question.metadata.headers && question.metadata.columns && question.metadata.rows ? 'table' : 'subjective'),
    has_string_value: question.question_type === 'subjective' || (!question.question_type && !(question.metadata && question.metadata.headers)),
    string_value_required: question.required,
  }), [question]);

  return (
    <AppProvider>
      <div className="relative">
        <div className="mt-2">
          {renderReadOnlyContent()}
        </div>

        {isEditModalOpen && (
          <QuestionEditPopup
            question={memoizedQuestion}
            initialAnswer={questionData || {}}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={handleSave}
            moduleId={moduleId}
            isOpen={isEditModalOpen}
          />
        )}

        {aiChatOpen && (
          <div className="fixed inset-0 z-[1000] flex items-end justify-end bg-opacity-50 transition-opacity duration-300">
            <div className="w-full h-full absolute top-0 left-0 bg-black/30" onClick={() => setAiChatOpen(false)} />
            <div className="relative z-10 w-full max-w-md m-4 md:m-8 animate-slide-up">
              <div className="bg-white rounded-lg shadow-2xl p-0 overflow-hidden border border-gray-200">
                <ChatbotWindow
                  onClose={() => setAiChatOpen(false)}
                  activeQuestion={question}
                  currentAnswer={questionData}
                  initialMode={chatbotInitialMode}
                  onAcceptAnswer={handleChatbotAccept}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppProvider>
  );
});

export default DynamicQuestionRenderer;