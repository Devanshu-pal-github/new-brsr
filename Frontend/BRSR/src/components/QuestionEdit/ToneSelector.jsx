import React from 'react';
import { Wand2 } from 'lucide-react';

const ToneSelector = ({ refineTone, setRefineTone, handleRefineDraftWithTone, currentValue, selectedTextInTextarea, isLoading }) => {
    const tones = ['concise', 'formal', 'detailed'];

    return (
        <div className="border border-[#1A2B5C] rounded-lg p-4 bg-white ">


            <button
                onClick={handleRefineDraftWithTone}
                disabled={isLoading || (!currentValue?.trim() && !selectedTextInTextarea)}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-[#1A2B5C] hover:bg-[#0F1D42] rounded-lg transition-all disabled:opacity-50 mb-3 border focus:outline-none focus:ring-2 focus:ring-[#001F5B] flex items-center justify-center gap-2"
                aria-label="Refine draft with selected tone"
            >
                <Wand2 className="w-4 h-4" />
                Refine Draft with Tone
            </button>
            <div className="flex space-x-2">
                {tones.map(tone => (
                    <button
                        key={tone}
                        onClick={() => setRefineTone(tone)}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all border border-[#D1D6E8]  ${refineTone === tone
                            ? 'bg-[#1A2B5C] text-white hover:bg-[#0F1D42]'
                            : 'bg-[#E6E8F0]  hover:bg-[#D1D6E8]'
                            } focus:outline-none focus:ring-2 `}
                        aria-label={`Set tone to ${tone}`}
                    >
                        {tone.charAt(0).toUpperCase() + tone.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ToneSelector;