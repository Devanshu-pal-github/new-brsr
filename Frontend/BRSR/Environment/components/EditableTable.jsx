import React, { useState, useEffect } from 'react';

const EditableTable = ({ metadata, initialData, onSave }) => {
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    // Initialize table data with existing values or empty cells
    const initialTableData = metadata.rows.map(row => {
      const rowData = { parameter: row.parameter };
      metadata.columns.forEach(col => {
        if (col.key !== 'parameter') {
          rowData[col.key] = initialData?.[row.parameter]?.[col.key] || '';
        }
      });
      return rowData;
    });
    setTableData(initialTableData);
  }, [metadata, initialData]);

  const handleCellChange = (rowIndex, columnKey, value) => {
    setTableData(prevData => {
      const newData = [...prevData];
      newData[rowIndex] = {
        ...newData[rowIndex],
        [columnKey]: value
      };
      return newData;
    });
  };

  const handleSave = () => {
    // Convert table data to the required format
    const formattedData = tableData.reduce((acc, row) => {
      acc[row.parameter] = row;
      return acc;
    }, {});
    onSave(formattedData);
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead>
            <tr>
              {metadata.columns.map(col => (
                <th
                  key={col.key}
                  className="border border-gray-300 px-4 py-2 bg-gray-50 text-sm font-medium"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {metadata.columns.map(col => (
                  <td key={col.key} className="border border-gray-300 p-2">
                    {col.key === 'parameter' ? (
                      <div dangerouslySetInnerHTML={{ __html: row.parameter }} />
                    ) : (
                      <input
                        type="text"
                        value={row[col.key] || ''}
                        onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default EditableTable;
