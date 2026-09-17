import { useEffect, useState } from "react";

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function format(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return {
    date: `${day} ${month} ${year}`,
    time: `${String(hours).padStart(2, "0")}:${minutes} ${period}`,
  };
}

export function useLiveClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => format(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setNow(format(new Date())), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
