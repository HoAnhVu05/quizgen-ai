import React, { useState, useEffect, useRef } from 'react';

interface UseDraggableFabOptions {
  onOpenChat: () => void;
}

/**
 * Manages the draggable Quanta FAB position with edge-snapping and click-vs-drag detection.
 */
export function useDraggableFab({ onOpenChat }: UseDraggableFabOptions) {
  const [fabPosition, setFabPosition] = useState<{ x: number; y: number; side?: 'left' | 'right' } | null>(() => {
    try {
      const saved = localStorage.getItem('quizgen_quanta_fab_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number' && parsed.y >= 140) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [snapSide, setSnapSide] = useState<'left' | 'right'>(() => {
    try {
      const saved = localStorage.getItem('quizgen_quanta_fab_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.side === 'left' || parsed?.side === 'right') return parsed.side;
        if (typeof parsed?.x === 'number' && typeof window !== 'undefined') {
          return parsed.x < window.innerWidth / 2 ? 'left' : 'right';
        }
      }
    } catch {}
    return 'right';
  });

  const [isCurrentlyDragging, setIsCurrentlyDragging] = useState(false);
  const fabElementRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    hasMoved: false,
  });

  useEffect(() => {
    const handleWindowResize = () => {
      setFabPosition((prev) => {
        if (!prev) return null;
        const midX = window.innerWidth / 2;
        const side: 'left' | 'right' = prev.x < midX ? 'left' : 'right';
        const snappedX = side === 'left' ? 16 : Math.max(16, window.innerWidth - 72);
        const maxY = Math.max(16, window.innerHeight - 80);
        const clampedY = Math.min(Math.max(16, prev.y), maxY);
        const clamped = { x: snappedX, y: clampedY, side };
        setSnapSide(side);
        try {
          localStorage.setItem('quizgen_quanta_fab_pos', JSON.stringify(clamped));
        } catch {}
        return clamped;
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const rect = fabElementRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : (fabPosition?.x ?? window.innerWidth - 80);
    const currentY = rect ? rect.top : (fabPosition?.y ?? window.innerHeight - 80);

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: currentX,
      originY: currentY,
      hasMoved: false,
    };

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!dragRef.current.isDragging) return;
      const dx = moveEv.clientX - dragRef.current.startX;
      const dy = moveEv.clientY - dragRef.current.startY;

      if (!dragRef.current.hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        dragRef.current.hasMoved = true;
        setIsCurrentlyDragging(true);
      }

      if (dragRef.current.hasMoved) {
        const elWidth = fabElementRef.current?.offsetWidth || 56;
        const maxX = Math.max(16, window.innerWidth - elWidth - 16);
        const maxY = Math.max(140, window.innerHeight - 80);
        const newX = Math.min(Math.max(16, dragRef.current.originX + dx), maxX);
        const newY = Math.min(Math.max(140, dragRef.current.originY + dy), maxY);
        setFabPosition({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      if (!dragRef.current.isDragging) return;
      const moved = dragRef.current.hasMoved;
      dragRef.current.isDragging = false;
      setIsCurrentlyDragging(false);

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (moved) {
        const rectNow = fabElementRef.current?.getBoundingClientRect();
        const curX = rectNow ? rectNow.left : (fabPosition?.x ?? window.innerWidth - 80);
        const curY = rectNow ? rectNow.top : (fabPosition?.y ?? window.innerHeight - 80);

        const midX = window.innerWidth / 2;
        const targetSide: 'left' | 'right' = curX < midX ? 'left' : 'right';
        const snappedX = targetSide === 'left' ? 16 : Math.max(16, window.innerWidth - 80);
        const clampedY = Math.min(Math.max(140, curY), window.innerHeight - 80);

        const finalPos = { x: Math.round(snappedX), y: Math.round(clampedY), side: targetSide };
        setFabPosition(finalPos);
        setSnapSide(targetSide);
        try {
          localStorage.setItem('quizgen_quanta_fab_pos', JSON.stringify(finalPos));
        } catch {}
      } else {
        onOpenChat();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const fabStyle: React.CSSProperties =
    isCurrentlyDragging && fabPosition
      ? {
          position: 'fixed',
          left: `${fabPosition.x}px`,
          top: `${fabPosition.y}px`,
          right: 'auto',
          bottom: 'auto',
          touchAction: 'none',
          transition: 'none',
        }
      : fabPosition
      ? {
          position: 'fixed',
          top: `${fabPosition.y}px`,
          ...(snapSide === 'left' ? { left: '16px', right: 'auto' } : { right: '16px', left: 'auto' }),
          bottom: 'auto',
          touchAction: 'none',
          transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }
      : {
          position: 'fixed',
          bottom: '24px',
          right: '16px',
          touchAction: 'none',
          transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        };

  return {
    fabElementRef,
    snapSide,
    isCurrentlyDragging,
    fabStyle,
    handlePointerDown,
  };
}
