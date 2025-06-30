import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useUploadRagDocumentMutation, useRagChatMutation } from '../../src/store/api/apiSlice';

// Remove `question` from props to avoid duplicate identifier
const RagDocumentQA = ({ isOpen, open, onClose, questionText = '', mode, tableMetadata, onAnswerSuggested, onTableValues }) => {
    const [file, setFile] = useState(null);
    const [fileId, setFileId] = useState('');
    const [question, setQuestion] = useState(questionText);
    const [answer, setAnswer] = useState('');
    const [uploadRagDocument, { isLoading: isUploading }] = useUploadRagDocumentMutation();
    const [ragChat, { isLoading: isChatting }] = useRagChatMutation();
    const [error, setError] = useState('');

    const fileInputRef = React.useRef();
    // Support both `isOpen` and `open` prop for backward compatibility
    const visible = typeof isOpen !== 'undefined' ? isOpen : open;
    React.useEffect(() => {
        // Reset state when modal opens
        if (visible) {
            setFile(null);
            setFileId('');
            setAnswer('');
            setError('');
            setQuestion(questionText);
        }
    }, [visible, questionText]);

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setFileId('');
        setAnswer('');
        setError('');
        if (selectedFile) {
            try {
                const res = await uploadRagDocument(selectedFile).unwrap();
                setFileId(res.file_id);
            } catch (err) {
                setError('Upload failed. Please try again.');
            }
        }
    };

    const handleUploadClick = () => {
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = null; // reset so same file can be picked again
            fileInputRef.current.click();
        }
    };

    const handleAsk = async () => {
        setError('');
        if (!fileId || !question) return;
        try {
            const res = await ragChat({ file_id: fileId, question }).unwrap();
            setAnswer(res.response);
        } catch (err) {
            setError('Failed to get answer. Please try again.');
        }
    };

    const handleUseAnswer = () => {
        if (onAnswerSuggested && answer) {
            onAnswerSuggested(answer);
            if (onClose) onClose();
        }
    };

    if (!visible) return null;

    // Close modal if click outside content
    const backdropRef = React.useRef();
    const handleBackdropClick = (e) => {
        if (e.target === backdropRef.current && onClose) onClose();
    };

    return (
        <div
            ref={backdropRef}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4"
            style={{ background: 'rgba(0,11,51,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={handleBackdropClick}
        >
            <div
                className="relative bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl border border-slate-200/50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300 max-h-[95vh] flex flex-col"
                style={{ boxSizing: 'border-box' }}
            >
                <button className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 hover:bg-slate-200/50 rounded-full transition-colors duration-200 z-10 text-slate-600 hover:text-slate-800 text-2xl font-bold" onClick={onClose} aria-label="Close RAG Modal">×</button>
                <div className="relative flex items-center gap-2 sm:gap-3 pr-8 sm:pr-0 pt-4 pb-2 px-4 sm:px-6">
                    <h2 className="text-lg sm:text-xl font-bold text-[#1A2341] truncate">Upload Document for Q&A</h2>
                </div>
                <div className="mb-3 text-xs text-[#1A2341] bg-[#F8FAFC] p-2 rounded border border-[#E0E7FF] mx-4">
                    Upload a PDF. After upload, you can ask questions and get answers from the document.
                </div>
                <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <div className="flex justify-center w-full mb-2">
                    <button
                        className="bg-[#4F46E5] text-white px-4 py-2 rounded text-xs font-semibold hover:bg-[#1A2341] transition w-full max-w-xs shadow"
                        onClick={handleUploadClick}
                        disabled={isUploading}
                    >
                        {isUploading ? 'Uploading...' : 'Upload PDF'}
                    </button>
                </div>
                {file && !fileId && (
                    <div className="text-xs text-[#1A2341] mb-2 mx-4">Selected: {file.name}</div>
                )}
                {fileId && (
                    <>
                        <div className="mt-2 mx-4">
                            <input
                                type="text"
                                placeholder="Ask a question..."
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                className="border border-[#4F46E5] rounded px-2 py-1 w-full mb-2 text-[#1A2341] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                            />
                            <div className="flex justify-center w-full mb-0">
                                <button
                                    className="bg-[#1A2341] text-white px-4 py-2 rounded text-xs font-semibold hover:bg-[#4F46E5] transition w-full max-w-xs shadow"
                                    onClick={handleAsk}
                                    disabled={isChatting || !question}
                                >
                                    {isChatting ? 'Asking...' : 'Ask'}
                                </button>
                            </div>
                        </div>
                        {answer && (
                            <div
                                className="mt-3 mx-4 p-3 bg-[#F5F6FA] border border-[#E0E7FF] rounded text-sm text-[#1A2341] overflow-y-auto whitespace-pre-line"
                                style={{ minHeight: '120px', maxHeight: '28vh', height: 'clamp(120px,24vh,192px)' }}
                            >
                                <strong className="block mb-1">Suggested Answer:</strong>
                                <div className="overflow-y-auto max-h-[18vh] min-h-[60px]">
                                    <ReactMarkdown>{answer}</ReactMarkdown>
                                </div>
                                {onAnswerSuggested && (
                                    <button
                                        className="mt-2 bg-[#4F46E5] text-white px-3 py-1 rounded text-xs font-semibold hover:bg-[#1A2341] transition"
                                        onClick={handleUseAnswer}
                                    >
                                        Use this answer
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
                {error && <div className="mt-2 text-red-500 text-xs mx-4">{error}</div>}
            </div>
        </div>
    );
};

export default RagDocumentQA;
