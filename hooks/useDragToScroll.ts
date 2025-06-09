
import { useRef, useEffect, useCallback } from 'react';

export const useDragToScroll = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const handleMouseDown = useCallback((e: MouseEvent | TouchEvent) => {
    if (!ref.current) return;
    isDragging.current = true;
    const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX;
    startX.current = pageX - ref.current.offsetLeft;
    scrollLeftStart.current = ref.current.scrollLeft;
    ref.current.style.cursor = 'grabbing';
    ref.current.style.userSelect = 'none'; 
    // Prevent text selection while dragging
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseLeaveOrUp = useCallback(() => {
    if (!ref.current || !isDragging.current) return;
    isDragging.current = false;
    ref.current.style.cursor = 'grab';
    ref.current.style.removeProperty('user-select');
    document.body.style.removeProperty('user-select');
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging.current || !ref.current) return;
    e.preventDefault(); // Prevent default drag behavior (e.g., image ghosting)
    const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX;
    const x = pageX - ref.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // Multiply for faster scrolling
    ref.current.scrollLeft = scrollLeftStart.current - walk;
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Mouse events
    element.addEventListener('mousedown', handleMouseDown as EventListener);
    element.addEventListener('mouseleave', handleMouseLeaveOrUp as EventListener);
    element.addEventListener('mouseup', handleMouseLeaveOrUp as EventListener);
    element.addEventListener('mousemove', handleMouseMove as EventListener);

    // Touch events
    element.addEventListener('touchstart', handleMouseDown as EventListener, { passive: false });
    element.addEventListener('touchend', handleMouseLeaveOrUp as EventListener);
    element.addEventListener('touchcancel', handleMouseLeaveOrUp as EventListener);
    element.addEventListener('touchmove', handleMouseMove as EventListener, { passive: false });
    
    // Initial cursor style
    element.style.cursor = 'grab';


    return () => {
      element.removeEventListener('mousedown', handleMouseDown as EventListener);
      element.removeEventListener('mouseleave', handleMouseLeaveOrUp as EventListener);
      element.removeEventListener('mouseup', handleMouseLeaveOrUp as EventListener);
      element.removeEventListener('mousemove', handleMouseMove as EventListener);

      element.removeEventListener('touchstart', handleMouseDown as EventListener);
      element.removeEventListener('touchend', handleMouseLeaveOrUp as EventListener);
      element.removeEventListener('touchcancel', handleMouseLeaveOrUp as EventListener);
      element.removeEventListener('touchmove', handleMouseMove as EventListener);
    };
  }, [handleMouseDown, handleMouseLeaveOrUp, handleMouseMove]);

  return ref;
};
