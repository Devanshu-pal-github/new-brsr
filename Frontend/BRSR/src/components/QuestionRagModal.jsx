import React, { useState } from 'react';
import RagDocumentQA from '../../Environment/components/RagDocumentQA';

/**
 * Wrapper for RAG Document QA modal for use in QuestionEditPopup
 *
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - question: object (with question_type, question, etc.)
 * - tableMetadata: object (for table questions)
 * - onAnswerSuggested: function (for subjective)
 * - onTableValues: function (for table)
 */
const QuestionRagModal = ({ isOpen, onClose, question, tableMetadata, onAnswerSuggested, onTableValues }) => {
  if (!question) return null;
  
  const mode = question.question_type === 'table' || question.question_type === 'table_with_additional_rows' ? 'table' : 'subjective';
  
  // Get the question text - handle both dynamic and static module formats
  const questionText = question.question || question.question_text || question.title || question.human_readable_id || '';
  
  return (
    <RagDocumentQA
      isOpen={isOpen}
      onClose={onClose}
      questionText={questionText}
      mode={mode}
      tableMetadata={mode === 'table' ? tableMetadata : undefined}
      onAnswerSuggested={onAnswerSuggested}
      onTableValues={onTableValues}
    />
  );
};

export default QuestionRagModal;
