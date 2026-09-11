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

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
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
    const resize = () => {
      W = c.width = Math.floor(window.innerWidth * DPR);
      H = c.height = Math.floor(window.innerHeight * DPR);
      c.style.width = window.innerWidth + "px";
      c.style.height = window.innerHeight + "px";
      make();
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      tx += (mx - tx) * 0.05;
      ty += (my - ty) * 0.05;
      for (const s of stars) {
        const op = reduce ? s.o : s.o * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph));
        ctx.beginPath();
        ctx.fillStyle = s.g
          ? `rgba(120,222,182,${op})`
          : `rgba(226,235,238,${op})`;
        ctx.arc(s.x * W + tx * s.d * 15 * DPR, s.y * H + ty * s.d * 15 * DPR, s.r, 0, 6.2832);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    const onMove = (e: MouseEvent) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    };

    resize();
    window.addEventListener("resize", resize);
    if (!reduce) window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}
