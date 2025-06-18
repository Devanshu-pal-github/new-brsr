import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DynamicSubHeader = ({ submodules, activeSubmodule, setActiveSubmodule }) => {
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const smoothScroll = useCallback((direction, distance = 120) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const targetScroll = container.scrollLeft + (direction === "left" ? -distance : distance);

      container.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
    }
  }, []);

  const updateScrollIndicators = useCallback(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = container;

      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      setShowLeftFade(scrollLeft > 10);
      setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const handleMouseDown = (e) => {
    if (scrollContainerRef.current) {
      setIsDragging(true);
      setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
      setScrollLeft(scrollContainerRef.current.scrollLeft);
      scrollContainerRef.current.style.cursor = "grabbing";
      scrollContainerRef.current.style.userSelect = "none";
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (scrollContainerRef.current) {
      setIsDragging(false);
      scrollContainerRef.current.style.cursor = "grab";
      scrollContainerRef.current.style.userSelect = "auto";
    }
  };

  const handleWheel = (e) => {
    if (scrollContainerRef.current) {
      e.preventDefault();
      const delta = e.deltaY || e.deltaX;
      scrollContainerRef.current.scrollLeft += delta;
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", updateScrollIndicators);
      container.addEventListener("wheel", handleWheel, { passive: false });
      updateScrollIndicators();

      return () => {
        container.removeEventListener("scroll", updateScrollIndicators);
        container.removeEventListener("wheel", handleWheel);
      };
    }
  }, [updateScrollIndicators]);

  return (
    <div className="bg-white text-[12px] sm:text-[13px] font-medium flex items-center h-[40px] rounded-[10px] shadow-lg shadow-black/5 w-full min-w-0 relative border border-gray-200/80 backdrop-blur-sm">
      <button
        onClick={() => smoothScroll("left")}
        disabled={!canScrollLeft}
        className={`flex items-center justify-center w-8 h-full transition-all duration-300 ease-out rounded-l-[10px] z-20 ${
          canScrollLeft
            ? "bg-gradient-to-r from-white via-white to-white/95 hover:from-[#20305D]/5 hover:via-[#20305D]/5 hover:to-[#20305D]/10 hover:text-[#20305D] text-gray-600 shadow-sm"
            : "bg-gray-50/80 text-gray-300 cursor-not-allowed"
        }`}
      >
        <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
      </button>

      {showLeftFade && (
        <div className="absolute left-8 top-0 w-6 h-full bg-gradient-to-r from-white to-transparent z-10 pointer-events-none rounded-l-[10px]" />
      )}

      <div
        ref={scrollContainerRef}
        className="flex items-center justify-start h-full overflow-x-hidden w-full cursor-grab active:cursor-grabbing scroll-smooth"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitScrollbar: { display: "none" },
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <div className="flex h-full py-1">
          {submodules?.map((submodule, index) => (
            <button
              key={`submodule-${submodule.id}`}
              onClick={() => setActiveSubmodule(submodule.id)}
              className={`relative flex items-center h-full px-3 py-1.5 whitespace-nowrap text-[12px] sm:text-[13px] transition-all duration-300 ease-out rounded-[6px] group will-change-transform ${
                activeSubmodule === submodule.id
                  ? "text-[#20305D] font-semibold bg-gradient-to-b from-[#20305D]/8 to-[#20305D]/12 shadow-sm border border-[#20305D]/10"
                  : "text-gray-600 hover:text-[#20305D] hover:scale-[1.02] transform"
              }`}
            >
              <span className="flex items-center h-full relative z-10">{submodule.name}</span>

              {activeSubmodule === submodule.id && (
                <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-[#20305D] to-[#20305D]/80 rounded-t-full" />
              )}

              <div className="absolute inset-0 rounded-[6px] bg-gradient-to-b from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 will-change-opacity" />
            </button>
          ))}
        </div>
      </div>

      {showRightFade && (
        <div className="absolute right-8 top-0 w-6 h-full bg-gradient-to-l from-white to-transparent z-10 pointer-events-none rounded-r-[10px]" />
      )}

      <button
        onClick={() => smoothScroll("right")}
        disabled={!canScrollRight}
        className={`flex items-center justify-center w-8 h-full transition-all duration-300 ease-out rounded-r-[10px] z-20 ${
          canScrollRight
            ? "bg-gradient-to-l from-white via-white to-white/95 hover:from-[#20305D]/5 hover:via-[#20305D]/5 hover:to-[#20305D]/10 hover:text-[#20305D] text-gray-600 shadow-sm"
            : "bg-gray-50/80 text-gray-300 cursor-not-allowed"
        }`}
      >
        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
      </button>

      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 translate-y-1 flex space-x-1">
        {submodules && submodules.length > 3 && (
          <>
            <div
              className={`w-1 h-1 rounded-full transition-all duration-300 ${showLeftFade ? "bg-[#20305D]/40" : "bg-gray-300"}`}
            />
            <div
              className={`w-1 h-1 rounded-full transition-all duration-300 ${showRightFade ? "bg-[#20305D]/40" : "bg-gray-300"}`}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DynamicSubHeader; 