import React from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

const ModalHeader = ({ questionId, questionText, closeModal }) => {
    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
                <h2 
                    id={`question-${questionId}-title`}
                    className="text-lg font-semibold text-gray-900"
                >
                    Question {questionId}
                </h2>

            </div>
            <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                aria-label="Close modal"
            >
                <X className="w-5 h-5 text-gray-500" />
            </button>
        </div>
    );
};

ModalHeader.propTypes = {
    questionId: PropTypes.string.isRequired,
    questionText: PropTypes.string.isRequired,
    closeModal: PropTypes.func.isRequired,
};

export default ModalHeader;