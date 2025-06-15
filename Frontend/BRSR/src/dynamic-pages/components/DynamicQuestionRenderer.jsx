import React, { useState, useEffect } from 'react';
import EditModal from './EditModal';
import ChatbotWindow from '../../AICHATBOT/ChatbotWindow';
import { AppProvider } from '../../AICHATBOT/AppProvider';

// Import our custom renderers
import { 
  SubjectiveRenderer, 
  TableRenderer, 
  TableWithAdditionalRowsRenderer 
} from './renderers';

const DynamicQuestionRenderer = ({ 
  question, 
  questionData, 
  onSave,
  isEditModalOpen,
  setIsEditModalOpen
 }) => {
  const [tempData, setTempData] = useState(questionData);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [chatbotInitialMode, setChatbotInitialMode] = useState("general");

  console.log('🧩 Question:', question);

  // Update tempData when questionData changes
  useEffect(() => {
    setTempData(questionData);
  }, [questionData]);

  // Log the question metadata for debugging
  console.log('🧩 Question metadata:', question.metadata);
  console.log('📊 Question data:', questionData);

  const handleDataChange = (newData) => {
    console.log('📝 Data changed in renderer:', newData);
    setTempData(newData);
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
      const storedQuestions = JSON.parse(localStorage.getItem('questionData') || '{}');
      storedQuestions[question.question_id] = questionContext;
      localStorage.setItem('questionData', JSON.stringify(storedQuestions));
      console.log('Stored question data:', questionContext);
    } catch (error) {
      console.error('Error storing question data:', error);
    }

    setChatbotInitialMode("question");
    setAiChatOpen(true);
  };

  const renderEditableContent = () => {
    const metadata = question.metadata;
    
    if (!metadata) {
      return <p className="text-gray-500">No metadata available for this question.</p>;
    }

    switch (metadata.type) {
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
          <TableWithAdditionalRowsRenderer 
            metadata={metadata} 
            data={tempData} 
            isEditing={true} 
            onSave={handleDataChange} 
          />
        );
      default:
        return <p className="text-gray-500">Unsupported question type: {metadata.type}</p>;
    }
  };

  const renderReadOnlyContent = () => {
    // Display read-only version of the question data
    if (!questionData || !Object.keys(questionData).length) {
      return <p className="text-gray-500 italic">No response provided yet</p>;
    }

    const metadata = question.metadata;
    if (!metadata) {
      return <p className="text-green-600">Response submitted</p>;
    }

    // Render the appropriate read-only component based on question type
    switch (metadata.type) {
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
      case 'table_with_additional_rows':
        return (
          <TableWithAdditionalRowsRenderer 
            metadata={metadata} 
            data={questionData} 
            isEditing={false} 
          />
        );
      default:
        return (
          <div className="p-2 bg-gray-50 rounded border border-gray-200">
            <p className="text-green-600 font-medium">Response submitted</p>
            <p className="text-xs text-gray-500 mt-1">Click 'Edit Response' to view or modify the data</p>
          </div>
        );
    }
  };

  return (
    <AppProvider>
      <div className="relative">
        {/* AI Button */}
        <button
          className="absolute right-2 top-2 bg-[#4F46E5] text-white font-medium px-2 min-w-[32px] min-h-[20px] rounded-[4px] text-[11px] shadow-sm focus:outline-none transition-all duration-200 hover:bg-[#4338CA] flex items-center gap-1"
          onClick={handleAIClick}
          aria-label="AI Assist"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI
        </button>

        <div className="mt-2">
          {renderReadOnlyContent()}
        </div>

        <EditModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          title={`Edit: ${question.question_text || question.title || question.human_readable_id}`}
          onSave={() => onSave(tempData)}
          tempData={tempData}
        >
          {renderEditableContent()}
        </EditModal>

        {/* AI Chat Window */}
        {aiChatOpen && (
          <div className="fixed inset-0 z-[1000] flex items-end justify-end bg-opacity-50 transition-opacity duration-300">
            <div className="w-full h-full absolute top-0 left-0" onClick={() => setAiChatOpen(false)} />
            <div className="relative z-10 w-full max-w-md m-4 md:m-8 animate-slide-up">
              <div className="bg-white rounded-lg shadow-2xl p-0 overflow-hidden border border-gray-200">
                <ChatbotWindow
                  onClose={() => setAiChatOpen(false)}
                  initialMode={chatbotInitialMode}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppProvider>
  );
};

export default DynamicQuestionRenderer;