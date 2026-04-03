/**
 * Hint section with pill-button navigation and overlay content panel.
 *
 * Three visible tabs: Yleiskuva, Pituudet, Alkuparit.
 * Clicking a tab opens its content as an absolute overlay; clicking the active
 * tab closes it. Locked hints show a centered unlock button inside the panel.
 *
 * The "letters" panel (Alkukirjaimet) is kept in the content registry
 * but intentionally not shown in the tab row.
 *
 * @module src/components/HintPanels
 */

import { useState, useCallback } from 'react';
import { useHintData } from '../hooks/useHintData.js';
import type { DerivedHintData } from '../hooks/useHintData.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface HintPanelsProps {
  /** Set of unlocked hint IDs from the store. */
  hintsUnlocked: Set<string>;
  /** Unlock a hint panel. */
  onUnlock: (id: string) => void;
}

interface PanelConfig {
  id: string;
  label: string;
}

/** Tabs shown in the UI — letters is kept in code but not displayed. */
const VISIBLE_PANELS: PanelConfig[] = [
  { id: 'summary', label: 'Yleiskuva' },
  { id: 'distribution', label: 'Pituudet' },
  { id: 'pairs', label: 'Alkuparit' },
];

/* ------------------------------------------------------------------ */
/*  Panel content renderers                                            */
/* ------------------------------------------------------------------ */

function SummaryContent({
  data,
}: {
  data: DerivedHintData;
}): React.JSX.Element {
  if (data.wordsRemaining === 0) {
    return <div style={{ color: 'var(--color-accent)' }}>kaikki löydetty</div>;
  }

  const pct = Math.round((data.wordsFound / data.wordCount) * 100);
  const { pangramStats } = data;
  const pangramLabel = pangramStats.total === 1 ? 'pangrammi' : 'pangrammia';

  const unfoundLengths = data.lengthDistribution.filter((e) => e.remaining > 0);
  const uniqueCount = unfoundLengths.length;
  const longest =
    unfoundLengths.length > 0
      ? Math.max(...unfoundLengths.map((e) => e.len))
      : 0;
  const lengthLabel = uniqueCount === 1 ? 'sanapituus' : 'sanapituutta';

  return (
    <div>
      <div>
        <span style={{ color: 'var(--color-text-primary)' }}>
          {data.wordsRemaining}/{data.wordCount} sanaa löytämättä
        </span>{' '}
        <span style={{ color: 'var(--color-text-secondary)' }}>({pct}%)</span>
      </div>
      <div style={{ color: 'var(--color-text-secondary)' }}>
        {pangramStats.remaining}/{pangramStats.total} {pangramLabel}
        {' · '}
        {uniqueCount} eri {lengthLabel} jäljellä
      </div>
      <div style={{ color: 'var(--color-text-secondary)' }}>
        Pisin jäljellä oleva sana {longest}&nbsp;kirjainta
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
    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
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
    <div className="flex flex-col w-full">
      <span
        style={{
          fontSize: '0.7rem',
          lineHeight: 1,
          color: 'var(--color-text-tertiary)',
          textAlign: 'center',
          marginBottom: '9px',
        }}
      >
        Sanoja jäljellä
      </span>
      <div className="flex gap-1.5 w-full">
        {data.lengthDistribution.map((item) => {
          const done = item.remaining === 0;
          const fillPct = item.total > 0 ? (item.found / item.total) * 100 : 0;
          return (
            <div
              key={item.len}
              className="flex flex-col items-center"
              style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
            >
              <span
                style={{
                  fontSize: '0.65rem',
                  lineHeight: 1,
                  marginBottom: '2px',
                  color: done
                    ? 'var(--color-text-tertiary)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {item.remaining}
              </span>
              <div
                style={{
                  width: '100%',
                  height: '26px',
                  background: 'var(--color-bg-primary)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${fillPct}%`,
                    background: done
                      ? 'var(--color-text-tertiary)'
                      : 'var(--color-accent)',
                    transition: 'height 0.3s ease',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  lineHeight: 1,
                  marginTop: '2px',
                  color: done
                    ? 'var(--color-text-tertiary)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {item.len}
              </span>
            </div>
          );
        })}
      </div>
      <span
        style={{
          fontSize: '0.7rem',
          lineHeight: 1,
          color: 'var(--color-text-tertiary)',
          textAlign: 'center',
          marginTop: '5px',
        }}
      >
        Pituus, kirjainta
      </span>
    </div>
  );
}

function PairsContent({ data }: { data: DerivedHintData }): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
      {data.pairMap.map((item) => (
        <span
          key={item.pair}
          className="text-sm"
          style={{
            fontFamily: 'var(--font-mono)',
            color:
              item.remaining === 0
                ? 'var(--color-text-tertiary)'
                : 'var(--color-text-primary)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
            {item.pair.toUpperCase()}:{' '}
          </span>
          {item.remaining}
        </span>
      ))}
    </div>
  );
}

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
 * Pill-button hint section with in-flow content panel.
 * Three compact pill buttons; clicking opens/closes the panel below.
 * The content area always reserves its height so layout never shifts.
 * Locked panels show an unlock button instead of content.
 */
export function HintPanels({
  hintsUnlocked,
  onUnlock,
}: HintPanelsProps): React.JSX.Element | null {
  const hintData = useHintData();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const handleTabClick = useCallback((id: string) => {
    setActiveTab((prev) => (prev === id ? null : id));
  }, []);

  if (!hintData) return null;

  const ContentComponent = activeTab ? PANEL_CONTENT[activeTab] : null;
  const activeIsUnlocked = activeTab ? hintsUnlocked.has(activeTab) : false;

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Segmented control row */}
      <div className="flex items-center gap-2" style={{ padding: '4px 0' }}>
        <span
          className="text-sm"
          style={{
            color: 'var(--color-text-primary)',
            fontWeight: 500,
            flexShrink: 0,
            marginRight: '6px',
          }}
        >
          Avut
        </span>
        <div
          className="flex"
          style={{
            flex: 1,
            background: 'var(--color-bg-secondary)',
            borderRadius: '9px',
            padding: '3px',
            gap: '2px',
          }}
        >
          {VISIBLE_PANELS.map((panel) => {
            const isActive = activeTab === panel.id;
            return (
              <button
                key={panel.id}
                type="button"
                onClick={() => handleTabClick(panel.id)}
                className="text-sm"
                style={{
                  flex: 1,
                  padding: '6px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: isActive
                    ? 'var(--color-bg-primary)'
                    : 'transparent',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  color: isActive
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {panel.label}
              </button>
            );
          })}
        </div>
        {/* Unlock status bars */}
        <div className="flex gap-1">
          {VISIBLE_PANELS.map((panel) => (
            <div
              key={panel.id}
              style={{
                width: '4px',
                height: '14px',
                borderRadius: '2px',
                background: hintsUnlocked.has(panel.id)
                  ? 'var(--color-accent)'
                  : 'var(--color-border)',
                transition: 'background 0.2s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Content area — always takes its height to prevent layout shift */}
      <div
        className="text-sm"
        style={{
          height: '6.5rem',
          overflowY: 'auto',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {activeTab && (
          <div
            className="p-3"
            style={{
              height: '100%',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {activeIsUnlocked && ContentComponent ? (
              <ContentComponent data={hintData} />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <button
                  type="button"
                  className="px-4 py-1.5 rounded-lg border-none cursor-pointer text-sm font-medium"
                  style={{
                    background: 'var(--color-accent)',
                    color: 'white',
                  }}
                  onClick={() => onUnlock(activeTab)}
                >
                  Aktivoi apu
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
