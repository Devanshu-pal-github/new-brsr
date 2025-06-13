import { useState } from 'react';

const DynamicTableRenderer = ({ metadata }) => {
  const [rows, setRows] = useState([{}]);

  const addRow = () => setRows([...rows, {}]);
  const removeRow = (idx) => setRows(rows.filter((_, i) => i !== idx));
  const updateCell = (idx, key, value) => {
    const updated = [...rows];
    updated[idx][key] = value;
    setRows(updated);
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
            <th className="border border-gray-300 px-2 py-1 font-semibold text-xs bg-gray-50">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {metadata.columns.map((col) => (
                <td key={col.key} className="border border-gray-300 px-2 py-1 text-xs">
                  <input
                    className="w-full border rounded px-1 py-0.5 text-xs"
                    value={row[col.key] || ''}
                    onChange={(e) => updateCell(idx, col.key, e.target.value)}
                  />
                </td>
              ))}
              <td className="border border-gray-300 px-2 py-1 text-xs">
                <button
                  className="text-red-500 text-xs"
                  onClick={() => removeRow(idx)}
                  disabled={rows.length === 1}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs"
        onClick={addRow}
      >
        Add Row
      </button>
    </div>
  );
};

export default DynamicTableRenderer;
