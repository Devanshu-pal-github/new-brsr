import TableRenderer from './TableRenderer';

const MultiTableRenderer = ({ metadata }) => (
  <div className="space-y-6">
    {metadata.tables.map((table, idx) => (
      <div key={idx}>
        {table.title && <div className="font-semibold text-sm mb-1">{table.title}</div>}
        <TableRenderer metadata={table} />
      </div>
    ))}
  </div>
);

export default MultiTableRenderer;
