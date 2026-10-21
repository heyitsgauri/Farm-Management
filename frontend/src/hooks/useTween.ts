import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion/react';

/** Smoothly rolls a displayed number toward `value`, like a game resource counter. */
export function useTween(value: number, duration = 0.8): number {
  const [display, setDisplay] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    const controls = animate(current.current, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        current.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value, duration]);

  return display;
}
