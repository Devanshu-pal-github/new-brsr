import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * GuidedDataEntry
 * Step-by-step guided data entry with AI hints and progress indicator.
 */
export default function GuidedDataEntry({ tableData, metadata, onStepComplete }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState(null);
  const [error, setError] = useState(null);

  const steps = tableData ? tableData.length : 0;

  const handleNext = async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      // Placeholder API call for AI hint
      const response = await fetch('/api/ai/guided-data-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, tableData, metadata }),
      });
      if (!response.ok) throw new Error('AI service error');
      const result = await response.json();
      setHint(result.hint);
      setStep(s => s + 1);
      if (onStepComplete) onStepComplete(step + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="guided-data-entry-panel">
      <div>Step {step + 1} of {steps}</div>
      <button onClick={handleNext} disabled={loading || step >= steps}>
        {loading ? 'Loading Hint...' : step < steps ? 'Next Step' : 'Done'}
      </button>
      {hint && <div className="ai-hint">AI Hint: {hint}</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
}

GuidedDataEntry.propTypes = {
  tableData: PropTypes.array.isRequired,
  metadata: PropTypes.object,
  onStepComplete: PropTypes.func,
};
