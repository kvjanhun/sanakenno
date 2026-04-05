/**
 * Inline SVG icon components used across the game UI.
 *
 * All icons use `currentColor` for fill/stroke, so they inherit
 * the parent's text color and adapt to light/dark themes.
 *
 * @module src/components/icons
 */

/** Lightbulb icon for the hints toggle button. */
export function BulbIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1.15em"
      height="1.15em"
      viewBox="-1 -1 40 64"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      style={{ verticalAlign: '-0.15em', display: 'inline-block' }}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.6,48l20.6-3c0-6.5,8.8-14.6,8.8-25.6C38,8.7,29.5,0,19,0S0,8.7,0,19.4c0,10.9,8.6,19,8.6,25.5V48z" />
      <path d="M10,52.3l18.8-2.9" />
      <path d="M10,56.2l18.8-2.9" />
      <path d="M26.3,59.1c0,1.6-3.1,2.9-7,2.9s-7-1.3-7-2.9" />
      <path d="M16.4,40.8c0-12.4-3.5-16.8-3.5-16.8s1.4,3.1,3,3.1c1.7,0,3-1.4,3-3.1c0,1.7,1.4,3.1,3,3.1c1.7,0,3-3.1,3-3.1s-2.8,6.7-2.8,16.8" />
    </svg>
  );
}

/** Magnifying glass icon for the summary hint panel. */
export function SummaryIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 512 512"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      className="inline-block align-middle ml-1"
    >
      <path d="M332.998,291.918c52.2-71.895,45.941-173.338-18.834-238.123c-71.736-71.728-188.468-71.728-260.195,0c-71.746,71.745-71.746,188.458,0,260.204c64.775,64.775,166.218,71.034,238.104,18.844l14.222,14.203l40.916-40.916L332.998,291.918z M278.488,278.333c-52.144,52.134-136.699,52.144-188.852,0c-52.152-52.153-52.152-136.717,0-188.861c52.154-52.144,136.708-52.144,188.852,0C330.64,141.616,330.64,226.18,278.488,278.333z" />
      <path d="M109.303,119.216c-27.078,34.788-29.324,82.646-6.756,119.614c2.142,3.489,6.709,4.603,10.208,2.46c3.49-2.142,4.594-6.709,2.462-10.198v0.008c-19.387-31.7-17.45-72.962,5.782-102.771c2.526-3.228,1.946-7.898-1.292-10.405C116.48,115.399,111.811,115.979,109.303,119.216z" />
      <path d="M501.499,438.591L363.341,315.178l-47.98,47.98l123.403,138.168c12.548,16.234,35.144,13.848,55.447-6.456C514.505,474.576,517.743,451.138,501.499,438.591z" />
    </svg>
  );
}

/** Styled "A" text used as the letters hint panel icon. */
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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1.15em"
      height="1em"
      viewBox="0 0 20 14"
      fill="currentColor"
      stroke="currentColor"
      aria-hidden="true"
      className="inline-block align-middle ml-1"
    >
      <rect
        x="0.5"
        y="0.5"
        width="19"
        height="13"
        rx="1"
        fill="none"
        strokeWidth="1.3"
      />
      <line x1="4" y1="0.5" x2="4" y2="5" strokeWidth="1" />
      <line x1="8" y1="0.5" x2="8" y2="7.5" strokeWidth="1" />
      <line x1="12" y1="0.5" x2="12" y2="5" strokeWidth="1" />
      <line x1="16" y1="0.5" x2="16" y2="7.5" strokeWidth="1" />
    </svg>
  );
}

/** Styled "AB" text used as the pairs hint panel icon. */
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
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

/** Calendar icon for the archive button. */
export function CalendarIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/** Bar chart icon for the stats button. */
export function StatsIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      {/* Left bar — short */}
      <path d="M3.5 15H5.5Q7 15 7 16.5V22H2V16.5Q2 15 3.5 15Z" />
      {/* Center bar — tall */}
      <path d="M11 4H13Q14.5 4 14.5 5.5V22H9.5V5.5Q9.5 4 11 4Z" />
      {/* Right bar — medium */}
      <path d="M18.5 9H20.5Q22 9 22 10.5V22H17V10.5Q17 9 18.5 9Z" />
    </svg>
  );
}

/** Moon icon for the theme toggle (shown in light mode). */
export function MoonIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
