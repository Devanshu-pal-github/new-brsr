import React, { useState, useEffect, useRef } from 'react';
import { Brain } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import RagDocumentQA from './RagDocumentQA';

const EditModalEnvironment = ({ isOpen, onClose, children, title, onSave, tempData, question, plantId, financialYear, updateAuditStatus, refetchAuditStatus, metadata, ragTableModalOpen, setRagTableModalOpen, handleRagTableValues }) => {
    const [localAuditStatus, setLocalAuditStatus] = useState(undefined);
    const [smartFeaturesOpen, setSmartFeaturesOpen] = useState(false);
    const [showAuditConfirm, setShowAuditConfirm] = useState(false);
    const [pendingAuditStatus, setPendingAuditStatus] = useState(null);
    const [isAuditLoading, setIsAuditLoading] = useState(false);
    
    // Ref for the modal content to detect clicks outside
    const modalContentRef = useRef(null);

    useEffect(() => {
        if (typeof question.auditStatus !== 'undefined') {
            setLocalAuditStatus(question.auditStatus);
        }
    }, [question.auditStatus]);

    useEffect(() => {
        if (!isOpen) {
            setShowAuditConfirm(false);
            setPendingAuditStatus(null);
        }
    }, [isOpen]);

    // Enhanced click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Don't close if audit confirmation is showing
            if (showAuditConfirm) return;
            
            // Don't close if RAG modal is open
            if (ragTableModalOpen) return;
            
            // Check if click is outside the modal content
            if (modalContentRef.current && !modalContentRef.current.contains(event.target)) {
                onClose();
            }
        };

        // Add event listener when modal is open
        if (isOpen) {
            // Use capture phase to ensure we catch the event before it bubbles
            document.addEventListener('mousedown', handleClickOutside, true);
        }

        // Cleanup
        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
        };
    }, [isOpen, showAuditConfirm, ragTableModalOpen, onClose]);

    // ESC key handler
    useEffect(() => {
        const handleEscapeKey = (event) => {
            if (event.key === 'Escape' && isOpen && !showAuditConfirm && !ragTableModalOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen, showAuditConfirm, ragTableModalOpen, onClose]);

    if (!isOpen) return null;

    const handleAuditStatusClick = (value) => {
        setPendingAuditStatus(value);
        setShowAuditConfirm(true);
    };

    const handleAuditConfirm = async () => {
        setIsAuditLoading(true);
        try {
            await updateAuditStatus({
                financialYear,
                questionId: question.id,
                audit_status: pendingAuditStatus,
                plantId
            }).unwrap();
            setLocalAuditStatus(pendingAuditStatus);
            if (refetchAuditStatus) refetchAuditStatus();
        } catch (err) { }
        setIsAuditLoading(false);
        setShowAuditConfirm(false);
        setPendingAuditStatus(null);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
        >
            <div className="w-full h-full flex items-center justify-center p-4" style={{ maxWidth: '100vw', overflow: 'hidden' }}>
                <motion.div
                    ref={modalContentRef}
                    className="bg-white rounded-lg overflow-hidden flex shadow-2xl relative"
                    initial={{ width: '1024px' }}
                    animate={{ width: smartFeaturesOpen ? '1374px' : '1024px' }}
                    transition={{ 
                        duration: 0.3, 
                        ease: [0.4, 0.0, 0.2, 1],
                        type: "tween"
                    }}
                    style={{ maxHeight: '90vh', minWidth: smartFeaturesOpen ? '1200px' : '1024px', maxWidth: '95vw' }}
                >
                    <div className="flex h-full min-h-0">
                        <div className="flex flex-col" style={{ width: '1024px', minWidth: '1024px' }}>
                            <div className="px-6 py-4 border-b border-gray-200 relative">
                                <div className="pr-20">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        {question.id && (
                                            <span className="inline-block bg-gray-200 text-gray-700 text-xs font-semibold px-2 py-1 rounded">Q.No: {question.id}</span>
                                        )}
                                        {question.principle && (
                                            <span className="inline-block bg-[#E0E7FF] text-[#3730A3] text-xs font-semibold px-2 py-1 rounded">Principle: {question.principle}</span>
                                        )}
                                        {question.indicator && (
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${question.indicator === 'Essential' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF9C3] text-[#92400E]'}`}>Indicator: {question.indicator}</span>
                                        )}
                                    </div>
                                    {question.description && (
                                        <div className="text-sm text-gray-700 mt-1 font-semibold" dangerouslySetInnerHTML={{ __html: question.description }} />
                                    )}
                                </div>
                                <div className="absolute top-2 right-4 flex flex-row items-center gap-2" style={{ zIndex: 20 }}>
                                    <button
                                        onClick={() => setSmartFeaturesOpen(!smartFeaturesOpen)}
                                        className={`flex items-center justify-center rounded-sm  transition-all duration-200 \
                  ${smartFeaturesOpen
                                                ? 'bg-[#3730A3] hover:bg-[#312E81]'
                                                : 'bg-[#4F46E5] hover:bg-[#4338CA]'} text-white`}
                                        style={{
                                            width: 42,
                                            height: 23,
                                            fontSize: 16,
                                            fontWeight: 600,
                                            padding: '0.25rem 0.4rem',
                                            boxShadow: 'none',
                                            transition: 'background 0.2s'
                                        }}
                                        aria-label="Smart AI Features"
                                    >
                                        <Brain className="w-5 h-5 mr-1" />
                                        <span className="text-xs font-semibold">AI</span>
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="rounded-full hover:bg-gray-100 focus:outline-none transition-colors flex items-center justify-center"
                                        style={{
                                            width: 40,
                                            height: 40,
                                            fontSize: 18,
                                            background: 'transparent',
                                            boxShadow: 'none'
                                        }}
                                        aria-label="Close"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1">
                                <div className="min-w-0">
                                    {children}
                                </div>
                                <div className="flex flex-col">
                                    <div className="">
                                        {question?.isAuditRequired && (
                                            <div className="mt-4 flex items-center space-x-4 pt-4">
                                                <span className="text-sm text-gray-600">Audit Done :</span>
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`audit-status-${question.id}`}
                                                        checked={localAuditStatus === true}
                                                        onChange={() => handleAuditStatusClick(true)}
                                                        disabled={showAuditConfirm || isAuditLoading}
                                                        className="accent-green-600"
                                                    />
                                                    <span className="text-green-700">Yes</span>
                                                </label>
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`audit-status-${question.id}`}
                                                        checked={localAuditStatus === false}
                                                        onChange={() => handleAuditStatusClick(false)}
                                                        disabled={showAuditConfirm || isAuditLoading}
                                                        className="accent-red-600"
                                                    />
                                                    <span className="text-red-700">No</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 flex justify-end space-x-2">
                                        <button
                                            onClick={onClose}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => onSave(tempData)}
                                            className="px-4 py-2 bg-[#20305D] text-white rounded hover:bg-[#162442]"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <AnimatePresence mode="wait">
                            {smartFeaturesOpen && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: '350px', opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{
                                        width: { 
                                            duration: 0.3, 
                                            ease: [0.4, 0.0, 0.2, 1],
                                            type: "tween"
                                        },
                                        opacity: { 
                                            duration: 0.25, 
                                            ease: "easeOut",
                                            delay: smartFeaturesOpen ? 0.1 : 0
                                        }
                                    }}
                                    className="border-l border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0"
                                    style={{ width: '350px', minWidth: '350px', maxWidth: '350px' }}
                                >
                                    <div className="p-4 h-full flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-800">Smart AI Features</h3>
                                            <button
                                                onClick={() => setSmartFeaturesOpen(false)}
                                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="space-y-3 flex-1">
                                            <motion.div
                                                initial={{ y: 10, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ 
                                                    delay: 0.15, 
                                                    duration: 0.2,
                                                    ease: "easeOut"
                                                }}
                                                className="bg-white rounded-lg p-3 shadow-sm"
                                            >
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Document Analysis</h4>
                                                <p className="text-xs text-gray-500 mb-3">
                                                    Extract answers from your uploaded documents
                                                </p>
                                                <button
                                                    className="w-full px-3 py-2 bg-[#4F46E5] text-white text-sm rounded hover:bg-[#4338CA] transition-colors flex items-center justify-center gap-2"
                                                    onClick={() => {
                                                        setRagTableModalOpen(true);
                                                    }}
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Get Answers from Document
                                                </button>
                                            </motion.div>
                                            <motion.div
                                                initial={{ y: 10, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ 
                                                    delay: 0.2, 
                                                    duration: 0.2,
                                                    ease: "easeOut"
                                                }}
                                                className="bg-white rounded-lg p-3 shadow-sm"
                                            >
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">More AI Tools</h4>
                                                <p className="text-xs text-gray-500 mb-3">Additional AI-powered features coming soon</p>
                                                <button
                                                    className="w-full px-3 py-2 bg-gray-200 text-gray-500 text-sm rounded cursor-not-allowed"
                                                    disabled
                                                >
                                                    Coming Soon
                                                </button>
                                            </motion.div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
            {ragTableModalOpen && (
                <RagDocumentQA
                    isOpen={ragTableModalOpen}
                    onClose={() => setRagTableModalOpen(false)}
                    questionText={question.description || ''}
                    mode={metadata?.type === 'table' ? 'table' : 'text'}
                    tableMetadata={metadata?.type === 'table' ? metadata : null}
                    onTableValues={(values) => {
                        if (metadata?.type === 'table') {
                            handleRagTableValues(values);
                        }
                        setRagTableModalOpen(false);
                    }}
                />
            )}
            {showAuditConfirm && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black/40 z-[60]"
                    onClick={e => {
                        if (e.target === e.currentTarget) {
                            setShowAuditConfirm(false);
                            setPendingAuditStatus(null);
                        }
                    }}
                >
                    <div className="bg-white p-6 rounded shadow-lg" onClick={e => e.stopPropagation()}>
                        <p className="mb-4">
                            Are you sure you want to set audit status to <b>{pendingAuditStatus ? 'Yes' : 'No'}</b>?
                        </p>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => {
                                    setShowAuditConfirm(false);
                                    setPendingAuditStatus(null);
                                }}
                                disabled={isAuditLoading}
                                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAuditConfirm}
                                disabled={isAuditLoading}
                                className="px-4 py-2 bg-[#20305D] hover:bg-[#162442] text-white rounded"
                            >
                                {isAuditLoading ? 'Updating...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditModalEnvironment;