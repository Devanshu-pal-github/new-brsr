import React, { useState } from 'react';
import PropTypes from 'prop-types';

const NaturalLanguageToTable = ({ tableData, metadata, onApplyNLTable }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAiResult(null);
    try {
      // Placeholder API call
      const response = await fetch('/api/ai/nl-to-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, tableData, metadata }),
      });
      if (!response.ok) throw new Error('AI service error');
      const result = await response.json();
      setAiResult(result.suggestions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (aiResult) onApplyNLTable(aiResult);
  };

  return (
    <div className="nl-to-table-panel">
      <form onSubmit={handleSubmit}>
        <label>
          Describe your change:
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="E.g., Set all Q1 values to 100, increase row 2 by 10%..."
            rows={3}
            style={{ width: '100%' }}
          />
        </label>
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? 'Processing...' : 'Apply with AI'}
        </button>
      </form>
      {error && <div className="error">{error}</div>}
      {aiResult && (
        <div className="ai-preview">
          <h4>AI Suggestions Preview</h4>
          <pre>{JSON.stringify(aiResult, null, 2)}</pre>
          <button onClick={handleApply}>Apply Suggestions</button>
        </div>
      )}
    </div>
  );
};

NaturalLanguageToTable.propTypes = {
  tableData: PropTypes.array.isRequired,
  metadata: PropTypes.object,
  onApplyNLTable: PropTypes.func.isRequired,
};

export default NaturalLanguageToTable;
