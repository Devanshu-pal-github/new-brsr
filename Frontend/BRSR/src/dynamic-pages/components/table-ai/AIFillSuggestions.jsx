import React, { useState } from 'react';
import PropTypes from 'prop-types';

const AIFillSuggestions = ({ tableData, metadata, onSuggestion, context }) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState(null);

  const handleAIFill = async () => {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    try {
      // Placeholder: Replace with your actual API endpoint
      const response = await fetch('/api/ai/table-fill-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableData, metadata, context })
      });
      if (!response.ok) throw new Error('AI suggestion failed');
      const data = await response.json();
      setSuggestions(data.suggestions);
    } catch (err) {
      setError('Failed to get AI suggestions.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (suggestions && onSuggestion) {
      onSuggestion(suggestions);
      setSuggestions(null);
    }
  };

  return (
    <div className="ai-fill-suggestions">
      <button onClick={handleAIFill} disabled={loading} style={{marginBottom:8}}>
        {loading ? 'Getting AI Suggestions...' : 'AI Fill Suggestions'}
      </button>
      {error && <div style={{color:'red'}}>{error}</div>}
      {suggestions && (
        <div style={{marginTop:8}}>
          <div style={{fontWeight:'bold'}}>AI Suggestions Preview:</div>
          <pre style={{maxHeight:200,overflow:'auto',background:'#f8f8f8',padding:8}}>{JSON.stringify(suggestions, null, 2)}</pre>
          <button onClick={handleApply} style={{marginTop:8}}>Apply Suggestions</button>
        </div>
      )}
    </div>
  );
};

AIFillSuggestions.propTypes = {
  tableData: PropTypes.object.isRequired,
  metadata: PropTypes.object.isRequired,
  onSuggestion: PropTypes.func,
  context: PropTypes.object
};

export default AIFillSuggestions;
