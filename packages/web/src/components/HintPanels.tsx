/**
 * Hint section with pill-button navigation and revealable content panel.
 *
 * Three visible tabs: Yleiskuva, Pituudet, Alkuparit.
 * Clicking a tab opens its content in an attached panel; clicking the active
 * tab closes it. Locked hints show a teaser plus an unlock button.
 *
 * The "letters" panel (Alkukirjaimet) is kept in the content registry
 * but intentionally not shown in the tab row.
 *
 * @module src/components/HintPanels
 */

import { useState, useCallback } from 'react';
import { toColumns } from '@sanakenno/shared';
import { useHintData } from '../hooks/useHintData';
import type { DerivedHintData } from '../hooks/useHintData';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface HintPanelsProps {
  /** Set of unlocked hint IDs from the store. */
  hintsUnlocked: Set<string>;
  /** Unlock a hint panel. */
  onUnlock: (id: string) => void;
}

type VisiblePanelId = 'summary' | 'distribution' | 'pairs';

interface PanelConfig {
  id: VisiblePanelId;
  label: string;
  teaser: string;
}

/** Tabs shown in the UI — letters is kept in code but not displayed. */
const VISIBLE_PANELS: readonly PanelConfig[] = [
  {
    id: 'summary',
    label: 'Yleiskuva',
    teaser: 'Yhteenveto jäljellä olevista sanoista.',
  },
  {
    id: 'distribution',
    label: 'Pituudet',
    teaser: 'Jäljellä olevien sanojen pituudet.',
  },
  {
    id: 'pairs',
    label: 'Alkuparit',
    teaser: 'Jäljellä olevien sanojen alkukirjainparit.',
  },
];

const PANEL_MIN_HEIGHT = '7.6rem';
const PANEL_CONTENT_HEIGHT = '6rem';
const RESERVED_PANEL_SPACE = 'calc(7.6rem + 1px)';
const PAIRS_PER_COLUMN = 4;

/* ------------------------------------------------------------------ */
/*  Panel content renderers                                            */
/* ------------------------------------------------------------------ */

/** Compact stat chip used in the summary hint dashboard. */
function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div
      className="flex items-center gap-2"
      style={{
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: '999px',
        padding: '0.35rem 0.65rem',
      }}
    >
      <span
        style={{
          color: 'var(--color-text-tertiary)',
          fontSize: '0.74rem',
          fontWeight: 600,
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: 'var(--color-text-primary)',
          fontSize: '0.84rem',
          fontWeight: 600,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** Summary dashboard content for the overview hint. */
function SummaryContent({
  data,
}: {
  data: DerivedHintData;
}): React.JSX.Element {
  const pct = Math.round((data.wordsFound / data.wordCount) * 100);
  const { pangramStats } = data;
  const pangramLabel = 'Pangrammit';

  const unfoundLengths = data.lengthDistribution.filter((e) => e.remaining > 0);
  const uniqueCount = unfoundLengths.length;
  const longest =
    unfoundLengths.length > 0
      ? Math.max(...unfoundLengths.map((e) => e.len))
      : 0;
  const pangramValue = `${pangramStats.remaining}/${pangramStats.total}`;
  const lengthValue = `${uniqueCount} eri`;
  const longestValue = `${longest} kirj.`;

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex flex-wrap items-end gap-2">
        <div
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '1.35rem',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {data.wordsRemaining}/{data.wordCount}
        </div>
        <div
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '0.95rem',
            fontWeight: 500,
            lineHeight: 1.2,
          }}
        >
          sanaa löytämättä
        </div>
        <div
          style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '999px',
            color: 'var(--color-text-secondary)',
            fontSize: '0.74rem',
            fontWeight: 600,
            lineHeight: 1,
            padding: '0.3rem 0.5rem',
          }}
        >
          {pct}%
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <SummaryMetric label={pangramLabel} value={pangramValue} />
        <SummaryMetric label="Pituuksia" value={lengthValue} />
        <SummaryMetric label="Pisin" value={longestValue} />
      </div>
    </div>
  );
}

