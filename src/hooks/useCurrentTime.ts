import { useState, useEffect } from 'react';

/**
 * Hook that provides the current time and updates it every second
 * @returns Current Date object that updates every second
 */
export function useCurrentTime(): Date {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return currentTime;
}
