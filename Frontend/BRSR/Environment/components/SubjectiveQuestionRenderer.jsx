import React from 'react';

const SubjectiveQuestionRenderer = ({ 
    question,
    answer,
    onAnswerChange,
    isReadOnly = false
}) => {
    const handleChange = (e) => {
        if (onAnswerChange && !isReadOnly) {
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

    console.log('SubjectiveQuestionRenderer - Full answer object:', answer);
    
    // Get the answer text, handling different possible data structures
    const answerText = typeof answer === 'string' 
        ? answer 
        : (answer?.updatedData?.text || answer?.text || '');
    
    console.log('SubjectiveQuestionRenderer - Extracted answerText:', answerText);

    return (
        <div className="mb-4 w-full">
            <div className="mb-4 relative">
                {isReadOnly && (
                    <div className="absolute top-2 right-2">
                        <svg 
                            className="w-5 h-5 text-gray-400" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                            />
                        </svg>
                    </div>
                )}
                <textarea
                    value={answerText}
                    onChange={handleChange}
                    placeholder={isReadOnly ? "No response provided yet" : "Enter your answer here..."}
                    className={`w-full min-h-[120px] p-3 rounded-md border ${
                        isReadOnly 
                            ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' 
                            : 'bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border-gray-300'
                    } transition-colors`}
                    disabled={isReadOnly}
                />
                {answer?.lastUpdated && (
                    <p className="text-sm text-gray-500 mt-1">
                        Last updated: {new Date(answer.lastUpdated).toLocaleString()}
                    </p>
                )}
                {isReadOnly && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center">
                        <svg 
                            className="w-4 h-4 mr-1" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                            />
                        </svg>
                        Click "Edit Response" to modify this answer
                    </p>
                )}
            </div>
        </div>
    );
};

export default SubjectiveQuestionRenderer;

