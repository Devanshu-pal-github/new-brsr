import React, { useReducer, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  FaTimes,
  FaEdit,
  FaExchangeAlt,
  FaUser,
  FaQuestionCircle,
  FaRobot,
  FaLightbulb,
  FaBook,
  FaPaperPlane,
  FaClipboard,
  FaCheckCircle,
} from 'react-icons/fa';
import { BiCheckDouble } from 'react-icons/bi';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from './AppProvider';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import CarouselRenderer from './CarouselRenderer';// SECTION 1: CONSTANTS AND TYPES
import hljs from 'highlight.js';
import 'highlight.js/styles/default.css'; // Optional: Add a style



const PRIMARY_COLOR = '#000D30';
const SECONDARY_COLOR = '#1E3A8A';
const ACCENT_COLOR = '#3B82F6';
const DEFAULT_API_KEY_MESSAGE = 'API Key Missing. Please configure it to enable full functionality.';
const MAX_MESSAGE_LENGTH = 500;

// Message type definition
const Message = {
  id: String,
  sender: 'user' | 'ai',
  text: String,
  responseType: String,
  timestamp: String,
  isMarkdown: Boolean,
  tags: Array,
  followUpActions: Array,
  originalUserMessage: String | null,
  is_content_answer: 'answer' | null,
};

