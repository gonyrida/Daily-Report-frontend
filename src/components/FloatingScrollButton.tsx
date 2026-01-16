import React, { useState, useEffect, useRef } from 'react';

const FloatingScrollButton: React.FC = () => {
  const [isInLowerHalf, setIsInLowerHalf] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Button is always visible when page has content
      setIsVisible(true);
      
      // Check if user is in lower half of the page
      const halfwayPoint = (scrollHeight - clientHeight) / 2;
      setIsInLowerHalf(scrollTop >= halfwayPoint);
    };

    // Initial check
    handleScroll();

    // Add scroll event listener with passive for performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Check if mouse has moved more than 5px to consider it a drag
      const movedDistance = Math.sqrt(Math.pow(newX - initialPosition.x, 2) + Math.pow(newY - initialPosition.y, 2));
      if (movedDistance > 5) {
        setHasDragged(true);
      }
      
      // Keep button within viewport bounds
      const maxX = window.innerWidth - 40;
      const maxY = window.innerHeight - 40;
      
      const finalX = Math.max(0, Math.min(newX, maxX));
      const finalY = Math.max(0, Math.min(newY, maxY));
      
      // Update position in real-time
      setPosition({
        x: finalX,
        y: finalY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Reset drag state after a short delay to prevent click event
      setTimeout(() => {
        setHasDragged(false);
      }, 100);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, dragStart, initialPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const currentX = position.x || (window.innerWidth - rect.right);
      const currentY = position.y || (window.innerHeight - rect.bottom);
      
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setInitialPosition({ x: currentX, y: currentY });
      setHasDragged(false);
      setIsDragging(true);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only scroll if the user hasn't dragged (clean click only)
    if (!hasDragged) {
      if (isInLowerHalf) {
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Scroll to bottom
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      }
    }
  };

  if (!isVisible) return null;

  const buttonStyles: React.CSSProperties = {
    position: 'fixed',
    bottom: position.y !== 0 ? 'auto' : '24px',
    right: position.x !== 0 ? 'auto' : '24px',
    left: position.x !== 0 ? `${position.x}px` : 'auto',
    top: position.y !== 0 ? `${position.y}px` : 'auto',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    border: 'none',
    color: 'white',
    cursor: isDragging ? 'grabbing' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 1000,
    outline: 'none',
    userSelect: 'none',
  };

  const hoverStyles: React.CSSProperties = {
    transform: 'scale(1.1)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
    backgroundColor: '#2563eb',
  };

  const focusStyles: React.CSSProperties = {
    outline: '2px solid #93c5fd',
    outlineOffset: '2px',
  };

  const arrowStyles: React.CSSProperties = {
    width: '16px',
    height: '16px',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isInLowerHalf ? 'rotate(0deg)' : 'rotate(180deg)',
  };

  const mediaQueryStyles = `
    @media (max-width: 768px) {
      button {
        bottom: 20px !important;
        right: 20px !important;
        width: 36px !important;
        height: 36px !important;
      }
    }
    
    @media (max-width: 480px) {
      button {
        bottom: 16px !important;
        right: 16px !important;
        width: 32px !important;
        height: 32px !important;
      }
    }
  `;

  return (
    <>
      <style>{mediaQueryStyles}</style>
      <button
        ref={buttonRef}
        style={buttonStyles}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        aria-label={isInLowerHalf ? 'Scroll to top' : 'Scroll to bottom'}
        title={isInLowerHalf ? 'Scroll to top (Drag to move)' : 'Scroll to bottom (Drag to move)'}
        onMouseEnter={(e) => {
          if (!isDragging) {
            Object.assign(e.currentTarget.style, hoverStyles);
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            Object.assign(e.currentTarget.style, buttonStyles);
          }
        }}
        onFocus={(e) => {
          Object.assign(e.currentTarget.style, { ...buttonStyles, ...focusStyles });
        }}
        onBlur={(e) => {
          Object.assign(e.currentTarget.style, buttonStyles);
        }}
      >
        <svg
          style={arrowStyles}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>
    </>
  );
};

export default FloatingScrollButton;
