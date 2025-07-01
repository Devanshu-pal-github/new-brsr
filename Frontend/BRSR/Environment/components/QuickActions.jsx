import React, { useState, useRef, useEffect } from 'react';
import { FaCloud, FaFileAlt, FaRobot } from 'react-icons/fa';
import GHGMainPage from '../../GHG Emission/Pages/GHGMainPage';
import RagDocumentQA from './RagDocumentQA';

const actions = [
    {
        label: 'View GHG Emissions',
        icon: <FaCloud size={28} className="text-[#1A2341]" />,
        onClick: 'openGHG',
        bg: 'bg-[#EEF2FF]',
    },
    {
        label: 'Get Answers from Document',
        icon: <FaFileAlt size={28} className="text-[#4F46E5]" />,
        onClick: 'openRag',
        bg: 'bg-[#F0FDF4]',
    },
    {
        label: 'More AI Features Coming Soon',
        icon: <FaRobot size={28} className="text-gray-400" />,
        onClick: null,
        bg: 'bg-gray-100',
        disabled: true,
    },
];

const QuickActions = ({ plantId, financialYear, hideGHG = false }) => {
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

    // Card click handlers
    const handleAction = (action) => {
        if (action === 'openGHG') setOpen(true);
        if (action === 'openRag') setRagOpen(true);
    };

    // Filter actions based on hideGHG flag
    const filteredActions = hideGHG
        ? actions.filter(a => a.onClick !== 'openGHG')
        : actions;

    return (
        <div className="bg-[#F8FAFC] rounded-[4px] shadow p-[0.7vw] border border-gray-100 w-full flex flex-col gap-2 mt-2">
            <div className="font-semibold text-[12px] mb-[0.3vh] text-[#000D30] text-center">Quick Actions Buttons</div>
            <div className="flex flex-wrap gap-x-3 gap-y-2 justify-center w-full px-2">
                {filteredActions.map((action, idx) => (
                    <div
                        key={action.label}
                        className={`
                            flex flex-col items-center justify-center 
                            ${action.bg} rounded-[6px] shadow-sm px-2 py-2 min-w-[82px] max-w-[98px] cursor-pointer
                            transition-all duration-300
                            ${action.disabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-md'}
                        `}
                        onClick={() => !action.disabled && handleAction(action.onClick)}
                        style={{ boxShadow: action.disabled ? 'none' : undefined }}
                    >
                        {/* Icon remains the same size for balance */}
                        <div className="flex items-center justify-center">
                            {React.cloneElement(action.icon, { size: 17 })}
                        </div>
                        <span className="mt-2 text-[11px] font-semibold text-center text-[#1A2341] leading-tight">{action.label}</span>
                    </div>
                ))}
            </div>
            {ragOpen && (
                <RagDocumentQA open={ragOpen} onClose={() => setRagOpen(false)} />
            )}
            {open && !hideGHG && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div ref={popupRef} className="bg-white rounded-lg shadow-xl p-0 w-[99vw] max-w-[1200px] md:max-w-[90vw] lg:max-w-[1100px] xl:max-w-[1300px] 2xl:max-w-[1500px] relative animate-fade-in overflow-hidden">
                        <button
                            className="absolute  right-2 text-gray-500 hover:text-gray-800 text-lg font-bold"
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
