import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * ExampleDataGenerator
 * Generates realistic example data for the table using AI.
 */
export default function ExampleDataGenerator({ metadata, onApplyExample }) {
  const [loading, setLoading] = useState(false);
  const [exampleData, setExampleData] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setExampleData(null);
    try {
      const response = await fetch('/api/ai/example-data-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      });
      if (!response.ok) throw new Error('AI service error');
      const data = await response.json();
      setExampleData(data.exampleData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (exampleData) onApplyExample(exampleData);
  };

  return (
    <div className="example-data-generator-panel">
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Example Data'}
      </button>
      {error && <div className="error">{error}</div>}
      {exampleData && (
        <div className="ai-preview">
          <h4>Example Data Preview</h4>
          <pre>{JSON.stringify(exampleData, null, 2)}</pre>
          <button onClick={handleApply}>Apply Example Data</button>
        </div>
      )}
    </div>
  );
}

ExampleDataGenerator.propTypes = {
  metadata: PropTypes.object,
  onApplyExample: PropTypes.func.isRequired,
};
