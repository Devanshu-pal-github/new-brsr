import React from 'react';
import TableRenderer from './TableRenderer';

const MultiTableRenderer = ({ metadata, data = {}, isEditing = false, onSave }) => {
  const handleTableSave = (tableIndex, tableData) => {
    if (onSave) {
      const newData = { ...data };
      newData[`table${tableIndex}`] = tableData;
      onSave(newData);
    }
  };

  return (
    <div className="space-y-6">
      {metadata.tables.map((table, idx) => (
        <div key={idx}>
          {table.title && (
            <div className="font-semibold text-sm mb-2 text-[#20305D]">{table.title}</div>
          )}
          <TableRenderer 
            metadata={table} 
            data={data[`table${idx}`] || {}}
            isEditing={isEditing}
            onSave={(tableData) => handleTableSave(idx, tableData)}
          />
        </div>
      ))}
    </div>
  );
};

export default MultiTableRenderer;
