import React, { useState, useEffect } from 'react';

const TableRenderer = ({ metadata, data, isEditing = false, onSave }) => {
  const [localData, setLocalData] = useState(data || {});

  // Update local data when the prop changes (skip while editing)
  useEffect(() => {
    if (!isEditing) {
      console.log('🔄 TableRenderer data prop changed:', data);
      console.log('🔍 Data type:', typeof data, 'Is null?', data === null, 'Is undefined?', data === undefined);
      setLocalData(data || {});
    }
  }, [data, isEditing]);

  // Debounced sync to parent to avoid UI flicker while typing
  useEffect(() => {
    if (!isEditing || !onSave) return;
    const timer = setTimeout(() => {
      console.log('🔄 Auto-syncing table data with parent in edit mode:', localData);
      onSave(localData);
    }, 300);
    return () => clearTimeout(timer);
  }, [localData, isEditing, onSave]);

  // Handle cell value change
  const handleCellChange = (rowIndex, colIndex, value) => {
    console.log(`🔄 Updating cell [${rowIndex}][${colIndex}] with value:`, value, 'type:', typeof value);
    
    const updatedData = { ...localData };
    
    // Initialize rows array if it doesn't exist
    if (!updatedData.rows) {
      updatedData.rows = [];
    }
    
    // Create a new rows array to avoid modifying the original
    updatedData.rows = [...updatedData.rows];
    
    // Initialize row if it doesn't exist
    if (!updatedData.rows[rowIndex]) {
      updatedData.rows[rowIndex] = { cells: [] };
    } else {
      // Create a new row object to avoid modifying the original
      updatedData.rows[rowIndex] = { ...updatedData.rows[rowIndex] };
    }
    
    // Initialize cells array if it doesn't exist
    if (!updatedData.rows[rowIndex].cells) {
      updatedData.rows[rowIndex].cells = [];
    } else {
      // Create a new cells array to avoid modifying the original
      updatedData.rows[rowIndex].cells = [...updatedData.rows[rowIndex].cells];
    }
    
    // Update cell value
    updatedData.rows[rowIndex].cells[colIndex] = { value };
    
    console.log('🔄 Updated table data:', updatedData);
    setLocalData(updatedData);
    
    // We don't need to call onSave here as the useEffect will handle it
    // This prevents duplicate calls and ensures data is always synced
  };

  // Get cell value from data
  const getCellValue = (rowIndex, colIndex) => {
    if (!localData || !localData.rows || !localData.rows[rowIndex] || 
        !localData.rows[rowIndex].cells || !localData.rows[rowIndex].cells[colIndex]) {
      return '';
    }
    return localData.rows[rowIndex].cells[colIndex].value || '';
  };

  // Render table headers recursively
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

  // Render all header levels
  const renderAllHeaders = () => {
    if (!metadata.headers) return null;
    
    // Handle multi-level headers
    if (Array.isArray(metadata.headers[0])) {
      return metadata.headers.map((headerRow, level) => renderHeaders(headerRow, level));
    }
    
    // Handle single-level headers
    return renderHeaders(metadata.headers);
  };

  // Render table rows
  const renderRows = () => {
    if (!metadata.rows || !metadata.columns) return null;
    
    const rowCount = metadata.rows.length || 0;
    const columnCount = metadata.columns.length || 0;
    
    return Array(rowCount).fill(0).map((_, rowIndex) => {
      const rowData = metadata.rows[rowIndex] || {};
      
      return (
        <tr key={`row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
          {/* Row label if present */}
          {rowData.label && (
            <td className="border border-gray-300 px-4 py-2 font-medium text-gray-700">
              {rowData.label}
            </td>
          )}
          
          {/* Row cells */}
          {Array(columnCount).fill(0).map((_, colIndex) => {
            const columnData = metadata.columns[colIndex] || {};
            const cellType = columnData.type || 'text';
            const cellValue = getCellValue(rowIndex, colIndex);
            
            return (
              <td key={`cell-${rowIndex}-${colIndex}`} className="border border-gray-300 px-4 py-2">
                {isEditing ? (
                  renderEditableCell(cellType, cellValue, rowIndex, colIndex)
                ) : (
                  renderReadOnlyCell(cellType, cellValue)
                )}
              </td>
            );
          })}
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
            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
            step={type === 'decimal' || type === 'percentage' ? '0.01' : '1'}
          />
        );
        
      case 'boolean':
        return (
          <select
            className="w-full p-1 border border-gray-300 rounded"
            value={value}
            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
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
            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
            placeholder="https://example.com"
          />
        );
        
      default: // text
        return (
          <input
            type="text"
            className="w-full p-1 border border-gray-300 rounded"
            value={value}
            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          {renderAllHeaders()}
        </thead>
        <tbody>
          {renderRows()}
        </tbody>
      </table>
    </div>
  );
};

export default TableRenderer;