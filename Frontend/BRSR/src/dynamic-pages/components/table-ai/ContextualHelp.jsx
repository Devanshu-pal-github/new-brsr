import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * ContextualHelp
 * Provides AI-powered regulatory/domain guidance for each cell/column.
 */
export default function ContextualHelp({ column, row, metadata }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [help, setHelp] = useState(null);
  const [error, setError] = useState(null);

  const handleHelp = async () => {
    setShow(true);
    setLoading(true);
    setError(null);
    setHelp(null);
    try {
      const response = await fetch('/api/ai/contextual-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column, row, metadata }),
      });
      if (!response.ok) throw new Error('AI service error');
      const data = await response.json();
      setHelp(data.help);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span style={{ position: 'relative' }}>
      <button onClick={handleHelp} title="Get contextual help">❓</button>
      {show && (
        <div className="contextual-help-popup" style={{ position: 'absolute', zIndex: 10, background: '#fff', border: '1px solid #ccc', padding: 8, minWidth: 200 }}>
          {loading && <div>Loading help...</div>}
          {error && <div className="error">{error}</div>}
          {help && <div><strong>AI Guidance:</strong><br />{help}</div>}
          <button onClick={() => setShow(false)} style={{ marginTop: 8 }}>Close</button>
        </div>
      )}
    </span>
  );
}

ContextualHelp.propTypes = {
  column: PropTypes.object,
  row: PropTypes.object,
  metadata: PropTypes.object,
};
