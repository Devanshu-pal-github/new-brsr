import React from 'react';
import { CheckCircle, AlertCircle, ShieldCheck, BookOpen, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { MiniAIAssistantAction } from './MiniAIAssistantAction.js';

const AIResponseDisplay = ({ aiMessage, isLoading, error, handlePostResponseAction }) => {
    console.log("AIResponseDisplay rendered with:", { aiMessage });

    if (isLoading) {
        console.log("AI is thinking...");
        return (
            <div className="mt-2">
                <div className="flex items-center gap-2">
                    <div className="text-blue-300 font-semibold flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        AI is thinking...
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-2">
                <div className="text-xs text-red-300 font-medium p-3 bg-red-900/50 rounded-lg border border-red-700">
                    <div className="flex items-center gap-2 text-red-300">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-bold">Assistant Error:</span>
                    </div>
                    <p className="text-red-300 text-xs mt-0.5">{error}</p>
                    <button 
                        onClick={() => handlePostResponseAction(aiMessage?.action)} 
                        className="mt-2 text-xs text-blue-300 hover:text-blue-200 hover:underline"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!aiMessage) return null;

    const renderProactiveFollowUps = (contextText) => {
        const actions = [
            { action: MiniAIAssistantAction.QUICK_COMPLIANCE_CHECK, label: 'Check This Draft Compliance', icon: ShieldCheck },
            { action: MiniAIAssistantAction.SUMMARIZE_ANSWER, label: 'Summarize This Draft', icon: BookOpen },
            { action: MiniAIAssistantAction.REFINE_ANSWER, label: 'Refine This Draft Further', icon: Edit3 },
        ];
        return (
            <div className="mt-2 pt-3">
                <p className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">Further Actions:</p>
                {actions.map(({ action, label, icon: Icon }) => (
                    <button
                        key={action}
                        onClick={() => handlePostResponseAction(action, contextText)}
                        className="w-full text-left mb-2 px-2.5 py-2 text-[9px] font-medium text-gray-900 bg-[#E6E8F0] hover:bg-[#D1D6E8] rounded-md transition-all duration-200 ease-in-out flex items-center hover:scale-[1.02] focus:outline-none focus:ring-2"
                    >
                        <Icon className="w-3.5 h-3.5 mr-2 tex-blue-700" /> {label}
                    </button>
                ))}
            </div>
        );
    };

    // Format the AI response text into structured markdown
    const formatResponseToMarkdown = (text) => {
        const sentences = text.split('. ').filter(sentence => sentence.trim().length > 0);
        const markdownPoints = sentences.map((sentence, index) => {
            const trimmedSentence = sentence.trim().replace(/\.$/, '');
            const pointTitle = trimmedSentence.split(' ').slice(0, 2).join(' '); // Take first two words for point title
            return `- **${pointTitle}**: ${trimmedSentence}`;
        }).join('\n');
        return `### Human Rights Integration\n${markdownPoints}`;
    };

    const formattedText = formatResponseToMarkdown(aiMessage.text);

    // Capitalize the confidence level for display
    const confidenceLevel = aiMessage.confidence
        ? aiMessage.confidence.charAt(0).toUpperCase() + aiMessage.confidence.slice(1)
        : 'Unknown';

    return (
        <div className="mt-2 relative">
            {/* Confidence Badge in Top Right */}
            <div className="absolute top-0 right-0">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-[#000D30] to-[#1A2B5C] text-white shadow-sm border border-[#000D30]">
                    AI Confidence: {confidenceLevel}
                </span>
            </div>

            {/* AI Response with Classy Markdown */}
            <div className="prose prose-sm max-w-none text-gray-300 pt-6">
                <ReactMarkdown 
                    rehypePlugins={[rehypeSanitize]}
                    components={{
                        h3: ({ node, ...props }) => (
                            <h3 
                                className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-1" 
                                {...props} 
                            />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul 
                                className="list-disc pl-5 my-2 space-y-1" 
                                {...props} 
                            />
                        ),
                        li: ({ node, ...props }) => (
                            <li 
                                className="text-sm text-gray-700 leading-relaxed" 
                                {...props} 
                            />
                        ),
                        strong: ({ node, ...props }) => (
                            <strong 
                                className="font-semibold text-gray-800" 
                                {...props} 
                            />
                        ),
                        p: ({ node, ...props }) => (
                            <p 
                                className="text-sm text-gray-700 mb-2 leading-relaxed" 
                                {...props} 
                            />
                        ),
                        code: ({ node, ...props }) => (
                            <code 
                                className="bg-slate-100 px-1 py-0.5 rounded text-xs text-gray-800 font-mono" 
                                {...props} 
                            />
                        ),
                    }}
                >
                    {formattedText}
                </ReactMarkdown>
            </div>

            {/* Suggestion Button */}
            {aiMessage.suggestion && (
                <div className="mt-3 pt-3">
                    <button
                        onClick={() => handlePostResponseAction("USE_THIS", aiMessage.suggestion)}
                        className="w-full p-2 text-white bg-[#1A2B5C] hover:bg-[#0F1D42] rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Use This Suggestion
                    </button>
                </div>
            )}

            {/* Proactive Follow-Ups */}
            {aiMessage.suggestion && renderProactiveFollowUps(aiMessage.suggestion)}
        </div>
    );
};

export default AIResponseDisplay;