const TableRenderer = ({ metadata }) => (
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
        </tr>
      </thead>
      <tbody>
        {metadata.rows.map((row, idx) => (
          <tr key={idx}>
            {metadata.columns.map((col, cidx) => (
              <td
                key={col.key}
                className={`border border-gray-300 px-2 py-1 text-xs ${row.isHeader ? 'font-bold bg-gray-100' : ''}`}
                dangerouslySetInnerHTML={{ __html: row[col.key] || row.parameter || '' }}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default TableRenderer;
