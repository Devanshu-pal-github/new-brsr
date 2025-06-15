import React, { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import PropTypes from 'prop-types';

// Utility to parse markdown with bullet-point focus
const parseMarkdown = (text) => {
    if (!text) return null;

    const lines = text.split('\n').filter(line => line.trim());

    return lines.map((line, index) => {
        const trimmedLine = line.trim();

        // Bullet points
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
            return (
                <li key={index} className="text-slate-700 text-sm leading-relaxed mb-1 pl-3 relative">
                    <span className="absolute left-0 top-1.5 w-1 h-1 bg-indigo-500 rounded-full" />
                    {trimmedLine.substring(2).trim()}
                </li>
            );
        }

        // Headers (h2 only for simplicity)
        if (trimmedLine.startsWith('## ')) {
            return (
                <h4 key={index} className="text-base font-semibold text-slate-800 mb-2 mt-2 first:mt-0">
                    {trimmedLine.substring(3).trim()}
                </h4>
            );
        }

        // Bold text
        if (trimmedLine.includes('**') && trimmedLine.split('**').length > 2) {
            const parts = trimmedLine.split('**');
            return (
                <p key={index} className="text-slate-700 text-sm leading-relaxed mb-1">
                    {parts.map((part, i) => 
                        i % 2 === 1 ? (
                            <strong key={i} className="font-semibold text-slate-900">{part}</strong>
                        ) : (
                            part
                        )
                    )}
                </p>
            );
        }

        // Paragraphs
        if (trimmedLine) {
            return (
                <p key={index} className="text-slate-700 text-sm leading-relaxed mb-1">
                    {trimmedLine}
                </p>
            );
        }

        return null;
    }).filter(Boolean);
};

const ExplanationCarousel = ({ payload, onAction }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [copiedSlide, setCopiedSlide] = useState(null);
    const slides = payload?.slides || [];

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [slides.length]);

    // Copy slide content
    const handleCopySlide = useCallback((text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedSlide(currentSlide);
            setTimeout(() => setCopiedSlide(null), 1000);
        }).catch((err) => {
            console.error('Failed to copy:', err);
        });
    }, [currentSlide]);

    if (!slides.length) {
        return (
            <div className="flex items-center justify-center h-24 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60">
                <p className="text-slate-400 text-xs font-medium">No content</p>
            </div>
        );
    }

    const nextSlide = useCallback(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, [slides.length]);

    const prevSlide = useCallback(() => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    }, [slides.length]);

    const currentSlideData = slides[currentSlide];
    const hasMultipleSlides = slides.length > 1;

    return (
        <div className="w-full max-w-sm mt-2 relative">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/10 to-blue-50/10 rounded-xl blur-2xl -z-10" />

            {/* Carousel container */}
            <div className="relative bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-lg overflow-hidden">
                {/* Fixed Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-blue-50 p-2 flex items-center justify-between border-b border-slate-200/30">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-800 truncate max-w-[150px]">
                            {currentSlideData.title || `Slide ${currentSlide + 1}`}
                        </h3>
                        {hasMultipleSlides && (
                            <div className="flex items-center gap-1">
                                {slides.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentSlide(index)}
                                        className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                                            index === currentSlide ? 'bg-indigo-500 w-4' : 'bg-slate-300'
                                        }`}
                                        aria-label={`Slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleCopySlide(currentSlideData.text)}
                            className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-indigo-50"
                            aria-label="Copy slide"
                        >
                            {copiedSlide === currentSlide ? (
                                <Check className="w-4 h-4 text-indigo-600" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </button>
                        {hasMultipleSlides && (
                            <>
                                <button
                                    onClick={prevSlide}
                                    className="p-1 text-slate-600 hover:text-indigo-600 rounded hover:bg-indigo-50"
                                    aria-label="Previous slide"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={nextSlide}
                                    className="p-1 text-slate-600 hover:text-indigo-600 rounded hover:bg-indigo-50"
                                    aria-label="Next slide"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-3 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                    <div className="space-y-1">
                        {currentSlideData.text && (
                            currentSlideData.text.includes('- ') || currentSlideData.text.includes('• ') ? (
                                <ul className="ml-0 list-none">{parseMarkdown(currentSlideData.text)}</ul>
                            ) : (
                                <div>{parseMarkdown(currentSlideData.text)}</div>
                            )
                        )}
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="sticky bottom-0 bg-gradient-to-r from-slate-50 to-blue-50 p-2 border-t border-slate-200/30 flex items-center justify-between">
                    <span className="text-xs text-slate-600">
                        {currentSlide + 1}/{slides.length}
                    </span>
                    {onAction && (
                        <button
                            onClick={() => onAction('DEEP_DIVE', 'Carousel content')}
                            className="px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
                        >
                            Deep Dive
                        </button>
                    )}
                </div>
            </div>

            {/* CSS */}
            <style jsx>{`
                .scrollbar-thin {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(100, 116, 139, 0.5) transparent;
                }
                .scrollbar-thin::-webkit-scrollbar {
                    width: 4px;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background-color: rgba(100, 116, 139, 0.5);
                    border-radius: 2px;
                }
                .scrollbar-thin::-webkit-scrollbar-track {
                    background: transparent;
                }
            `}</style>
        </div>
    );
};

ExplanationCarousel.propTypes = {
    payload: PropTypes.shape({
        slides: PropTypes.arrayOf(
            PropTypes.shape({
                title: PropTypes.string.isRequired,
                text: PropTypes.string.isRequired,
            })
        ).isRequired,
    }),
    onAction: PropTypes.func,
};

ExplanationCarousel.defaultProps = {
    onAction: null,
};

// Utility functions
export const getWordCount = (text) => {
    if (!text || typeof text !== 'string') return 0;
    const cleanText = text.replace(/[#*`_~[\]()]/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return cleanText.split(/\s+/).filter(word => word.length > 0).length;
};

export const convertToCarouselPayload = async (originalText, geminiService, wordThreshold = 150) => {
    const wordCount = getWordCount(originalText);
    if (wordCount <= wordThreshold) return null;

    const conversionPrompt = `Convert the following ${wordCount}-word text into a JSON object for a carousel display. Create 3-6 slides, each with a title (5-10 words) and text (80-120 words). Use markdown with ## headers and - bullet points for all text content to ensure clarity. Make slides concise and focused.

Original text:
---
${originalText}
---

Return ONLY a minified JSON object:
{"slides":[{"title":"Title","text":"## Header\n- Point 1\n- Point 2"}]}`;

    try {
        let jsonStr = (await geminiService.generateText(conversionPrompt, { responseMimeType: 'application/json' })).trim();
        const fenceRegex = /^(?:```)?(?:json)?\s*\n?([\s\S]*?)\n?\s*(?:```)?$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[1]) jsonStr = match[1].trim();
        
        const parsed = JSON.parse(jsonStr);
        if (parsed.slides?.length && parsed.slides.every(s => typeof s.title === 'string' && typeof s.text === 'string')) {
            return parsed;
        }
        return null;
    } catch (error) {
        console.error('[Carousel] Error:', error);
        return null;
    }
};

export default ExplanationCarousel;