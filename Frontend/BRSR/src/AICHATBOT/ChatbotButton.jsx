import { useState } from 'react';
import { FaRobot } from 'react-icons/fa';
import ChatbotWindow from './ChatbotWindow';

const ChatbotButton = () => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [editModalQuestion, setEditModalQuestion] = useState(null);

    return (
        <>
            <button
                className="fixed z-[100] bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-blue-500 shadow-lg flex items-center justify-center hover:scale-110 transform transition-all duration-300 focus:outline-none border-2 border-white animate-pulse"
                onClick={() => setIsChatOpen(true)}
                aria-label="Open AI Chatbot"
            >
                <FaRobot className="text-white text-2xl" />
            </button>
            {isChatOpen && (
                <div className="fixed inset-0 z-[110] flex items-end justify-end bg-black bg-opacity-50 transition-opacity duration-300">
                    <div
                        className="absolute inset-0"
                        onClick={() => setIsChatOpen(false)}
                    />
                    <div className="relative z-10 w-full max-w-lg m-4 md:m-6 animate-slide-up">
                        <ChatbotWindow
                            onClose={() => setIsChatOpen(false)}
                            onEdit={(question) => setEditModalQuestion(question)}
                        />
                    </div>
                </div>
            )}
            {editModalQuestion && (
                <EditModal
                    question={editModalQuestion}
                    onClose={() => setEditModalQuestion(null)}
                />
            )}
        </>
    );
};

export default ChatbotButton;