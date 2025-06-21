import React, { useState, useEffect } from 'react';
import { useCurrentFinancialYear } from '../../src/components/layout/FinancialYearDropdown';

const TableRenderer = ({ metadata, data, isEditing = false, onSave }) => {
  const [localData, setLocalData] = useState(data || {});
  const currentFY = useCurrentFinancialYear();
  // Calculate previous FY (assume format '2024-25' or '2024')
  let prevFY = '';
  if (currentFY) {
    if (/\d{4}-\d{2}/.test(currentFY)) {
      // e.g. 2024-25 -> 2023-24
      const [start, end] = currentFY.split('-');
      prevFY = `${parseInt(start, 10) - 1}-${('' + (parseInt(end, 10) - 1)).padStart(2, '0')}`;
    } else if (/\d{4}/.test(currentFY)) {
      prevFY = (parseInt(currentFY, 10) - 1).toString();
    }
  }

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
  let columnsWithUnits = metadata.columns.find(col => col.key === 'unit') 
    ? metadata.columns 
    : [...metadata.columns, { label: 'Unit', key: 'unit' }];

  // Patch column labels for current/previous year
  columnsWithUnits = columnsWithUnits.map(col => {
    if (col.key === 'current_year' && currentFY) {
      return { ...col, label: `${col.label} <span class='text-xs text-gray-500'>(${currentFY})</span>` };
    }
    if (col.key === 'previous_year' && prevFY) {
      return { ...col, label: `${col.label} <span class='text-xs text-gray-500'>(${prevFY})</span>` };
    }
    return col;
  });

  // --- Detect table type ---
  // Water Discharge Details: has rows like (i) To Surface water, (ii) To Groundwater, etc.
  const isDischargeTable = metadata.rows.some(row => row.parameter && row.parameter.match(/^\(i\) To Surface water/));
  // Water Withdrawal: has header 'Water withdrawal by source' and total row with 'total volume of water withdrawal'
  const isWithdrawalTable = metadata.rows.some(row => row.parameter && row.parameter.toLowerCase().includes('water withdrawal by source'));

  // --- Water Discharge Details logic ---
  let mainRowIndices = [], subRowMap = {}, totalRowIdx = -1;
  if (isDischargeTable) {
    mainRowIndices = [];
    subRowMap = {};
    totalRowIdx = -1;
    metadata.rows.forEach((row, idx) => {
      if (row.parameter && row.parameter.match(/^\(i\)|^\(ii\)|^\(iii\)|^\(iv\)|^\(v\)/)) {
        mainRowIndices.push(idx);
        subRowMap[idx] = [];
      }
      if (row.parameter && row.parameter.toLowerCase().includes('total water discharged')) {
        totalRowIdx = idx;
      }
    });
    let lastMainIdx = null;
    metadata.rows.forEach((row, idx) => {
      if (mainRowIndices.includes(idx)) {
        lastMainIdx = idx;
      } else if (lastMainIdx !== null && row.parameter && (row.parameter.includes('No treatment') || row.parameter.includes('With treatment'))) {
        subRowMap[lastMainIdx].push(idx);
      }
    });
  }

  // --- Water Withdrawal logic ---
  let withdrawalTotalRowIdx = -1, withdrawalSumRowIndices = [];
  if (isWithdrawalTable) {
    withdrawalTotalRowIdx = metadata.rows.findIndex(row =>
      row.parameter && row.parameter.toLowerCase().includes('total volume of water withdrawal')
    );
    // For water withdrawal table, sum rows (i) to (v) (indices 1-5)
    withdrawalSumRowIndices = [1,2,3,4,5];
  }

  // --- Helpers ---
  const sumSubRows = (subIndices, columnKey) => {
    let sum = 0;
    subIndices.forEach(idx => {
      const val = localData[idx]?.[columnKey];
      const num = parseFloat(val);
      if (!isNaN(num)) sum += num;
    });
    return sum !== 0 ? sum : '';
  };
  const sumMainRows = (mainIndices, columnKey) => {
    let sum = 0;
    mainIndices.forEach(idx => {
      const val = getMainRowValue(idx, columnKey);
      const num = parseFloat(val);
      if (!isNaN(num)) sum += num;
    });
    return sum !== 0 ? sum : '';
  };
  const getMainRowValue = (mainIdx, columnKey) => {
    const subIndices = subRowMap[mainIdx] || [];
    return sumSubRows(subIndices, columnKey);
  };

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
          {metadata.rows.map((row, rowIdx) => {
            // --- Water Discharge Table ---
            if (isDischargeTable) {
              // Render header row (isHeader)
              if (row.isHeader) {
                return (
                  <tr key={rowIdx} className="bg-gray-50">
                    <td colSpan={columnsWithUnits.length} className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" dangerouslySetInnerHTML={{ __html: row.parameter || '' }} />
                  </tr>
                );
              }
              // Main row (auto-calc, not editable)
              if (mainRowIndices.includes(rowIdx)) {
                return (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {columnsWithUnits.map((column, colIdx) => {
                      const columnKey = column.key || `col${colIdx}`;
                      if (columnKey === 'parameter') {
                        return (
                          <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm font-semibold" dangerouslySetInnerHTML={{ __html: row.parameter || '' }} />
                        );
                      }
                      if (columnKey === 'unit') {
                        return (
                          <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm text-gray-600 italic">{row.unit || ''}</td>
                        );
                      }
                      // Show sum of sub-rows
                      return (
                        <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-gray-100">{getMainRowValue(rowIdx, columnKey)}</td>
                      );
                    })}
                  </tr>
                );
              }
              // Total row (sum of main rows)
              if (rowIdx === totalRowIdx) {
                return (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {columnsWithUnits.map((column, colIdx) => {
                      const columnKey = column.key || `col${colIdx}`;
                      if (columnKey === 'parameter') {
                        return (
                          <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm font-semibold" dangerouslySetInnerHTML={{ __html: row.parameter || '' }} />
                        );
                      }
                      if (columnKey === 'unit') {
                        return (
                          <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm text-gray-600 italic">{row.unit || ''}</td>
                        );
                      }
                      // Show sum of main rows
                      return (
                        <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-gray-100">{sumMainRows(mainRowIndices, columnKey)}</td>
                      );
                    })}
                  </tr>
                );
              }
              // Sub-rows (editable)
              return (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {columnsWithUnits.map((column, colIdx) => {
                    const columnKey = column.key || `col${colIdx}`;
                    if (columnKey === 'parameter') {
                      return (
                        <td 
                          key={colIdx} 
                          className="border border-gray-300 px-4 py-2 text-sm"
                          dangerouslySetInnerHTML={{ __html: row.parameter || '' }}
                        />
                      );
                    }
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
              );
            }
            // --- Water Withdrawal Table ---
            if (isWithdrawalTable) {
              if (row.isHeader) {
                return (
                  <tr key={rowIdx} className="bg-gray-50">
                    <td colSpan={columnsWithUnits.length} className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" dangerouslySetInnerHTML={{ __html: row.parameter || '' }} />
                  </tr>
                );
              }
              if (rowIdx === withdrawalTotalRowIdx) {
                return (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {columnsWithUnits.map((column, colIdx) => {
                      const columnKey = column.key || `col${colIdx}`;
                      if (columnKey === 'parameter') {
                        return (
                          <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm font-semibold" dangerouslySetInnerHTML={{ __html: row.parameter || '' }} />
                        );
                      }
                      if (columnKey === 'unit') {
                        return (
                          <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm text-gray-600 italic">{row.unit || ''}</td>
                        );
                      }
                      let sum = 0;
                      withdrawalSumRowIndices.forEach(idx => {
                        const val = localData[idx]?.[columnKey];
                        const num = parseFloat(val);
                        if (!isNaN(num)) sum += num;
                      });
                      return (
                        <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-gray-100">{sum !== 0 ? sum : ''}</td>
                      );
                    })}
                  </tr>
                );
              }
              // All other rows (editable)
              return (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {columnsWithUnits.map((column, colIdx) => {
                    const columnKey = column.key || `col${colIdx}`;
                    if (columnKey === 'parameter') {
                      return (
                        <td 
                          key={colIdx} 
                          className="border border-gray-300 px-4 py-2 text-sm"
                          dangerouslySetInnerHTML={{ __html: row.parameter || '' }}
                        />
                      );
                    }
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
              );
            }
            // --- Default fallback (other tables) ---
            // All rows editable except header
            if (row.isHeader) {
              return (
                <tr key={rowIdx} className="bg-gray-50">
                  <td colSpan={columnsWithUnits.length} className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" dangerouslySetInnerHTML={{ __html: row.parameter || '' }} />
                </tr>
              );
            }
            return (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columnsWithUnits.map((column, colIdx) => {
                  const columnKey = column.key || `col${colIdx}`;
                  if (columnKey === 'parameter') {
                    return (
                      <td 
                        key={colIdx} 
                        className="border border-gray-300 px-4 py-2 text-sm"
                        dangerouslySetInnerHTML={{ __html: row.parameter || '' }}
                      />
                    );
                  }
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TableRenderer;
