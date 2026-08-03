import { useEffect, useState } from 'react';

/** Tracks whether the viewport is narrower than Tailwind's `sm` breakpoint (640px). */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
