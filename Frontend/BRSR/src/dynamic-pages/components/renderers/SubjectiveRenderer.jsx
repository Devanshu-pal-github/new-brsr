import React, { useState, useEffect } from "react";

const SubjectiveRenderer = ({
  metadata,
  data,
  isEditing = false,
  onSave,
  onSubmit,
}) => {
  const normalize = (str) =>
    (str || "").toString().toLowerCase().replace(/\s+/g, " ").trim();
  const mainNorm = normalize(metadata?.main_question_text);

  // Initialize localData with an empty object if data is null or undefined
  const [localData, setLocalData] = useState(data || {});

  // Update local data when the prop changes (skip while actively editing)
  useEffect(() => {
    // Always sync localData with data prop, even in edit mode, if data changes externally (e.g., after "Use This Suggestion")
    setLocalData(data || {});
  }, [data]);

  // Debounced sync to parent to prevent rapid re-renders that disrupt typing
  useEffect(() => {
    if (!isEditing) return;

    const timer = setTimeout(() => {
      // Call onSave for DynamicQuestionRenderer
      if (onSave) {
        onSave(localData);
      }

      // Call onSubmit for QuestionEditPopup
      if (onSubmit) {
        onSubmit(localData);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localData, isEditing, onSave, onSubmit]);

  const handleInputChange = (fieldKey, value) => {
    console.log(
      `🔄 Updating field ${fieldKey} with value:`,
      value,
      "type:",
      typeof value
    );

    // Create a new object to ensure React detects the change
    const updatedData = {
      ...localData,
      [fieldKey]: value,
    };

    console.log("🔄 Updated local data:", updatedData);
    console.log("🔍 Value type:", typeof value, "Value:", value);

    // Update local state
    setLocalData(updatedData);

    // We don't need to call onSave here as the useEffect will handle it
    // This prevents duplicate calls and ensures data is always synced
  };

  // Helper to normalise strings
  const normalizeLabel = (str) =>
    (str || "").toString().toLowerCase().replace(/\s+/g, " ").trim();
  // Render different input types based on field type
  const renderField = (field) => {
    const fieldKey = field.key;
    // Explicitly check for undefined to handle boolean false values correctly
    const fieldValue =
      localData[fieldKey] !== undefined ? localData[fieldKey] : "";
    console.log(
      `🔍 Rendering field ${fieldKey} with value:`,
      fieldValue,
      "type:",
      typeof fieldValue
    );

    const isYourResponseLabel = normalizeLabel(field.label) === 'your response';
    const showLabel =
      field.label &&
      normalizeLabel(field.label) !== "" &&
      normalizeLabel(field.label) !== mainNorm &&
      !mainNorm.includes(normalizeLabel(field.label)) &&
      // Hide generic placeholder label in read-only mode
      !(isYourResponseLabel && !isEditing);
    switch (field.type) {
      case "text":
        return (
          <div className="mb-4" key={fieldKey}>
            {showLabel && (
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
            )}
            {isEditing ? (
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-h-[160px] h-60 resize-y"
                value={fieldValue}
                onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                rows={6}
                placeholder={
                  field.placeholder || `Enter ${field.label.toLowerCase()}`
                }
              />
            ) : (
              <textarea
                className="w-full p-3 border rounded-md transition-colors bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200"
                value={fieldValue}
                disabled
                rows={6}
                placeholder="No response provided"
                style={{ resize: 'none' }}
              />
            )}
          </div>
        );

      case "boolean":
        return (
          <div className="mb-4" key={fieldKey}>
            {showLabel && (
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
            )}
            {isEditing ? (
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-blue-600"
                    name={fieldKey}
                    value="true"
                    checked={[
                      "true",
                      true,
                      "True",
                      "yes",
                      "Yes",
                      1,
                      "1",
                      "YES",
                    ].includes(fieldValue)}
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
                    checked={[
                      "false",
                      false,
                      "False",
                      "no",
                      "No",
                      0,
                      "0",
                      "NO",
                    ].includes(fieldValue)}
                    onChange={() => handleInputChange(fieldKey, false)}
                  />
                  <span className="ml-2">No</span>
                </label>
              </div>
            ) : (
              <div className="p-2 rounded ">
                {["true", true, "True", "yes", "Yes", 1, "1", "YES"].includes(
                  fieldValue
                ) ? (
                  "Yes"
                ) : [
                    "false",
                    false,
                    "False",
                    "no",
                    "No",
                    0,
                    "0",
                    "NO",
                  ].includes(fieldValue) ? (
                  "No"
                ) : (
                  <span className="text-gray-400 italic">
                    No response provided
                  </span>
                )}
              </div>
            )}
          </div>
        );

      case "number":
      case "decimal":
      case "integer":
      case "percentage":
        return (
          <div className="mb-4" key={fieldKey}>
            {showLabel && (
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
            )}
            {isEditing ? (
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={fieldValue}
                onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                step={field.type === "integer" ? "1" : "0.01"}
                placeholder={
                  field.placeholder || `Enter ${field.label.toLowerCase()}`
                }
              />
            ) : (
              <div className="p-2  rounded">
                {fieldValue !== "" &&
                fieldValue !== undefined &&
                fieldValue !== null ? (
                  fieldValue
                ) : (
                  <span className="text-gray-400 italic">
                    No response provided
                  </span>
                )}
                {field.type === "percentage" && fieldValue ? "%" : ""}
              </div>
            )}
          </div>
        );

      case "link":
        return (
          <div className="mb-4" key={fieldKey}>
            {showLabel && (
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
            )}
            {isEditing ? (
              <input
                type="url"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={fieldValue}
                onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                placeholder="https://example.com"
              />
            ) : (
              <div className="p-2 rounded whitespace-pre-line text-gray-900">
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
            {showLabel && (
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
            )}
            {isEditing ? (
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={fieldValue}
                onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                placeholder={
                  field.placeholder || `Enter ${field.label.toLowerCase()}`
                }
              />
            ) : (
              <div className="p-2 rounded whitespace-pre-line text-gray-900">
                {fieldValue || (
                  <span className="text-gray-400 italic">
                    No response provided
                  </span>
                )}
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
