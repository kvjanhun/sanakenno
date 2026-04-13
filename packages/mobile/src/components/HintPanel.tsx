import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { deriveHintData } from '@sanakenno/shared';
import type { HintData, DerivedHintData } from '@sanakenno/shared';
import type { Theme } from '../theme';

const TABS = [
  { id: 'overview', label: 'Yleiskuva' },
  { id: 'lengths', label: 'Pituudet' },
  { id: 'pairs', label: 'Alkuparit' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** Fixed height of the content panel — reserved even when hints are hidden. */
const CONTENT_HEIGHT = 108;

/** Height of each bar in the lengths chart. */
const BAR_H = 26;

interface Props {
  hintData: HintData;
  foundWords: Set<string>;
  allLetters: Set<string>;
  hintsUnlocked: Set<string>;
  onUnlock: (id: string) => void;
  theme: Theme;
}

export function HintPanel({
  hintData,
  foundWords,
  allLetters,
  hintsUnlocked,
  onUnlock,
  theme,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const derived = deriveHintData(hintData, foundWords, allLetters);

  return (
    <View style={styles.container}>
      {/* Segmented control row */}
      <View style={styles.controlRow}>
        <Text style={[styles.aputLabel, { color: theme.textPrimary }]}>
          Avut
        </Text>
        <View
          style={[
            styles.segmentedControl,
            { backgroundColor: theme.bgSecondary },
          ]}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() =>
                  setActiveTab((prev) => (prev === tab.id ? null : tab.id))
                }
                style={[
                  styles.segment,
                  isActive && [
                    styles.segmentActive,
                    { backgroundColor: theme.bgPrimary },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: isActive ? theme.textPrimary : theme.textSecondary,
                      fontWeight: isActive ? '600' : '400',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {/* Unlock status bars */}
        <View style={styles.statusBars}>
          {TABS.map((tab) => (
            <View
              key={tab.id}
              style={[
                styles.statusBar,
                {
                  backgroundColor: hintsUnlocked.has(tab.id)
                    ? theme.accent
                    : theme.border,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Fixed-height content area — always reserves space even when hidden */}
      <View
        style={[
          styles.contentArea,
          {
            backgroundColor:
              activeTab !== null ? theme.bgSecondary : 'transparent',
            borderColor: activeTab !== null ? theme.border : 'transparent',
          },
        ]}
      >
        {activeTab !== null &&
          (hintsUnlocked.has(activeTab) ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <TabContent tabId={activeTab} derived={derived} theme={theme} />
            </ScrollView>
          ) : (
            <View style={styles.lockedOverlay}>
              <Pressable
                onPress={() => onUnlock(activeTab)}
                style={[styles.unlockBtn, { backgroundColor: theme.accent }]}
              >
                <Text style={[styles.unlockBtnText, { color: theme.onAccent }]}>
                  Aktivoi apu
                </Text>
              </Pressable>
            </View>
          ))}
      </View>
    </View>
  );
}

function TabContent({
  tabId,
  derived,
  theme,
}: {
  tabId: TabId;
  derived: DerivedHintData;
  theme: Theme;
}) {
  if (tabId === 'overview')
    return <OverviewContent derived={derived} theme={theme} />;
  if (tabId === 'lengths')
    return <LengthsContent derived={derived} theme={theme} />;
  return <PairsContent derived={derived} theme={theme} />;
}

function OverviewContent({
  derived,
  theme,
}: {
  derived: DerivedHintData;
  theme: Theme;
}) {
  const allFound = derived.wordsRemaining === 0;
  const pct = Math.round((derived.wordsFound / derived.wordCount) * 100);
  const { pangramStats } = derived;
  const pangramLabel = pangramStats.total === 1 ? 'pangrammi' : 'pangrammia';
  const unfound = derived.lengthDistribution.filter((e) => e.remaining > 0);
  const longest =
    unfound.length > 0 ? Math.max(...unfound.map((e) => e.len)) : 0;

  const mainColor = allFound ? theme.textTertiary : theme.textPrimary;
  const subColor = allFound ? theme.textTertiary : theme.textSecondary;

  return (
    <View style={styles.overviewRows}>
      <View style={styles.overviewLine}>
        <Text style={[styles.overviewMain, { color: mainColor }]}>
          {derived.wordsRemaining}/{derived.wordCount} sanaa löytämättä
        </Text>
        <Text style={[styles.overviewSub, { color: subColor }]}> ({pct}%)</Text>
      </View>
      <Text style={[styles.overviewDetail, { color: subColor }]}>
        {pangramStats.remaining}/{pangramStats.total} {pangramLabel}
        {' · '}pisin jäljellä {longest} kirj.
      </Text>
    </View>
  );
}

function LengthsContent({
  derived,
  theme,
}: {
  derived: DerivedHintData;
  theme: Theme;
}) {
  return (
    <View style={styles.barsWrapper}>
      <Text style={[styles.barsCaption, { color: theme.textTertiary }]}>
        jäljellä
      </Text>
      <View style={styles.barsRow}>
        {derived.lengthDistribution.map((item) => {
          const done = item.remaining === 0;
          const fillH =
            item.total > 0 ? Math.round(BAR_H * (item.found / item.total)) : 0;
          return (
            <View key={item.len} style={styles.barCol}>
              <Text
                style={[
                  styles.barCountText,
                  { color: done ? theme.textTertiary : theme.textSecondary },
                ]}
              >
                {item.remaining}
              </Text>
              <View
                style={[
                  styles.barContainer,
                  { backgroundColor: theme.bgPrimary },
                ]}
              >
                <View
                  style={[
                    styles.barFill,
                    {
                      height: fillH,
                      backgroundColor: done ? theme.textTertiary : theme.accent,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.barLenText,
                  { color: done ? theme.textTertiary : theme.textSecondary },
                ]}
              >
                {item.len}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.barsCaption, { color: theme.textTertiary }]}>
        kirjainta
      </Text>
    </View>
  );
}

function PairsContent({
  derived,
  theme,
}: {
  derived: DerivedHintData;
  theme: Theme;
}) {
  const ROWS = 4;
  const items = derived.pairMap;
  const numCols = Math.ceil(items.length / ROWS);
  // Column-major: slice into columns of ROWS items
  const cols = Array.from({ length: numCols }, (_, ci) =>
    items.slice(ci * ROWS, ci * ROWS + ROWS),
  );

  return (
    <View style={styles.pairsCols}>
      {cols.map((col, ci) => (
        <View key={ci} style={styles.pairsCol}>
          {col.map((item) => (
            <Text
              key={item.pair}
              style={[
                styles.pairItem,
                {
                  color:
                    item.remaining === 0
                      ? theme.textTertiary
                      : theme.textPrimary,
                },
              ]}
            >
              <Text style={styles.pairKey}>{item.pair.toUpperCase()}: </Text>
              {item.remaining}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },

  // --- Control row ---
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aputLabel: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 0,
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 9,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 7,
    alignItems: 'center',
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: {
    fontSize: 12,
  },
  statusBars: {
    flexDirection: 'row',
    gap: 3,
    flexShrink: 0,
  },
  statusBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },

  // --- Content area ---
  contentArea: {
    height: CONTENT_HEIGHT,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    minHeight: CONTENT_HEIGHT,
    justifyContent: 'center',
  },
  lockedOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockBtn: {
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  unlockBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },

  // --- Overview ---
  overviewRows: {
    gap: 6,
  },
  overviewLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  overviewMain: {
    fontSize: 17,
    fontWeight: '600',
  },
  overviewSub: {
    fontSize: 15,
  },
  overviewDetail: {
    fontSize: 14,
  },

  // --- Lengths bar chart ---
  barsWrapper: {
    alignItems: 'center',
    gap: 3,
  },
  barsCaption: {
    fontSize: 10,
    lineHeight: 12,
  },
  barsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 4,
    alignItems: 'flex-end',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barCountText: {
    fontSize: 9,
    lineHeight: 11,
    marginBottom: 1,
  },
  barContainer: {
    width: '100%',
    height: BAR_H,
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
  },
  barLenText: {
    fontSize: 9,
    lineHeight: 11,
    marginTop: 1,
  },

  // --- Pairs ---
  pairsCols: {
    flexDirection: 'row',
    gap: 14,
  },
  pairsCol: {
    flexDirection: 'column',
    gap: 3,
  },
  pairItem: {
    fontSize: 13,
  },
  pairKey: {
    fontWeight: '600',
  },
});
