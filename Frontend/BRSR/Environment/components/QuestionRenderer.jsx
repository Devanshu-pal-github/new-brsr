import TableRenderer from './TableRenderer';
import MultiTableRenderer from './MultiTableRenderer';
import DynamicTableRenderer from './DynamicTableRenderer';

const QuestionRenderer = ({ question }) => {
  const { title, description, metadata } = question;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="mb-2">
        <div className="font-semibold text-base text-[#20305D]">{title}</div>
        {description && (
          <div className="text-sm text-gray-700 mb-2" dangerouslySetInnerHTML={{ __html: description }} />
        )}
      </div>
      {metadata?.type === 'table' && <TableRenderer metadata={metadata} />}
      {metadata?.type === 'multi-table' && <MultiTableRenderer metadata={metadata} />}
      {metadata?.type === 'dynamic-table' && <DynamicTableRenderer metadata={metadata} />}
      {metadata?.note && (
        <div
          className="text-xs text-gray-500 mt-2"
          dangerouslySetInnerHTML={{ __html: metadata.note }}
        />
      )}
    </div>
  );
};

export default QuestionRenderer;
