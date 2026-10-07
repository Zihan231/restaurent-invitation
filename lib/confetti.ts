import confetti from "canvas-confetti";

const COLORS = ["#f6d77a", "#d4a437", "#fff3c4", "#c4192b", "#8e0f1c"];

// Runs in a Web Worker on an OffscreenCanvas so the main thread stays free.
let shoot: confetti.CreateTypes | null = null;
function getShooter() {
  if (shoot) return shoot;
  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  document.body.appendChild(canvas);
  shoot = confetti.create(canvas, { resize: true, useWorker: true, disableForReducedMotion: true });
  return shoot;
}

export function celebrate() {
  const fire = getShooter();
  const small = window.innerWidth < 640;
  const count = small ? 70 : 120;
  const base = { colors: COLORS, ticks: 260, gravity: 0.9, scalar: small ? 0.9 : 1.1, startVelocity: small ? 45 : 60 };
  fire({ ...base, particleCount: count, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } });
  fire({ ...base, particleCount: count, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } });
  setTimeout(() => {
    fire({ ...base, particleCount: Math.round(count * 0.7), spread: 110, startVelocity: 30, origin: { x: 0.5, y: 0.25 }, shapes: ["star"] });
  }, 450);
}
