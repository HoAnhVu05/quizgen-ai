import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  step?: number;
}

export function usePinchZoom(options: UsePinchZoomOptions = {}) {
  const { minScale = 0.5, maxScale = 5, step = 0.25 } = options;

  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRefCurrent = useRef<HTMLDivElement | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  // Callback ref to guarantee listener attachment even if component conditionally renders
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    containerRefCurrent.current = node;
    setContainerEl(node);
  }, []);
  const scaleRef = useRef<number>(1);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);

  // Synchronize refs for smooth 60fps calculation
  scaleRef.current = scale;
  panRef.current = pan;
  isDraggingRef.current = isDragging;

  // Touch tracking refs
  const pinchStartDistRef = useRef<number>(0);
  const pinchStartScaleRef = useRef<number>(1);
  const pinchStartCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapTimeRef = useRef<number>(0);

  // Mouse tracking refs
  const mouseDragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset function
  const reset = useCallback(() => {
    scaleRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setScale(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setIsDragging(false);
  }, []);

  const zoomIn = useCallback(() => {
    const next = Math.min(scaleRef.current + step, maxScale);
    scaleRef.current = next;
    setScale(next);
  }, [step, maxScale]);

  const zoomOut = useCallback(() => {
    const next = Math.max(scaleRef.current - step, minScale);
    scaleRef.current = next;
    if (next <= 1) {
      panRef.current = { x: 0, y: 0 };
      setPan({ x: 0, y: 0 });
    }
    setScale(next);
  }, [step, minScale]);

  const rotate = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  // Zoom at cursor point (used for mouse wheel & double click)
  const zoomAtPoint = useCallback(
    (cursorX: number, cursorY: number, factor: number) => {
      const currentScale = scaleRef.current;
      const currentPan = panRef.current;
      const nextScale = Math.min(Math.max(currentScale * factor, minScale), maxScale);

      // If scale is 1 or less, center the view smoothly
      if (nextScale <= 1) {
        scaleRef.current = nextScale;
        panRef.current = { x: 0, y: 0 };
        setScale(nextScale);
        setPan({ x: 0, y: 0 });
        return;
      }

      const ratio = nextScale / currentScale;
      const nextPan = {
        x: cursorX - (cursorX - currentPan.x) * ratio,
        y: cursorY - (cursorY - currentPan.y) * ratio,
      };

      scaleRef.current = nextScale;
      panRef.current = nextPan;
      setScale(nextScale);
      setPan(nextPan);
    },
    [minScale, maxScale]
  );

  // Native Wheel & Touch Event Listeners (passive: false to prevent browser default pinch/zoom)
  useEffect(() => {
    const el = containerEl || containerRefCurrent.current;
    if (!el) return;

    // 1. Mouse Wheel Zoom centered at cursor (Supports normal wheel and laptop touchpad pinch with ctrlKey)
    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let factor = 1;
      if (e.ctrlKey) {
        // Laptop precision touchpad 2-finger pinch
        factor = Math.exp(-e.deltaY * 0.015);
      } else {
        // Standard mouse wheel roll
        factor = e.deltaY < 0 ? 1.15 : 0.85;
      }

      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - (rect.left + rect.width / 2);
      const cursorY = e.clientY - (rect.top + rect.height / 2);

      zoomAtPoint(cursorX, cursorY, factor);
    };

    // 2. Touch Gestures (Pinch-to-zoom 2 fingers + 1 finger pan when zoomed + double tap)
    const handleNativeTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch start
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartDistRef.current = dist;
        pinchStartScaleRef.current = scaleRef.current;
        pinchStartPanRef.current = { ...panRef.current };

        const rect = el.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        pinchStartCenterRef.current = {
          x: midX - (rect.left + rect.width / 2),
          y: midY - (rect.top + rect.height / 2),
        };
        setIsDragging(true);
      } else if (e.touches.length === 1) {
        // Check double tap
        const now = Date.now();
        if (now - lastTapTimeRef.current < 300) {
          e.preventDefault();
          if (scaleRef.current > 1) {
            reset();
          } else {
            const rect = el.getBoundingClientRect();
            const cursorX = e.touches[0].clientX - (rect.left + rect.width / 2);
            const cursorY = e.touches[0].clientY - (rect.top + rect.height / 2);
            zoomAtPoint(cursorX, cursorY, 2.5);
          }
          lastTapTimeRef.current = 0;
          return;
        }
        lastTapTimeRef.current = now;

        lastTouchPosRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        if (scaleRef.current > 1) {
          e.preventDefault();
          setIsDragging(true);
        }
      }
    };

    const handleNativeTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistRef.current > 0) {
        // 2 fingers pinch to zoom
        e.preventDefault();
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = currentDist / pinchStartDistRef.current;
        const nextScale = Math.min(Math.max(pinchStartScaleRef.current * factor, minScale), maxScale);

        const rect = el.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const currentCenterX = midX - (rect.left + rect.width / 2);
        const currentCenterY = midY - (rect.top + rect.height / 2);

        const scaleRatio = nextScale / pinchStartScaleRef.current;
        const startCenter = pinchStartCenterRef.current;

        const nextPan = {
          x: currentCenterX - (startCenter.x - pinchStartPanRef.current.x) * scaleRatio,
          y: currentCenterY - (startCenter.y - pinchStartPanRef.current.y) * scaleRatio,
        };

        scaleRef.current = nextScale;
        panRef.current = nextPan;
        setScale(nextScale);
        setPan(nextPan);
      } else if (e.touches.length === 1 && scaleRef.current > 1) {
        // 1 finger pan while zoomed
        e.preventDefault();
        const dx = e.touches[0].clientX - lastTouchPosRef.current.x;
        const dy = e.touches[0].clientY - lastTouchPosRef.current.y;
        lastTouchPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        const nextPan = {
          x: panRef.current.x + dx,
          y: panRef.current.y + dy,
        };
        panRef.current = nextPan;
        setPan(nextPan);
      }
    };

    const handleNativeTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        pinchStartDistRef.current = 0;
        setIsDragging(false);
        if (scaleRef.current < 1) {
          scaleRef.current = 1;
          panRef.current = { x: 0, y: 0 };
          setScale(1);
          setPan({ x: 0, y: 0 });
        }
      } else if (e.touches.length === 1) {
        pinchStartDistRef.current = 0;
        lastTouchPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    el.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    el.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    el.addEventListener('touchend', handleNativeTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleNativeTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
      el.removeEventListener('touchstart', handleNativeTouchStart);
      el.removeEventListener('touchmove', handleNativeTouchMove);
      el.removeEventListener('touchend', handleNativeTouchEnd);
      el.removeEventListener('touchcancel', handleNativeTouchEnd);
    };
  }, [containerEl, minScale, maxScale, zoomAtPoint, reset]);

  // Mouse Drag Handlers for Desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scaleRef.current > 1) {
      setIsDragging(true);
      mouseDragStartRef.current = {
        x: e.clientX - panRef.current.x,
        y: e.clientY - panRef.current.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current && scaleRef.current > 1) {
      const nextPan = {
        x: e.clientX - mouseDragStartRef.current.x,
        y: e.clientY - mouseDragStartRef.current.y,
      };
      panRef.current = nextPan;
      setPan(nextPan);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (scaleRef.current > 1) {
      reset();
    } else {
      const el = containerRefCurrent.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - (rect.left + rect.width / 2);
      const cursorY = e.clientY - (rect.top + rect.height / 2);
      zoomAtPoint(cursorX, cursorY, 2.5);
    }
  };

  const transformStyle: React.CSSProperties = {
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
    transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)',
    touchAction: 'none',
    userSelect: 'none',
    cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
  };

  return {
    scale,
    pan,
    rotation,
    isDragging,
    containerRef,
    zoomIn,
    zoomOut,
    rotate,
    reset,
    setScale,
    transformStyle,
    bind: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onDoubleClick: handleDoubleClick,
      onWheel: (e: React.WheelEvent) => {
        let factor = 1;
        if (e.ctrlKey) {
          factor = Math.exp(-e.deltaY * 0.015);
        } else {
          factor = e.deltaY < 0 ? 1.15 : 0.85;
        }
        const el = containerRefCurrent.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cursorX = e.clientX - (rect.left + rect.width / 2);
        const cursorY = e.clientY - (rect.top + rect.height / 2);
        zoomAtPoint(cursorX, cursorY, factor);
      },
    },
  };
}