/** Remaining-count chips for the hidden letter-based hint. */
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
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '999px',
            color:
              item.remaining === 0
                ? 'var(--color-text-tertiary)'
                : 'var(--color-text-primary)',
            padding: '0.25rem 0.55rem',
          }}
        >
          {item.letter.toUpperCase()}&nbsp;{item.remaining}
        </span>
      ))}
    </div>
  );
}

/** Column chart showing how many words remain at each length. */
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
                  background:
                    'linear-gradient(180deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%)',
                  border: '1px solid var(--color-border)',
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

/** Compact multi-column list showing remaining words by two-letter prefix. */
function PairsContent({ data }: { data: DerivedHintData }): React.JSX.Element {
  const columns = toColumns(data.pairMap, PAIRS_PER_COLUMN);

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 w-full">
      {columns.map((column, index) => (
        <div key={`pairs-col-${index}`} className="flex flex-col gap-1">
          {column.map((item) => (
            <span
              key={item.pair}
              className="text-sm"
              style={{
                fontFamily: 'var(--font-mono)',
                color:
                  item.remaining === 0
                    ? 'var(--color-text-tertiary)'
                    : 'var(--color-text-primary)',
                fontSize: '0.95rem',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                {item.pair.toUpperCase()}:{' '}
              </span>
              {item.remaining}
            </span>
          ))}
        </div>
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

/** Locked hint state with a short teaser and activation button. */
function LockedHintState({
  panel,
  onUnlock,
}: {
  panel: PanelConfig;
  onUnlock: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 w-full md:flex-row md:items-center md:justify-between">
      <div className="flex-1">
        <div
          style={{
            color: 'var(--color-accent)',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            lineHeight: 1.2,
            marginBottom: '0.35rem',
            textTransform: 'uppercase',
          }}
        >
          {panel.label}
        </div>
        <div
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.88rem',
            lineHeight: 1.35,
            maxWidth: '34rem',
          }}
        >
          {panel.teaser}
        </div>
      </div>

      <button
        type="button"
        className="rounded-xl cursor-pointer px-4 py-2 text-sm font-semibold"
        style={{
          background: 'var(--color-accent)',
          border: '1px solid var(--color-accent-faded)',
          boxShadow:
            '0 2px 5px -4px var(--color-button-shadow), 0 10px 20px -16px var(--color-button-shadow)',
          color: 'var(--color-on-accent)',
          flexShrink: 0,
        }}
        onClick={onUnlock}
      >
        Aktivoi apu
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

/**
 * Hint section with a shared shell, segmented tabs, and a revealable content panel.
 * When closed, it still reserves the same layout space so the play area below never shifts.
 * Clicking an active tab closes the panel; locked panels show a teaser and unlock CTA.
 */
export function HintPanels({
  hintsUnlocked,
  onUnlock,
}: HintPanelsProps): React.JSX.Element | null {
  const hintData = useHintData();
  const [activeTab, setActiveTab] = useState<VisiblePanelId | null>(null);

  const handleTabClick = useCallback((id: VisiblePanelId) => {
    setActiveTab((prev) => (prev === id ? null : id));
  }, []);

  if (!hintData) return null;

  const ContentComponent = activeTab ? PANEL_CONTENT[activeTab] : null;
  const activeIsUnlocked = activeTab ? hintsUnlocked.has(activeTab) : false;
  const activePanel = activeTab
    ? (VISIBLE_PANELS.find((panel) => panel.id === activeTab) ?? null)
    : null;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        className="relative overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%)',
          border: '1px solid var(--color-border)',
          borderRadius: '18px',
          boxShadow:
            '0 4px 10px -8px var(--color-button-shadow), 0 18px 28px -26px var(--color-button-shadow)',
        }}
      >
        <div
          className="relative flex items-center gap-2"
          style={{ padding: '0.8rem 0.85rem' }}
        >
          <span
            className="text-sm"
            style={{
              color: 'var(--color-text-primary)',
              fontWeight: 700,
              flexShrink: 0,
              marginRight: '0.35rem',
            }}
          >
            Avut
          </span>

          <div
            className="flex"
            style={{
              flex: 1,
              background:
                'linear-gradient(180deg, var(--color-bg-secondary) 0%, var(--color-bg-primary) 100%)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '4px',
              gap: '2px',
            }}
          >
            {VISIBLE_PANELS.map((panel) => {
              const isActive = activeTab === panel.id;
              const isUnlocked = hintsUnlocked.has(panel.id);
              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => handleTabClick(panel.id)}
                  aria-pressed={isActive}
                  className="relative text-sm"
                  style={{
                    flex: 1,
                    padding: '0.62rem 0.85rem 0.75rem',
                    borderRadius: '9px',
                    border: 'none',
                    background: isActive
                      ? 'linear-gradient(180deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%)'
                      : 'transparent',
                    boxShadow: isActive
                      ? '0 2px 6px -5px var(--color-button-shadow)'
                      : 'none',
                    color: isActive
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {panel.label}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute"
                    style={{
                      left: '18%',
                      right: '18%',
                      bottom: '0.34rem',
                      height: '3px',
                      borderRadius: '999px',
                      background: isUnlocked
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? 'scaleX(1)' : 'scaleX(0.45)',
                      transition: 'transform 0.15s ease, opacity 0.15s ease',
                    }}
                  />
                </button>
              );
            })}
          </div>

          <div
            className="flex items-center gap-1.5"
            style={{
              background:
                'linear-gradient(180deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%)',
              border: '1px solid var(--color-border)',
              borderRadius: '999px',
              flexShrink: 0,
              minHeight: '2.1rem',
              padding: '0.45rem 0.5rem',
            }}
          >
            {VISIBLE_PANELS.map((panel) => {
              const isActive = activeTab === panel.id;
              const isUnlocked = hintsUnlocked.has(panel.id);

              return (
                <div
                  key={panel.id}
                  style={{
                    width: '5px',
                    height: '1.35rem',
                    borderRadius: '999px',
                    background: isUnlocked
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                    boxShadow: isActive
                      ? '0 0 0 1px var(--color-accent-faded)'
                      : 'none',
                    opacity: isUnlocked || isActive ? 1 : 0.7,
                    transform: isActive ? 'scaleY(1.02)' : 'none',
                    transition: 'background 0.2s ease, transform 0.2s ease',
                  }}
                />
              );
            })}
          </div>
        </div>

        {activeTab && (
          <div
            className="relative overflow-hidden text-sm"
            style={{
              borderTop: '1px solid var(--color-border)',
              fontFamily: 'var(--font-sans)',
              height: PANEL_MIN_HEIGHT,
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, var(--color-bg-secondary) 0%, var(--color-bg-primary) 100%)',
              }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(30deg, var(--color-border) 12%, transparent 12.5%, transparent 87%, var(--color-border) 87.5%, var(--color-border)), linear-gradient(150deg, var(--color-border) 12%, transparent 12.5%, transparent 87%, var(--color-border) 87.5%, var(--color-border)), linear-gradient(90deg, var(--color-border) 2%, transparent 2.5%, transparent 97%, var(--color-border) 97.5%, var(--color-border))',
                backgroundPosition: '0 0, 0 0, 15px 8.5px',
                backgroundSize: '30px 17px',
                opacity: 0.09,
              }}
            />
            <div
              className="relative z-10"
              style={{
                height: PANEL_MIN_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                padding: '0.95rem 1rem 1rem',
              }}
            >
              {activeIsUnlocked && ContentComponent ? (
                <div
                  style={{
                    height: PANEL_CONTENT_HEIGHT,
                    overflowY: 'auto',
                    width: '100%',
                  }}
                >
                  <ContentComponent data={hintData} />
                </div>
              ) : (
                activePanel && (
                  <LockedHintState
                    panel={activePanel}
                    onUnlock={() => onUnlock(activePanel.id)}
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>

      {!activeTab && (
        <div aria-hidden="true" style={{ height: RESERVED_PANEL_SPACE }} />
      )}
    </div>
  );
}
