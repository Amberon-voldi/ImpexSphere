"use client";

import createGlobe from "cobe";
import { useSpring } from "motion/react";
import { useEffect, useRef } from "react";

// Indian sourcing hubs (gold) and destination ports (white).
const origins: [number, number][] = [
  [11.34, 77.72], // Erode
  [16.3, 80.45], // Guntur
  [23.79, 72.39], // Unjha
  [9.93, 76.26], // Kochi
  [18.67, 78.09], // Nizamabad
  [26.24, 73.02], // Jodhpur
  [25.18, 75.83], // Kota
];
const ports: [number, number][] = [
  [25.0, 55.06], // Jebel Ali
  [51.92, 4.48], // Rotterdam
  [53.55, 9.99], // Hamburg
  [29.76, -95.36], // Houston
  [3.0, 101.39], // Port Klang
  [6.93, 79.85], // Colombo
  [26.43, 50.1], // Dammam
  [33.57, -7.59], // Casablanca
  [1.26, 103.84], // Singapore
  [35.44, 139.64], // Yokohama
  [51.5, -0.12], // London
];

export default function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const drag = useSpring(0, { stiffness: 140, damping: 40, mass: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = canvas.offsetWidth;
    let phi = 4.6; // start facing India / Middle East
    const onResize = () => (width = canvas.offsetWidth);
    window.addEventListener("resize", onResize);

    let t = 0;
    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi,
      theta: 0.28,
      dark: 1,
      diffuse: 1.4,
      mapSamples: 22000,
      mapBrightness: 5.5,
      mapBaseBrightness: 0.02,
      baseColor: [0.12, 0.17, 0.32],
      markerColor: [0.98, 0.78, 0.4],
      glowColor: [0.32, 0.36, 0.55],
      markers: [
        ...origins.map((location) => ({ location, size: 0.06 })),
        ...ports.map((location) => ({ location, size: 0.035, color: [0.9, 0.93, 1] as [number, number, number] })),
      ],
      onRender: (state) => {
        t += 1;
        if (pointer.current === null && !reduce) phi += 0.0026;
        state.phi = phi + drag.get();
        state.theta = 0.28 + Math.sin(t / 240) * 0.04;
        state.width = width * 2;
        state.height = width * 2;
        // Pulse the origin markers.
        const k = 0.05 + Math.sin(t / 18) * 0.015;
        state.markers = [
          ...origins.map((location) => ({ location, size: k })),
          ...ports.map((location) => ({ location, size: 0.032, color: [0.9, 0.93, 1] as [number, number, number] })),
        ];
      },
    });
    const ready = setTimeout(() => canvas.classList.add("ready"), 60);
    return () => {
      clearTimeout(ready);
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [drag]);

  return (
    <div className="globe-wrap">
      <div className="globe-halo" />
      <div className="globe-ring" />
      <div className="globe-ring r2" />
      <canvas
        ref={canvasRef}
        aria-label="Globe showing Indian sourcing hubs and destination ports"
        role="img"
        onPointerDown={(e) => {
          pointer.current = e.clientX - drag.get() * 200;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerUp={() => (pointer.current = null)}
        onPointerCancel={() => (pointer.current = null)}
        onPointerMove={(e) => {
          if (pointer.current !== null) drag.set((e.clientX - pointer.current) / 200);
        }}
      />
    </div>
  );
}
