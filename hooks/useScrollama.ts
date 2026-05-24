"use client";

import { useEffect, useRef, useCallback } from "react";

interface ScrollamaOptions {
  offset?: number;
  once?: boolean;
}

interface StepEnterEvent {
  element: Element;
  index: number;
  direction: "up" | "down";
}

type StepCallback = (event: StepEnterEvent) => void;

export function useScrollama(
  containerRef: React.RefObject<HTMLElement | null>,
  stepSelector: string,
  onStepEnter: StepCallback,
  options: ScrollamaOptions = {}
) {
  const scrollamaRef = useRef<ReturnType<typeof import("scrollama")> | null>(null);
  const onStepEnterRef = useRef(onStepEnter);

  useEffect(() => {
    onStepEnterRef.current = onStepEnter;
  }, [onStepEnter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!containerRef.current) return;

    let scroller: ReturnType<typeof import("scrollama")> | null = null;

    const initScrollama = async () => {
      const scrollama = (await import("scrollama")).default;
      scroller = scrollama();
      scrollamaRef.current = scroller;

      const steps = containerRef.current!.querySelectorAll(stepSelector);
      if (!steps.length) return;

      scroller
        .setup({
          step: steps as unknown as string,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          offset: (options.offset ?? 0.5) as any,
          once: options.once ?? false,
        })
        .onStepEnter((response: StepEnterEvent) => {
          onStepEnterRef.current(response);
        });
    };

    initScrollama();

    const handleResize = () => {
      scrollamaRef.current?.resize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      scrollamaRef.current?.destroy();
    };
  }, [containerRef, stepSelector, options.offset, options.once]);
}

export function useSimpleScrollama(
  stepSelector: string,
  onStepEnter: StepCallback,
  options: ScrollamaOptions = {}
) {
  const containerRef = useRef<HTMLDivElement>(null);
  useScrollama(containerRef, stepSelector, onStepEnter, options);
  return containerRef;
}
