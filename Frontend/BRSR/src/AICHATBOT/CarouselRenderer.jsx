import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const PRIMARY_COLOR = '#000D30';
const SECONDARY_COLOR = '#1E3A8A';
const ACCENT_COLOR = '#3B82F6';

const CarouselRenderer = ({ slides }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [slides]);

  const renderMarkdown = (text) => {
    const dirtyHtml = marked(text || '');
    const cleanHtml = DOMPurify.sanitize(dirtyHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'strong', 'em', 'blockquote',
        'ul', 'ol', 'li', 'code', 'pre',
        'a', 'img', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
      ADD_ATTR: ['class'],
    });
    return cleanHtml;
  };

  const defaultSlides = [
    {
      title: "Modern Design",
      text: "Clean and **minimalistic** interface design."
    },
    {
      title: "Smooth Navigation",
      text: "Effortless *user experience* with intuitive controls."
    }
  ];

  const slideData = slides && slides.length > 0 ? slides : defaultSlides;

  return (
    <div className="relative w-full w-96 mx-auto bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow-lg p-6">
      <div className="h-[200px] flex items-start pt-4">
        <div className="text-left space-y-4 w-full">
          <div className="flex items-center gap-3">
            <div 
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: ACCENT_COLOR }}
            />
            <h2 
              className="text-2xl font-light tracking-tight"
              style={{ color: PRIMARY_COLOR }}
            >
              {slideData[currentSlide].title}
            </h2>
          </div>
          <div 
            className="text-gray-600 leading-relaxed ml-4 pl-3"
            dangerouslySetInnerHTML={{ 
              __html: renderMarkdown(slideData[currentSlide].text) 
            }}
          />
        </div>
      </div>
      <div className="flex justify-start gap-1 pt-4">
        {slideData.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className="h-[5px] transition-all duration-300 hover:opacity-80"
            style={{ 
              width: `${100 / slideData.length}%`,
              backgroundColor: index === currentSlide ? ACCENT_COLOR : '#d1d5db' 
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default CarouselRenderer;