import React, { useState } from 'react';
import RagDocumentQA from './RagDocumentQA';

const SubjectiveQuestionRenderer = ({ 
    question,
    answer,
    onAnswerChange,
    isReadOnly = false
}) => {
    console.log('SubjectiveQuestionRenderer received answer:', answer);
    
    // Get the answer text from the structured answer object
    const answerText = answer?.data?.text || '';
    const [showRagModal, setShowRagModal] = useState(false);
    console.log('Extracted answer text:', answerText);

    const handleChange = (e) => {
        if (onAnswerChange && !isReadOnly) {
            // Pass the structured answer object
            onAnswerChange({
                questionId: question.id,
                questionTitle: question.title,
                type: 'subjective',
                data: {
                    text: e.target.value
                }
            });
        }
    };

    return (
        <div className="mb-4 w-full">
            <div className="mb-4 relative">
                {isReadOnly && (
                    <div className="absolute top-2 right-2">
                        <svg 
                            className="w-5 h-5 text-gray-500" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth="2" 
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                    </div>
                )}
                {!isReadOnly && (
                    <button
                        className="mb-2 px-2 py-1 bg-[#4F46E5] text-white text-xs rounded hover:bg-[#4338CA] transition-colors"
                        type="button"
                        onClick={() => setShowRagModal(true)}
                    >
                        Get Answer from Document
                    </button>
                )}
                <textarea
                    className={`w-full p-3 border rounded-md transition-colors ${
                        isReadOnly 
                            ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' 
                            : 'bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border-gray-300'
                    }`}
                    value={answerText}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    rows={4}
                    placeholder={isReadOnly ? "No response provided yet" : "Enter your answer here..."}
                />
                {answer?.lastUpdated && (
                    <p className="text-sm text-gray-500 mt-1">
                        Last updated: {new Date(answer.lastUpdated).toLocaleString()}
                    </p>
                )}
                {showRagModal && (
                    <RagDocumentQA
                        open={showRagModal}
                        onClose={() => setShowRagModal(false)}
                        questionText={question?.title || ''}
                        onAnswerSuggested={(ans) => {
                            if (onAnswerChange) {
                                onAnswerChange({
                                    questionId: question.id,
                                    questionTitle: question.title,
                                    type: 'subjective',
                                    data: { text: ans }
                                });
                            }
                            setShowRagModal(false);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default SubjectiveQuestionRenderer;

