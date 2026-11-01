import Link from "next/link";
import { useId, type ReactNode } from "react";

/** Shared top bar of the inner pages. */
export function PageHeader({
  backHref,
  backLabel,
  title,
  subtitle,
}: {
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <header className="flex flex-col gap-1 px-4 pb-3 pt-2">
      {backHref && (
        <Link href={backHref} className="flex min-h-11 items-center self-start text-sm font-bold">
          ← {backLabel}
        </Link>
      )}
      {title && <h1 className="font-display text-4xl uppercase text-comic-yellow">{title}</h1>}
      {subtitle && <p className="text-sm font-semibold text-muted">{subtitle}</p>}
    </header>
  );
}

const BURST_POINTS =
  "50,0 59.3,15.2 75,6.7 75.5,24.5 93.3,25 84.8,40.7 100,50 84.8,59.3 93.3,75 75.5,75.5 75,93.3 59.3,84.8 50,100 40.7,84.8 25,93.3 24.5,75.5 6.7,75 15.2,59.3 0,50 15.2,40.7 6.7,25 24.5,24.5 25,6.7 40.7,15.2";

/** Comic explosion with an onomatopoeia inside. */
export function ComicBurst({
  fill,
  className,
  textClassName,
  children,
}: {
  fill: string;
  className: string;
  textClassName: string;
  children: ReactNode;
}) {
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <polygon points={BURST_POINTS} fill={fill} stroke="#000" strokeWidth={3} />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-sfx text-black ${textClassName}`}>
        {children}
      </span>
    </div>
  );
}

const PACK_OUTLINE =
  "M10 16 20 6 30 16 40 6 50 16 60 6 70 16 80 6 90 16 100 6 110 16 120 6 130 16 140 6 150 16 160 6 170 16 180 6 190 16V264L180 274 170 264 160 274 150 264 140 274 130 264 120 274 110 264 100 274 90 264 80 274 70 264 60 274 50 264 40 274 30 264 20 274 10 264Z";

/** The foil pack, with the Ω on a halftone band. */
export function PackArt({
  body,
  omega,
  className,
  shine = false,
}: {
  body: string;
  omega: string;
  className: string;
  shine?: boolean;
}) {
  const dots = useId();
  const outline = useId();
  return (
    <svg viewBox="0 0 200 280" className={className} aria-hidden>
      <defs>
        <pattern id={dots} width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="2.4" fill="#000" fillOpacity="0.28" />
        </pattern>
        {shine && (
          <clipPath id={outline}>
            <path d={PACK_OUTLINE} />
          </clipPath>
        )}
      </defs>
      <path d={PACK_OUTLINE} fill={body} stroke="#000" strokeWidth="5" strokeLinejoin="round" />
      <path d="M13 210 187 120V261H13Z" fill="#16c8ff" />
      <path d="M13 210 187 120V261H13Z" fill={`url(#${dots})`} />
      <text
        x="100"
        y="172"
        textAnchor="middle"
        fontSize="136"
        fontWeight="700"
        fill={omega}
        stroke="#000"
        strokeWidth="5"
        paintOrder="stroke"
        style={{ fontFamily: "var(--display-font)" }}
      >
        Ω
      </text>
      <text x="100" y="56" textAnchor="middle" fontSize="30" fill="#000" style={{ fontFamily: "var(--display-font)" }}>
        O-MEGA
      </text>
      <text x="100" y="246" textAnchor="middle" fontSize="20" fill="#000" style={{ fontFamily: "var(--display-font)" }}>
        5 CARTE
      </text>
      {shine && (
        <g clipPath={`url(#${outline})`}>
          <rect className="pack-shine" x="-70" y="-20" width="50" height="320" fill="#fff" fillOpacity="0.5" />
        </g>
      )}
    </svg>
  );
}
