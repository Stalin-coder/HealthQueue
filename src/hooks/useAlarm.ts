import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Repeating alarm: looping siren tone via Web Audio API + repeating vibration.
 */
export function useAlarm() {
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [ringing, setRinging] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const beepBurst = useCallback(() => {
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext();
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();

      [0, 0.28, 0.56].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880 + i * 220, ctx.currentTime + offset);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.26);
      });
    } catch {
      // audio unavailable
    }
    if ('vibrate' in navigator) navigator.vibrate([400, 150, 400, 150, 400]);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if ('vibrate' in navigator) navigator.vibrate(0);
    setRinging(false);
    setReason(null);
  }, []);

  const start = useCallback((why: string) => {
    setReason(why);
    setRinging(true);
    beepBurst();
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(beepBurst, 2000);
  }, [beepBurst]);

  useEffect(() => () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
  }, []);

  return { ringing, reason, start, stop };
}
