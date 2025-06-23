import React from 'react';
import { MiniAIAssistantAction } from './MiniAIAssistantAction.js'; // Assuming MiniAIAssistantAction is exported from QuestionEditPopup

const AIActionButtons = ({ selectedTextInTextarea, handleQuickAIAction, actions, currentValue }) => {
    // Ensure actions is always an object to avoid TypeError
    actions = actions || {};

    const allPanelActionsWithMetadata = [
        { action: MiniAIAssistantAction.EXPLAIN_THIS_QUESTION, label: "Explain Q", icon: 'InformationCircleIcon', title: "Explain current question." },
        { action: MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Left, label: "AI Draft", icon: 'SparklesIcon', title: "AI generates an answer." },
        { action: MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Right, label: "AI Draft ", icon: 'SparklesIcon', title: "AI generates an answer." },
        { action: MiniAIAssistantAction.BREAK_DOWN_QUESTION, label: "Break Down Q", icon: 'ListBulletIcon', title: "Break question into parts." },
        { action: MiniAIAssistantAction.IDENTIFY_KEY_TERMS, label: "Key Terms", icon: 'TagIcon', title: "Identify key terms in your draft or the question.", requiresDraft: true },
        { action: MiniAIAssistantAction.CHECK_TONE_CONSISTENCY, label: "Check Tone", icon: 'AdjustmentsHorizontalIcon', title: "Check tone consistency of your draft.", requiresDraft: true },
        { action: MiniAIAssistantAction.SUGGEST_ALTERNATIVE_PHRASING, label: "Rephrase", icon: 'LanguageIcon', title: "Suggest alternative phrasing for your draft.", requiresDraft: true },
        { action: MiniAIAssistantAction.EXPLAIN_ACRONYMS, label: "Acronyms", icon: 'AcademicCapIcon', title: "Explain acronyms in your draft.", requiresDraft: true },
        { action: MiniAIAssistantAction.SUGGEST_DATA_SOURCES, label: "Data Sources", icon: 'BeakerIcon', title: "Suggest potential data sources for this question." },
        { action: MiniAIAssistantAction.SUGGEST_TABLE_STRUCTURE, label: "Suggest Table", icon: 'TableCellsIcon', title: "Suggest table structure for this question.", requiresTableQuestion: true },
        { action: MiniAIAssistantAction.ELABORATE_DRAFT, label: "Elaborate", icon: 'ArrowsPointingOutIcon', title: "Elaborate on your current draft.", requiresDraft: true },
        { action: MiniAIAssistantAction.CONDENSE_DRAFT, label: "Condense", icon: 'ArrowsPointingInIcon', title: "Condense your current draft.", requiresDraft: true },
        { action: MiniAIAssistantAction.GENERATE_FOLLOWUP_QUESTIONS_FOR_USER, label: "User Qs", icon: 'QuestionMarkCircleIcon', title: "Generate follow-up questions for you to consider." },
        { action: MiniAIAssistantAction.COMPARE_WITH_BEST_PRACTICE, label: "Best Practice", icon: 'CheckBadgeIcon', title: "Compare answer with generic best practices." },
        { action: MiniAIAssistantAction.SUMMARIZE_SELECTION, label: "Summ. Select", icon: 'DocumentDuplicateIcon', title: "Summarize selected text.", requiresSelection: true },
        { action: MiniAIAssistantAction.REFINE_SELECTION, label: "Refine Select", icon: 'AdjustmentsHorizontalIcon', title: "Refine selected text.", requiresSelection: true },
        { action: MiniAIAssistantAction.EXPLAIN_SELECTION, label: "Explain Select", icon: 'InformationCircleIcon', title: "Explain selected text.", requiresSelection: true },
        { action: MiniAIAssistantAction.QUICK_COMPLIANCE_CHECK, label: "Compliance", icon: 'ShieldCheckIcon', title: "Quick compliance check of your draft.", requiresDraft: true },
    ];

    const iconMap = {
        CheckBadgeIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.5 3.5 0 001.946-.806 3.5 3.5 0 014.438 0 3.5 3.5 0 001.946.806 3.5 3.5 0 013.138 3.138 3.5 3.5 0 00.806 1.946 3.5 3.5 0 010 4.438 3.5 3.5 0 00-.806 1.946 3.5 3.5 0 01-3.138 3.138 3.5 3.5 0 00-1.946.806 3.5 3.5 0 01-4.438 0 3.5 3.5 0 00-1.946-.806 3.5 3.5 0 01-3.138-3.138 3.5 3.5 0 00-.806-1.946 3.5 3.5 0 010-4.438 3.5 3.5 0 00.806-1.946 3.5 3.5 0 013.138-3.138z" />
            </svg>
        ),
        SparklesIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
        ),
        InformationCircleIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        ListBulletIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        ),
        TagIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5.9a2 2 0 011.64 1.5l3.47 7.02c.07.15.11.32.11.49V20a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2zm0 4v8m4-4h8m0 4h-8" />
            </svg>
        ),
        AdjustmentsHorizontalIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
        ),
        LanguageIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4 4 4-4" />
            </svg>
        ),
        AcademicCapIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l-9 5 9 5 9-5-9-5zm0 0v-5m6 10H6" />
            </svg>
        ),
        BeakerIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-2.828-2.828L12 15.172l-4.596-4.596a2 2 0 10-2.828 2.828L9.172 18l-4.596 4.596a2 2 0 102.828 2.828L12 20.828l4.596 4.596a2 2 0 002.828-2.828L14.828 18l4.596-4.596z" />
            </svg>
        ),
        TableCellsIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
        ),
        ArrowsPointingOutIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4M4 20l5-5m11 1v4m0 0h-4m4 0l-5-5" />
            </svg>
        ),
        ArrowsPointingInIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        QuestionMarkCircleIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        DocumentDuplicateIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v6a2 2 0 002 2h2" />
            </svg>
        ),
        ShieldCheckIcon: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.504A9.956 9.956 0 0112 2C6.48 2 2 6.48 2 12a9.956 9.956 0 014.382 7.496l-1.392 1.392A1 1 0 005.172 22h13.656a1 1 0 00.707-1.707l-1.392-1.392z" />
            </svg>
        ),
        default: (
            <svg className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    };

    // Determine if the response is empty
    const isResponseEmpty = !currentValue || (typeof currentValue === 'string' && currentValue.trim().length === 0);

    // Only enable AI Recommend if response is empty
    const shouldDisable = (actionKey) => {
        if (isResponseEmpty) {
            // Only allow AI Recommend (Right) when empty
            return actionKey !== MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Right;
        }
        return false;
    };

    // Define action priorities for empty and filled states
    const emptyResponsePriority = [
        MiniAIAssistantAction.EXPLAIN_THIS_QUESTION,
        MiniAIAssistantAction.RECOMMEND_AI_ANSWER_Right,
        MiniAIAssistantAction.BREAK_DOWN_QUESTION,
        MiniAIAssistantAction.SUGGEST_DATA_SOURCES,
        MiniAIAssistantAction.GENERATE_FOLLOWUP_QUESTIONS_FOR_USER,
        MiniAIAssistantAction.COMPARE_WITH_BEST_PRACTICE,
        MiniAIAssistantAction.SUGGEST_TABLE_STRUCTURE,
    ];
    const filledResponsePriority = [
        MiniAIAssistantAction.REFINE_ANSWER,
        MiniAIAssistantAction.CHECK_TONE_CONSISTENCY,
        MiniAIAssistantAction.SUGGEST_ALTERNATIVE_PHRASING,
        MiniAIAssistantAction.IDENTIFY_KEY_TERMS,
        MiniAIAssistantAction.EXPLAIN_ACRONYMS,
        MiniAIAssistantAction.QUICK_COMPLIANCE_CHECK,
        MiniAIAssistantAction.ELABORATE_DRAFT,
        MiniAIAssistantAction.CONDENSE_DRAFT,
        MiniAIAssistantAction.SUMMARIZE_ANSWER,
        MiniAIAssistantAction.BREAK_DOWN_QUESTION,
        MiniAIAssistantAction.COMPARE_WITH_BEST_PRACTICE,
        MiniAIAssistantAction.GENERATE_FOLLOWUP_QUESTIONS_FOR_USER,
    ];

    // Filter relevant actions based on conditions
    const relevantActions = Object.keys(actions).filter(actionKey => {
        const actionMeta = allPanelActionsWithMetadata.find(meta => meta.action === actionKey);
        if (!actionMeta) return false;
        const hasDraft = currentValue?.trim && currentValue.trim().length > 0;
        const hasSelection = selectedTextInTextarea?.length > 0;
        if (actionMeta.requiresDraft && !hasDraft) return false;
        if (actionMeta.requiresSelection && !hasSelection) return false;
        if (actionMeta.requiresTableQuestion) return false;
        return true;
    });

    // Sort by priority depending on response state
    let prioritizedActions = isResponseEmpty
        ? emptyResponsePriority.filter(a => relevantActions.includes(a))
        : filledResponsePriority.filter(a => relevantActions.includes(a));
    // If less than 6, fill with any other relevant actions
    if (prioritizedActions.length < 6) {
        prioritizedActions = [
            ...prioritizedActions,
            ...relevantActions.filter(a => !prioritizedActions.includes(a)),
        ];
    }
    const maxVisible = 6;
    let visibleActions = prioritizedActions.slice(0, maxVisible);
    // If more than 6, allow cycling (future: add UI for cycling)
    // For now, just show the first 6 most relevant

    return (
        <div className=" mt-2">
            <h5 className="text-sm font-medium text-[#000D30] mb-2">Relevant AI Actions</h5>
            <div className="grid grid-cols-3 gap-2">
                {visibleActions.map(actionKey => {
                    const actionMeta = allPanelActionsWithMetadata.find(meta => meta.action === actionKey);
                    if (!actionMeta) return null;
                    return (
                        <button
                            key={actionKey}
                            onClick={() => handleQuickAIAction(actionKey)}
                            title={actionMeta.title}
                            className={`flex flex-col items-center px-2 py-2 text-xs font-medium text-[#000D30] bg-[#E6E8F0] hover:bg-[#D1D6E8] hover:scale-[1.02] transition-transform duration-150 ease-out  rounded-lg  border border-[#D1D6E8] focus:ring-2 focus:ring-blue-500/50 ${shouldDisable(actionKey) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                            aria-label={actionMeta.title}
                            disabled={shouldDisable(actionKey)}
                        >
                            {iconMap[actionMeta.icon] || iconMap.default}
                            <span className="text-center">{actionMeta.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default AIActionButtons;