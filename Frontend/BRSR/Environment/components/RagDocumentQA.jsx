import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useUploadRagDocumentMutation, useRagChatMutation } from '../../src/store/api/apiSlice';

const RagDocumentQA = ({ open, onClose }) => {
    const [file, setFile] = useState(null);
    const [fileId, setFileId] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [uploadRagDocument, { isLoading: isUploading }] = useUploadRagDocumentMutation();
    const [ragChat, { isLoading: isChatting }] = useRagChatMutation();
    const [error, setError] = useState('');

    const fileInputRef = React.useRef();
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

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div
                className="bg-white rounded-xl shadow-2xl p-6 w-[90vw] max-w-xl min-w-[320px] max-h-[90vh] flex flex-col relative border-2 border-[#1A2341]"
                style={{ boxSizing: 'border-box' }}
            >
                <button className="absolute top-2 right-2 text-gray-400 hover:text-[#1A2341] text-2xl font-bold" onClick={onClose}>×</button>
                <h2 className="text-xl font-bold mb-2 text-[#1A2341]">Upload Document for Q&A</h2>
                <div className="mb-3 text-xs text-[#1A2341] bg-[#F8FAFC] p-2 rounded border border-[#E0E7FF]">
                    Upload a PDF. After upload, you can ask questions and get answers from the document.
                </div>
                <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <button
                    className="bg-[#4F46E5] text-white px-4 py-2 rounded text-xs font-semibold hover:bg-[#1A2341] transition w-full mb-2 shadow"
                    onClick={handleUploadClick}
                    disabled={isUploading}
                >
                    {isUploading ? 'Uploading...' : 'Upload PDF'}
                </button>
                {file && !fileId && (
                    <div className="text-xs text-[#1A2341] mb-2">Selected: {file.name}</div>
                )}
                {fileId && (
                    <>
                        <div className="mt-2">
                            <input
                                type="text"
                                placeholder="Ask a question..."
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                className="border border-[#4F46E5] rounded px-2 py-1 w-full mb-2 text-[#1A2341] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                            />
                            <button
                                className="bg-[#1A2341] text-white px-4 py-2 rounded text-xs font-semibold hover:bg-[#4F46E5] transition w-full shadow"
                                onClick={handleAsk}
                                disabled={isChatting || !question}
                            >
                                {isChatting ? 'Asking...' : 'Ask'}
                            </button>
                        </div>
                        {answer && (
                            <div
                                className="mt-3 p-3 bg-[#F5F6FA] border border-[#E0E7FF] rounded text-sm text-[#1A2341] max-h-48 overflow-y-auto whitespace-pre-line"
                                style={{ minHeight: '96px', maxHeight: '192px' }}
                            >
                                <strong className="block mb-1">Answer:</strong>
                                <ReactMarkdown>{answer}</ReactMarkdown>
                            </div>
                        )}
                    </>
                )}
                {error && <div className="mt-2 text-red-500 text-xs">{error}</div>}
            </div>
        </div>
    );
};

export default RagDocumentQA;
