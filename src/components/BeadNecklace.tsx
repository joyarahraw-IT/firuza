'use client';
import { useEffect, useRef } from 'react';

/**
 * The brand's signature ornament: a necklace of polished stone beads hanging from a thread, swaying slowly.
 * It is the one looping animation on the site. Decorative (aria-hidden).
 * - Canvas 2D at device pixel ratio, so beads are always perfect circles; the bead count follows the container width.
 * - The thread sags in a gentle curve that "breathes" (phase-shifted sine, ~7.5 s); every bead follows it with a small delay.
 * - Pauses when off-screen and when the tab is hidden; with prefers-reduced-motion it is drawn once, at rest.
 */

type Stone = { base: string; light: string; dark: string };
const STONES: Stone[] = [
  { base: '#12a19b', light: '#8ff0e8', dark: '#07524f' }, // turquoise
  { base: '#b23a2e', light: '#f1a090', dark: '#5a150e' }, // agate red
  { base: '#2b4ba0', light: '#9db4f5', dark: '#152a63' }, // lapis blue
];
const GOLD: Stone = { base: '#d4a017', light: '#fff1a8', dark: '#7a5a06' };
// pattern: three stones, a gold spacer, repeat (turquoise-heavy like the shop's palette)
const PATTERN = [0, 0, 1, -1, 2, 0, 0, 1, -1, 2, 0, 2];

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function BeadNecklace({ height = 72, pendant = false, thread = 'var(--ink-muted)', className = '' }: { height?: number; pendant?: boolean; thread?: string; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = wrap.current;
    const cv = canvas.current;
    if (!host || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let w = 0;
    let dpr = 1;
    let beads: { u: number; r: number; stone: Stone; delay: number }[] = [];
    let threadColor = '#5e5163';
    let raf = 0;
    let running = false;
    let visible = true;
    let disposed = false;

    const readColors = () => {
      const probe = document.createElement('span');
      probe.style.color = thread;
      host.appendChild(probe);
      threadColor = getComputedStyle(probe).color;
      host.removeChild(probe);
    };

    const layout = () => {
      w = host.clientWidth;
      if (!w) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(height * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${height}px`;
      // bead count follows the width: pitch ~ 2 x radius + a little gap
      const rBase = height >= 90 ? 9 : 7;
      const pitch = rBase * 2.35;
      const n = Math.max(6, Math.floor((w - rBase * 2) / pitch));
      beads = [];
      let k = 0;
      for (let i = 0; i < n; i++) {
        const code = PATTERN[i % PATTERN.length];
        const gold = code === -1;
        const r = (gold ? 0.62 : 0.9 + hash(i + 1) * 0.32) * rBase;
        beads.push({ u: n === 1 ? 0.5 : i / (n - 1), r, stone: gold ? GOLD : STONES[code], delay: i * 0.035 });
        k++;
      }
      draw(performance.now() / 1000);
    };

    // thread height at horizontal position u (0..1) and time t (s): a sagging curve that breathes
    const sag = height * 0.5;
    const yAt = (u: number, t: number) => {
      const cycle = 7.5;
      const breathe = reduced.matches ? 0 : 1;
      const depth = sag * (1 + 0.1 * breathe * Math.sin((2 * Math.PI * t) / cycle));
      const sway = reduced.matches ? 0 : 2.2 * Math.sin((2 * Math.PI * t) / cycle + u * Math.PI * 1.3);
      return 8 + depth * 4 * u * (1 - u) + sway * Math.sin(u * Math.PI);
    };

    const drawBead = (x: number, y: number, r: number, s: Stone) => {
      ctx.save();
      ctx.shadowColor = 'rgba(20,12,28,0.35)';
      ctx.shadowBlur = 3 * dpr;
      ctx.shadowOffsetY = 1.5 * dpr;
      const g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r);
      g.addColorStop(0, s.light);
      g.addColorStop(0.28, s.base);
      g.addColorStop(1, s.dark);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // small specular dot: "polished stone"
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(x - r * 0.38, y - r * 0.42, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    };

    function draw(t: number) {
      if (!w) return;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, height);
      // thread
      ctx!.strokeStyle = threadColor;
      ctx!.lineWidth = 1.3;
      ctx!.beginPath();
      const steps = 48;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = u * w;
        const y = yAt(u, t);
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();
      // beads follow the thread, each with a slight delay
      const pad = 8;
      for (const b of beads) {
        const x = pad + b.u * (w - pad * 2);
        const uu = (x / w);
        const y = yAt(uu, t - b.delay) + b.r * 0.55;
        drawBead(x, y, b.r, b.stone);
      }
      if (pendant) {
        const x = w / 2;
        const y = yAt(0.5, t - 0.2) + 10;
        const swing = reduced.matches ? 0 : Math.sin((2 * Math.PI * (t - 0.4)) / 7.5) * 0.06;
        ctx!.save();
        ctx!.translate(x, y);
        ctx!.rotate(swing);
        ctx!.strokeStyle = GOLD.base;
        ctx!.lineWidth = 1.6;
        ctx!.beginPath();
        ctx!.arc(0, 4, 3.5, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.shadowColor = 'rgba(20,12,28,0.35)';
        ctx!.shadowBlur = 3 * dpr;
        ctx!.shadowOffsetY = 1.5 * dpr;
        const g = ctx!.createRadialGradient(-4, 14, 1, 0, 20, 14);
        g.addColorStop(0, STONES[2].light);
        g.addColorStop(0.3, STONES[2].base);
        g.addColorStop(1, STONES[2].dark);
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.moveTo(0, 8);
        ctx!.bezierCurveTo(10, 16, 10, 28, 0, 32);
        ctx!.bezierCurveTo(-10, 28, -10, 16, 0, 8);
        ctx!.fill();
        ctx!.restore();
      }
    }

    const frame = (ms: number) => {
      if (!running) return;
      draw(ms / 1000);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (disposed || running || reduced.matches || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    readColors();
    layout();
    // the animation starts after load, when the browser is idle (never competes with the LCP image)
    const idle: (cb: () => void) => void = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback ? (cb) => (window as unknown as { requestIdleCallback: (cb: () => void, o: { timeout: number }) => void }).requestIdleCallback(cb, { timeout: 2500 }) : (cb) => setTimeout(cb, 400);
    if (document.readyState === 'complete') idle(start); else window.addEventListener('load', () => idle(start), { once: true });

    const ro = new ResizeObserver(() => { layout(); });
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); });
    io.observe(host);
    const onVis = () => { if (document.hidden) stop(); else start(); };
    document.addEventListener('visibilitychange', onVis);
    const onMotion = () => { stop(); layout(); start(); };
    reduced.addEventListener('change', onMotion);
    const mo = new MutationObserver(() => { readColors(); if (!running) draw(performance.now() / 1000); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      disposed = true;
      stop();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      reduced.removeEventListener('change', onMotion);
    };
  }, [height, pendant, thread]);

  return (
    <div ref={wrap} aria-hidden="true" className={`w-full ${className}`} style={{ height }}>
      <canvas ref={canvas} className="block" />
    </div>
  );
}
