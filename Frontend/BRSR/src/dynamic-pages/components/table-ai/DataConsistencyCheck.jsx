import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * DataConsistencyCheck
 * Checks table data for logical consistency using AI, flags issues, and suggests fixes.
 */
export default function DataConsistencyCheck({ tableData, metadata, onApplyFixes }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCheck = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/ai/data-consistency-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableData, metadata }),
      });
      if (!response.ok) throw new Error('AI service error');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result && result.suggestions) onApplyFixes(result.suggestions);
  };

  return (
    <div className="data-consistency-check-panel">
      <button onClick={handleCheck} disabled={loading}>
        {loading ? 'Checking...' : 'Run Data Consistency Check'}
      </button>
      {error && <div className="error">{error}</div>}
      {result && (
        <div className="ai-result">
          <h4>AI Consistency Check Result</h4>
          {result.issues && result.issues.length > 0 ? (
            <ul>
              {result.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
            </ul>
          ) : <div>No issues found.</div>}
          {result.suggestions && result.suggestions.length > 0 && (
            <button onClick={handleApply}>Apply Suggested Fixes</button>
          )}
        </div>
      )}
    </div>
  );
}

DataConsistencyCheck.propTypes = {
  tableData: PropTypes.array.isRequired,
  metadata: PropTypes.object,
  onApplyFixes: PropTypes.func,
};
