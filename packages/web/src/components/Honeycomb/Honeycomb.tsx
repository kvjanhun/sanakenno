import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  getHoneycombCenterOverlayStops,
  getHoneycombCenterOverlayVariant,
} from '@sanakenno/shared';
import { usePaletteStore } from '../../store/usePaletteStore';
import {
  resolveScheme,
  useThemePreferenceStore,
} from '../../store/useThemePreferenceStore';

/** Props for the Honeycomb SVG letter grid component. */
export interface HoneycombProps {
  /** The center letter of the puzzle. */
  center: string;
  /** The six outer letters surrounding the center. */
  outerLetters: string[];
  /** Index of the currently pressed hex, or null if none. */
  pressedHexIndex: number | null;
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
 * Generates the same pointy-top hexagon as an SVG path.
 * Used for non-interactive overlays so the main hex count stays unchanged.
 */
function hexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(
      `${(cx + r * Math.cos(angle)).toFixed(2)} ${(cy + r * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return `M ${pts.join(' L ')} Z`;
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
  disabled = false,
  onLetterPress,
  onHexDown,
  onHexUp,
}: HoneycombProps) {
  const hexes = useMemo(
    () => computeHexes(center, outerLetters),
    [center, outerLetters],
  );
  const themeId = usePaletteStore((s) => s.themeId);
  const preference = useThemePreferenceStore((s) => s.preference);
  const centerOverlayStops = useMemo(
    () =>
      getHoneycombCenterOverlayStops(
        getHoneycombCenterOverlayVariant(themeId, resolveScheme(preference)),
      ),
    [themeId, preference],
  );

  const ariaLabel = `Kirjainkenno: kirjaimet ${hexes.map((h) => h.letter.toUpperCase()).join(', ')}, keskuskirjain ${center.toUpperCase()}`;

  // Native non-passive touch listener to suppress iOS magnifier loupe.
  // React registers touch handlers as passive, so preventDefault() is ignored.
  const svgRef = useRef<SVGSVGElement>(null);
  const preventTouch = useCallback((e: TouchEvent) => e.preventDefault(), []);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('touchstart', preventTouch, { passive: false });
    el.addEventListener('touchmove', preventTouch, { passive: false });
    return () => {
      el.removeEventListener('touchstart', preventTouch);
      el.removeEventListener('touchmove', preventTouch);
    };
  }, [preventTouch]);

  return (
    <svg
      ref={svgRef}
      viewBox="18 18 264 264"
      width="264"
      height="264"
      role="img"
      aria-label={ariaLabel}
      style={{ touchAction: 'none' }}
    >
      <defs>
        <linearGradient id="hex-outer-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--color-hex-hi)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--color-hex-lo)' }} />
        </linearGradient>
        <linearGradient id="hex-center-overlay" x1="0" y1="0" x2="0" y2="1">
          {centerOverlayStops.map((stop) => (
            <stop
              key={stop.offset}
              offset={stop.offset}
              stopColor={stop.color}
              stopOpacity={stop.opacity}
            />
          ))}
        </linearGradient>
      </defs>
      {hexes.map((hex, i) => (
        <g
          key={i}
          aria-hidden="true"
          style={{ cursor: disabled ? 'default' : 'pointer' }}
          onPointerDown={
            disabled
              ? undefined
              : (e) => {
                  // Release implicit pointer capture so concurrent touches
                  // on other hexes fire on their own target elements.
                  (e.target as Element).releasePointerCapture(e.pointerId);
                  onHexDown(i);
                  onLetterPress(hex.letter);
                }
          }
          onPointerUp={disabled ? undefined : onHexUp}
          onPointerLeave={disabled ? undefined : onHexUp}
        >
          <polygon
            points={hexPoints(hex.x, hex.y, 46)}
            style={{
              fill: hex.isCenter
                ? 'var(--color-accent)'
                : 'url(#hex-outer-grad)',
              stroke: hex.isCenter
                ? 'var(--color-accent)'
                : 'var(--color-hex-stroke)',
              strokeWidth: '1.5',
              transform: pressedHexIndex === i ? 'scale(0.92)' : 'scale(1)',
              transformOrigin: `${hex.x}px ${hex.y}px`,
              opacity: pressedHexIndex === i ? 0.78 : 1,
              transition: 'transform 0.08s ease, opacity 0.08s ease',
            }}
          />
          {hex.isCenter && (
            <path
              d={hexPath(hex.x, hex.y, 46)}
              style={{
                fill: 'url(#hex-center-overlay)',
                pointerEvents: 'none',
              }}
            />
          )}
          <text
            x={hex.x}
            y={hex.y}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fill: hex.isCenter
                ? 'var(--color-on-accent)'
                : 'var(--color-text-primary)',
              fontSize: '24px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              pointerEvents: 'none',
            }}
          >
            {hex.letter.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}
