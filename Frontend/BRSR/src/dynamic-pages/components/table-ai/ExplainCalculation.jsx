import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * ExplainCalculation
 * Allows users to click a calculated cell and get an AI explanation for the value.
 */
export default function ExplainCalculation({ cellValue, cellContext }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [error, setError] = useState(null);

  const handleExplain = async () => {
    setShow(true);
    setLoading(true);
    setError(null);
    setExplanation(null);
    try {
      const response = await fetch('/api/ai/explain-calculation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: cellValue, context: cellContext }),
      });
      if (!response.ok) throw new Error('AI service error');
      const result = await response.json();
      setExplanation(result.explanation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span style={{ position: 'relative' }}>
      <button onClick={handleExplain} title="Explain calculation">🛈</button>
      {show && (
        <div className="explain-popup" style={{ position: 'absolute', zIndex: 10, background: '#fff', border: '1px solid #ccc', padding: 8, minWidth: 200 }}>
          {loading && <div>Loading explanation...</div>}
          {error && <div className="error">{error}</div>}
          {explanation && <div><strong>AI Explanation:</strong><br />{explanation}</div>}
          <button onClick={() => setShow(false)} style={{ marginTop: 8 }}>Close</button>
        </div>
      )}
    </span>
  );
}

ExplainCalculation.propTypes = {
  cellValue: PropTypes.any.isRequired,
  cellContext: PropTypes.object,
};
