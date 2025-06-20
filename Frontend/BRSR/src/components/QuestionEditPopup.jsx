import { useRef, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
    useSubmitQuestionAnswerMutation,
    useStoreQuestionDataMutation,
    useGenerateTextMutation,
} from "../store/api/apiSlice";
import { useInactivityDetector } from "./QuestionEdit/useInactivityDetector";
import ModalHeader from "./QuestionEdit/ModalHeader";
import FormFields from "./QuestionEdit/FormFields";
import {
    LeftAIActions,
    RightAIActionsContent,
} from "./QuestionEdit/AIActions";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { SubjectiveRenderer, TableRenderer, TableWithAdditionalRowsRenderer } from "../dynamic-pages/components/renderers";
import toast from "react-hot-toast";
import { AlertCircle } from "lucide-react";
import AIResponseDisplay from "./QuestionEdit/AIResponseDisplay";
import ToneSelector from "./QuestionEdit/ToneSelector";
import AIActionButtons from "./QuestionEdit/AIActionButtons";
import { MiniAIAssistantAction } from "./QuestionEdit/MiniAIAssistantAction.js";

const QuestionEditPopup = ({
    question,
    initialAnswer,
    onClose,
    onSuccess,
    moduleId,
}) => {
    const [formData, setFormData] = useState({
        string_value: initialAnswer?.string_value || "",
        decimal_value: initialAnswer?.decimal_value || "",
        boolean_value: initialAnswer?.boolean_value || false,
        link: initialAnswer?.link || "",
        note: initialAnswer?.note || "",
        has_details: initialAnswer?.has_details || false,
        justification: initialAnswer?.justification || "",
    });
    const [currentValue, setCurrentValue] = useState(initialAnswer || {});
    const [errors, setErrors] = useState({});
    const [isVisible, setIsVisible] = useState(false);
    const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
    const [isSaveLoading, setIsSaveLoading] = useState(false);
    const [submitAnswer] = useSubmitQuestionAnswerMutation();
    const [storeQuestionData] = useStoreQuestionDataMutation();
    const [generateText] = useGenerateTextMutation();
    const [isLoading, setIsLoading] = useState({ left: false, right: false });
    const [error, setError] = useState(null);
    const [isTextareaFocused, setIsTextareaFocused] = useState(false);
    const [selectedTextInTextarea, setSelectedTextInTextarea] = useState(null);
    const [aiMessage, setAiMessage] = useState(null);
    const [leftAiMessage, setLeftAiMessage] = useState(null);
    const [refineTone, setRefineTone] = useState("concise");
    const user = useSelector((state) => state.auth.user);
    const textareaRef = useRef(null);
    const leftPanelRef = useRef(null);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    useEffect(() => {
        if (!initialAnswer) return;

        // Create a base object starting with any dynamic keys that already exist
        let mappedFormData = {
            ...initialAnswer,
            string_value: initialAnswer?.string_value || initialAnswer?.text || initialAnswer?.value || "",
            decimal_value: initialAnswer?.decimal_value ?? "",
            boolean_value: initialAnswer?.boolean_value ?? false,
            link: initialAnswer?.link || "",
            note: initialAnswer?.note || "",
        };

        // If metadata for the question exists, make sure its field keys are populated
        if (question?.metadata?.fields?.length) {
            question.metadata.fields.forEach((field) => {
                const key = field.key;
                if (mappedFormData[key] === undefined || mappedFormData[key] === "") {
                    switch (field.type) {
                        case "text":
                            mappedFormData[key] = initialAnswer?.string_value || initialAnswer?.text || initialAnswer?.value || "";
                            break;
                        case "boolean":
                            mappedFormData[key] = initialAnswer?.boolean_value ?? false;
                            break;
                        case "number":
                        case "decimal":
                        case "integer":
                        case "percentage":
                            mappedFormData[key] = initialAnswer?.decimal_value ?? "";
                            break;
                        case "link":
                            mappedFormData[key] = initialAnswer?.link || "";
                            break;
                        default:
                            mappedFormData[key] = initialAnswer[key] ?? "";
                    }
                }
            });
        }

        setFormData((prev) => ({
            ...prev,
            ...mappedFormData,
        }));
        setCurrentValue(initialAnswer);
    }, [initialAnswer, question]);

    useInactivityDetector({
        timeouts: [300000],
        onTimeout: () => {
            setAiMessage(null);
            setLeftAiMessage(null);
            setError(null);
            setIsLoading({ left: false, right: false });
        },
    });

    const handleInputChange = (e, fieldType) => {
        const { name, value, type, checked } = e.target;
        let isValid = true;
        let errorMessage = "";
        if (fieldType === "string") {
            if (question.string_value_required && !value.trim()) {
                isValid = false;
                errorMessage = "This field is required.";
            }
        } else if (fieldType === "decimal") {
            if (isNaN(value) || value === "") {
                isValid = false;
                errorMessage = "Please enter a valid number.";
            }
        } else if (fieldType === "link") {
            const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
            if (value && !urlRegex.test(value)) {
                isValid = false;
                errorMessage = "Please enter a valid URL.";
            }
        }

        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
        setErrors((prev) => ({ ...prev, [name]: isValid ? "" : errorMessage }));
    };

    const handleQuickAIAction = async (action, suggestion = null) => {
        if (action === "USE_THIS") {
            setFormData(prev => ({ ...prev, string_value: suggestion }));
            setAiMessage(null);
            setLeftAiMessage(null);
            setSelectedTextInTextarea(null);
            return;
        }

        const leftActions = [
            MiniAIAssistantAction.SUMMARIZE_ANSWER,
            MiniAIAssistantAction.MAKE_MORE_CONCISE,
            MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Left,
            MiniAIAssistantAction.QUICK_COMPLIANCE_CHECK,
        ];
        const isLeftAction = leftActions.includes(action);

        setIsLoading(prev => ({ ...prev, [isLeftAction ? 'left' : 'right']: true }));
        setError(null);
        setAiMessage(null);
        setLeftAiMessage(null);

        try {
            let prompt;
            const currentValue = formData?.string_value || "";

            const jsonInstruction = `\n\nIMPORTANT: Respond ONLY with a single, minified JSON object. Do NOT include any conversational text, explanations, or markdown formatting outside of this JSON structure. The JSON object must strictly match this TypeScript interface:
interface StructuredAISuggestion {
  id: string; // Unique ID for this suggestion
  type: "${action}"; // The action that triggered this
  title?: string; // A concise title for the suggestion block (max 5-7 words)
  mainContent?: string; // For a single block of text, summary, or full recommendation. Be concise.
  points?: string[]; // For breakdowns, lists. Each point concise.
  sections?: Array<{ heading: string; content: string }>; // For detailed explanations. Each section concise.
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
                    prompt = `Question: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft: "${currentValue}". Generate a professional answer in not more than 150 words. Return the full answer in mainContent. ${jsonInstruction}`;
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
                    prompt = `Question: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft: "${currentValue}". Provide a concise summary highlighting key points in 2-3 sentences, not more than 50 words. Return the summary in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.REFINE_ANSWER:
                    prompt = `Question: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft: "${currentValue}". Refine and enhance this draft to be more ${refineTone} and comprehensive in not more than 150 words. Return the full refined answer in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.QUICK_COMPLIANCE_CHECK:
                    prompt = `Question: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft: "${currentValue}". Perform a quick compliance check, highlighting 2-3 strengths and 2-3 potential issues as points in not more than 100 words total. Indicate if the question seems addressed in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.IMPROVE_CLARITY:
                    prompt = `Draft: "${currentValue}". Improve the clarity and readability of this answer while maintaining its meaning in not more than 150 words. Return the improved version in mainContent. ${jsonInstruction}`;
                    break;
                case MiniAIAssistantAction.EXPAND_ANSWER:
                    prompt = `Question: "${question.question}". Guidance: "${question.guidance || 'None'}". Draft: "${currentValue}". Expand this answer with more detailed information and examples while maintaining professionalism in not more than 150 words. Return the expanded answer in mainContent. ${jsonInstruction}`;
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
                    question_id: question.question_id,
                    module_id: moduleId
                },
                answer: currentValue
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
                    text: parsedResponse.mainContent || parsedResponse.points?.join('\n') || parsedResponse.sections?.map(s => `${s.heading}\n${s.content}`).join('\n') || rawResponse,
                    suggestion: parsedResponse.mainContent && (
                        action === MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Right ||
                        action === MiniAIAssistantAction.REFINE_ANSWER ||
                        action === MiniAIAssistantAction.REFINE_SELECTION ||
                        action === MiniAIAssistantAction.SUMMARIZE_SELECTION
                    ) ? parsedResponse.mainContent :
                        action === MiniAIAssistantAction.SUGGEST_ALTERNATIVE_PHRASING && parsedResponse.points ? parsedResponse.points.join('\n') : null,
                    confidence: parsedResponse.confidence,
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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Save Answer button clicked, handleSubmit triggered");
        setIsSaveLoading(true);
        setError(null);

        try {
            // ----------------------------------------------------------------
            // Build a mutable copy of formData so we can transform values
            // without relying on asynchronous state updates.
            // ----------------------------------------------------------------
            let updatedFormData = { ...formData };
            console.log("📝 [QuestionEditPopup] Form data before validation:", updatedFormData);
            console.log("📝 [QuestionEditPopup] Question type:", question.question_type);
            console.log("📝 [QuestionEditPopup] Question ID:", question.question_id);

            // Map additional fields to string_value for subjective questions
            if (question.question_type === "subjective") {
                if (updatedFormData.response) {
                    updatedFormData.string_value = updatedFormData.response;
                } else if (updatedFormData.has_provisions !== undefined) {
                    const provisionText = updatedFormData.has_provisions ? "Yes" : "No";
                    const explanationText = updatedFormData.explanation ? ` - ${updatedFormData.explanation}` : "";
                    updatedFormData.string_value = `${provisionText}${explanationText}`;
                }
            }

            // ------------------------------------------------------------
            // Run validation on the transformed data
            // ------------------------------------------------------------
            const validationErrors = validateForm(updatedFormData);
            console.log("📝 [QuestionEditPopup] Validation errors:", validationErrors);

            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                setIsSaveLoading(false);
                toast.error("Please correct the errors before submitting");
                return;
            }

            // Persist the transformed data back to state so the UI is in sync
            setFormData(updatedFormData);

            console.log("📝 [QuestionEditPopup] Form validation passed. Preparing data for submission.");
            console.log("📝 [QuestionEditPopup] Validation errors:", validationErrors);
            
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                setIsSaveLoading(false);
                toast.error("Please correct the errors before submitting");
                return;
            }

            console.log("📝 [QuestionEditPopup] Form validation passed. Preparing data for submission.");

            let answerData;
            
            if (question.question_type === "subjective") {
                console.log("📝 [QuestionEditPopup] Preparing subjective answer");
                
                // Special handling for questions with has_provisions field
                if (updatedFormData.has_provisions !== undefined) {
                    console.log("📝 [QuestionEditPopup] Special handling for has_provisions question", {
                        has_provisions: updatedFormData.has_provisions,
                        explanation: updatedFormData.explanation
                    });
                    
                    // Make sure we're sending the correct fields
                    answerData = {
                        has_provisions: updatedFormData.has_provisions,
                        explanation: updatedFormData.explanation || "",
                        // Include other fields that might be required
                        link: updatedFormData.link || "",
                        note: updatedFormData.note || "",
                        // Include string_value as empty to satisfy API requirements
                        string_value: "",
                        decimal_value: "",
                        boolean_value: false
                    };
                    
                    console.log("📝 [QuestionEditPopup] Prepared has_provisions answer data:", answerData);
                } else {
                    // For regular subjective questions, use the formData directly
                    answerData = updatedFormData;
                }
            } else if (question.question_type === "table" || question.question_type === "table_with_additional_rows") {
                console.log("📝 [QuestionEditPopup] Preparing table answer");
                answerData = currentValue;
            } else {
                // Legacy format for backward compatibility
                console.log("📝 [QuestionEditPopup] Using legacy format for question type:", question.question_type);
                answerData = {
                    string_value: updatedFormData.string_value,
                    decimal_value: updatedFormData.decimal_value,
                    boolean_value: updatedFormData.boolean_value,
                    link: updatedFormData.link,
                    note: updatedFormData.note,
                    has_details: updatedFormData.has_details,
                    justification: updatedFormData.justification
                };
            }

            console.log("📤 [QuestionEditPopup] Answer data prepared:", answerData);
            console.log("📤 [QuestionEditPopup] Using moduleId:", moduleId);

            if (!moduleId) {
                console.error("❌ [QuestionEditPopup] Missing moduleId for question:", question.question_id);
                throw new Error("Module ID is required but not provided");
            }

            // Get user data for fallback values
            const userData = JSON.parse(localStorage.getItem("userData") || "{}");
            const selectedReport = JSON.parse(localStorage.getItem("selectedReport") || "{}");
            
            // Ensure company_id and financial_year are set in localStorage
            let company_id = localStorage.getItem("company_id");
            if (!company_id) {
                company_id = userData?.company_id;
                console.log("📤 [QuestionEditPopup] Using company_id from userData:", company_id);
                if (company_id) {
                    localStorage.setItem("company_id", company_id);
                } else {
                    console.error("❌ [QuestionEditPopup] No company_id available");
                    throw new Error("Company ID is required but not available");
                }
            }
            
            let financial_year = localStorage.getItem("financial_year");
            if (!financial_year) {
                financial_year = selectedReport?.financial_year;
                console.log("📤 [QuestionEditPopup] Using financial_year from selectedReport:", financial_year);
                if (financial_year) {
                    localStorage.setItem("financial_year", financial_year);
                } else {
                    console.error("❌ [QuestionEditPopup] No financial_year available");
                    throw new Error("Financial year is required but not available");
                }
            }
            
            console.log("📤 [QuestionEditPopup] Context values:", {
                questionId: question.question_id,
                moduleId,
                company_id,
                financial_year
            });

            // Make the API call with explicit error handling
            console.log("📤 [QuestionEditPopup] Calling submitAnswer mutation with:", {
                questionId: question.question_id,
                answerData,
                moduleId,
            });
            console.log("📝 [QuestionEditPopup] Calling submitAnswer mutation with params:", {
                questionId: question.question_id,
                answerData,
                moduleId,
            });
            
            // Force a small delay to ensure localStorage is updated
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify all required parameters are present
            if (!moduleId) {
                throw new Error("Missing moduleId parameter");
            }
            if (!question.question_id) {
                throw new Error("Missing questionId parameter");
            }
            
            // Get current values from localStorage for verification
            const currentCompanyId = localStorage.getItem("company_id");
            const currentFinancialYear = localStorage.getItem("financial_year");
            
            console.log("📝 [QuestionEditPopup] Final verification before API call:", {
                moduleId,
                questionId: question.question_id,
                company_id: currentCompanyId,
                financial_year: currentFinancialYear,
                answerData
            });
            
            // Final validation check
            if (!moduleId) {
                throw new Error("Missing moduleId parameter");
            }
            if (!question.question_id) {
                throw new Error("Missing questionId parameter");
            }
            if (!currentCompanyId) {
                throw new Error("Missing company_id in localStorage");
            }
            if (!currentFinancialYear) {
                throw new Error("Missing financial_year in localStorage");
            }
            
            console.log("📝 [QuestionEditPopup] All parameters validated, making API call...");
            console.log("📝 [QuestionEditPopup] API URL will be: /module-answers/" + moduleId + "/" + currentCompanyId + "/" + currentFinancialYear);
            
            // Add a small delay before making the API call
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const response = await submitAnswer({
                questionId: question.question_id,
                answerData,
                moduleId,
            }).unwrap();
            console.log("📝 [QuestionEditPopup] submitAnswer mutation successful:", response);

            console.log("✅ [QuestionEditPopup] API response received:", response);

            if (onSuccess) {
                console.log("✅ [QuestionEditPopup] Calling onSuccess with data:", answerData);
                await onSuccess(answerData);
            }
            
            toast.success("Answer submitted successfully");
            console.log("✅ [QuestionEditPopup] Closing popup after successful submission");
            
            // Ensure the modal closes by using setTimeout
            setTimeout(() => {
                onClose();
            }, 800); // Increased timeout to ensure state updates complete
        } catch (err) {
            console.error("❌ [QuestionEditPopup] Error submitting answer:", err);
            console.error("❌ [QuestionEditPopup] Error details:", {
                status: err?.status,
                data: err?.data,
                message: err?.message,
                stack: err?.stack
            });
            
            // Try to extract a meaningful error message
            const errorMessage = 
                err?.data?.detail ||
                err?.data?.message ||
                err?.message ||
                "Failed to submit answer. Please try again.";
                
            console.error("❌ [QuestionEditPopup] Error message:", errorMessage);
            setError(errorMessage);
            toast.error(`Failed to save answer: ${errorMessage}`);
            
            // Set form error for display in UI
            setErrors(prev => ({
                ...prev,
                form: errorMessage
            }));
        } finally {
            setIsSaveLoading(false);
        }
    };

    const handleTableCellChange = (rowId, colId, value) => {
        const updatedTable = {
            ...currentValue.table,
            rows: currentValue.table.rows.map((row) => {
                if (row.row_id === rowId) {
                    return {
                        ...row,
                        cells: row.cells.map((cell) =>
                            cell.col_id === colId ? { ...cell, value } : cell
                        ),
                    };
                }
                return row;
            }),
        };
        setCurrentValue({
            ...currentValue,
            table: updatedTable,
        });
    };

    const validateForm = (data) => {
        const errors = {};
        console.log("🔍 [QuestionEditPopup] Validating form with data:", data);
        console.log("🔍 [QuestionEditPopup] Question metadata:", question);

        // Special case for questions with has_provisions field
        if (data.has_provisions !== undefined) {
            console.log("🔍 [QuestionEditPopup] Validating has_provisions question", {
                has_provisions: data.has_provisions,
                explanation: data.explanation
            });
            // If has_provisions is true and explanation is provided, consider it valid
            if (data.has_provisions === true && data.explanation) {
                console.log("✅ [QuestionEditPopup] Validation passed: has_provisions is true and explanation is provided");
                return errors; // Return empty errors object (valid)
            }

            // If has_provisions is true but no explanation is provided
            if (data.has_provisions === true && !data.explanation) {
                console.log("❌ [QuestionEditPopup] Validation failed: has_provisions is true but no explanation provided");
                errors.explanation = "Explanation is required when provisions are selected.";
            }

            // If has_provisions is false, no explanation is required
            if (data.has_provisions === false) {
                console.log("✅ [QuestionEditPopup] Validation passed: has_provisions is false");
                return errors; // Return empty errors object (valid)
            }
        }

        if (!data.string_value && question.question_type === "subjective" && data.has_provisions === undefined) {
            errors.string_value = "String value is required.";
        }
        if (!data.decimal_value && question.question_type === "decimal") {
            errors.decimal_value = "Decimal value is required.";
        }
        if (data.boolean_value === undefined && question.question_type === "boolean") {
            errors.boolean_value = "Boolean value is required.";
        }
        if (!data.link && question.link_required) {
            errors.link = "Link is required.";
        }
        if (!data.note && question.note_required) {
            errors.note = "Note is required.";
        }

        console.log("🔍 [QuestionEditPopup] Validation errors:", errors);
        return errors;
    };


    const sharedAIActionsProps = {
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
        setRefineTone,
    };

    const actions = {
        [MiniAIAssistantAction.EXPLAIN_THIS_QUESTION]: { action: MiniAIAssistantAction.EXPLAIN_THIS_QUESTION, icon: 'InformationCircleIcon', title: "Explain current question." },
        [MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Right]: { action: MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Right, icon: 'SparklesIcon', title: "AI generates an answer." },
        [MiniAIAssistantAction.BREAK_DOWN_QUESTION]: { action: MiniAIAssistantAction.BREAK_DOWN_QUESTION, icon: 'ListBulletIcon', title: "Break question into parts." },
        [MiniAIAssistantAction.IDENTIFY_KEY_TERMS]: { action: MiniAIAssistantAction.IDENTIFY_KEY_TERMS, icon: 'TagIcon', title: "Identify key terms in your draft or the question." },
        [MiniAIAssistantAction.CHECK_TONE_CONSISTENCY]: { action: MiniAIAssistantAction.CHECK_TONE_CONSISTENCY, icon: 'AdjustmentsHorizontalIcon', title: "Check tone consistency of your draft." },
        [MiniAIAssistantAction.SUGGEST_ALTERNATIVE_PHRASING]: { action: MiniAIAssistantAction.SUGGEST_ALTERNATIVE_PHRASING, icon: 'LanguageIcon', title: "Suggest alternative phrasing for your draft." },
        [MiniAIAssistantAction.EXPLAIN_ACRONYMS]: { action: MiniAIAssistantAction.EXPLAIN_ACRONYMS, icon: 'AcademicCapIcon', title: "Explain acronyms in your draft." },
        [MiniAIAssistantAction.SUGGEST_DATA_SOURCES]: { action: MiniAIAssistantAction.SUGGEST_DATA_SOURCES, icon: 'BeakerIcon', title: "Suggest potential data sources for this question." },
        [MiniAIAssistantAction.GENERATE_FOLLOWUP_QUESTIONS_FOR_USER]: { action: MiniAIAssistantAction.GENERATE_FOLLOWUP_QUESTIONS_FOR_USER, icon: 'QuestionMarkCircleIcon', title: "Generate follow-up questions for you to consider." },
        [MiniAIAssistantAction.COMPARE_WITH_BEST_PRACTICE]: { action: MiniAIAssistantAction.COMPARE_WITH_BEST_PRACTICE, icon: 'CheckBadgeIcon', title: "Compare answer with generic best practices." },
        [MiniAIAssistantAction.SUMMARIZE_SELECTION]: { action: MiniAIAssistantAction.SUMMARIZE_SELECTION, icon: 'DocumentDuplicateIcon', title: "Summarize selected text." },
        [MiniAIAssistantAction.REFINE_SELECTION]: { action: MiniAIAssistantAction.REFINE_SELECTION, icon: 'AdjustmentsHorizontalIcon', title: "Refine selected text." },
        [MiniAIAssistantAction.EXPLAIN_SELECTION]: { action: MiniAIAssistantAction.EXPLAIN_SELECTION, icon: 'InformationCircleIcon', title: "Explain selected text." },
    };

    const renderQuestionContent = () => {
        if (!question.metadata) {
            return <p className="text-gray-500">No metadata available for this question.</p>;
        }

        const questionType = question.question_type || question.metadata.type;
        const metadata = question.metadata;

        // Build sanitized metadata once to avoid duplicate question text as field label
        const normalize = (str) => (str || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();
        const questionNorm = normalize(question.question);
        const sanitizedMetadata = {
            ...metadata,
            main_question_text: question.question,
            fields: metadata.fields?.map((f) => {
                const labelNorm = normalize(f.label);
                const isDuplicate = labelNorm === questionNorm || questionNorm.includes(labelNorm);
                return {
                    ...f,
                    label: isDuplicate ? '' : f.label,
                };
            }),
        };


        switch (questionType) {
            case 'subjective': {
                    return (
                        <SubjectiveRenderer
                            metadata={sanitizedMetadata}
                            data={formData}
                            isEditing={true}
                            onSubmit={(data) => setFormData(data)}
                        />
                    );
                }
            case 'table':
                return (
                    <TableRenderer 
                        metadata={metadata} 
                        data={currentValue} 
                        isEditing={true}
                        onSubmit={(data) => setCurrentValue(data)} 
                    />
                );
            case 'table_with_additional_rows':
                return (
                    <TableWithAdditionalRowsRenderer 
                        metadata={metadata} 
                        data={currentValue} 
                        isEditing={true}
                        onSubmit={(data) => setCurrentValue(data)} 
                    />
                );
            default:
                return <p className="text-gray-500">Unsupported question type: {questionType}</p>;
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`question-${question.question_id}-title`}
        >
            <div className="relative">
                <motion.div
                    className={`bg-white rounded-2xl shadow-xl transition-all duration-700 ease-in-out flex flex-col overflow-hidden ${isAIAssistantOpen ? "w-[90vw] max-w-6xl" : "w-[70vw] max-w-4xl"} h-[75vh]`}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: isVisible ? 1 : 0.95, opacity: isVisible ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                    <ModalHeader
                        questionId={question.question_id}
                        questionText={question.question}
                        closeModal={onClose}
                    />
                    <div className="flex flex-1 overflow-hidden">
                        <div
                            ref={leftPanelRef}
                            className="flex-1 flex flex-col overflow-y-auto px-6 py-4 border-r border-gray-200 bg-gray-50 scrollbar-none"
                        >
                            <div className="flex-1">
                                <div className="mb-4">
                                    <h3 className="text-base font-semibold text-gray-800">
                                        {question.question}
                                    </h3>
                                    {question.guidance && (
                                        <div
                                            id={`question-${question.question_id}-guidance`}
                                            className="text-sm text-blue-600 mt-2 bg-blue-50 p-3 rounded-lg shadow-sm"
                                        >
                                            <svg
                                                className="w-4 h-4 mb-1 ml-1 inline-block"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M13 16h-1v-4h-1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <ReactMarkdown
                                                rehypePlugins={[rehypeSanitize]}
                                                className="inline-block"
                                            >
                                                {question.guidance}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                                {renderQuestionContent()}
                            </div>
                            <div>
                                <LeftAIActions {...sharedAIActionsProps} />
                            </div>
                        </div>
                        <motion.div
                            className="overflow-hidden"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{
                                width: isAIAssistantOpen ? "40%" : 0,
                                opacity: isAIAssistantOpen ? 1 : 0,
                                minWidth: isAIAssistantOpen ? "300px" : 0,
                            }}
                            transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
                        >
                            {isAIAssistantOpen && (
                                <div className="flex-1 flex flex-col overflow-y-auto px-6 py-4 bg-white h-full">
                                    <ToneSelector
                                        refineTone={refineTone}
                                        setRefineTone={setRefineTone}
                                        handleRefineDraftWithTone={() => {
                                            const textToRefine = selectedTextInTextarea || formData.string_value;
                                            if (textToRefine.trim()) {
                                                handleQuickAIAction(MiniAIAssistantAction.REFINE_ANSWER);
                                            }
                                        }}
                                        currentValue={formData.string_value}
                                        selectedTextInTextarea={selectedTextInTextarea}
                                        isLoading={isLoading.right}
                                    />
                                    <AIActionButtons
                                        selectedTextInTextarea={selectedTextInTextarea}
                                        handleQuickAIAction={handleQuickAIAction}
                                        actions={actions}
                                        currentValue={formData.string_value}
                                    />
                                    <div className="flex-1 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl shadow-inner border border-slate-200/60 overflow-y-auto mt-3.5 backdrop-blur-sm scrollbar-none">
                                        <div className="p-4">
                                            <AIResponseDisplay
                                                aiMessage={aiMessage}
                                                isLoading={isLoading.right}
                                                error={error}
                                                handlePostResponseAction={handleQuickAIAction}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3 bg-white">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                aria-label="Cancel changes"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaveLoading}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSaveLoading ? "bg-gray-400 cursor-not-allowed" : "bg-[#000D30] hover:bg-[#001A4D]"}`}
                                aria-label="Save Answer"
                            >
                                {isSaveLoading ? "Submitting..." : "Save Answer"}
                            </button>
                        </div>
                        {errors.form && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-[6px]">
                                <div className="flex items-center gap-2 text-red-700">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm">
                                        Please fix the following errors:
                                    </span>
                                </div>
                                <p className="text-red-600 text-xs mt-1">{errors.form}</p>
                            </div>
                        )}
                    </form>
                </motion.div>
                <button
                    onClick={() => setIsAIAssistantOpen((prev) => !prev)}
                    className="absolute top-1 right-[-40px] w-10 h-10 !rounded-full bg-white text-blue-700 hover:bg-gray-100 transition-colors duration-200 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] z-50 focus:outline-none focus:ring-1 focus:ring-[#1A2B5C] flex items-center justify-center"
                    aria-label={isAIAssistantOpen ? "Hide Mini AI Assistant" : "Show Mini AI Assistant"}
                    style={{
                        animation: 'spin-smooth 8s ease-in-out infinite',
                    }}
                >
                    <svg className="w-6 h-6 text-[#1A2B5C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                    </svg>
                    <style jsx>{`
                        @keyframes spin-smooth {
                            0% { transform: rotate(0deg); }
                            15% { transform: rotate(260deg); }
                            30% { transform: rotate(180deg); }
                            50% { transform: rotate(180deg); }
                            65% { transform: rotate(440deg); }
                            80% { transform: rotate(360deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </button>
            </div>
        </div>
    );
};

export default QuestionEditPopup;