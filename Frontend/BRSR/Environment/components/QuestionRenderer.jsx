import React, { useState, useEffect } from 'react';
import TableRenderer from './TableRenderer';
import MultiTableRenderer from './MultiTableRenderer';
import DynamicTableRenderer from './DynamicTableRenderer';
import { useUpdateTableAnswerMutation, useUpdateSubjectiveAnswerMutation } from '../../src/store/api/apiSlice';
import { toast } from 'react-toastify';
import SubjectiveQuestionRenderer from './SubjectiveQuestionRenderer';
import ChatbotWindow from '../../src/AICHATBOT/ChatbotWindow';
import { AppProvider } from '../../src/AICHATBOT/AppProvider';

const AuditBadge = ({ isAuditRequired }) => (
  <div className={`inline-block px-3 py-1 rounded text-xs ${
    isAuditRequired ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }`}>
    {isAuditRequired ? 'Audit Required' : 'No Audit Required'}
  </div>
);

const EditModal = ({ isOpen, onClose, children, title, onSave, tempData }) => {
  if (!isOpen) return null;

  const handleOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      onClose();
    }
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
  );
};

const QuestionRenderer = ({ question, financialYear }) => {
  console.log('Rendering Question:', question);
  const { title, description, metadata, isAuditRequired } = question;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [questionData, setQuestionData] = useState(() => {
    if (metadata?.type === 'subjective') {
      return question.answer?.text || '';
    }
    return question.answer || {};
  });
  const [tempData, setTempData] = useState(questionData);
  const [updateTableAnswer, { isLoading: isTableLoading }] = useUpdateTableAnswerMutation();
  const [updateSubjectiveAnswer, { isLoading: isSubjectiveLoading }] = useUpdateSubjectiveAnswerMutation();

  // Add these new states for ChatbotWindow
  const [aiChatOpen, setAiChatOpen] = useState(false);

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
      // For subjective questions, just get the text
      if (metadata?.type === 'subjective') {
        const answerText = question.answer?.text || '';
        setQuestionData(answerText);
        setTempData(answerText);
      }
      // For multi-table, transform the flattened array to the expected nested structure
      else if (metadata?.type === 'multi-table' && Array.isArray(question.answer)) {
        const transformedData = {};
        
        // Process each item in the flattened array
        question.answer.forEach(item => {
          const tableKey = item.table_key;
          const rowIndex = item.row_index;
          
          // Initialize the table if it doesn't exist
          if (!transformedData[tableKey]) {
            transformedData[tableKey] = {};
          }
          
          // Initialize the row if it doesn't exist
          if (!transformedData[tableKey][rowIndex]) {
            transformedData[tableKey][rowIndex] = {};
          }
          
          // Add the data to the nested structure
          transformedData[tableKey][rowIndex].current_year = item.current_year || '';
          transformedData[tableKey][rowIndex].previous_year = item.previous_year || '';
        });
        
        setQuestionData(transformedData);
      } 
      // For dynamic-table, transform the flattened array to the expected structure
      else if (metadata?.type === 'dynamic-table' && Array.isArray(question.answer)) {
        const transformedData = {};
        
        // Convert array of objects to object with row indices as keys
        question.answer.forEach(item => {
          const rowIndex = item.row_index;
          // Create a copy of the item without row_index
          const rowData = { ...item };
          delete rowData.row_index;
          transformedData[rowIndex] = rowData;
        });
        
        setQuestionData(transformedData);
      }
      else {
        setQuestionData(question.answer);
      }
    }
  }, [question.answer, metadata?.type]);

  const handleSave = async (data) => {
    console.log('Saving data with:', {
      questionId: question.id,
      questionTitle: title,
      financialYear,
      type: metadata?.type,
      data
    });

    try {
      if (!question.id || !title || !financialYear) {
        console.error('Missing required data:', {
          questionId: question.id,
          questionTitle: title,
          financialYear
        });
        toast.error('Missing required question information');
        return;
      }

      if (metadata?.type === 'subjective') {
        // Handle subjective question data
        await updateSubjectiveAnswer({
          questionId: question.id,
          questionTitle: title,
          financialYear,
          type: 'subjective',
          data: {
            text: typeof data === 'string' ? data : data?.text || ''
          }
        }).unwrap();

        // Update the local state with the string value
        const newText = typeof data === 'string' ? data : data?.text || '';
        setQuestionData(newText);
        setIsEditModalOpen(false);
        toast.success('Answer saved successfully');
      } else if (metadata?.type === 'table' || metadata?.type === 'multi-table' || metadata?.type === 'dynamic-table') {
        let formattedData;
        
        // Create a deep copy of the data to avoid modifying read-only properties
        const dataCopy = JSON.parse(JSON.stringify(data));
        
        if (metadata.type === 'table') {
          // Format single table data
          formattedData = Object.entries(dataCopy).map(([rowIndex, rowData]) => ({
            row_index: parseInt(rowIndex),
            current_year: rowData.current_year || '',
            previous_year: rowData.previous_year || ''
          }));
        } else if (metadata.type === 'multi-table') {
          // For multi-table, we need to handle the structure differently
          // The backend expects an array of objects, not a nested structure
          const tableEntries = Object.entries(dataCopy);
          
          if (tableEntries.length > 0) {
            // Convert the multi-table structure to a flat array for the API
            const flattenedData = [];
            
            tableEntries.forEach(([tableKey, tableData]) => {
              Object.entries(tableData).forEach(([rowIndex, rowData]) => {
                flattenedData.push({
                  table_key: tableKey,
                  row_index: parseInt(rowIndex),
                  current_year: rowData.current_year || '',
                  previous_year: rowData.previous_year || ''
                });
              });
            });
            
            formattedData = flattenedData;
          } else {
            formattedData = [];
          }
        } else if (metadata.type === 'dynamic-table') {
          // Format dynamic table data similar to single table
          formattedData = Object.entries(dataCopy).map(([rowIndex, rowData]) => ({
            row_index: parseInt(rowIndex),
            ...rowData
          }));
        }

        await updateTableAnswer({
          financialYear,
          questionId: question.id,
          questionTitle: title,
          updatedData: formattedData
        }).unwrap();

        // Create a deep copy before setting state
        setQuestionData(JSON.parse(JSON.stringify(data)));
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
            data={tempData} 
            isEditing={true} 
            onSave={handleDataChange} 
          />
        );
      case 'multi-table':
        return (
          <MultiTableRenderer 
            metadata={metadata} 
            data={tempData} 
            isEditing={true} 
            onSave={handleDataChange} 
          />
        );
      case 'dynamic-table':
        return (
          <DynamicTableRenderer 
            metadata={metadata} 
            data={tempData} 
            isEditing={true} 
            onSave={handleDataChange} 
          />
        );
      case 'subjective':
        return (
          <textarea
            className="w-full p-3 border border-gray-300 rounded-md min-h-[200px]"
            placeholder="Enter your response here..."
            value={tempData || ''}
            onChange={(e) => setTempData(e.target.value)}
          />
        );
      default:
        return (
          <textarea
            className="w-full p-3 border border-gray-300 rounded-md min-h-[200px]"
            placeholder="Enter your response here..."
            value={tempData.text || ''}
            onChange={(e) => setTempData({ text: e.target.value })}
          />
        );
    }
  };

  return (
    <AppProvider>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="font-semibold text-base text-[#20305D]">{title}</div>
            {description && (
              <div 
                className="text-sm text-gray-700 mb-2" 
                dangerouslySetInnerHTML={{ __html: description }}
              />
            )}
          </div>
          <div className="flex items-center space-x-3 ml-4">
            {/* Add AI Button */}

            <AuditBadge isAuditRequired={isAuditRequired} />

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
        </div>      {/* Content Display */}
        {metadata?.type === 'table' && (
          <TableRenderer 
            metadata={metadata} 
            data={questionData}
          />
        )}
        {metadata?.type === 'multi-table' && (
          <MultiTableRenderer 
            metadata={metadata} 
            data={questionData}
          />
        )}
        {metadata?.type === 'dynamic-table' && (
          <DynamicTableRenderer 
            metadata={metadata} 
            data={questionData}
          />
        )}
        {metadata?.type === 'subjective' && (
          <>
            {!isEditModalOpen && (
              <div className="mb-4">
                {/* <div className="text-gray-700 whitespace-pre-wrap p-3 bg-gray-50 rounded-md border border-gray-200 min-h-[120px]">
                  {typeof questionData === 'string' ? questionData : questionData?.text || 'No response provided yet'}
                </div> */}
              </div>
            )}
            <SubjectiveQuestionRenderer 
              question={question}
              answer={{
                text: typeof questionData === 'string' ? questionData : questionData?.text || '',
                updatedData: {
                  text: typeof questionData === 'string' ? questionData : questionData?.text || ''
                }
              }}
              isReadOnly={!isEditModalOpen}
              onAnswerChange={(newAnswer) => {
                const newText = newAnswer.data.text;
                setTempData(newText);
                handleSave(newText);
              }}
            />
          </>
        )}
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
        <EditModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit - ${title}`}
          onSave={handleSave}
          tempData={tempData}
        >
          {renderEditableContent()}
        </EditModal>

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
                    text: typeof questionData === 'string' ? questionData : questionData?.text || '',
                    updatedData: {
                      text: typeof questionData === 'string' ? questionData : questionData?.text || ''
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
