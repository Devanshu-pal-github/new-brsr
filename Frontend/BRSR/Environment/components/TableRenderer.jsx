import React, { useState, useEffect } from 'react';
import { useCurrentFinancialYear } from '../../src/components/layout/FinancialYearDropdown';

const TableRenderer = ({ metadata, data, isEditing = false, onSave, turnover }) => {
  const [localData, setLocalData] = useState({});
  const [extraFieldsData, setExtraFieldsData] = useState({});
  
  // Initialize data when component mounts or data changes
  useEffect(() => {
    console.log('[TableRenderer] data prop:', data);
    
    if (!data) {
      setLocalData({});
      setExtraFieldsData({});
      return;
    }

    // Separate extra fields from table data
    const tableData = {};
    const extraFields = {};

    Object.entries(data).forEach(([key, value]) => {
      // Check if this entry contains extra field data
      if (value && typeof value === 'object' && metadata?.extraFields) {
        const hasExtraFields = metadata.extraFields.some(field => field.key in value);
        const hasTableData = ['current_year', 'previous_year'].some(col => col in value);
        
        if (hasExtraFields && !hasTableData) {
          // This is pure extra fields data
          Object.assign(extraFields, value);
        } else if (hasTableData) {
          // This is table row data (may also contain extra fields, so extract them)
          const rowData = { ...value };
          metadata.extraFields.forEach(field => {
            if (field.key in rowData) {
              extraFields[field.key] = rowData[field.key];
              delete rowData[field.key];
            }
          });
          // Only add to table data if there's actual table content
          if (Object.keys(rowData).length > 0) {
            tableData[key] = rowData;
          }
        }
      } else {
        // Regular table data
        tableData[key] = value;
      }
    });

    console.log('[TableRenderer] Separated table data:', tableData);
    console.log('[TableRenderer] Separated extra fields:', extraFields);
    console.log('[TableRenderer] turnover prop:', turnover);
    
    setLocalData(tableData);
    setExtraFieldsData(extraFields);
  }, [data, metadata]);
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


  // Auto-calculate total energy consumption and energy intensity per rupee of turnover
  useEffect(() => {
    if (!metadata?.rows) return;
    // Deep copy
    const updated = JSON.parse(JSON.stringify(data || {}));
    // --- EC-1 logic (Total energy consumption (A+B+C)) ---
    const totalEnergyIdx = metadata.rows.findIndex(row => row.parameter && row.parameter.includes('Total energy consumption (A+B+C)'));
    const energyIntensityIdx = metadata.rows.findIndex(row => row.parameter && row.parameter.includes('Energy intensity per rupee of turnover'));
    if (totalEnergyIdx !== -1 && energyIntensityIdx !== -1) {
      ['current_year', 'previous_year'].forEach(yearKey => {
        const a = parseFloat((updated[0]?.[yearKey] || '').toString().replace(/,/g, '')) || 0;
        const b = parseFloat((updated[1]?.[yearKey] || '').toString().replace(/,/g, '')) || 0;
        const c = parseFloat((updated[2]?.[yearKey] || '').toString().replace(/,/g, '')) || 0;
        const total = a + b + c;
        if (!updated[totalEnergyIdx]) updated[totalEnergyIdx] = {};
        updated[totalEnergyIdx][yearKey] = total !== 0 ? total : '';
        if (!updated[energyIntensityIdx]) updated[energyIntensityIdx] = {};
        if (turnover && total) {
          updated[energyIntensityIdx][yearKey] = (total / turnover).toFixed(4);
        } else {
          updated[energyIntensityIdx][yearKey] = '';
        }
      });
    }

    // --- LEC-1 logic (Total energy consumed from renewable sources (A+B+C)) ---
    const lec1RenewIdx = metadata.rows.findIndex(row => row.parameter && row.parameter.includes('Total energy consumed from renewable sources (A+B+C)'));
    if (lec1RenewIdx !== -1) {
      ['current_year', 'previous_year'].forEach(yearKey => {
        const a = parseFloat((updated[lec1RenewIdx-3]?.[yearKey] || '').toString().replace(/,/g, '')) || 0;
        const b = parseFloat((updated[lec1RenewIdx-2]?.[yearKey] || '').toString().replace(/,/g, '')) || 0;
        const c = parseFloat((updated[lec1RenewIdx-1]?.[yearKey] || '').toString().replace(/,/g, '')) || 0;
        const total = a + b + c;
        if (!updated[lec1RenewIdx]) updated[lec1RenewIdx] = {};
        updated[lec1RenewIdx][yearKey] = total !== 0 ? total : '';
      });
    }
    // --- LEC-1 logic (Total energy consumed from non-renewable sources (D+E+F)) ---
    const lec1NonRenewIdx = metadata.rows.findIndex(row => row.parameter && row.parameter.includes('Total energy consumed from non-renewable sources (D+E+F)'));
    if (lec1NonRenewIdx !== -1) {
      ['current_year', 'previous_year'].forEach(yearKey => {
        const d = parseFloat((updated[lec1NonRenewIdx-3]?.[yearKey] || '').toString().replace(/,/g, '')) || 0;
        const e = parseFloat((updated[lec1NonRenewIdx-2]?.[yearKey] || '').toString().replace(/,/g, '')) || 0;
        const f = parseFloat((updated[lec1NonRenewIdx-1]?.[yearKey] || '').toString().replace(/,/g, '')) || 0;
        const total = d + e + f;
        if (!updated[lec1NonRenewIdx]) updated[lec1NonRenewIdx] = {};
        updated[lec1NonRenewIdx][yearKey] = total !== 0 ? total : '';
      });
    }
    setLocalData(updated);
  }, [data, metadata, turnover]);

  const handleCellChange = (rowIndex, columnKey, value) => {
    // Create a deep copy of the data
    const updatedData = JSON.parse(JSON.stringify(localData));
    // Ensure the row exists
    if (!updatedData[rowIndex]) {
      updatedData[rowIndex] = {};
    }
    // Update the cell value
    updatedData[rowIndex][columnKey] = value;
    // If editing A/B/C, recalculate total and intensity
    const totalEnergyIdx = metadata.rows.findIndex(row => row.parameter && row.parameter.includes('Total energy consumption (A+B+C)'));
    const energyIntensityIdx = metadata.rows.findIndex(row => row.parameter && row.parameter.includes('Energy intensity per rupee of turnover'));
    if ([0,1,2].includes(rowIndex) && totalEnergyIdx !== -1 && energyIntensityIdx !== -1) {
      ['current_year', 'previous_year'].forEach(yearKey => {
        // Remove commas and parse as float
        const a = parseFloat((rowIndex === 0 && columnKey === yearKey ? value : updatedData[0]?.[yearKey] || '').toString().replace(/,/g, '')) || 0;
        const b = parseFloat((rowIndex === 1 && columnKey === yearKey ? value : updatedData[1]?.[yearKey] || '').toString().replace(/,/g, '')) || 0;
        const c = parseFloat((rowIndex === 2 && columnKey === yearKey ? value : updatedData[2]?.[yearKey] || '').toString().replace(/,/g, '')) || 0;
        const total = a + b + c;
        if (!updatedData[totalEnergyIdx]) updatedData[totalEnergyIdx] = {};
        updatedData[totalEnergyIdx][yearKey] = total !== 0 ? total : '';
        if (!updatedData[energyIntensityIdx]) updatedData[energyIntensityIdx] = {};
        if (turnover && total) {
          updatedData[energyIntensityIdx][yearKey] = (total / turnover).toFixed(4);
        } else {
          updatedData[energyIntensityIdx][yearKey] = '';
        }
      });
    }

    // LEC-2 Table: If editing withdrawal rows (1-5), recalculate total withdrawal
    if (isLEC2Table && withdrawalSumRowIndices.includes(rowIndex) && withdrawalTotalRowIdx !== -1) {
      ['current_year', 'previous_year'].forEach(yearKey => {
        let sum = 0;
        withdrawalSumRowIndices.forEach(idx => {
          const val = (idx === rowIndex && columnKey === yearKey) ? value : (updatedData[idx]?.[yearKey] || '');
          const num = parseFloat((val || '').toString().replace(/,/g, ''));
          if (!isNaN(num)) sum += num;
        });
        if (!updatedData[withdrawalTotalRowIdx]) updatedData[withdrawalTotalRowIdx] = {};
        updatedData[withdrawalTotalRowIdx][yearKey] = sum !== 0 ? sum : '';
      });
    }

    // LEC-2 Table: If editing discharge sub-rows, recalculate main rows and total
    if (isLEC2Table) {
      // Check if the edited row is a discharge sub-row
      let isDischargeSubRow = false;
      let parentMainRowIdx = -1;
      
      Object.keys(lec2SubRowMap).forEach(mainIdx => {
        if (lec2SubRowMap[mainIdx].includes(rowIndex)) {
          isDischargeSubRow = true;
          parentMainRowIdx = parseInt(mainIdx);
        }
      });

      if (isDischargeSubRow && parentMainRowIdx !== -1) {
        ['current_year', 'previous_year'].forEach(yearKey => {
          // Recalculate parent main row
          const subIndices = lec2SubRowMap[parentMainRowIdx] || [];
          let mainSum = 0;
          subIndices.forEach(subIdx => {
            const val = (subIdx === rowIndex && columnKey === yearKey) ? value : (updatedData[subIdx]?.[yearKey] || '');
            const num = parseFloat((val || '').toString().replace(/,/g, ''));
            if (!isNaN(num)) mainSum += num;
          });
          if (!updatedData[parentMainRowIdx]) updatedData[parentMainRowIdx] = {};
          updatedData[parentMainRowIdx][yearKey] = mainSum !== 0 ? mainSum : '';

          // Recalculate total discharge row
          if (lec2TotalRowIdx !== -1) {
            let totalSum = 0;
            lec2MainRowIndices.forEach(mainIdx => {
              const val = updatedData[mainIdx]?.[yearKey] || '';
              const num = parseFloat((val || '').toString().replace(/,/g, ''));
              if (!isNaN(num)) totalSum += num;
            });
            if (!updatedData[lec2TotalRowIdx]) updatedData[lec2TotalRowIdx] = {};
            updatedData[lec2TotalRowIdx][yearKey] = totalSum !== 0 ? totalSum : '';
          }
        });
      }
    }
    // Update local state
    setLocalData(updatedData);
    
    // Call the parent onSave if provided, including extra fields
    if (onSave) {
      // Create a combined data structure that includes extra fields
      const combinedData = { ...updatedData };
      
      // Add extra fields as a separate row if they exist
      if (Object.keys(extraFieldsData).length > 0) {
        const rowIndices = Object.keys(updatedData).map(k => parseInt(k)).filter(k => !isNaN(k));
        const maxRowIndex = rowIndices.length > 0 ? Math.max(...rowIndices) : -1;
        const extraFieldsRowIndex = maxRowIndex + 1;
        combinedData[extraFieldsRowIndex] = extraFieldsData;
      }
      
      onSave(combinedData);
    }
  };

  const handleExtraFieldChange = (fieldKey, value) => {
    const updatedExtraFields = { ...extraFieldsData, [fieldKey]: value };
    setExtraFieldsData(updatedExtraFields);
    
    // Call the parent onSave if provided with combined data
    // The backend expects extra fields to be part of the main data structure
    if (onSave) {
      // Create a combined data structure
      const combinedData = { ...localData };
      
      // Find the highest row index to add extra fields at the end
      const rowIndices = Object.keys(localData).map(k => parseInt(k)).filter(k => !isNaN(k));
      const maxRowIndex = rowIndices.length > 0 ? Math.max(...rowIndices) : -1;
      const extraFieldsRowIndex = maxRowIndex + 1;
      
      // Add extra fields as a separate row
      combinedData[extraFieldsRowIndex] = updatedExtraFields;
      
      onSave(combinedData);
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
  // LEC-2 Table: has both water withdrawal and water discharge sections
  const isLEC2Table = metadata.rows.some(row => row.parameter && row.parameter.includes('Water discharge by destination and level of treatment'));
  // --- Waste Management Table logic ---
  // Detect if this is the new waste management table by looking for the total row
  const isWasteManagementTable = metadata.rows.some(row => row.parameter && row.parameter.includes('Total (A+B+C+D+E+F+G+H)'));
  // Indices for A-H rows
  let wasteSumRowIdx = -1;
  let wasteComponentIndices = [];
  // Indices for recovery and disposal totals
  let recoveryTotalIdx = -1, recoverySumIndices = [];
  let disposalTotalIdx = -1, disposalSumIndices = [];
  if (isWasteManagementTable) {
    metadata.rows.forEach((row, idx) => {
      // A-H
      if (row.parameter === 'Plastic waste (A)' ||
          row.parameter === 'E-waste (B)' ||
          row.parameter === 'Bio-medical waste (C)' ||
          row.parameter === 'Construction and demolition waste (D)' ||
          row.parameter === 'Battery waste (E)' ||
          row.parameter === 'Radioactive waste (F)' ||
          row.parameter === 'Other Hazardous waste. Please specify, if any. (G)' ||
          row.parameter === 'Other Non-hazardous waste generated (H). Please specify, if any.') {
        wasteComponentIndices.push(idx);
      }
      // Recovery section
      if (row.parameter === '(i) Recycled') recoverySumIndices[0] = idx;
      if (row.parameter === '(ii) Re-used') recoverySumIndices[1] = idx;
      if (row.parameter === '(iii) Other recovery operations') recoverySumIndices[2] = idx;
      if (row.parameter === 'Total' && recoveryTotalIdx === -1 && idx > wasteComponentIndices[wasteComponentIndices.length-1]) recoveryTotalIdx = idx;
      // Disposal section
      if (row.parameter === '(i) Incineration') disposalSumIndices[0] = idx;
      if (row.parameter === '(ii) Landfilling') disposalSumIndices[1] = idx;
      if (row.parameter === '(iii) Other disposal operations') disposalSumIndices[2] = idx;
      if (row.parameter === 'Total' && recoveryTotalIdx !== -1 && disposalTotalIdx === -1 && idx > recoveryTotalIdx) disposalTotalIdx = idx;
      // Main total
      if (row.parameter && row.parameter.includes('Total (A+B+C+D+E+F+G+H)')) wasteSumRowIdx = idx;
    });
  }

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

  // --- LEC-2 Water Discharge logic ---
  let lec2MainRowIndices = [], lec2SubRowMap = {}, lec2TotalRowIdx = -1;
  if (isLEC2Table) {
    lec2MainRowIndices = [];
    lec2SubRowMap = {};
    lec2TotalRowIdx = -1;
    let inLEC2DischargeSection = false;
    metadata.rows.forEach((row, idx) => {
      // Start of discharge section
      if (row.parameter && row.parameter.includes('Water discharge by destination and level of treatment')) {
        inLEC2DischargeSection = true;
        return;
      }
      
      if (inLEC2DischargeSection) {
        // Main discharge rows - (i) Into Surface water, (ii) Into Groundwater, etc.
        if (row.parameter && row.parameter.match(/^\(i\) Into|^\(ii\) Into|^\(iii\) Into|^\(iv\) Sent|^\(v\) Others/)) {
          lec2MainRowIndices.push(idx);
          lec2SubRowMap[idx] = [];
        }
        // Total row
        if (row.parameter && row.parameter.toLowerCase().includes('total water discharged')) {
          lec2TotalRowIdx = idx;
        }
      }
    });
    
    // Map sub-rows to main rows for LEC-2
    let lastLEC2MainIdx = null;
    let inLEC2DischargeSectionForSub = false;
    metadata.rows.forEach((row, idx) => {
      if (row.parameter && row.parameter.includes('Water discharge by destination and level of treatment')) {
        inLEC2DischargeSectionForSub = true;
        return;
      }
      
      if (inLEC2DischargeSectionForSub) {
        if (lec2MainRowIndices.includes(idx)) {
          lastLEC2MainIdx = idx;
        } else if (lastLEC2MainIdx !== null && row.parameter && (row.parameter.includes('No treatment') || row.parameter.includes('With treatment'))) {
          lec2SubRowMap[lastLEC2MainIdx].push(idx);
        }
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

  // --- LEC-2 Helpers ---
  const sumLEC2SubRows = (subIndices, columnKey) => {
    let sum = 0;
    subIndices.forEach(idx => {
      const val = localData[idx]?.[columnKey];
      const num = parseFloat(val);
      if (!isNaN(num)) sum += num;
    });
    return sum !== 0 ? sum : '';
  };
  const sumLEC2MainRows = (mainIndices, columnKey) => {
    let sum = 0;
    mainIndices.forEach(idx => {
      const val = getLEC2MainRowValue(idx, columnKey);
      const num = parseFloat(val);
      if (!isNaN(num)) sum += num;
    });
    return sum !== 0 ? sum : '';
  };
  const getLEC2MainRowValue = (mainIdx, columnKey) => {
    const subIndices = lec2SubRowMap[mainIdx] || [];
    return sumLEC2SubRows(subIndices, columnKey);
  };

  return (
    <div className="overflow-x-auto">
      {/* Render extra fields if they exist */}
      {metadata?.extraFields && metadata.extraFields.length > 0 && (
        <div className="mb-4 space-y-4">
          {metadata.extraFields.map((field, idx) => (
            <div key={idx} className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  value={extraFieldsData[field.key] || ''}
                  onChange={(e) => handleExtraFieldChange(field.key, e.target.value)}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              ) : (
                <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                  {extraFieldsData[field.key] || '-'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
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
                          <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm text-gray-600 ">{row.unit || ''}</td>
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
                          <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm text-gray-600 ">{row.unit || ''}</td>
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
                          className="border border-gray-300 px-4 py-2 text-sm text-gray-600 "
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
                    <td colSpan={columnsWithUnits.length} className="border border-gray-300 px-4 py-2 text-sm  text-gray-900" dangerouslySetInnerHTML={{ __html: row.parameter || '' }} />
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
                          <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm " dangerouslySetInnerHTML={{ __html: row.parameter || '' }} />
                        );
                      }
                      if (columnKey === 'unit') {
                        return (
                          <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm text-gray-600 ">{row.unit || ''}</td>
                        );
                      }
                      let sum = 0;
                      withdrawalSumRowIndices.forEach(idx => {
                        const val = localData[idx]?.[columnKey];
                        const num = parseFloat(val);
                        if (!isNaN(num)) sum += num;
                      });
                      return (
                        <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm  bg-gray-100">{sum !== 0 ? sum : ''}</td>
                      );
                    })}
                  </tr>
                );
              }
              // Make water intensity per rupee of turnover row read-only and auto-calculated
              if (
                isWithdrawalTable &&
                row.parameter &&
                row.parameter.toLowerCase().includes('water intensity per rupee of turnover')
              ) {
                // Find the index for total volume of water consumption row
                const totalConsumptionIdx = metadata.rows.findIndex(r => r.parameter && r.parameter.toLowerCase().includes('total volume of water consumption'));
                return (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {columnsWithUnits.map((column, colIdx) => {
                      const columnKey = column.key || `col${colIdx}`;
                      if (columnKey === 'parameter') {
                        return (
                          <td 
                            key={colIdx} 
                            className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-gray-100"
                            dangerouslySetInnerHTML={{ __html: row.parameter || '' }}
                          />
                        );
                      }
                      if (columnKey === 'unit') {
                        return (
                          <td 
                            key={colIdx} 
                            className="border border-gray-300 px-4 py-2 text-sm text-gray-600  bg-gray-100"
                          >
                            {row.unit || ''}
                          </td>
                        );
                      }
                      let intensity = '';
                      if (totalConsumptionIdx !== -1 && turnover) {
                        const totalVal = localData[totalConsumptionIdx]?.[columnKey];
                        const totalNum = parseFloat((totalVal || '').toString().replace(/,/g, ''));
                        if (!isNaN(totalNum) && totalNum && turnover) {
                          intensity = (totalNum / turnover).toFixed(4);
                        }
                      }
                      return (
                        <td 
                          key={colIdx} 
                          className="border border-gray-300 px-4 py-2 text-sm bg-gray-100"
                        >
                          <div>{intensity}</div>
                        </td>
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
                          className="border border-gray-300 px-4 py-2 text-sm text-gray-600 "
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
            // --- LEC-2 Table (Water withdrawal + discharge) ---
            if (isLEC2Table) {
              // Handle headers
              if (row.isHeader) {
                return (
                  <tr key={rowIdx} className="bg-gray-50">
                    <td colSpan={columnsWithUnits.length} className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" dangerouslySetInnerHTML={{ __html: row.parameter || '' }} />
                  </tr>
                );
              }

              // Handle water withdrawal total row (sum of withdrawal rows 1-5)
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
                          <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm text-gray-600">{row.unit || ''}</td>
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

              // Handle water intensity per rupee of turnover row (read-only, auto-calculated)
              if (row.parameter && row.parameter.toLowerCase().includes('water intensity per rupee of turnover')) {
                const totalConsumptionIdx = metadata.rows.findIndex(r => r.parameter && r.parameter.toLowerCase().includes('total volume of water consumption'));
                return (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {columnsWithUnits.map((column, colIdx) => {
                      const columnKey = column.key || `col${colIdx}`;
                      if (columnKey === 'parameter') {
                        return (
                          <td 
                            key={colIdx} 
                            className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-gray-100"
                            dangerouslySetInnerHTML={{ __html: row.parameter || '' }}
                          />
                        );
                      }
                      if (columnKey === 'unit') {
                        return (
                          <td 
                            key={colIdx} 
                            className="border border-gray-300 px-4 py-2 text-sm text-gray-600 bg-gray-100"
                          >
                            {row.unit || ''}
                          </td>
                        );
                      }
                      let intensity = '';
                      if (totalConsumptionIdx !== -1 && turnover) {
                        const totalVal = localData[totalConsumptionIdx]?.[columnKey];
                        const totalNum = parseFloat((totalVal || '').toString().replace(/,/g, ''));
                        if (!isNaN(totalNum) && totalNum && turnover) {
                          intensity = (totalNum / turnover).toFixed(4);
                        }
                      }
                      return (
                        <td 
                          key={colIdx} 
                          className="border border-gray-300 px-4 py-2 text-sm bg-gray-100"
                        >
                          <div>{intensity}</div>
                        </td>
                      );
                    })}
                  </tr>
                );
              }

              // Handle water discharge main rows (auto-calculated from sub-rows)
              if (lec2MainRowIndices.includes(rowIdx)) {
                return (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {columnsWithUnits.map((column, colIdx) => {
                      const columnKey = column.key || `col${colIdx}`;
                      if (columnKey === 'parameter') {
                        return (
                          <td 
                            key={colIdx} 
                            className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-gray-100"
                            dangerouslySetInnerHTML={{ __html: row.parameter || '' }}
                          />
                        );
                      }
                      if (columnKey === 'unit') {
                        return (
                          <td 
                            key={colIdx} 
                            className="border border-gray-300 px-4 py-2 text-sm text-gray-600 bg-gray-100"
                          >
                            {row.unit || ''}
                          </td>
                        );
                      }
                      const calculatedValue = getLEC2MainRowValue(rowIdx, columnKey);
                      return (
                        <td 
                          key={colIdx} 
                          className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-gray-100"
                        >
                          {calculatedValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              }

              // Handle water discharge total row (sum of main discharge rows)
              if (rowIdx === lec2TotalRowIdx) {
                return (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {columnsWithUnits.map((column, colIdx) => {
                      const columnKey = column.key || `col${colIdx}`;
                      if (columnKey === 'parameter') {
                        return (
                          <td 
                            key={colIdx} 
                            className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-gray-100"
                            dangerouslySetInnerHTML={{ __html: row.parameter || '' }}
                          />
                        );
                      }
                      if (columnKey === 'unit') {
                        return (
                          <td 
                            key={colIdx} 
                            className="border border-gray-300 px-4 py-2 text-sm text-gray-600 bg-gray-100"
                          >
                            {row.unit || ''}
                          </td>
                        );
                      }
                      const totalValue = sumLEC2MainRows(lec2MainRowIndices, columnKey);
                      return (
                        <td 
                          key={colIdx} 
                          className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-gray-100"
                        >
                          {totalValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              }

              // All other rows (editable - mainly sub-rows and regular withdrawal rows)
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
                          className="border border-gray-300 px-4 py-2 text-sm text-gray-600"
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
            // --- Waste Management Table ---
            if (isWasteManagementTable && rowIdx === wasteSumRowIdx) {
              // Render the total row as sum of A-H rows
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
                        <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm text-gray-600 ">{row.unit || ''}</td>
                      );
                    }
                    // Sum A-H rows for this column
                    let sum = 0;
                    wasteComponentIndices.forEach(idx => {
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
            // --- Waste Management Recovery Total ---
            if (isWasteManagementTable && rowIdx === recoveryTotalIdx) {
              // Render the total row as sum of recovery rows
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
                        <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm text-gray-600 ">{row.unit || ''}</td>
                      );
                    }
                    // Sum recovery rows for this column
                    let sum = 0;
                    recoverySumIndices.forEach(idx => {
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
            // --- Waste Management Disposal Total ---
            if (isWasteManagementTable && rowIdx === disposalTotalIdx) {
              // Render the total row as sum of disposal rows
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
                        <td key={colIdx} className="border border-gray-300 px-4 py-2 text-sm text-gray-600 ">{row.unit || ''}</td>
                      );
                    }
                    // Sum disposal rows for this column
                    let sum = 0;
                    disposalSumIndices.forEach(idx => {
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
            // --- Default fallback (other tables) ---
            // All rows editable except header
            if (row.isHeader) {
              return (
                <tr key={rowIdx} className="bg-gray-50">
                  <td colSpan={columnsWithUnits.length} className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900" dangerouslySetInnerHTML={{ __html: row.parameter || '' }} />
                </tr>
              );
            }
            // Make energy intensity and water intensity rows read-only, always show calculated value
            if (
              (row.parameter && row.parameter.includes('Energy intensity per rupee of turnover')) ||
              (row.parameter && row.parameter.toLowerCase().includes('water intensity per rupee of turnover'))
            ) {
              // For energy intensity
              const totalEnergyIdx = metadata.rows.findIndex(r => r.parameter && r.parameter.includes('Total energy consumption (A+B+C)'));
              // For water intensity
              const totalConsumptionIdx = metadata.rows.findIndex(r => r.parameter && r.parameter.toLowerCase().includes('total volume of water consumption'));
              return (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {columnsWithUnits.map((column, colIdx) => {
                    const columnKey = column.key || `col${colIdx}`;
                    if (columnKey === 'parameter') {
                      return (
                        <td 
                          key={colIdx} 
                          className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-gray-100"
                          dangerouslySetInnerHTML={{ __html: row.parameter || '' }}
                        />
                      );
                    }
                    if (columnKey === 'unit') {
                      return (
                        <td 
                          key={colIdx} 
                          className="border border-gray-300 px-4 py-2 text-sm text-gray-600  bg-gray-100"
                        >
                          {row.unit || ''}
                        </td>
                      );
                    }
                    let intensity = '';
                    // Energy intensity
                    if (row.parameter && row.parameter.includes('Energy intensity per rupee of turnover')) {
                      if (totalEnergyIdx !== -1 && turnover) {
                        const totalVal = localData[totalEnergyIdx]?.[columnKey];
                        const totalNum = parseFloat((totalVal || '').toString().replace(/,/g, ''));
                        if (!isNaN(totalNum) && totalNum && turnover) {
                          intensity = (totalNum / turnover).toFixed(4);
                        }
                      }
                    }
                    // Water intensity
                    if (row.parameter && row.parameter.toLowerCase().includes('water intensity per rupee of turnover')) {
                      if (totalConsumptionIdx !== -1 && turnover) {
                        const totalVal = localData[totalConsumptionIdx]?.[columnKey];
                        const totalNum = parseFloat((totalVal || '').toString().replace(/,/g, ''));
                        if (!isNaN(totalNum) && totalNum && turnover) {
                          intensity = (totalNum / turnover).toFixed(4);
                        }
                      }
                    }
                    // Always render as read-only, never editable
                    return (
                      <td 
                        key={colIdx} 
                        className="border border-gray-300 px-4 py-2 text-sm bg-gray-100"
                        style={{ pointerEvents: 'none', backgroundColor: '#f3f4f6' }}
                      >
                        <div>{intensity}</div>
                      </td>
                    );
                  })}
                </tr>
              );
            } else {
              // ...existing code for normal rows...
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
                          className="border border-gray-300 px-4 py-2 text-sm text-gray-600 "
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
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TableRenderer;
