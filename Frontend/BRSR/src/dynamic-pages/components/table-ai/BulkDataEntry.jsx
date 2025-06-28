import React, { useState } from 'react';
import PropTypes from 'prop-types';

const BulkDataEntry = ({ onBulkPaste, context }) => {
  const [bulkInput, setBulkInput] = useState('');
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  const handlePaste = () => {
    setError(null);
    setParsedData(null);
    try {
      // Simple CSV/TSV parsing (expand as needed)
      const rows = bulkInput.trim().split(/\r?\n/).map(line => line.split(/\t|,/));
      if (rows.length < 2) throw new Error('Paste at least a header and one row.');
      setParsedData(rows);
      if (onBulkPaste) onBulkPaste(rows);
    } catch (err) {
      setError('Invalid data format. Please paste tabular data (CSV/TSV).');
    }
  };

  return (
    <div className="bulk-data-entry" style={{marginTop:12}}>
      <div style={{fontWeight:'bold'}}>Bulk Data Entry</div>
      <textarea
        rows={4}
        style={{width:'100%',marginTop:4}}
        placeholder="Paste CSV or tab-separated data here..."
        value={bulkInput}
        onChange={e => setBulkInput(e.target.value)}
      />
      <button onClick={handlePaste} style={{marginTop:4}}>Parse & Preview</button>
      {error && <div style={{color:'red'}}>{error}</div>}
      {parsedData && (
        <div style={{marginTop:8}}>
          <div style={{fontWeight:'bold'}}>Preview:</div>
          <pre style={{maxHeight:120,overflow:'auto',background:'#f8f8f8',padding:8}}>{JSON.stringify(parsedData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

BulkDataEntry.propTypes = {
  onBulkPaste: PropTypes.func,
  context: PropTypes.object
};

export default BulkDataEntry;
