import React, { useState, useEffect } from 'react';

interface ScrollToTopButtonProps {
  className?: string;
}

const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({ className = '' }) => {
  const [isInLowerHalf, setIsInLowerHalf] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Show button after scrolling down a bit
      setIsVisible(scrollTop > 100);
      
      // Check if user is in lower half of the page
      const halfwayPoint = (scrollHeight - clientHeight) / 2;
      setIsInLowerHalf(scrollTop >= halfwayPoint);
    };

    // Initial check
    handleScroll();

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    if (isInLowerHalf) {
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Scroll to bottom
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14 rounded-full
        bg-blue-600 hover:bg-blue-700
        text-white shadow-lg
        flex items-center justify-center
        transition-all duration-300 ease-in-out
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-4 focus:ring-blue-300
        ${className}
      `}
      onClick={handleClick}
      aria-label={isInLowerHalf ? 'Scroll to top' : 'Scroll to bottom'}
    >
      <svg
        className="w-6 h-6 transition-transform duration-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={{
          transform: isInLowerHalf ? 'rotate(0deg)' : 'rotate(180deg)'
        }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
};

export default ScrollToTopButton;
