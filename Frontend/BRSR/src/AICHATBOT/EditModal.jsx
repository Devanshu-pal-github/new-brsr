import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import axios from 'axios';

const EditModal = ({ question, onClose }) => {
    const [editedText, setEditedText] = useState(question);

    const handleSave = async () => {
        try {
            await axios.put(`http://localhost:8000/api/messages/${question}`, {
                message: editedText,
            });
            onClose();
        } catch (err) {
            console.error('Error saving edited message:', err);
        }
    };

    return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-gray-200 animate-slide-up">
            <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none transition-colors"
                onClick={onClose}
                aria-label="Close edit modal"
            >
                <FaTimes />
            </button>
            <div className="text-center text-gray-700 text-lg font-medium">
                Edit message
                <div className="mt-4">
                    <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        rows="4"
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        aria-label="Edit message text"
                    />
                    <button
                        className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none transition-colors"
                        onClick={handleSave}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    </div>
);
};

export default EditModal;