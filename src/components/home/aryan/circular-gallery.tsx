"use client";

import {
  Children,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  homepageAnimationShouldRun,
  homepageGalleryGestureIsDrag,
} from "./homepage-contract";

export function CircularGallery({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => Children.toArray(children), [children]);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragging = useRef(false);
  const startX = useRef(0);
  const pointerDownX = useRef(0);
  const dragged = useRef(false);
  const rotation = useRef(0);
  const velocity = useRef(0);
  const reducedMotion = useRef(false);
  const nearViewport = useRef(false);

  const renderRotation = useCallback(() => {
    const itemCount = Math.max(items.length, 1);
    itemRefs.current.forEach((element, index) => {
      if (!element) return;
      const angle = (index / itemCount) * 360 + rotation.current;
      element.style.transform = `rotateY(${angle}deg) translateZ(350px)`;
      const normalized = ((angle % 360) + 360) % 360;
      element.style.opacity = Math.abs(normalized - 180) < 90 ? "0.2" : "1";
    });
  }, [items.length]);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;
    const update = () => {
      frameId = 0;
      if (
        !homepageAnimationShouldRun(
          !reducedMotion.current,
          nearViewport.current,
        )
      ) return;
      if (!dragging.current) {
        velocity.current *= 0.95;
        rotation.current += 0.1 + velocity.current;
        renderRotation();
      }
      frameId = requestAnimationFrame(update);
    };
    const syncAnimation = () => {
      const shouldRun = homepageAnimationShouldRun(
        !reducedMotion.current,
        nearViewport.current,
      );
      if (!shouldRun) {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = 0;
        velocity.current = 0;
        renderRotation();
      } else if (!frameId) {
        frameId = requestAnimationFrame(update);
      }
    };
    const updateMotion = () => {
      reducedMotion.current = motionQuery.matches;
      syncAnimation();
    };
    const scrollContainer = containerRef.current?.closest(".cosmos-aryan-home");
    const observer = new IntersectionObserver(([entry]) => {
      nearViewport.current = entry.isIntersecting;
      syncAnimation();
    }, { root: scrollContainer ?? null, rootMargin: "25% 0px" });

    if (containerRef.current) observer.observe(containerRef.current);
    updateMotion();
    motionQuery.addEventListener("change", updateMotion);
    renderRotation();

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      observer.disconnect();
      motionQuery.removeEventListener("change", updateMotion);
    };
  }, [renderRotation]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    startX.current = event.clientX;
    pointerDownX.current = event.clientX;
    dragged.current = false;
    velocity.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const deltaX = event.clientX - startX.current;
    if (homepageGalleryGestureIsDrag(event.clientX - pointerDownX.current)) {
      dragged.current = true;
    }
    startX.current = event.clientX;
    rotation.current += deltaX * 0.2;
    velocity.current = deltaX * 0.2;
    renderRotation();
  };

  const stopDragging = (event?: PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    rotation.current += event.key === "ArrowLeft" ? -60 : 60;
    renderRotation();
  };

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragged.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragged.current = false;
  };

  return (
    <div
      ref={containerRef}
      className="aryan-cursor-target relative flex h-[500px] w-full items-center justify-center [perspective:1000px] active:cursor-grabbing"
      role="region"
      aria-label="Recent NASA Cosmic Archive. Drag or use the left and right arrow keys to rotate."
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onClickCapture={onClickCapture}
      onKeyDown={onKeyDown}
    >
      <div className="relative flex h-full w-full items-center justify-center [transform-style:preserve-3d]">
        {items.map((child, index) => (
          <div
            key={index}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            className="absolute pointer-events-auto transition-opacity duration-300 [transform-style:preserve-3d]"
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
