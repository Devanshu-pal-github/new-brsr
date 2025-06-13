import React, { useState } from 'react';
import TableRenderer from './TableRenderer';

const AuditBadge = ({ isAuditRequired }) => (
  <div
    className={`inline-block px-3 py-1 rounded-full text-xs ${
      isAuditRequired
        ? 'bg-green-100 text-green-800'
        : 'bg-gray-100 text-gray-800'
    }`}
  >
    {isAuditRequired ? 'Audit Required' : 'No Audit Required'}
  </div>
);

const EditModal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit Response</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const EditableTable = ({ metadata, initialData = {}, onSave }) => {
  const [tableData, setTableData] = useState(
    metadata.rows.map((row) => ({
      parameter: row.parameter,
      current_year: initialData[row.parameter]?.current_year || '',
      previous_year: initialData[row.parameter]?.previous_year || '',
    }))
  );

  return (
    <div>
      <table className="min-w-full border border-gray-300">
        <thead>
          <tr>
            {metadata.columns.map((col) => (
              <th
                key={col.key}
                className="border border-gray-300 px-4 py-2 bg-gray-50"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td
                className="border border-gray-300 px-4 py-2"
                dangerouslySetInnerHTML={{ __html: row.parameter }}
              />
              {metadata.columns.slice(1).map((col) => (
                <td key={col.key} className="border border-gray-300 px-4 py-2">
                  <input
                    type="text"
                    value={row[col.key] || ''}
                    onChange={(e) => {
                      const newData = [...tableData];
                      newData[rowIndex] = { ...row, [col.key]: e.target.value };
                      setTableData(newData);
                    }}
                    className="w-full p-1 border border-gray-300 rounded"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onSave(tableData)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

const QuestionContainer = ({ question }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [questionData, setQuestionData] = useState(question.answer || {});

  const handleSave = (data) => {
    setQuestionData(data);
    setIsEditModalOpen(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 mb-6">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">{question.title}</h3>
          <p className="text-sm text-gray-600">{question.description}</p>
        </div>
        <div className="flex items-center space-x-4">
          <AuditBadge isAuditRequired={question.isAuditRequired} />
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Edit Response
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="mt-4">
        <TableRenderer metadata={question.metadata} data={questionData} />
      </div>

      {/* Edit Modal */}
      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      >
        <EditableTable
          metadata={question.metadata}
          initialData={questionData}
          onSave={handleSave}
        />
      </EditModal>
    </div>
  );
};

export default QuestionContainer;
