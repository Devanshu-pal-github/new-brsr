import React, { useState, useEffect } from 'react';
import TableRenderer from './TableRenderer';

const MultiTableRenderer = ({ metadata, data, isEditing = false, onSave }) => {
  const [localData, setLocalData] = useState(data || {});

  // Update local data when the prop changes
  useEffect(() => {
    if (data) {
      setLocalData(data);
    }
  }, [data]);

  // Initialize empty tables if they don't exist
  useEffect(() => {
    if (metadata?.tables && metadata.tables.length > 0) {
      const updatedData = { ...localData };
      let dataChanged = false;

      metadata.tables.forEach((table, idx) => {
        const tableKey = `table${idx}`;
        if (!updatedData[tableKey]) {
          updatedData[tableKey] = {};
          dataChanged = true;
        }
      });

      if (dataChanged) {
        setLocalData(updatedData);
        if (onSave) {
          onSave(updatedData);
        }
      }
    }
  }, [metadata, localData, onSave]);

  const handleTableSave = (tableIdx, tableData) => {
    // Create a deep copy of the data
    const updatedData = JSON.parse(JSON.stringify(localData));
    const tableKey = `table${tableIdx}`;
    
    // Update the specific table's data
    updatedData[tableKey] = tableData;
    
    // Update local state
    setLocalData(updatedData);
    
    // Call the parent onSave if provided
    if (onSave) {
      onSave(updatedData);
    }
  };

  if (!metadata?.tables || metadata.tables.length === 0) {
    return <div className="text-sm text-gray-500">No table configuration available</div>;
  }

  return (
    <div className="space-y-8">
      {metadata.tables.map((table, idx) => {
        const tableKey = `table${idx}`;
        const tableData = localData[tableKey] || {};
        
        return (
          <div key={idx} className="border-t pt-4 first:border-t-0 first:pt-0">
            {table.title && (
              <h4 className="font-medium text-sm mb-2 text-gray-700">{table.title}</h4>
            )}
            <TableRenderer
              metadata={{
                ...metadata,
                columns: table.columns || metadata.columns,
                rows: table.rows || metadata.rows,
                title: table.title || metadata.title
              }}
              data={tableData}
              isEditing={isEditing}
              onSave={(data) => handleTableSave(idx, data)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default MultiTableRenderer;
