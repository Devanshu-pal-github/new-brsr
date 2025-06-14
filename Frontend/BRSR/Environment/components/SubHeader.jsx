import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SubHeader = ({ tabs, onTabChange, activeTab }) => {
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const scrollLeftHandler = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -100, behavior: "smooth" });
    }
  };

  const scrollRightHandler = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 100, behavior: "smooth" });
    }
  };

  const handleMouseDown = (e) => {
    if (scrollContainerRef.current) {
      setIsDragging(true);
      setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
      setScrollLeft(scrollContainerRef.current.scrollLeft);
      scrollContainerRef.current.style.cursor = "grabbing";
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Adjust scroll speed
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (scrollContainerRef.current) {
      setIsDragging(false);
      scrollContainerRef.current.style.cursor = "default";
    }
  };

  return (
    <div className="bg-white text-[12px] sm:text-[13px] font-medium flex items-center h-[40px] rounded-[8px] shadow-md w-full min-w-0 relative border border-gray-200">
      <button
        onClick={scrollLeftHandler}
        className="flex items-center justify-center w-9 h-full bg-white/90 hover:bg-[#20305D]/90 hover:text-white transition-all duration-200 ease-in-out rounded-l-[8px] z-10"
      >
        <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
      </button>
      <div
        ref={scrollContainerRef}
        className="flex items-center justify-start px-2 sm:px-3 h-full overflow-x-hidden w-full select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <div className="flex space-x-3 sm:space-x-4 h-full">
          {tabs?.map((tab) => (
            <button
              key={`tab-${tab}`}
              onClick={() => onTabChange(tab)}
              className={`relative flex items-center h-full px-3 py-1.5 whitespace-nowrap text-[12px] sm:text-[13px] transition-all duration-200 ease-in-out rounded-[6px] ${
                activeTab === tab
                  ? "text-[#20305D] font-semibold bg-[#20305D]/10"
                  : "text-gray-600 hover:text-[#20305D] hover:bg-gray-100"
              }`}
              style={{ background: "none", border: "none", outline: "none" }}
            >
              <span className="flex items-center h-full">{tab}</span>
              {activeTab === tab && (
                <span
                  className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#20305D] rounded-t"
                  style={{ width: "100%" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={scrollRightHandler}
        className="flex items-center justify-center w-9 h-full bg-white/90 hover:bg-[#20305D]/90 hover:text-white transition-all duration-200 ease-in-out rounded-r-[8px] z-10"
      >
        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
};

export default SubHeader;