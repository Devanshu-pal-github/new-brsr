import React, { useState, useEffect } from 'react';

const TableRenderer = ({ metadata, data, isEditing = false, onSave }) => {
  const [localData, setLocalData] = useState(data || {});

  // Update local data when the prop changes
  useEffect(() => {
    if (data) {
      setLocalData(data);
    }
  }, [data]);

  const handleCellChange = (rowIndex, columnKey, value) => {
    // Create a deep copy of the data
    const updatedData = JSON.parse(JSON.stringify(localData));
    
    // Ensure the row exists
    if (!updatedData[rowIndex]) {
      updatedData[rowIndex] = {};
    }
    
    // Update the cell value
    updatedData[rowIndex][columnKey] = value;
    
    // Update local state
    setLocalData(updatedData);
    
    // Call the parent onSave if provided
    if (onSave) {
      onSave(updatedData);
    }
  };

  if (!metadata?.columns || metadata.columns.length === 0) {
    return <div className="text-sm text-gray-500">No table configuration available</div>;
  }

  // Check if rows exist in metadata
  if (!metadata?.rows || metadata.rows.length === 0) {
    return <div className="text-sm text-gray-500">No rows defined for this table</div>;
  }

  // Add units column to columns array if not present
  const columnsWithUnits = metadata.columns.find(col => col.key === 'unit') 
    ? metadata.columns 
    : [...metadata.columns, { label: 'Unit', key: 'unit' }];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-300">
        <thead>
          <tr>
            {columnsWithUnits.map((column, idx) => (
              <th 
                key={idx}
                scope="col"
                className="border border-gray-300 px-4 py-2 text-sm font-medium bg-gray-50"
                dangerouslySetInnerHTML={{ __html: column.label }}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {metadata.rows.map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {columnsWithUnits.map((column, colIdx) => {
                const columnKey = column.key || `col${colIdx}`;
                
                // For the first column (parameter column), display the row parameter
                if (columnKey === 'parameter') {
                  return (
                    <td 
                      key={colIdx} 
                      className="border border-gray-300 px-4 py-2 text-sm"
                      dangerouslySetInnerHTML={{ __html: row.parameter || '' }}
                    />
                  );
                }

                // For unit column, display the unit from metadata
                if (columnKey === 'unit') {
                  return (
                    <td 
                      key={colIdx} 
                      className="border border-gray-300 px-4 py-2 text-sm text-gray-600 italic"
                    >
                      {row.unit || ''}
                    </td>
                  );
                }
                
                // For data columns, display the cell value or input field
                const cellValue = localData[rowIdx]?.[columnKey] || '';
                
                return (
                  <td 
                    key={colIdx} 
                    className="border border-gray-300 px-4 py-2 text-sm"
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full p-1 border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                        value={cellValue}
                        onChange={(e) => handleCellChange(rowIdx, columnKey, e.target.value)}
                        placeholder="Enter value"
                      />
                    ) : (
                      <div>{cellValue}</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableRenderer;