// Action Configurations
const actionConfigs = {
  DRAFT_ANSWER: {
    responseType: 'normal',
    is_content_answer: 'answer',
    tags: ['question', 'answer'],
    prompt: (context) => {
      const sanitize = (input) => (input == null ? '' : String(input).replace(/"/g, '\\"').substring(0, MAX_MESSAGE_LENGTH));
      const hasGuidance = context.activeQuestion?.guidance_text && context.activeQuestion.guidance_text !== 'None provided';
      const hasCurrentDraft = context.currentAnswer && context.currentAnswer.trim() !== '';
      return `
Draft a concise since we have to draft a answer make sure to draft the answer with what you feel confidence as a answer to it, report-ready BRSR answer for: "${sanitize(context.activeQuestion?.question_text) || 'Unknown question'}".
${hasGuidance ? `Guidance: "${sanitize(context.activeQuestion?.guidance_text)}".` : 'No specific guidance; use ESG/BRSR expertise.'}
${hasCurrentDraft ? `Refine draft: "${sanitize(context.currentAnswer)}".` : 'Create new draft.'}
      `.trim();
    },
    render: ({ handleAction, isDisabled, currentAnswer }) => (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0, duration: 0.2 }}
        whileHover={{ scale: isDisabled ? 1 : 1.05 }}
        whileTap={{ scale: isDisabled ? 1 : 0.95 }}
        onClick={() => !isDisabled && handleAction('DRAFT_ANSWER', currentAnswer || '')}
        className={`flex flex-col items-center justify-center flex-1 h-10 transition-all duration-200 rounded-md ${
          isDisabled ? 'text-gray-500 cursor-not-allowed' : 'text-[#000D30] hover:text-[#1E3A8A]'
        } relative group`}
        role="button"
        aria-label="Draft Answer"
        tabIndex={0}
      >
        <FaEdit className={`w-3 h-3 text-[#000D30]`} />
        <span className={`mt-0.5 text-[8px] font-medium text-[#000D30]`}>Draft</span>
        <span className="absolute bottom-full mb-1 hidden group-hover:block text-[10px] text-white bg-[#000D30] px-2 py-1 rounded-md shadow-md">
          Generate a draft BRSR answer
        </span>
      </motion.div>
    ),
  },
  EXPLAIN_QUESTION: {
    responseType: 'normal',
    is_content_answer: null,
    tags: ['question', 'explanation'],
    prompt: (context) => {
      const sanitize = (input) => (input == null ? '' : String(input).replace(/"/g, '\\"').substring(0, MAX_MESSAGE_LENGTH));
      return `
Explain the BRSR question: "${sanitize(context.activeQuestion?.question_text) || 'Unknown question'}".
Guidance: "${sanitize(context.activeQuestion?.guidance_text) || 'No guidance provided'}".
- Clarify intent and ESG/BRSR relevance.
      `.trim();
    },
    render: ({ handleAction, isDisabled }) => (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        whileHover={{ scale: isDisabled ? 1 : 1.05 }}
        whileTap={{ scale: isDisabled ? 1 : 0.95 }}
        onClick={() => !isDisabled && handleAction('EXPLAIN_QUESTION')}
        className={`flex flex-col items-center justify-center flex-1 h-10 transition-all duration-200 rounded-md ${
          isDisabled ? 'text-gray-500 cursor-not-allowed' : 'text-[#000D30] hover:text-[#1E3A8A]'
        } relative group`}
        role="button"
        aria-label="Explain Question"
        tabIndex={0}
      >
        <FaQuestionCircle className={`w-3 h-3 text-[#000D30]`} />
        <span className={`mt-0.5 text-[8px] font-medium text-[#000D30]`}>Explain</span>
        <span className="absolute bottom-full mb-1 hidden group-hover:block text-[10px] text-white bg-[#000D30] px-2 py-1 rounded-md shadow-md">
          Explain the question's intent
        </span>
      </motion.div>
    ),
  },
  SHOW_EXAMPLE_ANSWER: {
    responseType: 'normal',
    is_content_answer: null,
    tags: ['question', 'example'],
    prompt: (context) => {
      const sanitize = (input) => (input == null ? '' : String(input).replace(/"/g, '\\"').substring(0, MAX_MESSAGE_LENGTH));
      return `- **Word Limit**: 50-100 words MAX (except when drafting detailed answers)

Provide a sample BRSR answer for: "${sanitize(context.activeQuestion?.question_text) || 'Unknown question'}".
Guidance: "${sanitize(context.activeQuestion?.guidance_text) || 'No guidance provided'}".
- Ensure alignment with ESG/BRSR standards.
      `.trim();
    },
    render: ({ handleAction, isDisabled }) => (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.2 }}
        whileHover={{ scale: isDisabled ? 1 : 1.05 }}
        whileTap={{ scale: isDisabled ? 1 : 0.95 }}
        onClick={() => !isDisabled && handleAction('SHOW_EXAMPLE_ANSWER')}
        className={`flex flex-col items-center justify-center flex-1 h-10 transition-all duration-200 rounded-md ${
          isDisabled ? 'text-gray-500 cursor-not-allowed' : 'text-[#000D30] hover:text-[#1E3A8A]'
        } relative group`}
        role="button"
        aria-label="Show Example Answer"
        tabIndex={0}
      >
        <FaLightbulb className={`w-3 h-3 text-[#000D30]`} />
        <span className={`mt-0.5 text-[8px] font-medium text-[#000D30]`}>Example</span>
        <span className="absolute bottom-full mb-1 hidden group-hover:block text-[10px] text-white bg-[#000D30] px-2 py-1 rounded-md shadow-md">
          Show a sample answer
        </span>
      </motion.div>
    ),
  },
  SOURCE: {
    responseType: 'normal',
    is_content_answer: null,
    tags: ['general', 'source'],
    prompt: (context, relatedText = '') => {
      const sanitize = (input) => (input == null ? '' : String(input).replace(/"/g, '\\"').substring(0, MAX_MESSAGE_LENGTH));
      return `- **Word Limit**: 50-100 words MAX (except when drafting detailed answers)

   Provide credible sources for: "${sanitize(context.activeQuestion?.question_text) || 'general ESG/BRSR topics'}".
Generate a bullet-point list in Markdown format.

Each bullet should include only the title of the source and a link (if available).

Do not include any explanations—strictly title + link only.

Use realistic or verifiable resources—do not fabricate sources.

If the source is internal, mention the relevant team, department, or internal document where it can be found.`.trim();
    },
    render: ({ handleAction, isDisabled }) => (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.2 }}
        whileHover={{ scale: isDisabled ? 1 : 1.05 }}
        whileTap={{ scale: isDisabled ? 1 : 0.95 }}
        onClick={() => !isDisabled && handleAction('SOURCE')}
        className={`flex flex-col items-center justify-center flex-1 h-10 transition-all duration-200 rounded-md ${
          isDisabled ? 'text-gray-500 cursor-not-allowed' : 'text-[#000D30] hover:text-[#1E3A8A]'
        } relative group`}
        role="button"
        aria-label="Source Information"
        tabIndex={0}
      >
        <FaBook className={`w-3 h-3 text-[#000D30]`} />
        <span className={`mt-0.5 text-[8px] font-medium text-[#000D30]`}>Source</span>
        <span className="absolute bottom-full mb-1 hidden group-hover:block text-[10px] text-white bg-[#000D30] px-2 py-1 rounded-md shadow-md">
          Provide credible sources
        </span>
      </motion.div>
    ),
  },
  IMPROVE_DRAFT: {
    responseType: 'normal',
    is_content_answer: 'answer',
    tags: ['question', 'answer'],
    prompt: (context, relatedText = '') => {
      const sanitize = (input) => (input == null ? '' : String(input).replace(/"/g, '\\"').substring(0, MAX_MESSAGE_LENGTH));
      return `
Improve draft for: "${sanitize(context.activeQuestion?.question_text)}" (Guidance: "${sanitize(context.activeQuestion?.guidance_text)}").
Draft: "${sanitize(relatedText)}".
- Enhance clarity, add ESG/BRSR details, suggest actionable steps.
      `.trim();
    },
  },
  DRAFT_KEY_METRICS_LIST: {
    responseType: 'normal',
    is_content_answer: null,
    tags: ['question', 'metrics'],
    prompt: (context, relatedText = '') => {
      const sanitize = (input) => (input == null ? '' : String(input).replace(/"/g, '\\"').substring(0, MAX_MESSAGE_LENGTH));
      return `- **Word Limit**: 50-100 words MAX (except when drafting detailed answers)

List key ESG/BRSR metrics for: "${sanitize(context.activeQuestion?.question_text)}" (Guidance: "${sanitize(context.activeQuestion?.guidance_text)}").
Draft: "${sanitize(relatedText)}".
- Format as bullet points with KPIs and target dates.
      `.trim();
    },
  },
  USER_QUERY: {
    responseType: 'normal',
    is_content_answer: null,
    tags: ['general'],
    prompt: (context, input) => {
      const sanitize = (input) => (input == null ? '' : String(input).replace(/"/g, '\\"').substring(0, MAX_MESSAGE_LENGTH));
      return `- **Word Limit**: 50-100 words MAX (except when drafting detailed answers)

Act as an ESG/BRSR expert. Respond to: "${sanitize(input)}".
${context.mode === 'question' ? `Context: "${sanitize(context.activeQuestion?.question_text)}". Guidance: "${sanitize(context.activeQuestion?.guidance_text)}".` : 'Use general ESG/BRSR knowledge.'}
- Provide a concise, professional response.
      `.trim();
    },
  },
};

// SECTION 2: UTILITIES
// Triple sanitization function
const sanitizeText = (input) => {
  if (input == null) return '';
  let sanitized = String(input);
  return sanitized;
};

// Secure markdown rendering
marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function (code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      } else {
        return hljs.highlightAuto(code).value;
      }
    },
  });
  
const renderMarkdown = (text) => {
  const dirtyHtml = marked(text || '');
  const cleanHtml = DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'strong', 'em', 'blockquote',
      'ul', 'ol', 'li', 'code', 'pre',
      'a', 'img', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
    ADD_ATTR: ['class'],
  });
  return (
    <div
      className="markdown-body prose prose-sm max-w-none text-gray-800"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};
  

const AI_RESPONSE_INSTRUCTIONS = `
**Instructions for AI Response**:
You must return the result as a valid JSON object in the following structure. Each field has a defined purpose in the UI and logic of the system:
{
"responseType": "normal"| "source", // Type of response. Use "normal" for standard replies and source if a list of sources to be provided in content. Reserved types may include "error", "info", or "warning" in the future.
"is_content_answer": TRUE | null, // If its answer reply "TRUE" else null
"tags": string[], // Add tags like "question", "answer", "metrics", or "error" to help categorize and render the response contextually.
"content": string, // Main content body in markdown format. Use headers (##, ###), bullet points, and links. Avoid HTML or raw JSON strings.
"followUpActions": string[] // Suggest next possible actions from the provided list of valid actions (e.g., "DRAFT_ANSWER", "SOURCE"). These are used to generate follow-up buttons or actions in the UI.
}

**Core Instructions:**
- Make sure to always revert back according to what user querry is
- **ESG Expert**: 10+ years experience, professional yet conversational
- **Ultra Crisp**: Direct responses, no fluff
- **Casual = Brief**: Simple greetings get 10-20 word responses
- **Bullets**: Use for clarity and brevity
- **Human Touch**: Natural, warm but authoritative
- **Context Aware**: This is a chatbot conversation
- **Proactive**: Suggest relevant follow-up actions

**Response Examples:**
- "Hi" → "Hello! I'm here to help with your ESG and BRSR questions. What can I assist you with today?"
- Technical query → Key points in bullets, 80-100 words max
- Complex topics → Offer to dive deeper via followUpActions

- **Valid Follow-Up Actions**: Choose appropriate actions from the following list: ${Object.keys(actionConfigs).join(', ')}.
- **Markdown Required**: All \`content\` must be formatted in markdown.
- **Fallback**: If unsure, ask for clarification in 30-50 words.
`.trim();
// UUID generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Custom hook for keyboard shortcuts
const useKeyboardShortcuts = (onClose, mode, setMode, handleModeToggle, inputRef) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.ctrlKey && event.key === '1') {
        event.preventDefault();
        if (mode !== 'question') handleModeToggle('question');
        return;
      }
      if (event.ctrlKey && event.key === '2') {
        event.preventDefault();
        if (mode !== 'general') handleModeToggle('general');
        return;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, mode, handleModeToggle]);
};

// Message reducer for state management
const messageReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_MESSAGE':
      console.log('Adding message:', action.payload);
      return [
        ...state.map(msg => ({ ...msg, followUpActions: [] })),
        {
          id: generateUUID(),
          sender: action.payload.sender,
          text: action.payload.text,
          responseType: action.payload.responseType || 'normal',
          timestamp: new Date().toISOString(),
          isMarkdown: action.payload.isMarkdown,
          tags: action.payload.tags || ['general'],
          followUpActions: action.payload.followUpActions || [],
          originalUserMessage: action.payload.originalUserMessage || null,
          is_content_answer: action.payload.is_content_answer || null,
        },
      ];
    case 'CLEAR_FOLLOW_UPS':
      return state.map(msg => ({ ...msg, followUpActions: [] }));
    case 'RESET':
      return [];
    default:
      return state;
  }
};

