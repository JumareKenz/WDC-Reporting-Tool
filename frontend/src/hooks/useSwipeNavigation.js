import { useRef, useCallback } from 'react';

export function useSwipeNavigation({ onSwipeLeft, onSwipeRight, threshold = 80 }) {
  const touchStart = useRef({ x: 0, y: 0 });

  const onTouchStart = useCallback((e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
      dx > 0 ? onSwipeRight?.() : onSwipeLeft?.();
    }
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchEnd };
}
