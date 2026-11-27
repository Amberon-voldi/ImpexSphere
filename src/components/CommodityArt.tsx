import { useId } from "react";

/**
 * Procedurally generated commodity artwork: a heap of seeds, pods or fingers
 * in the category colour. Deterministic per `seed`, so it never changes between renders.
 */
export default function CommodityArt({
  hue,
  shape,
  seed,
  density = 1,
  className = "art",
}: {
  hue: string;
  shape: string;
  seed: string;
  density?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let s = h >>> 0;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);

  const W = 400;
  const H = 300;
  const n = Math.round((shape === "round" ? 90 : shape === "seed" ? 110 : 34) * density);
  const pieces = Array.from({ length: n }, () => {
    // Bias pieces toward a mound at the bottom-right.
    const x = rnd() * W * 1.1 - 20;
    const mound = H * 0.25 + Math.pow(Math.abs(x - W * 0.62) / W, 1.4) * H * 0.9;
    const y = mound + rnd() * (H - mound + 40);
    return {
      x,
      y,
      r: rnd() * 360,
      k: 0.7 + rnd() * 0.7,
      l: rnd(),
    };
  }).sort((a, b) => a.y - b.y);

  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id={`bg${uid}`} cx="70%" cy="85%" r="90%">
          <stop offset="0" stopColor={hue} stopOpacity="0.55" />
          <stop offset="0.5" stopColor={hue} stopOpacity="0.12" />
          <stop offset="1" stopColor="#050a17" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`p${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.35" stopColor={hue} />
          <stop offset="1" stopColor="#000" stopOpacity="0.85" />
        </linearGradient>
        <filter id={`sh${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>
      <rect width={W} height={H} fill="#0a1328" />
      <rect width={W} height={H} fill={`url(#bg${uid})`} />
      <g filter={`url(#sh${uid})`}>
        {pieces.map((p, i) => (
          <g
            key={i}
            transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.r.toFixed(0)}) scale(${p.k.toFixed(2)})`}
            opacity={0.55 + p.l * 0.45}
          >
            <Piece shape={shape} fill={`url(#p${uid})`} hue={hue} light={p.l} />
          </g>
        ))}
      </g>
    </svg>
  );
}

function Piece({ shape, fill, hue, light }: { shape: string; fill: string; hue: string; light: number }) {
  switch (shape) {
    case "finger":
      return (
        <g>
          <path d="M-26 -5 C-18 -12 4 -10 18 -8 C28 -7 30 4 20 7 C6 10 -16 11 -26 5 C-31 2 -31 -2 -26 -5Z" fill={fill} />
          <path d="M-12 -9 C-13 -3 -12 4 -11 9 M2 -9 C1 -3 2 4 3 9" stroke="#000" strokeOpacity="0.25" fill="none" />
          <path d="M6 -8 C10 -18 18 -20 22 -16 C24 -12 18 -9 12 -7Z" fill={fill} />
        </g>
      );
    case "pod":
      return (
        <g>
          <path d="M-34 0 C-24 -10 6 -12 26 -6 C34 -4 36 2 30 4 C10 10 -20 8 -34 0Z" fill={fill} />
          <path d="M-34 0 C-38 -2 -42 -6 -40 -10" stroke={hue} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
          <path d="M-20 -3 C-4 -6 14 -5 26 -2" stroke="#fff" strokeOpacity={0.15 + light * 0.25} strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case "seed":
      return (
        <g>
          <ellipse rx="10" ry="3.2" fill={fill} />
          <path d="M-8 0 H8 M-7 -1.6 H7 M-7 1.6 H7" stroke="#000" strokeOpacity="0.25" strokeWidth="0.6" />
        </g>
      );
    default:
      return (
        <g>
          <circle r="7" fill={fill} />
          <circle cx="-2.2" cy="-2.4" r="2" fill="#fff" opacity={0.15 + light * 0.3} />
        </g>
      );
  }
}
