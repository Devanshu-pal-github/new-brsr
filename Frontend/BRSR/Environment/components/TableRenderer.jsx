import React from 'react';

const TableRenderer = ({ metadata, data = {}, isEditing = false, onSave }) => {
  const handleCellChange = (rowIndex, colKey, value) => {
    const newData = { ...data };
    if (!newData[rowIndex]) {
      newData[rowIndex] = {};
    }
    newData[rowIndex][colKey] = value;
    if (onSave) {
      onSave(newData);
    }
  };

  // Check if the first column should be editable
  const isFirstColumnEditable = metadata.columns[0]?.key === 'category_of_waste' || 
                               metadata.columns[0]?.key === 'waste_category';

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-300">
        <thead>
          <tr>
            {metadata.columns.map((col) => (
              <th
                key={col.key}
                className="border border-gray-300 px-4 py-2 text-sm font-medium bg-gray-50"
                dangerouslySetInnerHTML={{ __html: col.label }}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {metadata.rows.map((row, idx) => (
            <tr key={idx}>
              {metadata.columns.map((col, colIdx) => (
                <td key={col.key} className="border border-gray-300 px-4 py-2 text-sm">
                  {isEditing && (colIdx > 0 || isFirstColumnEditable) ? (
                    <input
                      type="text"
                      value={colIdx === 0 ? (data[idx]?.category_of_waste || '') : (data[idx]?.[col.key] || '')}
                      onChange={(e) => handleCellChange(idx, colIdx === 0 ? 'category_of_waste' : col.key, e.target.value)}
                      className="w-full p-1 border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                      placeholder={colIdx === 0 ? "Enter waste category" : "Enter value"}
                    />
                  ) : (
                    colIdx === 0 ? 
                      (data[idx]?.category_of_waste || row.parameter || '') :
                      (data[idx]?.[col.key] || '')
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableRenderer;
