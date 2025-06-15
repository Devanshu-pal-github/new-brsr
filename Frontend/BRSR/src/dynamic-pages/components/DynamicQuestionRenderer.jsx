import React, { useState, useEffect } from 'react';
import EditModal from './EditModal';

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
      return <p className="text-gray-500 italic">No response provided yet.</p>;
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
    <>
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
    </>
  );
};

export default DynamicQuestionRenderer;