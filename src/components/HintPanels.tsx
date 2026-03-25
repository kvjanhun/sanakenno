/**
 * Four individually unlockable hint panels that help players find
 * remaining words. Unlock state persists via the Zustand store
 * (localStorage); collapse state is session-only (React local state).
 *
 * Panels: summary, letters, distribution, pairs.
 *
 * @module src/components/HintPanels
 */

import { useState, useCallback } from 'react';
import { useHintData } from '../hooks/useHintData.js';
import type { DerivedHintData } from '../hooks/useHintData.js';
import {
  BulbIcon,
  SummaryIcon,
  LettersIcon,
  DistributionIcon,
  PairsIcon,
} from './icons.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface HintPanelsProps {
  /** Set of unlocked hint IDs from the store. */
  hintsUnlocked: Set<string>;
  /** Unlock a hint panel. */
  onUnlock: (id: string) => void;
}

/** Hint panel configuration. */
interface PanelConfig {
  id: string;
  label: string;
  Icon: () => React.JSX.Element;
}

const PANELS: PanelConfig[] = [
  { id: 'summary', label: 'Yleiskuva', Icon: SummaryIcon },
  { id: 'letters', label: 'Alkukirjaimet', Icon: LettersIcon },
  { id: 'distribution', label: 'Pituusjakauma', Icon: DistributionIcon },
  { id: 'pairs', label: 'Alkuparit', Icon: PairsIcon },
];

/* ------------------------------------------------------------------ */
/*  Sub-components: panel content renderers                            */
/* ------------------------------------------------------------------ */

function SummaryContent({ data }: { data: DerivedHintData }): React.JSX.Element {
  if (data.wordsRemaining === 0) {
    return (
      <div style={{ color: 'var(--color-accent)' }}>kaikki löydetty</div>
    );
  }

  const pct = Math.round((data.wordsFound / data.wordCount) * 100);
  const { pangramStats } = data;
  const pangramLabel =
    pangramStats.total === 1 ? 'pangrammi' : 'pangrammia';

  const unfoundLengths = data.lengthDistribution.filter(
    (e) => e.remaining > 0,
  );
  const uniqueCount = unfoundLengths.length;
  const longest = unfoundLengths.length > 0
    ? Math.max(...unfoundLengths.map((e) => e.len))
    : 0;
  const lengthLabel = uniqueCount === 1 ? 'sanapituus' : 'sanapituutta';

  return (
    <div style={{ fontFamily: 'var(--font-mono)' }}>
      <div>
        <span style={{ color: 'var(--color-text-primary)' }}>
          {data.wordsRemaining}/{data.wordCount} sanaa jäljellä{' '}
        </span>
        <span style={{ color: 'var(--color-text-secondary)' }}>
          ({pct}%) &middot; {pangramStats.remaining}/{pangramStats.total}{' '}
          {pangramLabel}
        </span>
      </div>
      <div style={{ color: 'var(--color-text-secondary)' }}>
        {uniqueCount} eri {lengthLabel} &middot; Pisin sana{' '}
        {longest}&nbsp;merkkiä
      </div>
    </div>
  );
}

function LettersContent({
  data,
}: {
  data: DerivedHintData;
}): React.JSX.Element {
  return (
    <div
      className="flex flex-wrap gap-x-3 gap-y-0.5"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {data.letterMap.map((item) => (
        <span
          key={item.letter}
          className="text-sm"
          style={{
            color:
              item.remaining === 0
                ? 'var(--color-text-tertiary)'
                : 'var(--color-text-primary)',
          }}
        >
          {item.letter.toUpperCase()}&nbsp;{item.remaining}
        </span>
      ))}
    </div>
  );
}

function DistributionContent({
  data,
}: {
  data: DerivedHintData;
}): React.JSX.Element {
  return (
    <div
      className="flex flex-wrap gap-x-4 gap-y-0.5"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {data.lengthDistribution.map((item) => (
        <span
          key={item.len}
          className="text-sm"
          style={{
            color:
              item.remaining === 0
                ? 'var(--color-text-tertiary)'
                : 'var(--color-text-primary)',
          }}
        >
          {item.len}: {item.remaining}
        </span>
      ))}
    </div>
  );
}

function PairsContent({
  data,
}: {
  data: DerivedHintData;
}): React.JSX.Element {
  return (
    <div
      className="flex flex-wrap gap-x-3 gap-y-0.5"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {data.pairMap.map((item) => (
        <span
          key={item.pair}
          className="text-sm"
          style={{
            color:
              item.remaining === 0
                ? 'var(--color-text-tertiary)'
                : 'var(--color-text-primary)',
          }}
        >
          {item.pair.toUpperCase()}&nbsp;{item.remaining}
        </span>
      ))}
    </div>
  );
}

/** Map panel ID to its content renderer. */
const PANEL_CONTENT: Record<
  string,
  (props: { data: DerivedHintData }) => React.JSX.Element
> = {
  summary: SummaryContent,
  letters: LettersContent,
  distribution: DistributionContent,
  pairs: PairsContent,
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

/**
 * Collapsible hint panels section with per-panel unlock and collapse.
 */
export function HintPanels({
  hintsUnlocked,
  onUnlock,
}: HintPanelsProps): React.JSX.Element | null {
  const hintData = useHintData();
  const [showHints, setShowHints] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (!hintData) return null;

  return (
    <div className="mb-2" style={{ scrollMarginTop: '6rem' }}>
      <button
        className="text-sm font-medium"
        style={{
          color: 'var(--color-text-secondary)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
        onClick={() => setShowHints((v) => !v)}
        aria-expanded={showHints}
      >
        <BulbIcon /> Avut {showHints ? '\u25B2' : '\u25BC'}
      </button>

      {showHints && (
        <div
          className="mt-2 p-3 rounded-lg text-sm space-y-3"
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          {PANELS.map((panel) => {
            const isUnlocked = hintsUnlocked.has(panel.id);
            const isCollapsed = collapsed.has(panel.id);
            const ContentComponent = PANEL_CONTENT[panel.id];

            return (
              <div key={panel.id}>
                {/* Panel header */}
                <div
                  className="flex items-center justify-between mb-1"
                  style={{ cursor: isUnlocked ? 'pointer' : undefined }}
                  onClick={
                    isUnlocked
                      ? () => toggleCollapse(panel.id)
                      : undefined
                  }
                >
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {panel.label} <panel.Icon />
                  </span>

                  {!isUnlocked ? (
                    <button
                      className="text-xs px-2 py-0.5 rounded border-none cursor-pointer"
                      style={{
                        background: 'var(--color-accent)',
                        color: 'white',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnlock(panel.id);
                      }}
                    >
                      Aktivoi
                    </button>
                  ) : (
                    <span
                      className="text-xs"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {isCollapsed ? '\u25BC' : '\u25B2'}
                    </span>
                  )}
                </div>

                {/* Panel content */}
                {isUnlocked && !isCollapsed && (
                  <ContentComponent data={hintData} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
