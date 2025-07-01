
import React, { useState, useRef, useEffect } from 'react';
import GHGMainPage from '../../GHG Emission/Pages/GHGMainPage';
import RagDocumentQA from './RagDocumentQA';

const QuickActions = ({ plantId, financialYear }) => {
    const [open, setOpen] = useState(false);
    const [ragOpen, setRagOpen] = useState(false);
    const [totalCO2e, setTotalCO2e] = useState(null);
    const popupRef = useRef(null);

    // Handler to close popup when clicking outside
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    // Callback to get total CO2e from GHGMainPage
    const handleTotalCO2e = (value) => setTotalCO2e(value);

    return (
        <div className="bg-[#F8FAFC] rounded-[4px] shadow p-[0.7vw] border border-gray-100 w-full flex flex-col gap-2 mt-2">
            <div className="font-semibold text-[11px] mb-[0.3vh] text-[#000D30]">Quick Actions</div>
            <button
                className="bg-[#1A2341] text-white px-3 py-2 rounded text-xs font-medium hover:bg-[#2c3e50] transition"
                onClick={() => setOpen(true)}
            >
                View GHG Emissions
            </button>
            <button
                className="bg-[#4F46E5] text-white px-3 py-2 rounded text-xs font-medium hover:bg-[#4338CA] transition mt-1"
                onClick={() => setRagOpen(true)}
            >
                Get Answers from Document
            </button>
            <button
                className="w-full px-3 py-2 bg-gray-200 text-gray-500 text-sm rounded mt-1 cursor-not-allowed"
                disabled
            >
                More AI Features Coming Soon
            </button>
            {ragOpen && (
                <RagDocumentQA open={ragOpen} onClose={() => setRagOpen(false)} />
            )}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div ref={popupRef} className="bg-white rounded-lg shadow-xl p-0 w-[99vw] max-w-[1200px] md:max-w-[90vw] lg:max-w-[1100px] xl:max-w-[1300px] 2xl:max-w-[1500px] relative animate-fade-in overflow-hidden">
                        <button
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-lg font-bold"
                            onClick={() => setOpen(false)}
                            aria-label="Close"
                        >
                            ×
                        </button>
                        {/* Minimal GHGMainPage: hide Breadcrumb, shrink SubHeader, custom table height */}
                        <div className="p-4">
                            <div style={{width: '100%', height: '65vh', maxHeight: '75vh', overflow: 'auto'}}>
                                <GHGMainPage
                                    hideBreadcrumb
                                    smallSubHeader
                                    plantId={plantId}
                                    financialYear={financialYear}
                                    tableHeight="100%"
                                    onTotalCO2e={handleTotalCO2e}
                                />
                            </div>
                            {totalCO2e !== null && (
                                <div className="mt-4 flex justify-end">
                                    <div className="bg-[#F5F6FA] border border-gray-200 rounded-lg px-6 py-3 shadow text-[#1A2341] text-sm font-semibold">
                                        Total CO₂e: {totalCO2e.toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickActions;
