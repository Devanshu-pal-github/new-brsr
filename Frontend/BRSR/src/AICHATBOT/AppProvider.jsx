import React, { createContext, useReducer } from 'react';

// Create context
export const AppContext = createContext(null);

// Initial state
const initialState = {
    isChatbotOpen: false,
    questions: [
        { question_id: 'q1', question_text: 'What is your sustainability strategy?', guidance_text: 'Describe long-term goals.' },
        { question_id: 'q2', question_text: 'How do you manage emissions?', guidance_text: 'Include metrics and targets.' },
    ],
    activeQuestionId: null,
    answers: {},
};

// Reducer to handle state updates
const reducer = (state, action) => {
    switch (action.type) {
        case 'SET_CHATBOT_OPEN':
            return { ...state, isChatbotOpen: action.payload };
        case 'UPDATE_ANSWER':
            return {
                ...state,
                answers: {
                    ...state.answers,
                    [action.payload.question_id]: { text_value: action.payload.text_value },
                },
            };
        case 'SET_ACTIVE_QUESTION':
            return { ...state, activeQuestionId: action.payload };
        default:
            return state;
    }
};

// Provider component
export const AppProvider = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};