// Prompt Builder with robust AI instructions
class PromptBuilder {
    constructor(context = {}) {
      this.context = {
        mode: ['question', 'general'].includes(context.mode) ? context.mode : 'general',
        activeQuestion: context.activeQuestion || { question_text: 'Unknown question', guidance_text: 'None provided' },
        currentAnswer: String(context.currentAnswer || ''),
        lastUserMessage: String(context.lastUserMessage || ''),
        userHistory: Array.isArray(context.userHistory) ? context.userHistory : [],
      };
      this.validActions = Object.keys(actionConfigs);
    }
  
    sanitize(input) {
      return sanitizeText(input);
    }
  
    buildPrompt(action, relatedText = '') {
      try {
        const config = actionConfigs[action] || {
          prompt: () => `
  {
    "responseType": "normal",
    "is_content_answer": null,
    "tags": ["general"],
    "content": "Action not recognized. Available actions: ${this.validActions.join(', ')}.",
    "followUpActions": ["SOURCE"]
  }
          `.trim(),
        };
        const questionSpecificActions = ['DRAFT_ANSWER', 'EXPLAIN_QUESTION', 'SHOW_EXAMPLE_ANSWER', 'IMPROVE_DRAFT', 'DRAFT_KEY_METRICS_LIST'];
        if (this.context.mode === 'general' && questionSpecificActions.includes(action)) {
          return `
  {
    "responseType": "normal",
    "is_content_answer": null,
    "tags": ["general"],
    "content": "This action requires question mode. Please select a question.",
    "followUpActions": ["SOURCE"]
  }
  ${AI_RESPONSE_INSTRUCTIONS}
          `.trim();
        }
        return `
  ${config.prompt(this.context, this.sanitize(relatedText))}
  ${AI_RESPONSE_INSTRUCTIONS}
        `.trim();
      } catch (error) {
        console.error(`Error building prompt for ${action}:`, error);
        return `
  {
    "responseType": "normal",
    "is_content_answer": null,
    "tags": ["general"],
    "content": "Failed to process action: ${this.sanitize(error.message)}. Please try again.",
    "followUpActions": ["SOURCE"]
  }
  ${AI_RESPONSE_INSTRUCTIONS}
        `.trim();
      }
    }
  
    suggestFollowUpActions(action, responseText = '') {
      const baseActions = ['SOURCE'];
      const actionSpecific = {
        USER_QUERY: this.context.mode === 'question'
          ? ['DRAFT_ANSWER', 'EXPLAIN_QUESTION', 'SHOW_EXAMPLE_ANSWER', 'SOURCE']
          : ['SOURCE'],
        DRAFT_ANSWER: ['IMPROVE_DRAFT', 'DRAFT_KEY_METRICS_LIST', 'SOURCE'],
        EXPLAIN_QUESTION: ['DRAFT_ANSWER', 'SHOW_EXAMPLE_ANSWER', 'SOURCE'],
        SHOW_EXAMPLE_ANSWER: ['DRAFT_ANSWER', 'SOURCE'],
        SOURCE: ['USER_QUERY'],
        IMPROVE_DRAFT: ['DRAFT_ANSWER', 'DRAFT_KEY_METRICS_LIST', 'SOURCE'],
        DRAFT_KEY_METRICS_LIST: ['IMPROVE_DRAFT', 'SOURCE'],
      };
      let actions = actionSpecific[action] || baseActions;
      actions = [...new Set(actions)].filter(a => this.validActions.includes(a));
      if (this.context.mode === 'general') {
        actions = actions.filter(a => !['DRAFT_ANSWER', 'EXPLAIN_QUESTION', 'SHOW_EXAMPLE_ANSWER', 'IMPROVE_DRAFT', 'DRAFT_KEY_METRICS_LIST'].includes(a));
      }
      return actions.slice(0, 2);
    }
  }
