import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useUploadRagDocumentMutation, useRagChatMutation, useRagExtractTableMutation } from '../../src/store/api/apiSlice';

// Remove `question` from props to avoid duplicate identifier
const RagDocumentQA = ({ isOpen, open, onClose, questionText = '', mode, tableMetadata, onAnswerSuggested, onTableValues }) => {
    const [file, setFile] = useState(null);
    const [fileId, setFileId] = useState('');
    const [question, setQuestion] = useState(questionText);
    const [answer, setAnswer] = useState('');
    const [suggestedTable, setSuggestedTable] = useState(null);
    const [parametersInfo, setParametersInfo] = useState({});
    const [acceptedCells, setAcceptedCells] = useState({}); // Track which cells are accepted
    const [unitWarnings, setUnitWarnings] = useState([]);
    const [uploadRagDocument, { isLoading: isUploading }] = useUploadRagDocumentMutation();
    const [ragChat, { isLoading: isChatting }] = useRagChatMutation();
    const [ragExtractTable, { isLoading: isExtracting }] = useRagExtractTableMutation();
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
            setSuggestedTable(null);
            setParametersInfo({});
            setAcceptedCells({});
            setUnitWarnings([]);
        }
    }, [visible, questionText]);

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        console.log('🔍 [RAG Frontend] File selected:', selectedFile?.name, selectedFile?.size);
        
        setFile(selectedFile);
        setFileId('');
        setAnswer('');
        setError('');
        setSuggestedTable(null);
        setParametersInfo({});
        setAcceptedCells({});
        setUnitWarnings([]);
        
        if (selectedFile) {
            try {
                console.log('🔍 [RAG Frontend] Uploading file...');
                const res = await uploadRagDocument(selectedFile).unwrap();
                console.log('🔍 [RAG Frontend] Upload response:', res);
                setFileId(res.file_id);
                console.log('🔍 [RAG Frontend] File uploaded successfully with ID:', res.file_id);
            } catch (err) {
                console.error('❌ [RAG Frontend] Upload failed:', err);
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

    // For subjective Q&A
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

    // For table extraction
    const handleExtractTable = async () => {
        setError('');
        setSuggestedTable(null);
        setParametersInfo({});
        setAcceptedCells({});
        setUnitWarnings([]);
        if (!fileId || !question || !tableMetadata) return;
        
        console.log('🔍 [RAG Frontend] Starting table extraction...');
        console.log('🔍 [RAG Frontend] File ID:', fileId);
        console.log('🔍 [RAG Frontend] Question:', question);
        console.log('🔍 [RAG Frontend] Table metadata:', tableMetadata);
        
        try {
            const payload = { file_id: fileId, table_metadata: tableMetadata, question };
            console.log('🔍 [RAG Frontend] Sending payload:', payload);
            
            const res = await ragExtractTable(payload).unwrap();
            console.log('🔍 [RAG Frontend] Received response:', res);
            
            setSuggestedTable(res.suggested_values);
            setParametersInfo(res.parameters_info || {});
            setUnitWarnings(res.unit_warnings || []);
            
            console.log('🔍 [RAG Frontend] Suggested values:', res.suggested_values);
            console.log('🔍 [RAG Frontend] Parameters info:', res.parameters_info);
            console.log('🔍 [RAG Frontend] Unit warnings:', res.unit_warnings);
            console.log('🔍 [RAG Frontend] State after setting - parametersInfo:', res.parameters_info);
        } catch (err) {
            console.error('❌ [RAG Frontend] Error extracting table values:', err);
            setError('Failed to extract table values. Please try again.');
        }
    };

    const handleUseAnswer = () => {
        if (onAnswerSuggested && answer) {
            onAnswerSuggested(answer);
            if (onClose) onClose();
        }
    };

    // Toggle acceptance of individual cell
    const handleToggleCellAcceptance = (rowIdx, colKey) => {
        const cellKey = `${rowIdx}_${colKey}`;
        setAcceptedCells(prev => ({
            ...prev,
            [cellKey]: !prev[cellKey]
        }));
    };

    // For table: accept only the selected cells
    const handleUseSelectedCells = () => {
        if (onTableValues && suggestedTable) {
            // Only send accepted cells
            const acceptedValues = {};
            Object.entries(suggestedTable).forEach(([rowIdx, rowObj]) => {
                Object.entries(rowObj).forEach(([colKey, value]) => {
                    const cellKey = `${rowIdx}_${colKey}`;
                    if (acceptedCells[cellKey]) {
                        if (!acceptedValues[rowIdx]) {
                            acceptedValues[rowIdx] = {};
                        }
                        acceptedValues[rowIdx][colKey] = value;
                    }
                });
            });
            
            console.log('🔍 [RAG Frontend] Sending accepted values:', acceptedValues);
            onTableValues(acceptedValues);
            if (onClose) onClose();
        }
    };

    // For table: accept all suggested values (old behavior)
    const handleUseAllValues = () => {
        if (onTableValues && suggestedTable) {
            onTableValues(suggestedTable);
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
                    <h2 className="text-lg sm:text-xl font-bold text-[#1A2341] truncate">
                        {mode === 'table' ? 'Upload Document for Table Extraction' : 'Upload Document for Q&A'}
                    </h2>
                </div>
                <div className="mb-3 text-xs text-[#1A2341] bg-[#F8FAFC] p-2 rounded border border-[#E0E7FF] mx-4">
                    {mode === 'table'
                        ? 'Upload a PDF/Word/Excel. After upload, extract and review suggested table values.'
                        : 'Upload a PDF. After upload, you can ask questions and get answers from the document.'}
                </div>
                <input
                    type="file"
                    accept={mode === 'table' ? '.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf'}
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
                        {isUploading ? 'Uploading...' : (mode === 'table' ? 'Upload Document' : 'Upload PDF')}
                    </button>
                </div>
                {file && !fileId && (
                    <div className="text-xs text-[#1A2341] mb-2 mx-4">Selected: {file.name}</div>
                )}
                {fileId && mode !== 'table' && (
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
                {fileId && mode === 'table' && (
                    <>
                        <div className="mt-2 mx-4">
                            <input
                                type="text"
                                placeholder="Describe what table values to extract..."
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                className="border border-[#4F46E5] rounded px-2 py-1 w-full mb-2 text-[#1A2341] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                            />
                            <div className="flex justify-center w-full mb-0">
                                <button
                                    className="bg-[#1A2341] text-white px-4 py-2 rounded text-xs font-semibold hover:bg-[#4F46E5] transition w-full max-w-xs shadow"
                                    onClick={handleExtractTable}
                                    disabled={isExtracting || !question}
                                >
                                    {isExtracting ? 'Extracting...' : 'Extract Table Values'}
                                </button>
                            </div>
                        </div>
                        {suggestedTable && (
                            <div className="mt-3 mx-4 p-3 bg-[#F5F6FA] border border-[#E0E7FF] rounded text-sm text-[#1A2341] overflow-y-auto whitespace-pre-line" style={{ minHeight: '120px', maxHeight: '40vh', height: 'clamp(120px,35vh,300px)' }}>
                                <strong className="block mb-2">Suggested Table Values:</strong>
                                <div className="overflow-y-auto max-h-[30vh] min-h-[100px]">
                                    <div className="space-y-3">
                                        {Object.entries(suggestedTable).map(([rowIdx, rowObj]) => {
                                            const paramInfo = parametersInfo[rowIdx] || {};
                                            // Use the parameter name from backend, fallback to "Unknown Parameter" if not available
                                            const paramName = paramInfo.parameter || `Unknown Parameter (Row ${parseInt(rowIdx, 10) + 1})`;
                                            const unit = paramInfo.unit || '';
                                            
                                            console.log(`🔍 [RAG Frontend] Row ${rowIdx}: paramInfo =`, paramInfo, `, paramName =`, paramName);
                                            
                                            return (
                                                <div key={rowIdx} className="border border-gray-200 rounded p-2 bg-white">
                                                    <div className="font-semibold text-xs mb-2 text-[#1A2341]">
                                                        {paramName}
                                                        {unit && <span className="text-gray-500 ml-1">({unit})</span>}
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {Object.entries(rowObj).map(([colKey, val]) => {
                                                            const cellKey = `${rowIdx}_${colKey}`;
                                                            const isAccepted = acceptedCells[cellKey];
                                                            const colLabel = colKey === 'current_year' ? 'Current Year' : 
                                                                           colKey === 'previous_year' ? 'Previous Year' : colKey;
                                                            
                                                            return (
                                                                <div key={colKey} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                                                    <div className="flex-1">
                                                                        <span className="text-xs font-medium text-gray-600">{colLabel}:</span>
                                                                        <span className="ml-2 font-bold text-[#1A2341]">{val || 'No value'}</span>
                                                                    </div>
                                                                    {val && (
                                                                        <button
                                                                            onClick={() => handleToggleCellAcceptance(rowIdx, colKey)}
                                                                            className={`ml-2 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                                                                                isAccepted 
                                                                                    ? 'bg-green-500 text-white hover:bg-green-600' 
                                                                                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                                                            }`}
                                                                        >
                                                                            {isAccepted ? '✓ Accepted' : 'Accept'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {unitWarnings && unitWarnings.length > 0 && (
                                    <div className="mt-3 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                                        <strong>Unit Warnings:</strong>
                                        <ul className="list-disc ml-5">
                                            {unitWarnings.map((w, i) => <li key={i}>{w}</li>)}
                                        </ul>
                                    </div>
                                )}
                                <div className="mt-3 flex gap-2 flex-wrap">
                                    <button
                                        className="bg-[#4F46E5] text-white px-3 py-1 rounded text-xs font-semibold hover:bg-[#1A2341] transition"
                                        onClick={handleUseSelectedCells}
                                        disabled={Object.keys(acceptedCells).filter(key => acceptedCells[key]).length === 0}
                                    >
                                        Use Selected Values ({Object.keys(acceptedCells).filter(key => acceptedCells[key]).length})
                                    </button>
                                    <button
                                        className="bg-gray-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-gray-600 transition"
                                        onClick={handleUseAllValues}
                                    >
                                        Use All Values
                                    </button>
                                </div>
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
