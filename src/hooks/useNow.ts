import { useEffect, useState } from "react";

/** La hora actual, refrescada cada `everyMs`: hace que lo que depende del paso del tiempo se vuelva a pintar. */
export function useNow(everyMs = 5000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(timer);
  }, [everyMs]);
  return now;
}
