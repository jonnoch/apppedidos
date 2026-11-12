"use client";

import { useCallback, useEffect, useRef } from "react";

// Genera un "ding" con Web Audio API (sin archivos de audio externos).
// Devuelve una función play() y un enable() para desbloquear el audio tras
// una interacción del usuario (requisito de los navegadores móviles).
export function useOrderSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const ensureCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AC) ctxRef.current = new AC();
    }
    return ctxRef.current;
  }, []);

  const enable = useCallback(() => {
    const ctx = ensureCtx();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
  }, [ensureCtx]);

  const play = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    // Dos tonos cortos tipo campanita.
    [0, 0.18].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 0 ? 880 : 1175;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.4, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.3);
    });
  }, [ensureCtx]);

  useEffect(() => {
    return () => {
      void ctxRef.current?.close();
    };
  }, []);

  return { play, enable };
}
