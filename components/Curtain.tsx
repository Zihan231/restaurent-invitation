"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import VelvetCurtain from "./VelvetCurtain";

type Props = {
  onOpenStart: () => void;
  onOpenComplete: () => void;
};

// Heavy-curtain feel: slow start, long glide, soft landing.
const DRAPE_EASE = [0.7, 0, 0.2, 1] as const;

export default function Curtain({ onOpenStart, onOpenComplete }: Props) {
  const [opening, setOpening] = useState(false);
  const [gl, setGl] = useState<"pending" | "ok" | "none">("pending");
  const reduce = useReducedMotion();
  const duration = reduce ? 0.6 : 2.4;

  const open = () => {
    if (opening) return;
    setOpening(true);
    onOpenStart();
  };

  const layerClass = ["curtain-layer", opening && "is-opening", gl === "ok" && "has-gl"].filter(Boolean).join(" ");

  return (
    <div className={layerClass} aria-hidden={opening}>
      {/* Realistic WebGL velvet; stays as the stage frame around the hero once tied back */}
      {gl !== "none" && (
        <VelvetCurtain
          opening={opening}
          reduced={!!reduce}
          onReady={() => setGl("ok")}
          onUnsupported={() => setGl("none")}
          onSettled={onOpenComplete}
        />
      )}

      {/* CSS drapes: placeholder until WebGL draws, and fallback when it is unavailable */}
      {gl !== "ok" && (
        <>
          <motion.div
            className="drape drape--left"
            initial={false}
            animate={opening ? { x: "-101%", scaleX: 0.55 } : { x: "0%", scaleX: 1 }}
            transition={{ duration, ease: DRAPE_EASE, delay: 0.35 }}
            onAnimationComplete={() => opening && onOpenComplete()}
          >
            <span className="drape__fringe" />
          </motion.div>
          <motion.div
            className="drape drape--right"
            initial={false}
            animate={opening ? { x: "101%", scaleX: 0.55 } : { x: "0%", scaleX: 1 }}
            transition={{ duration, ease: DRAPE_EASE, delay: 0.35 }}
          >
            <span className="drape__fringe" />
          </motion.div>
          <motion.div
            className="valance"
            initial={false}
            animate={opening ? { y: "-110%" } : { y: "0%" }}
            transition={{ duration: duration * 0.6, ease: DRAPE_EASE, delay: 0.35 + duration * 0.55 }}
          />
        </>
      )}

      {/* Invitation seal sitting on the seam */}
      <motion.div
        className="seal"
        // entrance is a CSS animation so it shows before hydration on slow phones
        initial={false}
        animate={opening ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeIn" }}
      >
        <p className="seal__kicker">You are cordially invited</p>
        <div className="seal__medal">
          <Image src="/images/logo.webp" alt="Water Park" width={480} height={333} priority className="seal__logo" />
        </div>
        <h1 className="seal__title">
          <span>Grand</span>
          <span>Opening</span>
        </h1>
        <p className="seal__date">9 · 10 · 2026</p>
        <motion.button
          type="button"
          className="seal__btn"
          onClick={open}
          whileTap={{ scale: 0.94 }}
          aria-label="Open the invitation"
        >
          <span className="seal__btn-ring" />
          Open Invitation
        </motion.button>
        <p className="seal__hint">Tap to raise the curtain</p>
      </motion.div>
    </div>
  );
}
