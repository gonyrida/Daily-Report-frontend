import React, { useState, useEffect, useRef, useCallback } from 'react';

const FloatingScrollButton: React.FC = () => {
  const [isInLowerHalf, setIsInLowerHalf] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Tracks the actual element that scrolls (null = window)
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Find the first scrollable container in the DOM (used on mount before any scroll fires)
  const detectScrollContainer = useCallback((): HTMLElement | null => {
    if (document.documentElement.scrollHeight > window.innerHeight + 2) {
      return null; // window scrolls
    }
    // Walk the DOM looking for an element with overflow auto/scroll that has overflow content
    const walk = (el: HTMLElement, depth: number): HTMLElement | null => {
      if (depth > 8) return null;
      const style = window.getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 2) {
        return el;
      }
      for (const child of Array.from(el.children)) {
        const result = walk(child as HTMLElement, depth + 1);
        if (result) return result;
      }
      return null;
    };
    return walk(document.body, 0);
  }, []);

  const updateScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    const scrollTop = container ? container.scrollTop : (window.pageYOffset || document.documentElement.scrollTop);
    const scrollHeight = container ? container.scrollHeight : document.documentElement.scrollHeight;
    const clientHeight = container ? container.clientHeight : window.innerHeight;
    const halfwayPoint = (scrollHeight - clientHeight) / 2;
    setIsInLowerHalf(scrollTop >= halfwayPoint);
  }, []);

  useEffect(() => {
    // Detect scroll container on mount
    scrollContainerRef.current = detectScrollContainer();
    setIsVisible(true);
    updateScrollPosition();

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      // Update which element is scrolling
      if (target && target !== document && target !== document.documentElement && target !== document.body) {
        scrollContainerRef.current = target;
      } else {
        scrollContainerRef.current = null;
      }
      setIsVisible(true);
      updateScrollPosition();
    };

    // capture:true catches scroll events from any element in the DOM
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => document.removeEventListener('scroll', handleScroll, { capture: true });
  }, [detectScrollContainer, updateScrollPosition]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      const movedDistance = Math.sqrt(Math.pow(newX - initialPosition.x, 2) + Math.pow(newY - initialPosition.y, 2));
      if (movedDistance > 5) setHasDragged(true);

      const maxX = window.innerWidth - 40;
      const maxY = window.innerHeight - 40;
      setPosition({ x: Math.max(0, Math.min(newX, maxX)), y: Math.max(0, Math.min(newY, maxY)) });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setTimeout(() => setHasDragged(false), 100);
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
      setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setInitialPosition({ x: currentX, y: currentY });
      setHasDragged(false);
      setIsDragging(true);
    }
  };

  const handleClick = () => {
    if (hasDragged) return;
    const container = scrollContainerRef.current;
    if (isInLowerHalf) {
      container
        ? container.scrollTo({ top: 0, behavior: 'smooth' })
        : window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      container
        ? container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
        : window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
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

  return (
    <button
      ref={buttonRef}
      style={buttonStyles}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      aria-label={isInLowerHalf ? 'Scroll to top' : 'Scroll to bottom'}
      title={isInLowerHalf ? 'Scroll to top (Drag to move)' : 'Scroll to bottom (Drag to move)'}
      onMouseEnter={(e) => { if (!isDragging) Object.assign(e.currentTarget.style, hoverStyles); }}
      onMouseLeave={(e) => { if (!isDragging) Object.assign(e.currentTarget.style, buttonStyles); }}
      onFocus={(e) => Object.assign(e.currentTarget.style, { ...buttonStyles, ...focusStyles })}
      onBlur={(e) => Object.assign(e.currentTarget.style, buttonStyles)}
    >
      <svg
        style={arrowStyles}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  );
};

export default FloatingScrollButton;
