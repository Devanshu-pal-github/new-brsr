import React, { useRef, useEffect } from 'react';
import { FaTimes, FaUser, FaRobot, FaPaperPlane, FaClipboard, FaPen, FaQuestionCircle, FaListAlt, FaBookOpen, FaSearch, FaChartLine } from 'react-icons/fa';
import { renderMarkdown } from './renderMarkdown';
import ExplanationCarousel from './ExplanationCarousel';

// Component 1: ChatbotHeader
export const ChatbotHeader = ({ onClose, activeQuestion, isApiKeyAvailable }) => {
    return (
        <div className="bg-gradient-to-r from-slate-50/90 to-indigo-50/90 p-3 border-b border-slate-200/30 rounded-b-2xl shadow-sm animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative w-5 h-5 bg-white/90 rounded-md flex items-center justify-center border border-slate-200/30 animate-pulse-gentle">
                        <div className="w-2.5 h-2.5 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-sm"></div>
                        <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-emerald-400 rounded-full border border-white/80"></div>
                    </div>
                    <div>
                        <h2 className="text-sm font-medium text-slate-800">AI Assistant</h2>
                        <div className="flex items-center gap-1 text-[11px] text-slate-600">
                            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></div>
                            <span>Active</span>
                        </div>
                    </div>
                </div>
                <div
                    onClick={onClose}
                    className="p-1 rounded-md bg-slate-100/50 hover:bg-indigo-100/50 text-slate-600 hover:text-indigo-700 cursor-pointer transition-all duration-200 animate-slide-up"
                    aria-label="Close Assistant"
                >
                    <FaTimes className="w-4 h-4" />
                </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-700 animate-slide-up border-t border-slate-200/40 pt-1">
                {activeQuestion ? (
                    <div className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse"></div>
                        <span className="truncate max-w-[200px]">{activeQuestion.question_text.substring(0, 30)}...</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                        <span>BRSR Assistant Mode</span>
                    </div>
                )}
                {!isApiKeyAvailable && (
                    <div className="flex items-center gap-1 mt-1 text-amber-600">
                        <div className="w-1 h-1 bg-amber-400 rounded-full animate-pulse"></div>
                        <span>API Config Needed</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Component 2: ChatbotMessages
export const ChatbotMessages = ({ messages, handleCopyMessage, copiedMessageId, isLoading, error, handleAction, formatTimestamp }) => {
    const messagesEndRef = useRef(null);

    // Find index of last AI message to show follow-up actions only there
    const lastAiIndex = messages
        .map((msg, i) => (msg.sender === "ai" ? i : -1))
        .filter((i) => i !== -1)
        .pop();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div
            className="flex-1 px-6 py-2.5 overflow-y-auto bg-gradient-to-br from-slate-50/50 to-indigo-50/50 space-y-2 scrollbar-none"
            style={{ scrollbarWidth: "none" }}
        >
            {messages.map((msg, index) => (
                <div
                    key={msg.id}
                    className={`flex flex-col animate-message-appear ${
                        msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                >
                    {/* AI Message */}
                    {msg.sender === "ai" && (
                        <div className="flex items-end max-w-[80%] group relative">
                            <div className="mr-2 flex-shrink-0">
                                <FaRobot className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="px-2.5 py-1.5 rounded-lg text-sm bg-white/80 text-slate-800 rounded-bl-none border border-slate-200/30 relative">
                                {msg.isMarkdown && !msg.carouselPayload
                                    ? renderMarkdown(msg.text)
                                    : (
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    )}

                                {!msg.carouselPayload && (
                                    <div
                                        onClick={() => handleCopyMessage(msg.text, msg.id)}
                                        className="absolute top-1 right-1 p-1 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-md hover:bg-indigo-50/50 cursor-pointer animate-slide-up"
                                    >
                                        {copiedMessageId === msg.id ? (
                                            <span className="text-[10px] text-indigo-600">✓</span>
                                        ) : (
                                            <FaClipboard className="w-3 h-3" />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* User Message */}
                    {msg.sender === "user" && (
                        <div className="flex items-end max-w-[80%] group">
                            {/* User message bubble first */}
                            <div className="px-2.5 py-1.5 rounded-lg text-sm bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-br-none border border-indigo-400/30">
                                {msg.isMarkdown && !msg.carouselPayload
                                    ? renderMarkdown(msg.text)
                                    : <p className="whitespace-pre-wrap">{msg.text}</p>}
                            </div>

                            {/* User icon on right with spacing */}
                            <div className="mb-0.5 ml-2 flex-shrink-0">
                                <FaUser className="w-3 h-3 text-indigo-300" />
                            </div>
                        </div>
                    )}

                    {msg.carouselPayload && (
                        <div className="w-full mt-1 animate-slide-up">
                            <ExplanationCarousel
                                payload={msg.carouselPayload}
                                onAction={handleAction}
                            />
                        </div>
                    )}

                    {/* Follow-up actions for latest AI message only */}
                    {msg.sender === "ai" &&
                        msg.followUpActions &&
                        index === lastAiIndex && (
                            <div className="mt-1 max-w-[80%] ml-6 flex flex-wrap gap-1 animate-slide-up">
                                {msg.followUpActions.map((action, actionIndex) => (
                                    <div
                                        key={action}
                                        onClick={() =>
                                            handleAction(
                                                action,
                                                msg.carouselPayload ? "Carousel content" : msg.text
                                            )
                                        }
                                        className="px-2 py-0.5 text-[10px] text-slate-600 hover:text-indigo-600 bg-slate-100/50 hover:bg-indigo-50/50 rounded-md cursor-pointer transition-all duration-200"
                                        style={{ animationDelay: `${actionIndex * 0.1}s` }}
                                    >
                                        {action.replace(/_/g, " ").toLowerCase()}
                                    </div>
                                ))}
                            </div>
                        )}
                </div>
            ))}

            <div ref={messagesEndRef} />

            {isLoading && (
                <div className="flex justify-center py-2 animate-fade-in">
                    <div className="flex items-center gap-1.5 bg-white/80 rounded-lg px-2.5 py-1 border border-slate-200/30">
                        <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                        <span className="text-[10px] text-slate-600">Processing</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="flex justify-center py-1.5 animate-shake">
                    <div className="px-2.5 py-1 bg-red-50/80 rounded-lg border border-red-200/30 text-[10px] text-red-600">
                        ⚠️ {error}
                    </div>
                </div>
            )}
        </div>
    );
};

// Component 3: ChatbotInput
export const ChatbotInput = ({ input, setInput, handleSendMessage, isLoading, isWaitingForTerm, isApiKeyAvailable, inputRef }) => {
    return (
        <div className="p-2 bg-gradient-to-r from-slate-50/90 to-indigo-50/90 border-t border-slate-200/30 animate-fade-in">
            <div className="flex items-center gap-1.5">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
                    placeholder={isWaitingForTerm ? "Enter term..." : "Type message..."}
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-sm bg-white/90 text-slate-800 placeholder-slate-400/70 border border-slate-200/30 focus:outline-none focus:ring-1 focus:ring-indigo-400/50 disabled:opacity-50 transition-all duration-200"
                    disabled={isLoading || !isApiKeyAvailable}
                />
                <div
                    onClick={handleSendMessage}
                    className="p-1.5 rounded-lg bg-slate-100/50 hover:bg-indigo-100/50 text-slate-600 hover:text-indigo-700 disabled:opacity-40 cursor-pointer transition-all duration-200 animate-slide-up"
                    aria-label="Send message"
                >
                    <FaPaperPlane className="w-3 h-3" />
                </div>
            </div>
        </div>
    );
};

// Component 4: ChatbotQuickActions
export const ChatbotQuickActions = ({ quickActions, handleAction, isLoading, isApiKeyAvailable, activeQuestion }) => {
    const requiresActiveQuestion = [
        'DRAFT_ANSWER', 'EXPLAIN_QUESTION', 'SUGGEST_INPUT_ELEMENTS', 'SHOW_EXAMPLE_ANSWER',
        'EXPLAIN_DRAFT', 'IMPROVE_DRAFT', 'SUGGEST_FOLLOW_UP',
    ];

    const actionConfig = {
        DRAFT_ANSWER: { label: 'Draft', icon: <FaPen />, tooltip: 'Create a draft answer' },
        EXPLAIN_QUESTION: { label: 'Explain', icon: <FaQuestionCircle />, tooltip: 'Explain the question' },
        SUGGEST_INPUT_ELEMENTS: { label: 'Inputs', icon: <FaListAlt />, tooltip: 'Suggest input elements' },
        SHOW_EXAMPLE_ANSWER: { label: 'Example', icon: <FaBookOpen />, tooltip: 'Show example answer' },
        DEFINE_TERM: { label: 'Define', icon: <FaSearch />, tooltip: 'Define a term' },
        EXPLORE_EXAMPLES: { label: 'Examples', icon: <FaBookOpen />, tooltip: 'Explore examples' },
        SUMMARIZE_CHAT: { label: 'Summarize', icon: <FaListAlt />, tooltip: 'Summarize chat' },
        SUGGEST_USER_FOLLOWUPS: { label: 'Follow-ups', icon: <FaQuestionCircle />, tooltip: 'Suggest follow-ups' },
        DRAFT_KEY_METRICS_LIST: { label: 'Metrics', icon: <FaChartLine />, tooltip: 'Draft key metrics' },
    };

    return (
        <div className="p-2 bg-gradient-to-r from-slate-50/90 to-indigo-50/90 border-t border-slate-200/30 animate-fade-in">
            <div className="flex flex-wrap gap-1 justify-center">
                {quickActions.map((action, index) => (
                    <div
                        key={action}
                        onClick={() => handleAction(action)}
                        className={`group relative flex items-center gap-1 px-2 py-0.5 text-[10px] text-slate-600 hover:text-indigo-600 rounded-md transition-all duration-200 cursor-pointer animate-slide-up ${
                            (requiresActiveQuestion.includes(action) && !activeQuestion) || !isApiKeyAvailable || isLoading
                                ? 'bg-slate-100/30 text-slate-400/70 cursor-not-allowed'
                                : 'bg-slate-100/50 hover:bg-indigo-50/50'
                        }`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        <span className="text-indigo-500">{actionConfig[action]?.icon}</span>
                        <span>{actionConfig[action]?.label || action.replace(/_/g, ' ').toLowerCase()}</span>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800/80 text-white text-[10px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            {actionConfig[action]?.tooltip}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};