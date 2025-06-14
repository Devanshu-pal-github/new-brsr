import { useState, useEffect } from 'react';

const DynamicTableRenderer = ({ metadata, data = {}, isEditing = false, onSave }) => {
  const [rows, setRows] = useState(Object.keys(data).length > 0 ? 
    Object.entries(data).map(([_, rowData]) => rowData) : 
    [{}]
  );

  useEffect(() => {
    if (Object.keys(data).length > 0) {
      setRows(Object.entries(data).map(([_, rowData]) => rowData));
    }
  }, [data]);

  const addRow = () => {
    // Create a deep copy of rows to avoid modifying read-only properties
    const newRows = JSON.parse(JSON.stringify(rows));
    newRows.push({});
    setRows(newRows);
    
    if (onSave) {
      const newData = newRows.reduce((acc, row, idx) => {
        acc[idx] = row;
        return acc;
      }, {});
      onSave(newData);
    }
  };

  const removeRow = (idx) => {
    // Create a deep copy of rows to avoid modifying read-only properties
    const newRows = JSON.parse(JSON.stringify(rows));
    newRows.splice(idx, 1);
    setRows(newRows);
    
    if (onSave) {
      const newData = newRows.reduce((acc, row, idx) => {
        acc[idx] = row;
        return acc;
      }, {});
      onSave(newData);
    }
  };

  const updateCell = (idx, key, value) => {
    // Create a deep copy of rows to avoid modifying read-only properties
    const newRows = JSON.parse(JSON.stringify(rows));
    if (!newRows[idx]) {
      newRows[idx] = {};
    }
    newRows[idx][key] = value;
    setRows(newRows);
    
    if (onSave) {
      const newData = newRows.reduce((acc, row, idx) => {
        acc[idx] = row;
        return acc;
      }, {});
      onSave(newData);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-300">
        <thead>
          <tr>
            {metadata.columns.map((col) => (
              <th
                key={col.key}
                className="border border-gray-300 px-2 py-1 font-semibold text-xs bg-gray-50"
                dangerouslySetInnerHTML={{ __html: col.label }}
              />
            ))}
            {isEditing && (
              <th className="border border-gray-300 px-2 py-1 font-semibold text-xs bg-gray-50">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {metadata.columns.map((col) => (
                <td key={col.key} className="border border-gray-300 px-2 py-1 text-xs">
                  {isEditing ? (
                    <input
                      className="w-full border rounded px-1 py-0.5 text-xs"
                      value={row[col.key] || ''}
                      onChange={(e) => updateCell(idx, col.key, e.target.value)}
                    />
                  ) : (
                    <div>{row[col.key] || ''}</div>
                  )}
                </td>
              ))}
              {isEditing && (
                <td className="border border-gray-300 px-2 py-1 text-xs">
                  <button
                    className="text-red-500 text-xs"
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                  >
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {isEditing && (
        <button
          className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs"
          onClick={addRow}
        >
          Add Row
        </button>
      )}
    </div>
  );
};

export default DynamicTableRenderer;
