import React, { useState, useEffect } from 'react';

const TableRenderer = ({ metadata, data = {}, isEditing = false, onSave }) => {
  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const handleCellChange = (rowIndex, colKey, value) => {
    setLocalData(prevData => {
      const newData = { ...prevData };
      if (!newData[rowIndex]) {
        newData[rowIndex] = {};
      }
      newData[rowIndex][colKey] = value;
      return newData;
    });

    // Pass changes up immediately for parent component to handle
    if (onSave) {
      onSave(localData);
    }
  };

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
                      value={colIdx === 0 ? 
                        (localData[idx]?.category_of_waste || '') : 
                        (localData[idx]?.[col.key] || '')}
                      onChange={(e) => handleCellChange(
                        idx, 
                        colIdx === 0 ? 'category_of_waste' : col.key, 
                        e.target.value
                      )}
                      className="w-full p-1 border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                      placeholder={colIdx === 0 ? "Enter category" : "Enter value"}
                    />
                  ) : (
                    <div dangerouslySetInnerHTML={{ 
                      __html: colIdx === 0 ? 
                        (localData[idx]?.category_of_waste || row.parameter || '') :
                        (localData[idx]?.[col.key] || '')
                    }} />
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
