import { useEffect, useState } from 'react';

export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

// iOS only lets a page play sound after a tap, so the context is created on the first logged set.
let audio: AudioContext | null = null;

export function unlockAudio() {
  try {
    if (!audio) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audio = new AC();
    }
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    audio = null;
  }
}

export function beep() {
  if (!audio) return;
  const t = audio.currentTime;
  for (const [offset, freq] of [[0, 880], [0.22, 1175]] as const) {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = freq;
    o.connect(g);
    g.connect(audio.destination);
    g.gain.setValueAtTime(0.0001, t + offset);
    g.gain.exponentialRampToValueAtTime(0.25, t + offset + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.3);
    o.start(t + offset);
    o.stop(t + offset + 0.32);
  }
}
