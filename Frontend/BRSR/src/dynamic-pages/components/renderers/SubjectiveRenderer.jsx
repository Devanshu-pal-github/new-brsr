import React, { useState, useEffect } from 'react';

const SubjectiveRenderer = ({ metadata, data, isEditing = false, onSave }) => {
  const [localData, setLocalData] = useState(data || {});

  // Update local data when the prop changes
  useEffect(() => {
    if (data) {
      setLocalData(data);
    }
  }, [data]);

  const handleInputChange = (fieldKey, value) => {
    const updatedData = {
      ...localData,
      [fieldKey]: value
    };
    
    setLocalData(updatedData);
    
    if (onSave) {
      onSave(updatedData);
    }
  };

  // Render different input types based on field type
  const renderField = (field) => {
    const fieldKey = field.key;
    const fieldValue = localData[fieldKey] || '';
    
    switch (field.type) {
      case 'text':
        return (
          <div className="mb-4" key={fieldKey}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            {isEditing ? (
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={fieldValue}
                onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                rows={3}
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border border-gray-200">
                {fieldValue || <span className="text-gray-400 italic">No response provided</span>}
              </div>
            )}
          </div>
        );
        
      case 'boolean':
        return (
          <div className="mb-4" key={fieldKey}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            {isEditing ? (
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-blue-600"
                    name={fieldKey}
                    value="true"
                    checked={fieldValue === true || fieldValue === 'true'}
                    onChange={() => handleInputChange(fieldKey, true)}
                  />
                  <span className="ml-2">Yes</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-blue-600"
                    name={fieldKey}
                    value="false"
                    checked={fieldValue === false || fieldValue === 'false'}
                    onChange={() => handleInputChange(fieldKey, false)}
                  />
                  <span className="ml-2">No</span>
                </label>
              </div>
            ) : (
              <div className="p-2 bg-gray-50 rounded border border-gray-200">
                {fieldValue === true || fieldValue === 'true' ? 'Yes' : 
                 fieldValue === false || fieldValue === 'false' ? 'No' : 
                 <span className="text-gray-400 italic">No response provided</span>}
              </div>
            )}
          </div>
        );
        
      case 'number':
      case 'decimal':
      case 'integer':
      case 'percentage':
        return (
          <div className="mb-4" key={fieldKey}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            {isEditing ? (
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={fieldValue}
                onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                step={field.type === 'integer' ? '1' : '0.01'}
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border border-gray-200">
                {fieldValue || <span className="text-gray-400 italic">No response provided</span>}
                {field.type === 'percentage' && fieldValue ? '%' : ''}
              </div>
            )}
          </div>
        );
        
      case 'link':
        return (
          <div className="mb-4" key={fieldKey}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            {isEditing ? (
              <input
                type="url"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={fieldValue}
                onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                placeholder="https://example.com"
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border border-gray-200">
                {fieldValue ? (
                  <a 
                    href={fieldValue} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {fieldValue}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">No link provided</span>
                )}
              </div>
            )}
          </div>
        );
        
      default:
        return (
          <div className="mb-4" key={fieldKey}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            {isEditing ? (
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={fieldValue}
                onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded border border-gray-200">
                {fieldValue || <span className="text-gray-400 italic">No response provided</span>}
              </div>
            )}
          </div>
        );
    }
  };

  // If no metadata or fields, show a message
  if (!metadata || !metadata.fields || metadata.fields.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No fields configuration available for this subjective question.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {metadata.fields.map((field) => renderField(field))}
    </div>
  );
};

export default SubjectiveRenderer;