"use client";

import { useEffect, useState } from "react";
import { EVENT } from "@/lib/event";

function diff(now: number) {
  const ms = Math.max(0, EVENT.start.getTime() - now);
  return {
    done: ms === 0,
    parts: [
      { label: "Days", value: Math.floor(ms / 86_400_000) },
      { label: "Hours", value: Math.floor(ms / 3_600_000) % 24 },
      { label: "Mins", value: Math.floor(ms / 60_000) % 60 },
      { label: "Secs", value: Math.floor(ms / 1000) % 60 },
    ],
  };
}

export default function Countdown() {
  // Render nothing time-dependent on the server to avoid hydration mismatch.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { done, parts } = diff(now ?? EVENT.start.getTime() - 1);

  if (now !== null && done) {
    return <p className="countdown__done">The celebration has begun — welcome!</p>;
  }

  return (
    <div className="countdown" role="timer" aria-label="Time until the grand opening">
      {parts.map((p) => (
        <div className="countdown__cell" key={p.label}>
          <span className="countdown__num">{now === null ? "--" : String(p.value).padStart(2, "0")}</span>
          <span className="countdown__label">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
