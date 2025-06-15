import React, { useState, useEffect } from 'react';
import EditModal from './EditModal';

// Import renderers from Environment components or create new ones
import TableRenderer from '../../../Environment/components/TableRenderer';
import MultiTableRenderer from '../../../Environment/components/MultiTableRenderer';
import DynamicTableRenderer from '../../../Environment/components/DynamicTableRenderer';

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

    // For now, just show that there's data
    // In a real implementation, you would render a read-only version of the table
    return (
      <div className="p-2 bg-gray-50 rounded border border-gray-200">
        <p className="text-green-600 font-medium">Response submitted</p>
        <p className="text-xs text-gray-500 mt-1">Click 'Edit Response' to view or modify the data</p>
      </div>
    );
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