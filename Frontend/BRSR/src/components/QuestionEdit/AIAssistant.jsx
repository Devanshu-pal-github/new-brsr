import React, { useRef, useState, useCallback } from "react";
import { MiniAIAssistantAction } from "./MiniAIAssistantAction.js.js";
import ToneSelector from "./ToneSelector";
import AIActionButtons from "./AIActionButtons";
import AIResponseDisplay from "./AIResponseDisplay";

const AIAssistant = ({ question, currentValue, selectedTextInTextarea, handleQuickAIAction, refineTone, setRefineTone, onAcceptSuggestion }) => {
    const messagesContainerRef = useRef(null);
    const [assistantResponse, setAssistantResponse] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentAction, setCurrentAction] = useState(null);

    const getHighlyRelevantAIActions = useCallback(() => {
        const actions = [];
        const hasSelection = selectedTextInTextarea?.length > 0;

        if (hasSelection) {
            actions.push(MiniAIAssistantAction.SUMMARIZE_SELECTION);
            actions.push(MiniAIAssistantAction.REFINE_SELECTION);
            actions.push(MiniAIAssistantAction.EXPLAIN_SELECTION);
            actions.push(MiniAIAssistantAction.SUGGEST_DATA_SOURCES);
            actions.push(MiniAIAssistantAction.GENERATE_FOLLOWUP_QUESTIONS_FOR_USER);
            actions.push(MiniAIAssistantAction.COMPARE_WITH_BEST_PRACTICE);
        } else {
            actions.push(MiniAIAssistantAction.EXPLAIN_THIS_QUESTION);
            actions.push(MiniAIAssistantAction.RECOMMEND_AI_ANSWER);
            actions.push(MiniAIAssistantAction.BREAK_DOWN_QUESTION);
            actions.push(MiniAIAssistantAction.SUGGEST_DATA_SOURCES);
            actions.push(MiniAIAssistantAction.GENERATE_FOLLOWUP_QUESTIONS_FOR_USER);
            actions.push(MiniAIAssistantAction.COMPARE_WITH_BEST_PRACTICE);
        }

        return actions;
    }, [selectedTextInTextarea]);

    const fetchAIResponse = useCallback(async (action) => {
        setIsLoading(true);
        setError(null);
        setAssistantResponse(null);
        setCurrentAction(action);

        try {
            let prompt;
            const currentAnswer = currentValue || "";
            const questionText = question?.question || "";
            const contextInfo = `\nContext: This is for a sustainability/business/ESG/HR/operations/finance report. Be specific, actionable, and ensure compliance with Indian and global best practices. Output must be clear, concise, and audit-ready. If referencing laws, use the latest applicable. If suggesting improvements, be practical and relevant to Indian corporates.`;

            switch (action) {
                case MiniAIAssistantAction.EXPLAIN_THIS_QUESTION:
                    prompt = `Explain the purpose, intent, and compliance expectations of the following question for a sustainability/business/ESG/HR/operations/finance report. Highlight what a perfect answer should cover.\nQuestion: "${questionText}"${contextInfo}`;
                    break;
                case MiniAIAssistantAction.RECOMMEND_AI_ANSWER:
                    prompt = `Write a model answer for the following question, as would be expected in a top-tier, audit-ready Indian corporate report. Be specific, compliant, and concise.\nQuestion: "${questionText}"${currentAnswer ? `\nCurrent Draft: "${currentAnswer}"` : ''}${contextInfo}`;
                    break;
                case MiniAIAssistantAction.BREAK_DOWN_QUESTION:
                    prompt = `Break down the following question into all key sub-parts and explain what information is needed for each.\nQuestion: "${questionText}"${contextInfo}`;
                    break;
                case MiniAIAssistantAction.SUGGEST_DATA_SOURCES:
                    prompt = `List the most reliable, practical, and India-relevant data sources or methods for answering this question accurately.\nQuestion: "${questionText}"${contextInfo}`;
                    break;
                case MiniAIAssistantAction.GENERATE_FOLLOWUP_QUESTIONS_FOR_USER:
                    prompt = `Generate 3-5 follow-up questions that would help a user provide a more complete, compliant, and audit-ready answer.\nQuestion: "${questionText}"${currentAnswer ? `\nCurrent Draft: "${currentAnswer}"` : ''}${contextInfo}`;
                    break;
                case MiniAIAssistantAction.COMPARE_WITH_BEST_PRACTICE:
                    prompt = `Compare the following draft answer with global and Indian best practices. Suggest concrete improvements for compliance, clarity, and completeness.\nDraft: "${currentAnswer}"${contextInfo}`;
                    break;
                case MiniAIAssistantAction.SUMMARIZE_SELECTION:
                    prompt = `Summarize the selected text in 2-3 sentences, focusing on key points and compliance.\nSelected: "${selectedTextInTextarea}"${contextInfo}`;
                    break;
                case MiniAIAssistantAction.REFINE_SELECTION:
                    prompt = `Refine the selected text to improve clarity, compliance, and professionalism. Use the tone: ${refineTone}.\nSelected: "${selectedTextInTextarea}"${contextInfo}`;
                    break;
                case MiniAIAssistantAction.EXPLAIN_SELECTION:
                    prompt = `Explain the meaning, compliance relevance, and importance of the selected text.\nSelected: "${selectedTextInTextarea}"${contextInfo}`;
                    break;
                default:
                    prompt = `${action} for question: "${questionText}" with draft: "${currentAnswer}"${contextInfo}`;
            }

            const response = { id: Date.now().toString(), text: prompt, action, confidence: 'medium' }; // Mock response for structure
            setAssistantResponse(response);
        } catch (err) {
            setError('Failed to fetch AI response. Please try again.');
        } finally {
            setIsLoading(false);
            setCurrentAction(null);
        }
    }, [question, currentValue, selectedTextInTextarea, refineTone]);

    const handleMiniAIAction = (actionId) => {
        fetchAIResponse(actionId);
    };

    const handlePostResponseAction = (actionId) => {
        if (actionId === 'USE_THIS') {
            if (onAcceptSuggestion && assistantResponse?.text) {
                onAcceptSuggestion(assistantResponse.text);
            }
            handleQuickAIAction(actionId, assistantResponse.text);
            setAssistantResponse(null);
            return;
        }
        fetchAIResponse(actionId);
    };

    const handleToneChange = (tone) => {
        setRefineTone(tone);
    };

    const handleRefineDraftWithTone = () => {
        const textToRefine = selectedTextInTextarea || currentValue;
        if (textToRefine.trim()) {
            fetchAIResponse(MiniAIAssistantAction.REFINE_ANSWER);
        }
    };

    const relevantActions = getHighlyRelevantAIActions();

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            <div className="p-4 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-blue-700">Mini AI Assistant</h4>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                <ToneSelector
                    refineTone={refineTone}
                    handleToneChange={handleToneChange}
                    handleRefineDraftWithTone={handleRefineDraftWithTone}
                    state={{ isLoading }}
                    currentValue={currentValue}
                    selectedTextInTextarea={selectedTextInTextarea}
                />
                <AIActionButtons
                    relevantActions={relevantActions}
                    handleMiniAIAction={handleMiniAIAction}
                    state={{ isLoading }}
                />
                {assistantResponse && (
                    <button
                        onClick={() => handlePostResponseAction('USE_THIS')}
                        className="w-full mt-2 p-2 border border-blue-200 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white text-sm font-medium"
                        aria-label="Use this AI response"
                    >
                        Use This
                    </button>
                )}
                <div className="mt-4">
                    <AIResponseDisplay
                        aiMessage={assistantResponse}
                        state={{
                            miniAiAssistantLoading: isLoading,
                            miniAiAssistantError: error,
                        }}
                        messagesContainerRef={messagesContainerRef}
                        handlePostResponseAction={handlePostResponseAction}
                        currentAction={currentAction}
                    />
                    {assistantResponse && (
                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                onClick={() => handlePostResponseAction(MiniAIAssistantAction.QUICK_COMPLIANCE_CHECK)}
                                disabled={isLoading}
                                className="w-full p-2 flex items-center gap-2 border border-blue-200 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50 text-sm text-gray-700"
                                aria-label="Perform quick compliance check"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Quick Compliance Check
                            </button>
                            <button
                                onClick={() => handlePostResponseAction(MiniAIAssistantAction.REFINE_ANSWER)}
                                disabled={isLoading}
                                className="w-full p-2 flex items-center gap-2 border border-blue-200 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50 text-sm text-gray-700"
                                aria-label={`Refine draft with ${refineTone} tone`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Refine Draft
                            </button>
                            <button
                                onClick={() => handlePostResponseAction(MiniAIAssistantAction.SUMMARIZE_ANSWER)}
                                disabled={isLoading}
                                className="w-full p-2 flex items-center gap-2 border border-blue-200 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50 text-sm text-gray-700"
                                aria-label="Summarize draft"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Summarize Draft
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;