"use client";

import { useEffect, useRef, useState } from "react";

interface CounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
}

export default function AnimatedCounter({
  end,
  prefix = "",
  suffix = "",
  duration = 2000,
  decimals = 0,
}: CounterProps) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          startTimeRef.current = null;

          const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const elapsed = timestamp - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(eased * end);
            if (progress < 1) {
              frameRef.current = requestAnimationFrame(animate);
            }
          };

          frameRef.current = requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (elementRef.current) observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameRef.current);
    };
  }, [end, duration]);

  const display =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.floor(value).toLocaleString();

  return (
    <span ref={elementRef}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
