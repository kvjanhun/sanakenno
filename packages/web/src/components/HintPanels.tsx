/**
 * Hint section with segmented navigation and revealable content panel.
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

import { useCallback, useState } from 'react';
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

const CONTENT_HEIGHT_PX = 108;
const PANEL_SECTION_HEIGHT_PX = CONTENT_HEIGHT_PX + 1;
const RESERVED_PANEL_SPACE = `${PANEL_SECTION_HEIGHT_PX}px`;
const PANEL_INNER_HEIGHT_PX = CONTENT_HEIGHT_PX - 20;
const BAR_HEIGHT_PX = 26;
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
      className="flex items-center gap-1.5"
      style={{
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: '999px',
        padding: '5px 8px',
      }}
    >
      <span
        style={{
          color: 'var(--color-text-tertiary)',
          fontSize: '10.5px',
          fontWeight: 600,
          lineHeight: '13px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: 'var(--color-text-primary)',
          fontSize: '11.5px',
          fontWeight: 700,
          lineHeight: '14px',
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
  const pangramLabel = pangramStats.total === 1 ? 'Pangrammi' : 'Pangrammit';
  const unfoundLengths = data.lengthDistribution.filter((e) => e.remaining > 0);
  const uniqueCount = unfoundLengths.length;
  const longest =
    unfoundLengths.length > 0
      ? Math.max(...unfoundLengths.map((e) => e.len))
      : 0;
  const allFound = data.wordsRemaining === 0;
  const primaryColor = allFound
    ? 'var(--color-text-tertiary)'
    : 'var(--color-text-primary)';
  const secondaryColor = allFound
    ? 'var(--color-text-tertiary)'
    : 'var(--color-text-secondary)';

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap items-center gap-1.5">
        <div
          style={{
            color: primaryColor,
            fontSize: '16px',
            fontWeight: 700,
            lineHeight: '20px',
          }}
        >
          {data.wordsRemaining}/{data.wordCount}
        </div>
        <div
          style={{
            color: primaryColor,
            fontSize: '12.5px',
            fontWeight: 600,
            lineHeight: '16px',
          }}
        >
          sanaa löytämättä
        </div>
        <div
          style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '999px',
            color: secondaryColor,
            fontSize: '11px',
            fontWeight: 700,
            lineHeight: '14px',
            padding: '3px 7px',
          }}
        >
          {pct}%
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <SummaryMetric
          label={pangramLabel}
          value={`${pangramStats.remaining}/${pangramStats.total}`}
        />
        <SummaryMetric label="Pituuksia" value={`${uniqueCount} eri`} />
        <SummaryMetric label="Pisin" value={`${longest} kirj.`} />
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
    <div className="flex flex-wrap gap-x-3 gap-y-1 w-full">
      {data.letterMap.map((item) => (
        <span
          key={item.letter}
          style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '999px',
            color:
              item.remaining === 0
                ? 'var(--color-text-tertiary)'
                : 'var(--color-text-primary)',
            fontSize: '13px',
            lineHeight: '17px',
            padding: '4px 8px',
          }}
        >
          {item.letter.toUpperCase()} {item.remaining}
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
    <div className="flex flex-col items-center w-full" style={{ gap: '4px' }}>
      <span
        style={{
          fontSize: '10px',
          lineHeight: '12px',
          color: 'var(--color-text-tertiary)',
          textAlign: 'center',
        }}
      >
        Sanoja jäljellä
      </span>
      <div className="flex items-end gap-1 w-full">
        {data.lengthDistribution.map((item) => {
          const done = item.remaining === 0;
          const fillHeight =
            item.total > 0
              ? Math.round(BAR_HEIGHT_PX * (item.found / item.total))
              : 0;

          return (
            <div
              key={item.len}
              className="flex flex-col items-center"
              style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
            >
              <span
                style={{
                  fontSize: '9px',
                  lineHeight: '11px',
                  marginBottom: '1px',
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
                  height: `${BAR_HEIGHT_PX}px`,
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${fillHeight}px`,
                    background: done
                      ? 'var(--color-text-tertiary)'
                      : 'var(--color-accent)',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: '9px',
                  lineHeight: '11px',
                  marginTop: '1px',
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
          fontSize: '10px',
          lineHeight: '12px',
          color: 'var(--color-text-tertiary)',
          textAlign: 'center',
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
    <div
      className="flex flex-wrap w-full"
      style={{ columnGap: '10px', rowGap: '4px' }}
    >
      {columns.map((column, index) => (
        <div key={`pairs-col-${index}`} className="flex flex-col gap-1">
          {column.map((item) => (
            <span
              key={item.pair}
              style={{
                fontFamily: 'var(--font-mono)',
                color:
                  item.remaining === 0
                    ? 'var(--color-text-tertiary)'
                    : 'var(--color-text-primary)',
                fontSize: '13px',
                lineHeight: '17px',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
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
    <div
      className="flex flex-col justify-center gap-2 w-full"
      style={{ minHeight: `${PANEL_INNER_HEIGHT_PX}px` }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div
          style={{
            color: 'var(--color-accent)',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            lineHeight: '13px',
            textTransform: 'uppercase',
          }}
        >
          {panel.label}
        </div>
        <div
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
            lineHeight: '17px',
          }}
        >
          {panel.teaser}
        </div>
      </div>

      <button
        type="button"
        style={{
          alignSelf: 'stretch',
          background: 'var(--color-accent)',
          border: '1px solid var(--color-accent-faded)',
          borderRadius: '10px',
          color: 'var(--color-on-accent)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 700,
          padding: '8px 14px',
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
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: '14px',
        }}
      >
        <div
          className="relative flex items-center gap-2"
          style={{ padding: '7px 10px' }}
        >
          <span
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '13px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            Avut
          </span>

          <div
            className="flex"
            style={{
              flex: 1,
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '3px',
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
                  style={{
                    flex: 1,
                    minHeight: '30px',
                    padding: '4px',
                    borderRadius: '8px',
                    border: `1px solid ${
                      isActive ? 'var(--color-border)' : 'transparent'
                    }`,
                    background: isActive
                      ? 'var(--color-bg-primary)'
                      : 'transparent',
                    color: isActive
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    position: 'relative',
                  }}
                >
                  {panel.label}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute"
                    style={{
                      left: '24%',
                      right: '24%',
                      bottom: '3px',
                      height: '3px',
                      borderRadius: '999px',
                      background: isUnlocked
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                      opacity: isActive ? 1 : 0,
                    }}
                  />
                </button>
              );
            })}
          </div>

          <div
            className="flex items-center gap-1"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '999px',
              flexShrink: 0,
              minHeight: '30px',
              padding: '6px 7px',
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
                    height: '18px',
                    borderRadius: '999px',
                    border: `1px solid ${
                      isActive ? 'var(--color-accent-faded)' : 'transparent'
                    }`,
                    background: isUnlocked
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                    opacity: isUnlocked || isActive ? 1 : 0.72,
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
              boxSizing: 'border-box',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-bg-primary)',
              fontFamily: 'var(--font-sans)',
              height: RESERVED_PANEL_SPACE,
            }}
          >
            <div
              className="relative z-10"
              style={{
                height: '100%',
                overflowY: 'auto',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  minHeight: `${PANEL_INNER_HEIGHT_PX}px`,
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                {activeIsUnlocked && ContentComponent ? (
                  <div style={{ width: '100%' }}>
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
          </div>
        )}
      </div>

      {!activeTab && (
        <div aria-hidden="true" style={{ height: RESERVED_PANEL_SPACE }} />
      )}
    </div>
  );
}
