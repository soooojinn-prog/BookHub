"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  o: number;
  tw: number;
  ph: number;
  d: number;
  g: boolean;
};

export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    // No pointer means no parallax to follow, and a phone GPU does not need to
    // clear a 3x backing store 60 times a second for a decorative background.
    const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);

    let reduce = reduceQuery.matches;
    let W = 0;
    let H = 0;
    let lastW = -1;
    let lastH = -1;
    let stars: Star[] = [];
    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;
    let raf = 0;

    const make = () => {
      const n = Math.min(Math.round((window.innerWidth * window.innerHeight) / 7000), 260);
      stars = Array.from({ length: n }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: (Math.random() * 0.9 + 0.35) * DPR,
        o: Math.random() * 0.55 + 0.12,
        tw: Math.random() * 0.02 + 0.004,
        ph: Math.random() * 6.28,
        d: Math.random() * 0.9 + 0.15,
        g: Math.random() < 0.13,
      }));
    };

    const paint = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      tx += (mx - tx) * 0.05;
      ty += (my - ty) * 0.05;
      for (const s of stars) {
        const op = reduce ? s.o : s.o * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph));
        ctx.beginPath();
        ctx.fillStyle = s.g ? `rgba(120,222,182,${op})` : `rgba(226,235,238,${op})`;
        ctx.arc(s.x * W + tx * s.d * 15 * DPR, s.y * H + ty * s.d * 15 * DPR, s.r, 0, 6.2832);
        ctx.fill();
      }
    };

    const loop = (t: number) => {
      paint(t);
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const start = () => {
      if (raf || reduce || document.hidden) return;
      raf = requestAnimationFrame(loop);
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // On a phone the URL bar collapsing fires resize on nearly every scroll.
      // Rebuilding there reallocates the bitmap mid-scroll and re-randomises
      // every star (a visible pop), so height-only changes are ignored — the
      // canvas is sized by CSS, and the bitmap just scales to it.
      if (w === lastW && (coarse || h === lastH)) return;
      lastW = w;
      lastH = h;
      W = c.width = Math.floor(w * DPR);
      H = c.height = Math.floor(h * DPR);
      make();
      if (reduce) paint(0);
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onReduceChange = () => {
      reduce = reduceQuery.matches;
      stop();
      if (reduce) paint(0);
      else start();
    };

    resize();
    window.addEventListener("resize", resize);
    if (!reduce && !coarse) window.addEventListener("mousemove", onMove);
    document.addEventListener("visibilitychange", onVisibility);
    reduceQuery.addEventListener("change", onReduceChange);
    // Reduced motion gets one still frame instead of a loop that redraws the
    // same picture 60 times a second.
    if (reduce) paint(0);
    else start();

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceQuery.removeEventListener("change", onReduceChange);
    };
  }, []);

  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}
