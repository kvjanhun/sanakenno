import { useMemo, useState, useEffect, useRef } from 'react';

/** Props for the Honeycomb SVG letter grid component. */
export interface HoneycombProps {
  /** The center letter of the puzzle. */
  center: string;
  /** The six outer letters surrounding the center. */
  outerLetters: string[];
  /** Index of the currently pressed hex, or null if none. */
  pressedHexIndex: number | null;
  /** Increments each time a word is found correctly; triggers a ripple animation. */
  rippleKey?: number;
  /** When true, pointer interactions are disabled (e.g. all words found). */
  disabled?: boolean;
  /** Called when a letter is pressed. */
  onLetterPress: (letter: string) => void;
  /** Called on pointer down with the hex index. */
  onHexDown: (index: number) => void;
  /** Called on pointer up or pointer leave. */
  onHexUp: () => void;
}

interface HexCell {
  x: number;
  y: number;
  letter: string;
  isCenter: boolean;
}

/**
 * Generates the six vertices of a pointy-top hexagon as an SVG points string.
 * @param cx - Center x coordinate.
 * @param cy - Center y coordinate.
 * @param r - Circumradius of the hexagon.
 * @returns SVG-compatible points string for a polygon element.
 */
function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(
      `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return pts.join(' ');
}

/**
 * Computes the seven hex cell positions in a flower/honeycomb layout.
 * Uses pointy-top hexagons with circumradius 50 on a 300x300 grid.
 * @param center - The center letter.
 * @param outerLetters - The six outer letters.
 * @returns Array of seven HexCell objects with positions and letters.
 */
function computeHexes(center: string, outerLetters: string[]): HexCell[] {
  const R = 50;
  const dx = R * Math.sqrt(3);
  const dy = R * 1.5;
  const cx = 150;
  const cy = 150;
  const ol = outerLetters;

  return [
    { x: cx - dx / 2, y: cy - dy, letter: ol[0] ?? '', isCenter: false },
    { x: cx + dx / 2, y: cy - dy, letter: ol[1] ?? '', isCenter: false },
    { x: cx - dx, y: cy, letter: ol[2] ?? '', isCenter: false },
    { x: cx, y: cy, letter: center, isCenter: true },
    { x: cx + dx, y: cy, letter: ol[3] ?? '', isCenter: false },
    { x: cx - dx / 2, y: cy + dy, letter: ol[4] ?? '', isCenter: false },
    { x: cx + dx / 2, y: cy + dy, letter: ol[5] ?? '', isCenter: false },
  ];
}

/**
 * Honeycomb SVG component rendering a flower-pattern letter grid.
 * Displays seven pointy-top hexagons: one center (accent-colored) and six outer.
 * Supports press feedback via scale transform and pointer event callbacks.
 */
export function Honeycomb({
  center,
  outerLetters,
  pressedHexIndex,
  rippleKey = 0,
  disabled = false,
  onLetterPress,
  onHexDown,
  onHexUp,
}: HoneycombProps) {
  const hexes = useMemo(
    () => computeHexes(center, outerLetters),
    [center, outerLetters],
  );

  // Ripple animation: expand a circle from the center hex on each correct word.
  const [rippleRadius, setRippleRadius] = useState<number | null>(null);
  const rippleRafRef = useRef<number | undefined>(undefined);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip ripple on initial mount (restoring saved state may have rippleKey > 0).
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (rippleRafRef.current !== undefined)
      cancelAnimationFrame(rippleRafRef.current);
    const startTime = performance.now();
    const duration = 500;
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const radius = 30 + t * 125; // expands from 30 to 155
      setRippleRadius(t < 1 ? radius : null);
      if (t < 1) rippleRafRef.current = requestAnimationFrame(step);
    };
    rippleRafRef.current = requestAnimationFrame(step);
    return () => {
      if (rippleRafRef.current !== undefined)
        cancelAnimationFrame(rippleRafRef.current);
    };
  }, [rippleKey]);

  const ariaLabel = `Kirjainkenno: kirjaimet ${hexes.map((h) => h.letter.toUpperCase()).join(', ')}, keskuskirjain ${center.toUpperCase()}`;

  return (
    <svg
      viewBox="18 18 264 264"
      width="264"
      height="264"
      role="img"
      aria-label={ariaLabel}
      className="select-none"
      style={{
        touchAction: 'none',
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))',
      }}
      onTouchMove={(e) => e.preventDefault()}
    >
      {hexes.map((hex, i) => (
        <g
          key={i}
          aria-hidden="true"
          style={{ cursor: disabled ? 'default' : 'pointer' }}
          onPointerDown={
            disabled
              ? undefined
              : () => {
                  onHexDown(i);
                  onLetterPress(hex.letter);
                }
          }
          onPointerUp={disabled ? undefined : onHexUp}
          onPointerLeave={disabled ? undefined : onHexUp}
        >
          <polygon
            points={hexPoints(hex.x, hex.y, 47)}
            style={{
              fill: hex.isCenter
                ? 'var(--color-accent)'
                : 'var(--color-bg-secondary)',
              stroke: hex.isCenter
                ? 'var(--color-accent)'
                : 'var(--color-border)',
              strokeWidth: '1.5',
              transform: pressedHexIndex === i ? 'scale(0.92)' : 'scale(1)',
              transformOrigin: `${hex.x}px ${hex.y}px`,
              opacity: pressedHexIndex === i ? 0.78 : 1,
              transition: 'transform 0.08s ease, opacity 0.08s ease',
            }}
          />
          <text
            x={hex.x}
            y={hex.y}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fill: hex.isCenter ? '#ffffff' : 'var(--color-text-primary)',
              fontSize: '24px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {hex.letter.toUpperCase()}
          </text>
        </g>
      ))}
      {/* Expanding ring on each correct word */}
      {rippleRadius !== null && (
        <circle
          cx={150}
          cy={150}
          r={rippleRadius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          opacity={(155 - rippleRadius) / 125}
          aria-hidden="true"
        />
      )}
    </svg>
  );
}
