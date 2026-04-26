/**
 * Icon components — thin wrappers around Lucide React.
 *
 * All inherit `currentColor` from the parent element, adapting to
 * light/dark themes automatically.
 *
 * Existing export names are preserved so all importers need no changes.
 *
 * @module src/components/icons
 */

import {
  Lightbulb,
  Search,
  BarChart2,
  CircleHelp,
  Sun,
  Calendar,
  Moon,
  User,
  UserCheck,
  Copy,
  Eye,
} from 'lucide-react';

const HEADER_SIZE = 20;
const INLINE_SIZE = '1em';
/** Stroke weight for standalone icons — slightly bolder than Lucide default. */
const SW = 2.5;

/** Lightbulb icon for the hints toggle button. */
export function BulbIcon(): React.JSX.Element {
  return (
    <Lightbulb
      size={INLINE_SIZE}
      strokeWidth={SW}
      aria-hidden="true"
      style={{
        verticalAlign: '-0.15em',
        display: 'inline-block',
        marginLeft: '0.25em',
      }}
    />
  );
}

/** Magnifying glass icon for the summary hint panel. */
export function SummaryIcon(): React.JSX.Element {
  return (
    <Search
      size={INLINE_SIZE}
      strokeWidth={SW}
      aria-hidden="true"
      className="inline-block align-middle ml-1"
    />
  );
}

/** Styled "A" text for the letters hint panel — no icon equivalent. */
export function LettersIcon(): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="inline-block ml-1"
      style={{
        fontWeight: 450,
        fontSize: '1.1em',
        lineHeight: 1,
        verticalAlign: 'baseline',
      }}
    >
      A
    </span>
  );
}

/** Bar chart icon for the distribution hint panel. */
export function DistributionIcon(): React.JSX.Element {
  return (
    <BarChart2
      size={INLINE_SIZE}
      strokeWidth={SW}
      aria-hidden="true"
      className="inline-block align-middle ml-1"
    />
  );
}

/** Styled "AB" text for the pairs hint panel — no icon equivalent. */
export function PairsIcon(): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="inline-block ml-1"
      style={{
        fontWeight: 450,
        fontSize: '1.1em',
        lineHeight: 1,
        verticalAlign: 'baseline',
      }}
    >
      AB
    </span>
  );
}

/** Sun icon for the theme toggle (shown in dark mode). */
export function SunIcon(): React.JSX.Element {
  return <Sun size={HEADER_SIZE} strokeWidth={SW} aria-hidden="true" />;
}

/** Calendar icon for the archive button. */
export function CalendarIcon(): React.JSX.Element {
  return <Calendar size={HEADER_SIZE} strokeWidth={SW} aria-hidden="true" />;
}

/** Bar chart icon for the stats button. */
export function StatsIcon(): React.JSX.Element {
  return <BarChart2 size={HEADER_SIZE} strokeWidth={3} aria-hidden="true" />;
}

/** Moon icon for the theme toggle (shown in light mode). */
export function MoonIcon(): React.JSX.Element {
  return <Moon size={HEADER_SIZE} strokeWidth={SW} aria-hidden="true" />;
}

/** Circle with question mark for the rules button. */
export function CircleHelpIcon(): React.JSX.Element {
  return <CircleHelp size={HEADER_SIZE} strokeWidth={SW} aria-hidden="true" />;
}

/** User icon for the auth button. Shows a checkmark variant when logged in. */
export function UserIcon({
  loggedIn,
}: {
  loggedIn?: boolean;
}): React.JSX.Element {
  return loggedIn ? (
    <UserCheck size={HEADER_SIZE} strokeWidth={SW} aria-hidden="true" />
  ) : (
    <User size={HEADER_SIZE} strokeWidth={SW} aria-hidden="true" />
  );
}

/**
 * Copy icon for the share button.
 * Stroke weight matches regular-weight body text rather than the bolder icons.
 */
export function CopyIcon(): React.JSX.Element {
  return <Copy size={14} strokeWidth={1.5} aria-hidden="true" />;
}

/** Eye icon used to flag puzzles whose answers have been revealed. */
export function EyeIcon(): React.JSX.Element {
  return <Eye size={14} strokeWidth={2} aria-hidden="true" />;
}
