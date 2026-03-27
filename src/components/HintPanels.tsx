/**
 * Hint section with tab-based navigation.
 *
 * Three visible tabs: Yleiskuva, Pituudet, Alkuparit.
 * Clicking a tab opens its content box below; clicking the active tab closes it.
 * Locked hints show a centered unlock button inside the content box.
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
          {data.wordsRemaining}/{data.wordCount} sanaa jäljellä
        </span>{' '}
        <span style={{ color: 'var(--color-text-secondary)' }}>({pct}%)</span>
      </div>
      <div style={{ color: 'var(--color-text-secondary)' }}>
        {pangramStats.remaining}/{pangramStats.total} {pangramLabel}
        {' · '}
        {uniqueCount} eri {lengthLabel}
        {' · '}
        pisin {longest}&nbsp;kirjainta
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
          fontSize: '0.6rem',
          lineHeight: 1,
          color: 'var(--color-text-tertiary)',
          textAlign: 'center',
          marginBottom: '4px',
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
              style={{ flex: 1 }}
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
          fontSize: '0.6rem',
          lineHeight: 1,
          color: 'var(--color-text-tertiary)',
          textAlign: 'center',
          marginTop: '4px',
        }}
      >
        Pituus, kirjainta
      </span>
    </div>
  );
}

function PairsContent({ data }: { data: DerivedHintData }): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
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
          <span style={{ fontWeight: 500 }}>{item.pair.toUpperCase()}:</span>{' '}
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
 * Tab-based hint section. Three full-width tabs; clicking opens/closes the panel below.
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

  // Round the top corners of the content box that are not covered by the active tab.
  const activeIdx = VISIBLE_PANELS.findIndex((p) => p.id === activeTab);
  const contentRadius =
    activeIdx === 0
      ? '0 6px 6px 6px'
      : activeIdx === VISIBLE_PANELS.length - 1
        ? '6px 0 6px 6px'
        : '6px';

  function tabStyle(isActive: boolean): React.CSSProperties {
    return {
      flex: 1,
      padding: '5px 8px',
      fontWeight: isActive ? 600 : 400,
      color: isActive
        ? 'var(--color-text-primary)'
        : 'var(--color-text-secondary)',
      background: isActive ? 'var(--color-bg-secondary)' : 'transparent',
      border: '1px solid',
      borderColor: isActive ? 'var(--color-border)' : 'transparent',
      borderBottomColor: isActive ? 'var(--color-bg-secondary)' : 'transparent',
      borderRadius: '6px 6px 0 0',
      cursor: 'pointer',
      position: 'relative',
      top: '1px',
      zIndex: isActive ? 1 : 0,
    };
  }

  return (
    <div className="mb-2">
      {/* Tab row — tabs share full width; active tab shifted 1px down to merge with content border */}
      <div className="flex items-center" style={{ position: 'relative' }}>
        <span
          className="text-sm font-medium mr-10 pl-1"
          style={{ color: 'var(--color-text-primary)', flexShrink: 0 }}
        >
          Avut:
        </span>
        {VISIBLE_PANELS.map((panel) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => handleTabClick(panel.id)}
            className="text-sm"
            style={tabStyle(activeTab === panel.id)}
          >
            {panel.label}
          </button>
        ))}
      </div>

      {/* Content box — visible only when a tab is selected */}
      {activeTab && (
        <div
          className="p-3 text-sm"
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: contentRadius,
            position: 'relative',
            zIndex: 0,
            height: '6.5rem',
            overflowY: 'auto',
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
          }}
        >
          {activeIsUnlocked && ContentComponent ? (
            <ContentComponent data={hintData} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <button
                type="button"
                className="px-4 py-1.5 rounded-lg border-none cursor-pointer text-sm font-medium"
                style={{ background: 'var(--color-accent)', color: 'white' }}
                onClick={() => onUnlock(activeTab)}
              >
                Aktivoi apu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
