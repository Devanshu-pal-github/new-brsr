import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * ScenarioSimulation
 * Allows users to simulate hypothetical changes and preview the impact using AI.
 */
export default function ScenarioSimulation({ tableData, metadata, onApplyScenario }) {
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
      const response = await fetch('/api/ai/scenario-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, tableData, metadata }),
      });
      if (!response.ok) throw new Error('AI service error');
      const result = await response.json();
      setAiResult(result.simulation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (aiResult) onApplyScenario(aiResult);
  };

  return (
    <div className="scenario-simulation-panel">
      <form onSubmit={handleSubmit}>
        <label>
          Simulate a scenario:
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="E.g., What if all Q2 values increase by 20%?"
            rows={3}
            style={{ width: '100%' }}
          />
        </label>
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? 'Simulating...' : 'Simulate Scenario'}
        </button>
      </form>
      {error && <div className="error">{error}</div>}
      {aiResult && (
        <div className="ai-preview">
          <h4>Simulation Preview</h4>
          <pre>{JSON.stringify(aiResult, null, 2)}</pre>
          <button onClick={handleApply}>Apply Simulation</button>
        </div>
      )}
    </div>
  );
}

ScenarioSimulation.propTypes = {
  tableData: PropTypes.array.isRequired,
  metadata: PropTypes.object,
  onApplyScenario: PropTypes.func.isRequired,
};
