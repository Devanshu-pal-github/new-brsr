import React, { useState, useEffect } from 'react';
import TableRenderer from './TableRenderer';

const TableWithAdditionalRowsRenderer = ({ metadata, data, isEditing = false, onSave }) => {
  const [localData, setLocalData] = useState(data || { rows: [], additionalRows: [] });
  const [additionalRowCount, setAdditionalRowCount] = useState(
    (data && data.additionalRows && data.additionalRows.length) || 0
  );

  // Update local data when the prop changes
  useEffect(() => {
    if (data) {
      setLocalData(data);
      setAdditionalRowCount((data.additionalRows && data.additionalRows.length) || 0);
    }
  }, [data]);

  // Handle adding a new row
  const handleAddRow = () => {
    const updatedData = { ...localData };
    
    // Initialize additionalRows array if it doesn't exist
    if (!updatedData.additionalRows) {
      updatedData.additionalRows = [];
    }
    
    // Create a new empty row with cells
    const columnCount = metadata.columns ? metadata.columns.length : 0;
    const newRow = {
      cells: Array(columnCount).fill(0).map(() => ({ value: '' }))
    };
    
    // Add the new row
    updatedData.additionalRows.push(newRow);
    
    setLocalData(updatedData);
    setAdditionalRowCount(updatedData.additionalRows.length);
    
    if (onSave) {
      onSave(updatedData);
    }
  };

  // Handle removing a row
  const handleRemoveRow = (rowIndex) => {
    const updatedData = { ...localData };
    
    if (updatedData.additionalRows && updatedData.additionalRows.length > rowIndex) {
      updatedData.additionalRows.splice(rowIndex, 1);
      
      setLocalData(updatedData);
      setAdditionalRowCount(updatedData.additionalRows.length);
      
      if (onSave) {
        onSave(updatedData);
      }
    }
  };

  // Handle cell value change in additional rows
  const handleAdditionalCellChange = (rowIndex, colIndex, value) => {
    const updatedData = { ...localData };
    
    // Initialize additionalRows array if it doesn't exist
    if (!updatedData.additionalRows) {
      updatedData.additionalRows = [];
    }
    
    // Initialize row if it doesn't exist
    if (!updatedData.additionalRows[rowIndex]) {
      updatedData.additionalRows[rowIndex] = { cells: [] };
    }
    
    // Initialize cells array if it doesn't exist
    if (!updatedData.additionalRows[rowIndex].cells) {
      updatedData.additionalRows[rowIndex].cells = [];
    }
    
    // Update cell value
    updatedData.additionalRows[rowIndex].cells[colIndex] = { value };
    
    setLocalData(updatedData);
    
    if (onSave) {
      onSave(updatedData);
    }
  };

  // Get cell value from additional rows data
  const getAdditionalCellValue = (rowIndex, colIndex) => {
    if (!localData || !localData.additionalRows || !localData.additionalRows[rowIndex] || 
        !localData.additionalRows[rowIndex].cells || !localData.additionalRows[rowIndex].cells[colIndex]) {
      return '';
    }
    return localData.additionalRows[rowIndex].cells[colIndex].value || '';
  };

  // Render table headers recursively (same as TableRenderer)
  const renderHeaders = (headers, level = 0) => {
    if (!headers || headers.length === 0) return null;

    return (
      <tr className={`bg-gray-${level === 0 ? '200' : '100'}`}>
        {headers.map((header, index) => {
          const colSpan = header.colspan || 1;
          const rowSpan = header.rowspan || 1;
          
          return (
            <th 
              key={`header-${level}-${index}`}
              colSpan={colSpan}
              rowSpan={rowSpan}
              className="border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 text-center"
              style={{
                width: header.width || 'auto',
                minWidth: header.minWidth || 'auto',
                maxWidth: header.maxWidth || 'none'
              }}
            >
              {header.label}
            </th>
          );
        })}
      </tr>
    );
  };

  // Render all header levels (same as TableRenderer)
  const renderAllHeaders = () => {
    if (!metadata.headers) return null;
    
    // Handle multi-level headers
    if (Array.isArray(metadata.headers[0])) {
      return metadata.headers.map((headerRow, level) => renderHeaders(headerRow, level));
    }
    
    // Handle single-level headers
    return renderHeaders(metadata.headers);
  };

  // Render additional rows
  const renderAdditionalRows = () => {
    if (!metadata.columns) return null;
    
    const columnCount = metadata.columns.length || 0;
    
    return localData.additionalRows && localData.additionalRows.map((_, rowIndex) => {
      return (
        <tr key={`additional-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
          {/* Row cells */}
          {Array(columnCount).fill(0).map((_, colIndex) => {
            const columnData = metadata.columns[colIndex] || {};
            const cellType = columnData.type || 'text';
            const cellValue = getAdditionalCellValue(rowIndex, colIndex);
            
            return (
              <td key={`additional-cell-${rowIndex}-${colIndex}`} className="border border-gray-300 px-4 py-2">
                {isEditing ? (
                  renderEditableCell(cellType, cellValue, rowIndex, colIndex)
                ) : (
                  renderReadOnlyCell(cellType, cellValue)
                )}
              </td>
            );
          })}
          
          {/* Remove row button */}
          {isEditing && (
            <td className="border border-gray-300 px-2 py-1">
              <button
                type="button"
                onClick={() => handleRemoveRow(rowIndex)}
                className="text-red-600 hover:text-red-800 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </td>
          )}
        </tr>
      );
    });
  };

  // Render editable cell based on type
  const renderEditableCell = (type, value, rowIndex, colIndex) => {
    switch (type) {
      case 'number':
      case 'decimal':
      case 'percentage':
        return (
          <input
            type="number"
            className="w-full p-1 border border-gray-300 rounded"
            value={value}
            onChange={(e) => handleAdditionalCellChange(rowIndex, colIndex, e.target.value)}
            step={type === 'decimal' || type === 'percentage' ? '0.01' : '1'}
          />
        );
        
      case 'boolean':
        return (
          <select
            className="w-full p-1 border border-gray-300 rounded"
            value={value}
            onChange={(e) => handleAdditionalCellChange(rowIndex, colIndex, e.target.value)}
          >
            <option value="">Select</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
        
      case 'link':
        return (
          <input
            type="url"
            className="w-full p-1 border border-gray-300 rounded"
            value={value}
            onChange={(e) => handleAdditionalCellChange(rowIndex, colIndex, e.target.value)}
            placeholder="https://example.com"
          />
        );
        
      default: // text
        return (
          <input
            type="text"
            className="w-full p-1 border border-gray-300 rounded"
            value={value}
            onChange={(e) => handleAdditionalCellChange(rowIndex, colIndex, e.target.value)}
          />
        );
    }
  };

  // Render read-only cell based on type
  const renderReadOnlyCell = (type, value) => {
    if (!value && value !== 0) {
      return <span className="text-gray-400 italic">-</span>;
    }
    
    switch (type) {
      case 'boolean':
        return value === 'true' || value === true ? 'Yes' : 'No';
        
      case 'percentage':
        return `${value}%`;
        
      case 'link':
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {value}
          </a>
        );
        
      default: // text, number, decimal
        return value;
    }
  };

  // If no metadata, show a message
  if (!metadata) {
    return (
      <div className="text-sm text-gray-500">
        No table configuration available.
      </div>
    );
  }

  // Use the regular TableRenderer for the fixed part of the table
  return (
    <div className="space-y-4">
      {/* Regular table */}
      <TableRenderer 
        metadata={metadata} 
        data={localData} 
        isEditing={isEditing} 
        onSave={onSave} 
      />
      
      {/* Additional rows section */}
      {(additionalRowCount > 0 || isEditing) && (
        <div className="mt-4">
          <h4 className="text-md font-medium text-gray-700 mb-2">Additional Entries</h4>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                {renderAllHeaders()}
              </thead>
              <tbody>
                {renderAdditionalRows()}
              </tbody>
            </table>
          </div>
          
          {isEditing && (
            <div className="mt-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Row
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TableWithAdditionalRowsRenderer;