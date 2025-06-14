import React, { useState } from 'react';
import TableRenderer from './TableRenderer';
import MultiTableRenderer from './MultiTableRenderer';
import DynamicTableRenderer from './DynamicTableRenderer';
import { useUpdateTableAnswerMutation } from '../../src/store/api/apiSlice';
import { toast } from 'react-toastify';

const AuditBadge = ({ isAuditRequired }) => (
  <div className={`inline-block px-3 py-1 rounded-full text-xs ${
    isAuditRequired ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }`}>
    {isAuditRequired ? 'Audit Required' : 'No Audit Required'}
  </div>
);

const EditModal = ({ isOpen, onClose, children, title, onSave, tempData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
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
  const [questionData, setQuestionData] = useState(question.answer || {});
  const [tempData, setTempData] = useState(questionData);
  const [updateTableAnswer, { isLoading }] = useUpdateTableAnswerMutation();
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

      if (metadata?.type === 'table' || metadata?.type === 'multi-table' || metadata?.type === 'dynamic-table') {
        let formattedData;
        
        if (metadata.type === 'table') {
          // Format single table data
          formattedData = Object.entries(data).map(([rowIndex, rowData]) => ({
            row_index: parseInt(rowIndex),
            current_year: rowData.current_year || '',
            previous_year: rowData.previous_year || ''
          }));
        } else if (metadata.type === 'multi-table') {
          // Format multi-table data
          formattedData = {};
          Object.entries(data).forEach(([tableKey, tableData]) => {
            formattedData[tableKey] = Object.entries(tableData).map(([rowIndex, rowData]) => ({
              row_index: parseInt(rowIndex),
              current_year: rowData.current_year || '',
              previous_year: rowData.previous_year || ''
            }));
          });
        } else if (metadata.type === 'dynamic-table') {
          // Format dynamic table data similar to single table
          formattedData = Object.entries(data).map(([rowIndex, rowData]) => ({
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

        toast.success('Answer saved successfully');
      } else {
        // Handle non-table data types if needed
        console.log('Saving non-table data:', data);
      }

      setQuestionData(data);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to save answer:', error);
      toast.error(error.data?.detail || 'Failed to save answer');
    }
  };

  const handleDataChange = (newData) => {
    setTempData(newData);
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
          <AuditBadge isAuditRequired={isAuditRequired} />
          <button
            onClick={() => {
              setTempData(questionData); // Reset temp data when opening modal
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
          questionId={question.id}
          questionTitle={title}
          financialYear={financialYear}
        />
      )}
      {metadata?.type === 'dynamic-table' && (
        <DynamicTableRenderer 
          metadata={metadata} 
          data={questionData}
        />
      )}
      {isLoading && (
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
    </div>
  );
};

export default QuestionRenderer;
