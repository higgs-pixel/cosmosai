"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

export function CustomCursor() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stretchRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(finePointer.matches && !reducedMotion.matches);
    update();
    finePointer.addEventListener("change", update);
    reducedMotion.addEventListener("change", update);
    return () => {
      finePointer.removeEventListener("change", update);
      reducedMotion.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const wrapper = wrapperRef.current;
    const stretch = stretchRef.current;
    if (!wrapper || !stretch) return;

    const mouse = { x: 0, y: 0 };
    const position = { x: 0, y: 0 };
    let moved = false;
    const setX = gsap.quickSetter(wrapper, "x", "px");
    const setY = gsap.quickSetter(wrapper, "y", "px");
    const setRotation = gsap.quickSetter(stretch, "rotation", "deg");
    const setScaleX = gsap.quickSetter(stretch, "scaleX");
    const setScaleY = gsap.quickSetter(stretch, "scaleY");

    const inspectHover = (clientX: number, clientY: number) => {
      if (
        clientX <= 5 ||
        clientY <= 5 ||
        clientX >= window.innerWidth - 5 ||
        clientY >= window.innerHeight - 5
      ) {
        setVisible(false);
        return;
      }
      setVisible(true);
      const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const interactive = Boolean(target?.closest('[data-cursor-link="true"]'));
      gsap.to(stretch, {
        width: interactive ? 32 : 12,
        height: interactive ? 32 : 12,
        duration: interactive ? 0.4 : 0.3,
        ease: interactive ? "elastic.out(1, 0.4)" : "power3.out",
        overwrite: "auto",
      });
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!moved) {
        position.x = event.clientX;
        position.y = event.clientY;
        setX(position.x);
        setY(position.y);
        moved = true;
      }
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      inspectHover(event.clientX, event.clientY);
    };
    const onScroll = () => moved && inspectHover(mouse.x, mouse.y);
    const hide = () => setVisible(false);
    const scrollContainer = document.querySelector<HTMLElement>(".cosmos-aryan-home");

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    scrollContainer?.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseleave", hide);

    const ticker = () => {
      if (!moved) return;
      const delta = 1 - Math.pow(0.8, gsap.ticker.deltaRatio());
      position.x += (mouse.x - position.x) * delta;
      position.y += (mouse.y - position.y) * delta;
      setX(position.x);
      setY(position.y);
      const velocityX = mouse.x - position.x;
      const velocityY = mouse.y - position.y;
      const speed = Math.hypot(velocityX, velocityY);
      setRotation(Math.atan2(velocityY, velocityX) * (180 / Math.PI));
      setScaleX(1 + Math.min(speed * 0.004, 0.4));
      setScaleY(1 - Math.min(speed * 0.004, 0.4));
    };
    gsap.ticker.add(ticker);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      scrollContainer?.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseleave", hide);
      gsap.ticker.remove(ticker);
      gsap.killTweensOf(stretch);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={wrapperRef}
      data-home-cursor="true"
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 top-0 z-[9999] h-0 w-0 mix-blend-difference transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div
        ref={stretchRef}
        className="absolute left-0 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white will-change-transform"
      />
    </div>
  );
}