// API Service with retry logic
const geminiService = {
  isApiKeyAvailable: () => true, // Replace with actual check in production
  generateText: async (prompt, retries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post('http://localhost:8000/api/messages', { message: prompt }, { timeout: 10000 });
        return response.data.reply;
      } catch (error) {
        if (attempt === retries) {
          throw new Error('Failed to generate response after multiple attempts. Please try again.');
        }
        console.warn(`Attempt ${attempt} failed: ${error.message}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  },
};

// SECTION 3: COMPONENTS
const ChatbotHeader = ({ onClose, activeQuestion, currentAnswer, isApiKeyAvailable, onModeToggle, currentMode }) => {
  const handleModeToggle = () => {
    onModeToggle(currentMode === 'question' ? 'general' : 'question');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="px-6 py-4 shadow-md z-10 relative bg-gradient-to-r from-white to-blue-50/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#000D30] to-[#1E3A8A] rounded-full flex items-center justify-center shadow-md">
            <FaRobot className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-[#000D30]">BRSR Assistant</h2>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              currentMode === 'question' ? 'bg-[#000D30] text-white' : 'bg-gray-200 text-[#000D30]'
            }`}
          >
            {currentMode === 'question' ? 'Context Mode' : 'General Mode'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer scale-90">
            <input
              type="checkbox"
              checked={currentMode === 'question'}
              onChange={handleModeToggle}
              className="sr-only peer"
              aria-label="Toggle between General and Context Mode"
            />
            <div className="w-10 h-5 bg-gray-300 rounded-full peer peer-checked:bg-[#000D30] transition-all duration-300" />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-md transform peer-checked:translate-x-5 transition-transform duration-300" />
          </label>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition"
            aria-label="Close Assistant"
          >
            <FaTimes className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
      {currentMode === 'question' && activeQuestion && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 pl-2 text-sm text-[#1E3A8A] italic"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#3B82F6] rounded-full" />
            <span>
              {activeQuestion.question_text.length > 50
                ? `${activeQuestion.question_text.slice(0, 50)}...`
                : activeQuestion.question_text}
            </span>
          </div>
        </motion.div>
      )}
      {currentMode === 'question' && currentAnswer && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 pl-2 text-sm"
        >
          <div className="flex items-center gap-2 text-[#1E3A8A]">
            <div className="w-2 h-2 bg-[#3B82F6] rounded-full" />
            <span className="font-medium">Current Draft:</span>
          </div>
          <div className="mt-2 p-3 bg-blue-50 text-[#1E3A8A] rounded-md border border-blue-100 shadow-sm">
            {currentAnswer.length > 50 ? `${currentAnswer.slice(0, 50)}...` : currentAnswer}
          </div>
        </motion.div>
      )}
      {!isApiKeyAvailable && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 flex items-center gap-2 text-sm text-amber-800 bg-amber-100 border border-amber-300 p-3 rounded-md"
        >
          <div className="w-2 h-2 bg-amber-600 rounded-full" />
          <span className="font-medium">{sanitizeText(DEFAULT_API_KEY_MESSAGE)}</span>
        </motion.div>
      )}
    </motion.div>
  );
};

