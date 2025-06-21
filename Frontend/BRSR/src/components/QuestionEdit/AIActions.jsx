import PropTypes from 'prop-types';
import { useCallback, useState, useMemo, useEffect } from "react";
import { AlertCircle, Lightbulb, Sparkles, Info, FileText, ShieldCheck, Database, HelpCircle, Star, BookOpen, Edit3, Zap, Book, Edit2, HelpCircle as ExplainIcon, Key, Mic, RefreshCcw, BookMarked } from "lucide-react";
import AIActionButtons from "./AIActionButtons";
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { MiniAIAssistantAction } from './MiniAIAssistantAction.js';
import AIResponseDisplay from "./AIResponseDisplay";
import ToneSelector from "./ToneSelector";
import Loader from '../../components/loader.jsx'

// ---------- Domain & UX constants ----------
// Keep AI grounded in Indian ESG/BRSR and related disclosure frameworks
const INDIA_ESG_CONTEXT = "You are an industry-veteran ESG consultant specialising in India's Business Responsibility & Sustainability Report (BRSR) and other Indian compliance frameworks (SEBI BRSR, Companies Act, CSR Rules, EPF Act, Factories Act, ISO-14064, GHG Protocol). Ground every recommendation in this context with relevant Indian citations where appropriate.";

// Encourage freshness to avoid repetitive phrasing
const FRESHNESS_NOTE = "Vary your phrasing from previous suggestions; avoid repeating exact sentences or structures.";
// Ensure answers read as coming directly from the organisation
const COMPANY_VOICE_NOTE = "Write the answer from the company's perspective using first-person plural (\"We\", \"Our\"), reflecting organisational commitment rather than third-person commentary.";

