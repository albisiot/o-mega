"use client";

import { useSyncExternalStore } from "react";

// Short sounds for the result pages, made on the spot with Web Audio: no files to load.
// Off until the player switches them on; the choice stays on this device. Browsers play
// sound only after a tap, which a result page always had. With the iPhone on silent
// they may not be heard.

export type ComicSound = "up" | "down" | "shield" | "stop" | "hit" | "whoosh" | "reveal" | "threat" | "win" | "lose" | "void" | "cutin";

const STORAGE_KEY = "o-mega.sound";
const listeners = new Set<() => void>();
let enabled: boolean | null = null;

function read(): boolean {
  if (enabled !== null) return enabled;
  try {
    enabled = localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    enabled = false;
  }
  return enabled;
}

export function setSoundOn(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Without storage the choice lasts until the page is closed.
  }
  listeners.forEach((listener) => listener());
  if (on) playSound("up");
}

/** Whether the sounds are on, kept in step across the page. */
export function useSoundOn(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => false,
  );
}

let context: AudioContext | null = null;

export function playSound(kind: ComicSound) {
  if (!read() || typeof window === "undefined") return;
  try {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    context ??= new Context();
    if (context.state === "suspended") void context.resume();
    const ac = context;
    const t = ac.currentTime;
    const out = ac.createGain();
    out.connect(ac.destination);
    const envelope = (peak: number, duration: number) => {
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(peak, t + 0.012);
      out.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    };
    const tone = (type: OscillatorType, from: number, to: number, duration: number, delay = 0) => {
      const oscillator = ac.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from, t + delay);
      oscillator.frequency.exponentialRampToValueAtTime(to, t + delay + duration);
      oscillator.connect(out);
      oscillator.start(t + delay);
      oscillator.stop(t + delay + duration + 0.05);
    };
    const noise = (duration: number, type: BiquadFilterType, from: number, to: number) => {
      const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * duration), ac.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
      const source = ac.createBufferSource();
      source.buffer = buffer;
      const filter = ac.createBiquadFilter();
      filter.type = type;
      filter.frequency.setValueAtTime(from, t);
      filter.frequency.exponentialRampToValueAtTime(to, t + duration);
      source.connect(filter);
      filter.connect(out);
      source.start(t);
    };
    switch (kind) {
      case "up":
        envelope(0.09, 0.24);
        tone("square", 440, 990, 0.18);
        break;
      case "down":
        envelope(0.09, 0.3);
        tone("sawtooth", 700, 140, 0.28);
        break;
      case "shield":
        envelope(0.11, 0.45);
        tone("sine", 1250, 1180, 0.4);
        tone("sine", 1870, 1800, 0.4);
        break;
      case "stop":
        envelope(0.22, 0.28);
        tone("sine", 120, 60, 0.25);
        noise(0.15, "lowpass", 400, 120);
        break;
      case "hit":
        envelope(0.18, 0.18);
        tone("triangle", 300, 90, 0.15);
        break;
      case "whoosh":
        envelope(0.16, 0.42);
        noise(0.42, "bandpass", 300, 2400);
        break;
      case "reveal":
        envelope(0.08, 0.6);
        tone("sine", 1046, 1046, 0.12);
        tone("sine", 1318, 1318, 0.12, 0.1);
        tone("sine", 1568, 1568, 0.2, 0.2);
        break;
      case "threat":
        envelope(0.16, 0.8);
        tone("sine", 110, 98, 0.75);
        tone("triangle", 220, 196, 0.5);
        break;
      case "cutin":
        envelope(0.14, 0.5);
        noise(0.45, "highpass", 800, 4000);
        tone("square", 220, 660, 0.3);
        break;
      case "win":
        envelope(0.09, 0.5);
        tone("square", 523, 523, 0.1);
        tone("square", 659, 659, 0.1, 0.1);
        tone("square", 784, 784, 0.25, 0.2);
        break;
      case "lose":
        envelope(0.11, 0.5);
        tone("sawtooth", 300, 110, 0.45);
        break;
      default:
        envelope(0.07, 0.2);
        tone("sine", 440, 440, 0.15);
    }
  } catch {
    // No audio: the page works without it.
  }
}
