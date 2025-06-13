import React from 'react';

const AuditBadge = ({ isAuditRequired }) => {
  // Ensure boolean conversion happens correctly
  const auditRequired = isAuditRequired === true || isAuditRequired === 'true';
  
  return (
    <div 
      className={`inline-block px-3 py-1 rounded-full text-xs ${
        auditRequired ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}
      title={auditRequired ? 'This question requires audit' : 'This question does not require audit'}
    >
      {auditRequired ? 'Audit Required' : 'No Audit Required'}
    </div>
  );
};

export default AuditBadge;