// Shared logic for AI actions
const useAIActionHandlers = ({
    formData,
    setFormData,
    question,
    moduleId,
    selectedTextInTextarea,
    setSelectedTextInTextarea,
    generateText,
    setIsLoading,
    setError,
    setErrors,
    setAiMessage,
    setLeftAiMessage,
    refineTone,
}) => {
    const handleQuickAIAction = useCallback(async (action, suggestion = null) => {
        if (action === "USE_THIS") {
            // Dynamically decide which form field should receive the AI suggestion
            setFormData(prev => {
                const next = { ...prev };
                const cleanedSuggestion = typeof suggestion === 'string' ? suggestion.trim() : suggestion;

                // 1. Try metadata-based mapping first (Subjective & custom questions)
                if (question?.metadata?.fields?.length) {
                    question.metadata.fields.forEach(field => {
                        const key = field.key;
                        switch (field.type) {
                            case 'text':
                                if (typeof cleanedSuggestion === 'string') {
                                    next[key] = cleanedSuggestion;
                                }
                                break;
                            case 'boolean': {
                                const truthy = ['true', 'yes', 'y', '1'];
                                next[key] = truthy.includes(String(cleanedSuggestion).toLowerCase());
                                break;
                            }
                            case 'number':
                            case 'decimal':
                            case 'integer':
                            case 'percentage': {
                                const numeric = String(cleanedSuggestion).match(/[\d.]+/)?.[0] || '';
                                next[key] = numeric;
                                break;
                            }
                            case 'link':
                                next[key] = cleanedSuggestion;
                                break;
                            default:
                                // fallback: treat as text
                                next[key] = cleanedSuggestion;
                        }
                    });
                } else {
                    // 2. Legacy mapping based on generic properties
                    if (question.has_string_value) {
                        next.string_value = cleanedSuggestion;
                    } else if (question.has_decimal_value) {
                        const numeric = String(cleanedSuggestion).match(/[\d.]+/)?.[0] || '';
                        next.decimal_value = numeric;
                    } else if (question.has_boolean_value) {
                        const truthy = ['true', 'yes', 'y', '1'];
                        next.boolean_value = truthy.includes(String(cleanedSuggestion).toLowerCase());
                    } else if (question.has_link) {
                        next.link = cleanedSuggestion;
                    } else if (question.has_note) {
                        next.note = cleanedSuggestion;
                    } else {
                        next.string_value = cleanedSuggestion;
                    }
                }

                return next;
            });
            setAiMessage(null);
            setLeftAiMessage(null);
            setSelectedTextInTextarea(null); // Clear selection after using the suggestion
            return;
        }

        const leftActions = [
            MiniAIAssistantAction.SUMMARIZE_ANSWER,
            MiniAIAssistantAction.MAKE_MORE_CONCISE,
            MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Left,
            MiniAIAssistantAction.QUICK_COMPLIANCE_CHECK,
            MiniAIAssistantAction.IMPROVE_POST_COMPLIANCE,
        ];
        const isLeftAction = leftActions.includes(action);

        setIsLoading(prev => ({ ...prev, [isLeftAction ? 'left' : 'right']: true }));
        setError(null);
        setAiMessage(null);
        setLeftAiMessage(null);

        try {
            let prompt;
            const currentValue = formData?.string_value || "";
            // Capture the current Yes/No radio selection (if any) so AI keeps consistency
            const yesNoChoice = (formData?.boolean_value !== undefined)
                ? (formData.boolean_value ? 'Yes' : 'No')
                : null;

            const jsonInstruction = `\n\nIMPORTANT: Respond ONLY with a single, minified JSON object. Do NOT include any conversational text, explanations, or markdown formatting outside of this JSON structure. The JSON object must strictly match this TypeScript interface:
interface StructuredAISuggestion {
  id: string; // Unique ID for this suggestion
  type: "${action}"; // The action that triggered this
  title?: string; // A concise title for the suggestion block (max 5-7 words)
  mainContent?: string; // For a single block of text, summary, or full recommendation. Be concise.
  points?: string[]; // For breakdowns, lists. Each point concise.
  sections?: Array<{ heading: string; content: string }>; // For detailed explanations. Each section concise.
  slides?: string[]; // Optional carousel slides, 4–6 items, each ≤ 80 chars.
  complianceFeedback?: string; // For IMPROVE_POST_COMPLIANCE, raw feedback text.
  confidence: 'low' | 'medium' | 'high'; // Your confidence in this suggestion. MANDATORY.
  error?: string; // If you encounter an issue providing the suggestion
  ${action === MiniAIAssistantAction.REFINE_ANSWER || action === MiniAIAssistantAction.REFINE_SELECTION ? `refineParams?: { tone: "${refineTone}" };` : ''}
}`;

            switch (action) {
                case MiniAIAssistantAction.EXPLAIN_THIS_QUESTION:
                    prompt = `Question: "${question.question}". Guidance: "${question.guidance || 'None'}". Explain the purpose, expected information, and importance of this question in not more than 100 words. Return the explanation in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Left:
                case MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Right:
                    prompt = `${INDIA_ESG_CONTEXT ? INDIA_ESG_CONTEXT + '\n' : ''}${FRESHNESS_NOTE ? FRESHNESS_NOTE + '\n' : ''}${COMPANY_VOICE_NOTE ? COMPANY_VOICE_NOTE + '\n' : ''}\n\nQuestion: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft (if any): "${currentValue}". ${yesNoChoice ? `Current selection: \"${yesNoChoice}\". Your answer must begin with \"${yesNoChoice},\" and remain consistent. ` : ''}Generate a professional, industry-grade answer in not more than 150 words. Vary your structure, wording, and examples from previous responses. Use different sentence openers, and avoid repeating phrases. Return the full answer in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.BREAK_DOWN_QUESTION:
                    prompt = `Question: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft for context: "${currentValue}". Break down the question into 3-5 smaller components as points, explaining what information is needed for each, in not more than 100 words total. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.IDENTIFY_KEY_TERMS:
                    prompt = `Question: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft: "${currentValue}". Identify and explain 3-5 key terms as points, each explanation concise, in not more than 100 words total. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.CHECK_TONE_CONSISTENCY:
                    prompt = `Draft: "${currentValue}". Check the tone consistency and suggest improvements to make it more ${refineTone} in not more than 100 words. Provide suggestions as points. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.SUGGEST_ALTERNATIVE_PHRASING:
                    prompt = `Draft: "${currentValue}". Suggest 3-5 alternative professional phrasings as points while maintaining accuracy, in not more than 100 words total. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.SUMMARIZE_ANSWER:
                    prompt = `Question: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft: "${currentValue}". Provide a concise summary highlighting key points in 2-3 sentences, not more than 50 words. Vary your summary style and avoid repeating previous summaries. Return the summary in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.REFINE_ANSWER:
                    prompt = `${INDIA_ESG_CONTEXT}\n${FRESHNESS_NOTE}\n${COMPANY_VOICE_NOTE}\n\nQuestion: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft: "${currentValue}". Refine and enhance this draft to be more ${refineTone} and comprehensive in not more than 150 words. Use a different structure or phrasing from previous responses. Return the full refined answer in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.QUICK_COMPLIANCE_CHECK:
                    prompt = `You are an ESG report compliance reviewer. Analyse the following answer draft in relation to the question.\n\nQuestion: "${question.question}"\nGuidance: "${question.guidance || 'None'}"\nDraft: "${currentValue}"\n\nIf the draft is empty or fewer than 15 characters, clearly state there are *no substantive strengths*.\nReturn *2-3 Strengths* (if any), *2-3 Issues* (gaps, risks, missing evidence) and *clear Recommendations* (next steps). For at least one recommendation, provide a concrete example snippet (e.g., a short table layout or sentence template). Wherever relevant, cite the primary Indian statute or international standard in parentheses, e.g., “(EPF Act, 1952)”. Provide data-driven guidance where possible (e.g., “state employer + employee PF contribution rates”).\nIn *mainContent*, output each point on its own line, prefixed EXACTLY with one of these tags: [Strength], [Issue], or [Recommendation] followed by a colon.\nExample:\n[Strength]: Covers PF, Gratuity and Pension schemes (comprehensive).\n[Issue]: Draft lacks contribution rates.\n[Recommendation]: Add a summary table with employer/employee PF rates.\nDo not include any additional headings or prose outside these tagged lines.\nKeep wording formal and objective. Do not repeat the same heading for every bullet. Use concise phrasing. Vary your points and recommendations from previous responses. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.IMPROVE_POST_COMPLIANCE:
                    prompt = `${INDIA_ESG_CONTEXT}\n${FRESHNESS_NOTE}\n${COMPANY_VOICE_NOTE}\n\nQuestion: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft: "${currentValue}". Compliance review feedback:\n"${suggestion}"\n\nUsing the compliance feedback, strengthen the existing strengths, address each issue, and implement every recommendation. Produce an improved, fully compliant answer (<=150 words) in mainContent plus exactly 4 slides (≤80 chars) in slides. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.IMPROVE_CLARITY:
                    prompt = `Draft: "${currentValue}". Improve the clarity and readability of this answer while maintaining its meaning in not more than 150 words. Return the improved version in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.EXPAND_ANSWER:
                    prompt = `${INDIA_ESG_CONTEXT}\n${FRESHNESS_NOTE}\n${COMPANY_VOICE_NOTE}\n\nQuestion: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft: "${currentValue}". Expand this answer with more detailed information and examples while maintaining professionalism in not more than 150 words. Return the expanded answer in mainContent. Also break the expanded answer into exactly 4 slides (≤80 characters each) in slides. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.MAKE_MORE_CONCISE:
                    prompt = `Draft: "${currentValue}". Make this answer more concise while retaining all important information in not more than 50 words. Return the concise version in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.CHECK_COMPLETENESS:
                    prompt = `Question: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft: "${currentValue}". Analyze this answer for completeness, suggesting 2-3 missing aspects as points in not more than 100 words total. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.EXPLAIN_ACRONYMS:
                    prompt = `Draft: "${currentValue}". Identify and explain any acronyms as points in not more than 100 words total. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.SUGGEST_DATA_SOURCES:
                    prompt = `Question: "${question.question}". Guidance: "${question.guidance || 'None'}". Suggest 2-3 reliable data sources or methods for collecting data to answer this question accurately, in not more than 100 words total. Return suggestions as points. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.SUGGEST_TABLE_STRUCTURE:
                    prompt = `Question: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft: "${currentValue}". Suggest a table structure with 3-5 column headers as points and 1 example row in mainContent, in not more than 100 words total. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.ELABORATE_DRAFT:
                    prompt = `Draft: "${currentValue}". Elaborate on this draft by adding more details and context in not more than 150 words. Return the elaborated version in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.CONDENSE_DRAFT:
                    prompt = `Draft: "${currentValue}". Condense this draft by removing unnecessary details, focusing on key points in not more than 50 words. Return the condensed version in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.GENERATE_FOLLOWUP_QUESTIONS_FOR_USER:
                    prompt = `Question: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft: "${currentValue}". Generate 3-5 follow-up questions as points to help the user provide more comprehensive information, in not more than 100 words total. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.COMPARE_WITH_BEST_PRACTICE:
                    prompt = `Draft: "${currentValue}". Compare this answer with generic best practices, suggesting 2-3 improvements as points in not more than 100 words total. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.SUMMARIZE_SELECTION:
                    prompt = `Question: "${question.question}". Selected text: "${selectedTextInTextarea}". Summarize this selected text in 2-3 sentences, keeping key points concise, in not more than 50 words. Return the summary in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.REFINE_SELECTION:
                    prompt = `Question: "${question.question}". Selected text: "${selectedTextInTextarea}". Refine this selected text to improve clarity and align with tone "${refineTone}" in not more than 100 words. Return the refined text in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.EXPLAIN_SELECTION:
                    prompt = `Question: "${question.question}". Selected text: "${selectedTextInTextarea}". Explain the meaning or significance of this selected text in not more than 100 words. Return the explanation in mainContent. ${jsonInstruction}`;
                    break;
                default:
                    console.warn(`[AIActions] Unrecognized AI action: ${action}`);
                    throw new Error(`Unrecognized AI action: ${action}`);
            }

            const context = {
                questionText: question.question,
                guidanceText: question.guidance || "",
                metadata: {
                    ...question.metadata,
                    question_id: question.question_id,
                    question_type: question.question_type || question.type,
                    module_id: moduleId,
                },
                answer: formData // provide the full set of current answer fields
            };
            const rawResponse = await generateText({ message: prompt, context }).unwrap();
            let jsonString = rawResponse.trim();

            const fenceRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/s;
            const match = jsonString.match(fenceRegex);
            if (match && match[1]) {
                jsonString = match[1].trim();
            }

            try {
                const parsedResponse = JSON.parse(jsonString);
                if (!parsedResponse.confidence) {
                    console.warn(`[AIActions] Mini AI: Confidence score missing from AI response for action ${action}. Defaulting to 'medium'. Raw:`, rawResponse);
                    parsedResponse.confidence = 'medium';
                }
                const message = {
                    id: Date.now().toString(),
                    action,
                    text: parsedResponse.mainContent || parsedResponse.points?.map((pt)=>`- ${pt}`).join('\n') || parsedResponse.sections?.map(s => `${s.heading}\n${s.content}`).join('\n') || rawResponse,
                    suggestion: parsedResponse.mainContent && (
                        action === MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Right ||
                        action === MiniAIAssistantAction.REFINE_ANSWER ||
                        action === MiniAIAssistantAction.REFINE_SELECTION ||
                        action === MiniAIAssistantAction.SUMMARIZE_SELECTION
                    ) ? parsedResponse.mainContent :
                        action === MiniAIAssistantAction.SUGGEST_ALTERNATIVE_PHRASING && parsedResponse.points ? parsedResponse.points.map((pt)=>`- ${pt}`).join('\n') : null,
                    confidence: parsedResponse.confidence,
                    generic: parsedResponse.mainContent || null,
                    points: parsedResponse.points || null,
                    slides: parsedResponse.slides || null,
                };

                if (isLeftAction) {
                    setLeftAiMessage(message);
                } else {
                    setAiMessage(message);
                }
            } catch (parseError) {
                console.error(`[AIActions] Mini AI: Failed to parse JSON response for action ${action}:`, parseError, "\nRaw response was:", rawResponse);
                setError("AI returned an unexpected format. Please try again.");
                setErrors(prev => ({ ...prev, ai: "AI returned an unexpected format" }));
            }
        } catch (err) {
            setError(err?.data?.detail || 'Failed to fetch AI response. Please try again.');
            setErrors(prev => ({ ...prev, ai: 'Failed to fetch AI response' }));
        } finally {
            setIsLoading(prev => ({ ...prev, [isLeftAction ? 'left' : 'right']: false }));
        }
    }, [question, formData, refineTone, generateText, moduleId, selectedTextInTextarea, setFormData, setAiMessage, setLeftAiMessage, setError, setErrors, setIsLoading, setSelectedTextInTextarea]);

    const handleRefineDraftWithTone = useCallback(() => {
        const textToRefine = selectedTextInTextarea || formData.string_value;
        if (textToRefine.trim()) {
            handleQuickAIAction(MiniAIAssistantAction.REFINE_ANSWER);
        }
    }, [selectedTextInTextarea, formData, handleQuickAIAction]);

    return { handleQuickAIAction, handleRefineDraftWithTone };
};

// LeftAIActions component
export const LeftAIActions = ({
    formData,
    setFormData,
    question,
    moduleId,
    selectedTextInTextarea,
    setSelectedTextInTextarea,
    generateText,
    isLoading,
    setIsLoading,
    error,
    setError,
    setErrors,
    aiMessage,
    setAiMessage,
    leftAiMessage,
    setLeftAiMessage,
    refineTone,
}) => {
    const { handleQuickAIAction } = useAIActionHandlers({
        formData,
        setFormData,
        question,
        moduleId,
        selectedTextInTextarea,
        setSelectedTextInTextarea,
        generateText,
        setIsLoading,
        setError,
        setErrors,
        setAiMessage,
        setLeftAiMessage,
        refineTone,
    });

    const leftActions = [
        { action: MiniAIAssistantAction.SUMMARIZE_ANSWER, icon: BookOpen, title: "Summarize the Draft", requiresDraft: true },
        { action: MiniAIAssistantAction.MAKE_MORE_CONCISE, icon: Edit3, title: "Refine Draft", requiresDraft: true },
        { action: MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Left, icon: Zap, title: "AI Recommends" },
        { action: MiniAIAssistantAction.QUICK_COMPLIANCE_CHECK, icon: ShieldCheck, title: "Quick Compliance Check", requiresDraft: true },
    ];

    const hasDraft = formData.string_value?.trim().length > 0;

    const [hoveredAction, setHoveredAction] = useState(null);
    // Carousel state for long AI responses
    const [slideIndex, setSlideIndex] = useState(0);

    // Build slides: prefer explicit slides from backend, else parse tagged sections, else sentence grouping.
    const slides = useMemo(() => {
        if (!leftAiMessage) return [];

        // 1. Explicit slides from backend – respect but cap at 6
        if (Array.isArray(leftAiMessage.slides) && leftAiMessage.slides.length) {
            return leftAiMessage.slides.slice(0, 6);
        }

        const raw = leftAiMessage.text || '';
        const blocks = [];

        // 2. Parse [Strength]/[Issue]/[Recommendation] blocks (max 6)
        const tagRegex = /\[(Strength|Issue|Recommendation)\]:\s*([\s\S]*?)(?=\s*\[(?:Strength|Issue|Recommendation)\]:|$)/gi;
        let m;
        while ((m = tagRegex.exec(raw)) && blocks.length < 6) {
            const tag = m[1];
            const body = m[2].trim();
            blocks.push(`### ${tag}\n\n${body}`);
        }

        if (blocks.length) return blocks;

        // 3. Fallback – split sentences evenly into ≤6 chunks
        const sentences = raw.split(/(?<=[.!?])\s+/);
        if (!sentences.length) return [];
        const chunkSize = Math.ceil(sentences.length / 6);
        for (let i = 0; i < sentences.length && blocks.length < 6; i += chunkSize) {
            blocks.push(sentences.slice(i, i + chunkSize).join(' '));
        }
        return blocks;
    }, [leftAiMessage]);
    useEffect(() => { setSlideIndex(0); }, [leftAiMessage]);

    // Add proactive follow-up actions for left-side responses
    const renderProactiveFollowUps = (contextText) => {
        const actions = [
            { action: MiniAIAssistantAction.QUICK_COMPLIANCE_CHECK, label: 'Check This Draft Compliance', icon: ShieldCheck },
            { action: MiniAIAssistantAction.SUMMARIZE_ANSWER, label: 'Summarize This Draft', icon: BookOpen },
            { action: MiniAIAssistantAction.MAKE_MORE_CONCISE, label: 'Make This Draft More Concise', icon: Edit3 }, // Adjusted for left-side actions
        ];
        return (
            <div className="mt-2 pt-3">
                <p className="text-xs font-semibold text-gray-700 mb-2 tracking-wide">Further Actions:</p>
                {actions.map(({ action, label, icon: Icon }) => (
                    <button
                        key={action}
                        onClick={() => handleQuickAIAction(action, contextText)}
                        className="w-full text-left mb-2 px-2.5 py-2 text-[9px] font-medium text-gray-900 bg-[#E6E8F0] hover:bg-[#D1D6E8] rounded-md transition-all duration-200 ease-in-out flex items-center hover:scale-[1.02] focus:outline-none focus:ring-2"
                    >
                        <Icon className="w-3.5 h-3.5 mr-2 text-[#000D30]" /> {label}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <>
            {/* Animated label above buttons */}
            <div style={{ minHeight: 40, marginBottom: 12, position: "relative" }}>
                {leftActions.map(({ action, title }) =>
                    hoveredAction === action ? (
                        <div
                            key={action}
                            className="ai-action-label-glass"
                            style={{
                                left: '50%',
                                transform: 'translate(-50%, 0)',
                                position: 'absolute',
                                top: 0,
                                zIndex: 20,
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {title}
                        </div>
                    ) : null
                )}
            </div>
            {!isLoading.left && !leftAiMessage ? (
                <div className="flex flex-wrap justify-center gap-3 px-4 py-5">
                    {leftActions.map(({ action, icon: Icon, title, requiresDraft }) => {
                        const isDisabled = requiresDraft && !hasDraft;
                        return (
                            <div key={action} className="relative">
                                <button
                                    onMouseEnter={() => setHoveredAction(action)}
                                    onMouseLeave={() => setHoveredAction(null)}
                                    onFocus={() => setHoveredAction(action)}
                                    onBlur={() => setHoveredAction(null)}
                                    onClick={() => handleQuickAIAction(action)}
                                    title={title}
                                    className={`
                                        flex items-center justify-center
                                        w-12 h-12 rounded-xl
                                        bg-[#1A2B5C]
                                        hover:bg-[#0F1D42]
                                        active:bg[#000A24]
                                        text-white font-medium
                                        transition-all duration-300 ease-out
                                        transform hover:scale-110 active:scale-95
                                        shadow-lg hover:shadow-xl
                                        disabled:opacity-40 disabled:cursor-not-allowed 
                                        disabled:hover:scale-100 disabled:shadow-lg
                                        disabled:bg-gray-600
                                        focus:outline-none focus:ring-3 focus:ring-navy-hover
                                        hover:rotate-3 active:rotate-0
                                    `}
                                    disabled={isDisabled}
                                    aria-label={title}
                                >
                                    <Icon className="w-5 h-5 transition-transform duration-200" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                    <div className="px-4 sm:px-6 py-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-3">
                            <div className="relative">
                                <div className="w-3 h-3 bg-[#000D30] rounded-full animate-pulse"></div>
                                <div className="absolute inset-0 w-3 h-3 bg-[#000D30] rounded-full animate-ping opacity-75"></div>
                            </div>
                            AI Assistant Actions
                        </h3>
                    </div>
                    <div className="px-4 sm:px-6 pb-6">
                        {isLoading.left ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="relative">
                                    <div className="w-10 h-10 border-4 border-blue-200 rounded-full border-t-[#000D30] animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-6 h-6 bg-[#000D30] rounded-full animate-pulse opacity-20"></div>
                                    </div>
                                </div>
                                <span className="ml-3 text-sm font-medium text-gray-600">Processing...</span>
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-semibold text-red-800 mb-1">Error Occurred</h4>
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        ) : leftAiMessage ? (
                            <div>
                                <div className="flex-1 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl shadow-inner border border-slate-200/60 overflow-y-auto backdrop-blur-sm scrollbar-none p-4 text-gray-700">
                                    {/* Only render parsed bullet points for compliance check, not the raw text, and do not render both at once */}
                                    {leftAiMessage.action === MiniAIAssistantAction.QUICK_COMPLIANCE_CHECK && leftAiMessage.mainContent ? (
                                        (() => {
                                            // Split mainContent by newlines and group by tag
                                            const strengths = [], issues = [], recommendations = [];
                                            leftAiMessage.mainContent.split(/\r?\n/).forEach(line => {
                                                const trimmed = line.trim();
                                                if (trimmed.startsWith('[Strength]:')) strengths.push(trimmed.replace('[Strength]:', '').trim());
                                                else if (trimmed.startsWith('[Issue]:')) issues.push(trimmed.replace('[Issue]:', '').trim());
                                                else if (trimmed.startsWith('[Recommendation]:')) recommendations.push(trimmed.replace('[Recommendation]:', '').trim());
                                            });
                                            return (
                                                <div className="mb-3">
                                                    {strengths.length > 0 && <>
                                                        <div className="font-semibold text-green-800 mb-1">Strengths</div>
                                                        <ul className="list-disc pl-5 mb-2 text-sm text-green-900">
                                                            {strengths.map((pt, i) => <li key={i}>{pt}</li>)}
                                                        </ul>
                                                    </>}
                                                    {issues.length > 0 && <>
                                                        <div className="font-semibold text-yellow-800 mb-1">Issues</div>
                                                        <ul className="list-disc pl-5 mb-2 text-sm text-yellow-900">
                                                            {issues.map((pt, i) => <li key={i}>{pt}</li>)}
                                                        </ul>
                                                    </>}
                                                    {recommendations.length > 0 && <>
                                                        <div className="font-semibold text-blue-800 mb-1">Recommendations</div>
                                                        <ul className="list-disc pl-5 mb-2 text-sm text-blue-900">
                                                            {recommendations.map((pt, i) => <li key={i}>{pt}</li>)}
                                                        </ul>
                                                    </>}
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        // Default rendering for other actions
                                        <>
                                            {leftAiMessage.generic && (
                                                <div className="mb-3"><ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                                                    {leftAiMessage.generic}
                                                </ReactMarkdown></div>
                                            )}
                                            {leftAiMessage.points?.length > 0 && (
                                                <ul className="list-disc pl-5 mb-4 text-sm text-gray-700">
                                                    {leftAiMessage.points.map((pt, idx) => (
                                                        <li key={idx}>{pt}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="mt-4 flex flex-wrap justify-end gap-3">
                                    {leftAiMessage.action === MiniAIAssistantAction.MAKE_MORE_CONCISE ||
                                        leftAiMessage.action === MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Left ||
                                        leftAiMessage.action === MiniAIAssistantAction.IMPROVE_POST_COMPLIANCE ? (
                                        <>
                                            <button
                                                onClick={() => setLeftAiMessage(null)}
                                                className="
                                                    px-4 py-2 text-sm font-medium
                                                    text-gray-700 bg-gray-200
                                                    hover:bg-gray-300
                                                    rounded-lg
                                                    focus:outline-none focus:ring-2 focus:ring-indigo-300
                                                    transition-all duration-200
                                                "
                                                aria-label="Reject AI suggestion"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const chosen = leftAiMessage.suggestion || leftAiMessage.text;
                                                    console.log("Using AI suggestion:", chosen);
                                                    handleQuickAIAction("USE_THIS", chosen);
                                                    setLeftAiMessage(null);
                                                }}
                                                className="
                                                    px-4 py-2 text-sm font-medium
                                                    text-white bg-[#0F1D42]
                                                    hover:bg-[#1A2B5C]
                                                    rounded-lg
                                                    focus:outline-none focus:ring-2 focus:ring-indigo-300
                                                    transition-all duration-200
                                                "
                                                aria-label="Accept AI suggestion"
                                            >
                                                Accept
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {leftAiMessage.action === MiniAIAssistantAction.QUICK_COMPLIANCE_CHECK && (
                                                <button
                                                    onClick={() => handleQuickAIAction(MiniAIAssistantAction.IMPROVE_POST_COMPLIANCE, leftAiMessage.text)}
                                                    className="
                                                        px-4 py-2 text-sm font-medium
                                                        text-white bg-green-700
                                                        hover:bg-green-800
                                                        rounded-lg
                                                        focus:outline-none focus:ring-2 focus:ring-green-300
                                                        transition-all duration-200
                                                    "
                                                    aria-label="Generate improved response"
                                                >
                                                    Generate Improved Draft
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setLeftAiMessage(null)}
                                                className="
                                                    px-4 py-2 text-sm font-medium
                                                    text-white bg-[#0F1D42]
                                                    hover:bg-[#1A2B5C]
                                                    rounded-lg
                                                    focus:outline-none focus:ring-2 focus:ring-indigo-300
                                                    transition-all duration-200
                                                "
                                                aria-label="Acknowledge AI suggestion"
                                            >
                                                Okay
                                            </button>
                                        </>
                                    )}
                                </div>
                                {leftAiMessage.suggestion && renderProactiveFollowUps(leftAiMessage.suggestion)}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
            {/* Advanced animation styles */}
            <style>{`
                .ai-action-label-glass {
                    background: rgba(255, 255, 255, 0.25);
                    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    padding: 0.5rem 1.5rem;
                    font-size: 1.08rem;
                    font-weight: 600;
                    color: #1A2B5C;
                    letter-spacing: 0.01em;
                    opacity: 0;
                    transform: translate(-50%, 10px) scale(0.95);
                    animation: aiLabelIn 0.35s cubic-bezier(0.4, 0.2, 0.2, 1) forwards;
                }
                @keyframes aiLabelIn {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, 20px) scale(0.92);
                    }
                    60% {
                        opacity: 1;
                        transform: translate(-50%, -4px) scale(1.04);
                    }
                    100% {
                        opacity: 1;
                        transform: translate(-50%, 0) scale(1);
                    }
                }
            `}</style>
        </>
    );
};

// Placeholder RightAIActionsContent for right-side AI actions
export const RightAIActionsContent = (props) => {
    // You can customize this as needed; for now, it mirrors LeftAIActions
    return <LeftAIActions {...props} />;
};