const ChatbotMessages = ({
  messages,
  handleCopyMessage,
  copiedMessageId,
  isLoading,
  error,
  formatTimestamp,
  handleAction,
  handleAcceptAnswer,
  handleRejectAnswer,
  effectiveActiveQuestion,
  carouselData,
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    console.log('Current messages:', messages);
    console.log('Current carouselData:', carouselData);
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, carouselData]);

  const renderMessageContent = (msg) => {
    const sanitizedText = sanitizeText(msg.text);

    if (msg.isMarkdown) {
      return (
        <div className="markdown-content prose prose-sm max-w-none text-gray-800">
          {renderMarkdown(sanitizedText)}
        </div>
      );
    }
    return (
      <div className="whitespace-pre-wrap leading-relaxed text-sm">
        {sanitizedText}
      </div>
    );
  };

  const renderFollowUpActions = (actions, messageId, messageText) => {
    if (!actions || actions.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {actions.map((action) => (
          <motion.button
            key={`${messageId}-${action}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAction(action, sanitizeText(messageText))}
            className="px-2 py-0.5 text-xs italic bg-blue-50 text-[#3B82F6] rounded-full hover:bg-blue-100 transition font-medium"
            aria-label={`Perform ${action} action`}
          >
            {sanitizeText(action.replace(/_/g, ' ').toLowerCase())}
          </motion.button>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-[200px] px-4 py-4 bg-gradient-to-br from-white to-blue-50/30 space-y-3 overflow-y-auto no-scrollbar"
    >
      <AnimatePresence>
        {messages.length === 0 && !isLoading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center py-3 text-sm text-gray-500"
          >
            No messages to display. Start by typing a query!
          </motion.div>
        )}
        {messages.map((msg, index) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.3, delay: index * 0.03 }}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-start max-w-[85%] group">
              {/* AI Avatar - Show on left for AI messages */}
              {msg.sender === 'ai' && (
                <motion.div whileHover={{ scale: 1 }} className="mt-1 mr-2 flex-shrink-0">
                  <div className="w-6 h-6 bg-[#1E3A8A] rounded-full flex items-center justify-center shadow-sm">
                    <FaRobot className="w-2.5 h-2.5 text-white" aria-hidden="true" />
                  </div>
                </motion.div>
              )}
              
              <div className="flex flex-col flex-1">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className={`px-3 py-2 rounded-xl text-sm border shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-[#000D30]/90 text-white border-[#1E3A8A]/50'
                      : 'bg-white text-gray-800 border-blue-200/50'
                  }`}
                >
                  {msg.sender === 'ai' && carouselData[index + 1] ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-full"
                    >
                      <CarouselRenderer slides={carouselData[index + 1]} />
                    </motion.div>
                  ) : (
                    renderMessageContent(msg)
                  )}
                  {msg.sender === 'ai' &&
                    ((msg.is_content_answer && msg.is_content_answer !== 'FALSE') || (msg.tags && msg.tags.includes('answer'))) &&
                    effectiveActiveQuestion && (
                      <div className="mt-2 flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() =>
                            handleAcceptAnswer(
                              sanitizeText(msg.text),
                              effectiveActiveQuestion.question_id
                            )
                          }
                          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition font-medium flex items-center gap-1"
                          aria-label="Save this answer"
                        >
                          <FaCheckCircle className="w-3 h-3" />
                          Accept
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRejectAnswer()}
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition font-medium flex items-center gap-1"
                          aria-label="Reject this answer"
                        >
                          <FaTimes className="w-3 h-3" />
                          Reject
                        </motion.button>
                      </div>
                    )}
                </motion.div>
                
                {/* Timestamp and copy - aligned with message content */}
                <div className={`flex items-center gap-2 mt-1 text-[9px] ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                  {msg.sender === 'ai' && (
                    <>
                      <span className="text-gray-400 italic font-light tracking-wide">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                      <motion.div
                        whileHover={{ scale: 1.05, opacity: 0.8 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCopyMessage(sanitizeText(msg.text), msg.id)}
                        className="cursor-pointer text-gray-400 hover:text-blue-500 transition-colors duration-200 opacity-60 hover:opacity-100"
                        aria-label="Copy message"
                      >
                        {copiedMessageId === msg.id ? (
                          <BiCheckDouble className="w-2.5 h-2.5 text-emerald-500" />
                        ) : (
                          <FaClipboard className="w-2.5 h-2.5" />
                        )}
                      </motion.div>
                    </>
                  )}
                  {msg.sender === 'user' && (
                    <span className="text-gray-400 italic font-light tracking-wide">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  )}
                </div>
                
                {/* Follow-up actions for AI messages */}
                {msg.sender === 'ai' && (
                  <div className="mt-1">
                    {renderFollowUpActions(msg.followUpActions, msg.id, msg.text)}
                  </div>
                )}
              </div>
              
              {/* User Avatar - Show on right for user messages */}
              {msg.sender === 'user' && (
                <motion.div whileHover={{ scale: 1 }} className="mt-1 ml-2 flex-shrink-0">
                  <div className="w-6 h-6 bg-[#000D30] rounded-full flex items-center justify-center shadow-sm">
                    <FaUser className="w-2.5 h-2.5 text-white" aria-hidden="true" />
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-3">
            <div className="flex items-center gap-2 bg-white rounded-md px-3 py-2 border border-blue-200 shadow-md">
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full"
                  />
                ))}
              </div>
              <span className="text-[11px] text-[#1E3A8A] font-medium">Processing...</span>
            </div>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center py-3">
            <div className="px-3 py-2 bg-red-50 rounded-md border border-red-200 text-[11px] text-red-600 shadow">
              <span className="mr-1">⚠️</span>
              {sanitizeText(error)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
const ChatbotInput = ({ input, setInput, handleSendMessage, isLoading, isApiKeyAvailable, inputRef, activeQuestion }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3 py-2 bg-white border-t border-gray-200/50 shadow-[0_-1px_4px_rgba(0,0,0,0.05)] flex-shrink-0"
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(sanitizeText(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
            placeholder={
              activeQuestion?.question_text
                ? `Ask about "${activeQuestion.question_text.substring(0, 30)}..."`
                : 'Type your ESG/BRSR query...'
            }
            className="w-full px-3 py-2 rounded-lg text-sm bg-white text-gray-800 placeholder-gray-400 border border-gray-200/50 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6]/50 disabled:opacity-50 transition-all duration-200 shadow-sm"
            disabled={isLoading || !isApiKeyAvailable}
            aria-label="Chat input for ESG/BRSR queries"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim() || !isApiKeyAvailable}
          className="p-2.5 rounded-lg bg-[#000D30]/90 hover:bg-[#1E3A8A]/90 text-white disabled:opacity-40 disabled:cursor-not-allowed transition duration-200 shadow-sm"
          aria-label="Send message"
        >
          <FaPaperPlane className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};

const ChatbotQuickActions = ({ quickActions, handleAction, isLoading, isApiKeyAvailable, activeQuestion, currentAnswer }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="px-4 py-2 bg-gradient-to-r from-white to-indigo-30 flex-shrink-0 rounded-md shadow-sm"
    >
      <div className="flex justify-between gap-2">
        {quickActions.map((action) => {
          const RenderComponent = actionConfigs[action]?.render;
          const isDisabled =
            (['DRAFT_ANSWER', 'EXPLAIN_QUESTION', 'SHOW_EXAMPLE_ANSWER'].includes(action) && !activeQuestion) ||
            !isApiKeyAvailable ||
            isLoading;

          return RenderComponent ? (
            <RenderComponent
              key={action}
              handleAction={handleAction}
              isDisabled={isDisabled}
              currentAnswer={currentAnswer}
            />
          ) : null;
        })}
      </div>
    </motion.div>
  );
};

// SECTION 4: MAIN COMPONENT
const ChatbotWindow = ({ onClose, activeQuestion, currentAnswer, initialMode, onAcceptAnswer }) => {
  const { state, dispatch } = useContext(AppContext);
  const [messages, dispatchMessages] = useReducer(messageReducer, []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [mode, setMode] = useState(activeQuestion?.question_text ? 'question' : 'general');
  const inputRef = useRef(null);
  const [carouselData, setCarouselData] = useState({});

  useEffect(() => {
        setMode(initialMode || (activeQuestion?.question_text ? 'question' : 'general'));
    }, [initialMode, activeQuestion]);
  const processMessage = async ({
    action,
    input,
    setIsLoading,
    setError,
    dispatchMessages,
    inputRef,
    effectiveActiveQuestion,
    dispatch,
    mode,
  }) => {
    if (!geminiService.isApiKeyAvailable()) {
      dispatchMessages({
        type: 'ADD_MESSAGE',
        payload: {
          sender: 'ai',
          text: DEFAULT_API_KEY_MESSAGE,
          isMarkdown: true,
          tags: ['general'],
        },
      });
      return;
    }
  
    if (action === 'USER_QUERY' && !input.trim() && mode !== 'question') return;
  
    setIsLoading(true);
    setError(null);
    dispatchMessages({ type: 'CLEAR_FOLLOW_UPS' });
  
    try {
      const currentInput = input || (mode === 'question' ? '(Using question context)' : '');
      if (action === 'USER_QUERY') {
        dispatchMessages({
          type: 'ADD_MESSAGE',
          payload: {
            sender: 'user',
            text: currentInput,
            isMarkdown: false,
            tags: ['general'],
          },
        });
      } else {
        dispatchMessages({
          type: 'ADD_MESSAGE',
          payload: {
            sender: 'user',
            text: `Action: ${action}${input ? ` (related to: "${input.substring(0, 50)}...")` : ''}`,
            isMarkdown: false,
            tags: ['action'],
          },
        });
      }
  
      const promptBuilder = new PromptBuilder({
        mode,
        activeQuestion: effectiveActiveQuestion,
        currentAnswer: answerText,
        lastUserMessage: messages.slice().reverse().find((m) => m.sender === 'user')?.text || '',
        userHistory: messages,
      });
  
      const prompt = promptBuilder.buildPrompt(action, input);
      console.log('Prompt:', prompt);
      let responseText = await geminiService.generateText(prompt);
      console.log('Raw API response:', responseText);
  
      // Triple sanitization of API response
      responseText = sanitizeText(responseText);
      responseText = sanitizeText(responseText.trim().replace(/^```(?:json)?\s*|\s*```$/gi, '').replace(/^\s*json\s*/i, ''));
      responseText = sanitizeText(responseText);
  
      let parsedResponse = {
        responseType: 'normal',
        content: 'Unexpected response format.',
        tags: ['error'],
        followUpActions: ['SOURCE'],
        is_content_answer: null,
      };
      try {
        const parsed = JSON.parse(responseText);
        if (!parsed.content || !['normal', 'source'].includes(parsed.responseType)) {
          throw new Error('Invalid response format');
        }
        parsedResponse = {
          responseType: parsed.responseType,
          content: sanitizeText(parsed.content),
          tags: parsed.tags || ['general'],
          followUpActions: parsed.followUpActions?.filter(a => promptBuilder.validActions.includes(a)) || [],
          is_content_answer: parsed.is_content_answer || null,
          sources: parsed.responseType === 'source' ? parsed.sources || [] : [],
        };
      } catch (error) {
        console.warn('Failed to parse response:', error);
        parsedResponse = {
          responseType: 'normal',
          content: sanitizeText(responseText),
          tags: ['error'],
          followUpActions: [],
          is_content_answer: null,
          sources: [],
        };
      }
  
      console.log('Parsed response:', parsedResponse);
  
      // Check for carousel eligibility
      let carouselSlides = null;
      if (parsedResponse.content.length > 110 && parsedResponse.is_content_answer !== 'TRUE') {
        try {
          const carouselPrompt = `
            ${parsedResponse.content}
            Break down the information into logical sections or points, each suitable for a carousel slide. Use markdown bullet points within slide text for lists and details.
            Respond ONLY with a single, minified JSON object matching this TypeScript interface:
            interface CarouselExplanationPayload {
              slides: Array<{
                title: string;
                text: string;
              }>;
            }
            Ensure each slide's 'text' is comprehensive but not excessively long. Aim for 2-4 slides if the topic warrants it.Each slide shall not have more than 30-50 words. If the topic is simple, a single slide is acceptable. The title should be distinct for each slide.
          `.trim();
          const carouselResponse = await geminiService.generateText(carouselPrompt);
          const sanitizedCarouselResponse = sanitizeText(carouselResponse.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
          const parsedCarousel = JSON.parse(sanitizedCarouselResponse);
          if (parsedCarousel.slides?.length) {
            carouselSlides = parsedCarousel.slides;
            setCarouselData(prev => ({
              ...prev,
              [messages.length + 1]: carouselSlides,
            }));
          }
        } catch (carouselError) {
          console.warn('Failed to generate carousel:', carouselError);
          // Continue without carousel
        }
      }
  
      // Ensure tags and follow-up actions are context-aware
      parsedResponse.tags = actionConfigs[action]?.tags || ['general'];
      parsedResponse.followUpActions = parsedResponse.followUpActions?.length
        ? parsedResponse.followUpActions.filter(a => promptBuilder.validActions.includes(a))
        : promptBuilder.suggestFollowUpActions(action, parsedResponse.content);
  
      // Update answer in context if applicable
      if ((action === 'DRAFT_ANSWER' || action === 'IMPROVE_DRAFT') && effectiveActiveQuestion && dispatch) {
        dispatch({ type: 'UPDATE_ANSWER', payload: { question_id: effectiveActiveQuestion.question_id, text_value: parsedResponse.content } });
      }
  
      // Dispatch the message
      dispatchMessages({
        type: 'ADD_MESSAGE',
        payload: {
          sender: 'ai',
          text: parsedResponse.content,
          responseType: parsedResponse.responseType,
          isMarkdown: true,
          tags: parsedResponse.tags,
          followUpActions: parsedResponse.followUpActions,
          originalUserMessage: currentInput,
          is_content_answer: ['DRAFT_ANSWER','IMPROVE_DRAFT'].includes(action) ? 'answer' : parsedResponse.is_content_answer,
          sources: parsedResponse.sources || [],
        },
      });
    } catch (err) {
      console.error(`Error processing ${action}:`, err);
      setError(err.message);
      dispatchMessages({
        type: 'ADD_MESSAGE',
        payload: {
          sender: 'ai',
          text: `Error: ${err.message}`,
          isMarkdown: true,
          tags: ['error'],
        },
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleModeToggle = useCallback((newMode) => {
    setMode(newMode);
    const modeLabel = newMode === 'question' ? 'Context Mode' : 'General Mode';
    const modeMessage = newMode === 'question' && activeQuestion?.question_text
      ? `**Switched to ${modeLabel}** 🔄\n\n**Current Question:** "${activeQuestion.question_text.substring(0, 80)}..."\n\nHow can I assist with this BRSR question?`
      : `**Switched to ${modeLabel}** 🔄\n\n${newMode === 'general' ? 'Ask me anything about ESG/BRSR!' : 'Please select a question to work with.'}`;
    dispatchMessages({
      type: 'ADD_MESSAGE',
      payload: {
        sender: 'ai',
        text: modeMessage,
        isMarkdown: true,
        tags: ['general'],
        followUpActions: newMode === 'question' ? ['DRAFT_ANSWER', 'EXPLAIN_QUESTION'] : ['SOURCE'],
      },
    });
  }, [activeQuestion]);

  useKeyboardShortcuts(onClose, mode, setMode, handleModeToggle, inputRef);

  const answerText = useMemo(() => {
    if (!currentAnswer) return '';
    if (currentAnswer.string_value) return currentAnswer.string_value;
    if (currentAnswer.text_value) return currentAnswer.text_value;
    if (currentAnswer.choice_value) return currentAnswer.choice_value;
    if (currentAnswer.bool_value !== undefined) return String(currentAnswer.bool_value);
    if (currentAnswer.boolean_value !== undefined) return String(currentAnswer.boolean_value);
    if (currentAnswer.decimal_value !== undefined) return String(currentAnswer.decimal_value);
    return '';
  }, [currentAnswer]);

  const effectiveActiveQuestion = useMemo(() => {
    if (mode === 'question' && activeQuestion?.question_text) {
      return activeQuestion;
    }
    try {
      const storedData = JSON.parse(localStorage.getItem('questionData') || '{}');
      const latest = Object.entries(storedData)
        .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp))[0];
      if (latest && mode === 'question') {
        const [id, data] = latest;
        return {
          question_id: id,
          question_text: data.metadata?.question_text || '',
          guidance_text: data.metadata?.guidance_text || 'No guidance provided',
          ...data.metadata,
        };
      }
    } catch (error) {
      console.error('Error parsing stored question data:', error);
    }
    return null;
  }, [activeQuestion, mode]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleCopyMessage = (textToCopy, messageId) => {
    navigator.clipboard
      .writeText(sanitizeText(textToCopy))
      .then(() => {
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 1500);
        dispatchMessages({
          type: 'ADD_MESSAGE',
          payload: {
            sender: 'ai',
            text: '✅ Message copied to clipboard!',
            isMarkdown: true,
            tags: ['general'],
          },
        });
      })
      .catch((err) => {
        console.error('Failed to copy text:', err);
        dispatchMessages({
          type: 'ADD_MESSAGE',
          payload: {
            sender: 'ai',
            text: 'Failed to copy message. Please try again.',
            isMarkdown: true,
            tags: ['error'],
          },
        });
      });
  };

  const handleAcceptAnswer = useCallback(async (answerText, questionId) => {
    if (onAcceptAnswer) {
      onAcceptAnswer(answerText);
    }

    if (!questionId || !dispatch) {
      dispatchMessages({
        type: 'ADD_MESSAGE',
        payload: {
          sender: 'ai',
          text: 'Error: Cannot accept answer without a valid question.',
          isMarkdown: true,
          tags: ['error'],
        },
      });
      return;
    }
    try {
      dispatch({ type: 'UPDATE_ANSWER', payload: { question_id: questionId, text_value: sanitizeText(answerText) } });
      dispatchMessages({
        type: 'ADD_MESSAGE',
        payload: {
          sender: 'ai',
          text: '✅ Answer accepted successfully!',
          isMarkdown: true,
          tags: ['general'],
        },
      });
    } catch (err) {
      console.error('Error accepting answer:', err);
      dispatchMessages({
        type: 'ADD_MESSAGE',
        payload: {
          sender: 'ai',
          text: `Error: Failed to accept answer. ${err.message}`,
          isMarkdown: true,
          tags: ['error'],
        },
      });
    }
  }, [dispatch, onAcceptAnswer]);

  const handleRejectAnswer = useCallback(() => {
    dispatchMessages({
      type: 'ADD_MESSAGE',
      payload: {
        sender: 'ai',
        text: '❌ Draft rejected.',
        isMarkdown: true,
        tags: ['info'],
      },
    });
  }, []);

  const handleSendMessage = async () => {
    await processMessage({
      action: 'USER_QUERY',
      input,
      setIsLoading,
      setError,
      dispatchMessages,
      inputRef,
      effectiveActiveQuestion,
      dispatch,
      mode,
    });
    setInput('');
  };

  const handleAction = useCallback(async (action, relatedText = '') => {
    if (['DRAFT_ANSWER', 'EXPLAIN_QUESTION', 'SHOW_EXAMPLE_ANSWER', 'IMPROVE_DRAFT', 'DRAFT_KEY_METRICS_LIST'].includes(action) && !effectiveActiveQuestion) {
      dispatchMessages({
        type: 'ADD_MESSAGE',
        payload: {
          sender: 'ai',
          text: 'Please select a question to perform this action.',
          isMarkdown: true,
          tags: ['error'],
        },
      });
      return;
    }
    await processMessage({
      action,
      input: relatedText,
      setIsLoading,
      setError,
      dispatchMessages,
      inputRef,
      effectiveActiveQuestion,
      dispatch,
      mode,
    });
  }, [effectiveActiveQuestion, dispatch, mode]);

  const getQuickActions = () => {
    return mode === 'question'
      ? ['DRAFT_ANSWER', 'EXPLAIN_QUESTION', 'SHOW_EXAMPLE_ANSWER', 'SOURCE']
      : ['SOURCE'];
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/messages');
        console.log('Fetched messages:', response.data);


        
        const formattedMessages = response.data.map((msg) => [
            {
              sender: 'user',
              text: sanitizeText(msg.user_message),
              id: generateUUID(),
              timestamp: msg.timestamp || new Date().toISOString(),
              isMarkdown: false,
              tags: ['general'],
            },
            {
              sender: 'ai',
              text: sanitizeText(msg.bot_reply),
              id: generateUUID(),
              timestamp: msg.timestamp || new Date().toISOString(),
              isMarkdown: true,
              tags: msg.tags || ['general'],
              followUpActions: new PromptBuilder({
                mode,
                activeQuestion: effectiveActiveQuestion,
                currentAnswer: answerText,
                lastUserMessage: msg.user_message,
                userHistory: messages,
              }).suggestFollowUpActions('USER_QUERY', msg.bot_reply),
              originalUserMessage: msg.user_message,
              responseType: msg.responseType || 'normal', // Handle responseType
              sources: msg.sources || [], // Handle sources
            },
          ]).flat();
        formattedMessages.forEach(msg => {
          dispatchMessages({
            type: 'ADD_MESSAGE',
            payload: msg,
          });
        });
      } catch (err) {
        console.error('Failed to load message history:', err);
        dispatchMessages({
          type: 'ADD_MESSAGE',
          payload: {
            sender: 'ai',
            text: 'Failed to load message history. Please try again.',
            isMarkdown: true,
            tags: ['error'],
          },
        });
      }
    };

    if (state.isChatbotOpen) {
      fetchMessages();
      setError(null);
      setTimeout(() => {
        if (messages.length === 0) {
          const initialMessage = mode === 'question' && effectiveActiveQuestion?.question_text
            ? `**BRSR Assistant Ready** 🤖\n\n**Current Question:** "${effectiveActiveQuestion.question_text.substring(0, 80)}..."\n\nHow can I assist with this BRSR question?`
            : '**ESG/BRSR Expert Assistant** 🤖\n\nAsk a question about ESG/BRSR to get started!';
            dispatchMessages({
                type: 'ADD_MESSAGE',
                payload: {
                  sender: 'ai',
                  text: initialMessage,
                  isMarkdown: true,
                  tags: ['general'],
                  followUpActions: mode === 'question' ? ['DRAFT_ANSWER', 'EXPLAIN_QUESTION', 'SOURCE'] : ['SOURCE'],
                  responseType: 'normal', // Explicitly set responseType
                  sources: [], // Initialize sources
                },
              });
        }
      }, 100);
      inputRef.current?.focus();
    } else {
      dispatchMessages({ type: 'RESET' });
    }
  }, [state.isChatbotOpen, mode, effectiveActiveQuestion]);

  useEffect(() => {
    const handleResize = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight / 100}px`);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

return (
  <>
    {/* Backdrop blur for mobile */}
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 sm:hidden" />
    
    <div className="fixed inset-x-0 bottom-0 w-full h-[75vh] z-50 sm:static sm:max-w-md sm:h-[80vh] sm:max-h-[700px] sm:z-auto bg-white border border-gray-200 sm:rounded-xxl shadow-lg sm:shadow-xl flex flex-col overflow-hidden">
      <div className="relative flex flex-col h-full">
        <ChatbotHeader
          onClose={onClose}
          activeQuestion={effectiveActiveQuestion}
          currentAnswer={answerText}
          isApiKeyAvailable={geminiService.isApiKeyAvailable()}
          onModeToggle={handleModeToggle}
          currentMode={mode}
        />
        <ChatbotMessages
          messages={messages}
          handleCopyMessage={handleCopyMessage}
          copiedMessageId={copiedMessageId}
          isLoading={isLoading}
          error={error}
          formatTimestamp={formatTimestamp}
          handleAction={handleAction}
          handleAcceptAnswer={handleAcceptAnswer}
          handleRejectAnswer={handleRejectAnswer}
          effectiveActiveQuestion={effectiveActiveQuestion}
          carouselData={carouselData}
        />
        <ChatbotInput
          input={input}
          setInput={setInput}
          handleSendMessage={handleSendMessage}
          isLoading={isLoading}
          isApiKeyAvailable={geminiService.isApiKeyAvailable()}
          inputRef={inputRef}
          activeQuestion={effectiveActiveQuestion}
        />
        {mode === 'question' && (
          <ChatbotQuickActions
            quickActions={getQuickActions()}
            handleAction={handleAction}
            isLoading={isLoading}
            isApiKeyAvailable={geminiService.isApiKeyAvailable()}
            activeQuestion={effectiveActiveQuestion}
            currentAnswer={answerText}
          />
        )}
      </div>
      <style jsx>{`
        :global(html, body) {
          height: calc(var(--vh, 1vh) * 100);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .markdown-content h2 {
          color: ${PRIMARY_COLOR};
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }
        .markdown-content h3 {
          color: ${SECONDARY_COLOR};
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        .markdown-content li {
          color: #1F2937;
          margin-bottom: 0.25rem;
        }
        .markdown-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .markdown-content li {
          color: #1F2937;
          margin-bottom: 0.25rem;
        }
        
        /* Mobile styles - only for mobile screens */
        @media (max-width: 640px) {
          .fixed {
            height: 75vh;
            max-height: 75vh;
            border-radius: 1rem 1rem 0 0;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            top: auto;
            overflow: hidden;
            overscroll-behavior: none;
            border-bottom: none;
          }
        }
      `}</style>
    </div>
  </>
);
};

export default ChatbotWindow;