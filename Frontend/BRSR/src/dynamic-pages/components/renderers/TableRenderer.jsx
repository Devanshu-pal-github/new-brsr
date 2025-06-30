import React, { useState, useEffect } from 'react';
import { useCurrentFinancialYear } from '../../../components/layout/FinancialYearDropdown';

const TableRenderer = ({ metadata, data, isEditing = false, onSave }) => {
  const [localData, setLocalData] = useState(data || {});
  const currentFinancialYear = useCurrentFinancialYear();
  // Helper to get previous FY string
  const getPreviousFinancialYear = (fy) => {
    if (!fy || !fy.includes('-')) return '';
    const [start, end] = fy.split('-').map(Number);
    if (isNaN(start) || isNaN(end)) return '';
    return `${start - 1}-${end - 1}`;
  };
  const previousFinancialYear = getPreviousFinancialYear(currentFinancialYear);

  // Update local data when the prop changes
  useEffect(() => {
    console.log('🔍 [TableRenderer] Data prop changed, isEditing:', isEditing, 'new data:', data);
    
    // Always update localData when data prop changes, regardless of editing mode
    // This is essential for RAG updates to work
    setLocalData(data || {});
  }, [data]);

  // Debounced sync to parent to avoid UI flicker while typing
  useEffect(() => {
    if (!isEditing || !onSave) return;
    const timer = setTimeout(() => {
      // console.log('🔄 Auto-syncing table data with parent in edit mode:', localData);
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

  // Helper: check if a row is a total row
  const isTotalRow = (rowData) => rowData.label && rowData.label.toLowerCase() === 'total';

  // Helper: check if a column is a percentage column
  const isPercentageCol = (colIndex) => {
    const col = metadata.columns[colIndex];
    return col && col.type === 'percentage';
  };

  // Helper: get the index of the 'Total (A)' column (first data col)
  const totalAColIndex = 0;

  // Helper: for a given percentage column, get the numerator col index
  const getNumeratorColIndex = (colIndex) => {
    // e.g. % (B/A) is after Number (B), so numerator is colIndex-1
    return colIndex - 1;
  };

  // Compute calculated values for total rows and percentage columns
  const computeCellValue = (rowIndex, colIndex) => {
    const rowData = metadata.rows[rowIndex] || {};
    // If total row, sum values from previous rows in the section
    if (isTotalRow(rowData)) {
      // Find section start (above this total row)
      let sectionStart = rowIndex - 1;
      while (sectionStart >= 0 && !metadata.rows[sectionStart].isSectionHeader && !isTotalRow(metadata.rows[sectionStart])) {
        sectionStart--;
      }
      sectionStart++;
      let sum = 0;
      for (let i = sectionStart; i < rowIndex; i++) {
        const val = parseFloat(getCellValue(i, colIndex));
        if (!isNaN(val)) sum += val;
      }
      return sum === 0 ? '' : sum;
    }
    // If percentage column, calculate as (numerator/TotalA)*100
    if (isPercentageCol(colIndex)) {
      const numeratorCol = getNumeratorColIndex(colIndex);
      const numerator = parseFloat(getCellValue(rowIndex, numeratorCol));
      const denominator = parseFloat(getCellValue(rowIndex, totalAColIndex));
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        return ((numerator / denominator) * 100).toFixed(2);
      }
      return '';
    }
    // Default: return user value
    return getCellValue(rowIndex, colIndex);
  };

  // Helper: check if a row is a section header
  const isSectionHeader = (rowData) => rowData.isSectionHeader;

  // Render table headers recursively
  const renderHeaders = (headers, level = 0) => {
    if (!headers || headers.length === 0) return null;

    return (
      <tr className={`bg-gray-${level === 0 ? '200' : '100'}`}>
        {headers.map((header, index) => {
          if (!header) return null; // null/undefined safety
          const colSpan = header.colspan || 1;
          const rowSpan = header.rowspan || 1;
          // Use header.id if available, else fallback to a robust key
          const key = header.id
            ? `header-${level}-${header.id}`
            : `header-${level}-${index}-${String(header.label).replace(/\s+/g, '_')}`;
          // Dynamically replace FY label if present
          let label = header.label;
          if (typeof label === 'string') {
            // Remove 'FY ___<br/>' or similar patterns before the year
            label = label.replace(/FY\s*_{2,}\s*<br\s*\/?>/gi, '').trim();
            // Remove any remaining 'FY ___' or 'FY__' or 'FY ___' (with or without spaces)
            label = label.replace(/FY\s*_+/gi, '').trim();
            // Remove any remaining <br> or <br/> tags
            label = label.replace(/<br\s*\/?>/gi, '').trim();
            if (label.includes('Current Financial Year')) {
              label = label.replace('Current Financial Year', currentFinancialYear || 'Current Financial Year');
            }
            if (label.includes('Previous Financial Year')) {
              label = label.replace('Previous Financial Year', previousFinancialYear || 'Previous Financial Year');
            }
          }
          return (
            <th 
              key={key}
              colSpan={colSpan}
              rowSpan={rowSpan}
              className="border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 text-center"
              style={{
                width: header.width || 'auto',
                minWidth: header.minWidth || 'auto',
                maxWidth: header.maxWidth || 'none'
              }}
            >
              {label}
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
      if (isSectionHeader(rowData)) {
        // Render a section header row spanning all columns + label col
        return (
          <tr key={`row-${rowIndex}`} className="bg-gray-100">
            <td colSpan={columnCount + 1} className="border border-gray-300 px-4 py-2 font-bold text-gray-800 text-center">
              {rowData.label}
            </td>
          </tr>
        );
      }
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
            const isCalc = isTotalRow(rowData) || isPercentageCol(colIndex);
            const cellValue = computeCellValue(rowIndex, colIndex);
            return (
              <td key={`cell-${rowIndex}-${colIndex}`} className="border border-gray-300 px-4 py-2">
                {isEditing && !isCalc ? (
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