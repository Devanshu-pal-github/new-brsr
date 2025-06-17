import React, { useCallback } from 'react';
import DOMPurify from 'dompurify';

const MarkdownRenderer = ({ content, className = '', wrapLists = true }) => {
    const renderMarkdown = useCallback((text) => {
        if (!text) return '';

        let raw = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/^(Strengths|Improvements):$/gm, '<strong>$1:</strong>'); // Specific headings

        if (wrapLists) {
            raw = raw
                .replace(/^-\s(.*?)$/gm, '<li>$1</li>')
                .replace(/(<li>.*?<\/li>(?:\s*<br\s*\/?>)*)+/g, (match) => {
                    const cleanedMatch = match.replace(/<br\s*\/?>/g, '');
                    return `<ul>${cleanedMatch}</ul>`;
                });
        } else {
            raw = raw.replace(/^-\s(.*?)$/gm, '$1');
        }

        if (!wrapLists) {
            raw = raw.replace(/\n/g, '<br />');
        }

        return DOMPurify.sanitize(raw);
    }, [wrapLists]);

    return (
        <span
            className={`inline-block max-w-[80%] p-2 rounded-lg text-sm ${className}`}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
    );
};

export default MarkdownRenderer;