import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { deriveHintData, toColumns } from '@sanakenno/shared';
import type { HintData, DerivedHintData } from '@sanakenno/shared';
import { withOpacity, type Theme } from '../theme';

const TABS = [
  {
    id: 'overview',
    label: 'Yleiskuva',
    teaser: 'Yhteenveto puuttuvista sanoista.',
  },
  {
    id: 'lengths',
    label: 'Pituudet',
    teaser: 'Jäljellä olevien sanojen pituudet.',
  },
  {
    id: 'pairs',
    label: 'Alkuparit',
    teaser: 'Jäljellä olevien sanojen alkukirjainparit.',
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

const CONTENT_HEIGHT = 108;
const RESERVED_PANEL_SPACE = CONTENT_HEIGHT + 1;
const BAR_H = 26;
const PAIRS_PER_COLUMN = 4;
const TEXTURE_LINE_COUNT = 9;

interface Props {
  hintData: HintData;
  foundWords: Set<string>;
  allLetters: Set<string>;
  hintsUnlocked: Set<string>;
  onUnlock: (id: string) => void;
  theme: Theme;
}

function SummaryMetric({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: Theme;
}) {
  return (
    <View
      style={[
        styles.metricChip,
        {
          backgroundColor: withOpacity(theme.bgPrimary, 0.82),
          borderColor: theme.border,
        },
      ]}
    >
      <Text style={[styles.metricLabel, { color: theme.textTertiary }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

function PanelTexture({ theme }: { theme: Theme }) {
  return (
    <View pointerEvents="none" style={styles.texture}>
      {Array.from({ length: TEXTURE_LINE_COUNT }, (_, index) => (
        <View
          key={`texture-line-${index}`}
          style={[
            styles.textureLine,
            {
              left: 18 + index * 32,
              backgroundColor: withOpacity(
                theme.border,
                index % 2 === 0 ? 0.22 : 0.12,
              ),
            },
          ]}
        />
      ))}
    </View>
  );
}

function LockedHintState({
  tab,
  onUnlock,
  theme,
}: {
  tab: (typeof TABS)[number];
  onUnlock: () => void;
  theme: Theme;
}) {
  return (
    <View style={styles.lockedContent}>
      <View style={styles.lockedTextBlock}>
        <Text style={[styles.lockedEyebrow, { color: theme.accent }]}>
          {tab.label}
        </Text>
        <Text style={[styles.lockedTeaser, { color: theme.textSecondary }]}>
          {tab.teaser}
        </Text>
      </View>

      <Pressable
        onPress={onUnlock}
        style={[
          styles.unlockBtn,
          {
            backgroundColor: theme.accent,
            borderColor: theme.accentFaded,
            shadowColor: theme.buttonShadow,
          },
        ]}
      >
        <Text style={[styles.unlockBtnText, { color: theme.onAccent }]}>
          Aktivoi apu
        </Text>
      </Pressable>
    </View>
  );
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
  const activeConfig = activeTab
    ? (TABS.find((tab) => tab.id === activeTab) ?? null)
    : null;
  const activeUnlocked = activeTab ? hintsUnlocked.has(activeTab) : false;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.shell,
          {
            backgroundColor: theme.bgSecondary,
            borderColor: theme.border,
            shadowColor: theme.buttonShadow,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.aputLabel, { color: theme.textPrimary }]}>
            Avut
          </Text>

          <View
            style={[
              styles.segmentedControl,
              {
                backgroundColor: withOpacity(theme.bgPrimary, 0.45),
                borderColor: theme.border,
              },
            ]}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const isUnlocked = hintsUnlocked.has(tab.id);

              return (
                <Pressable
                  key={tab.id}
                  onPress={() =>
                    setActiveTab((prev) => (prev === tab.id ? null : tab.id))
                  }
                  style={[
                    styles.segment,
                    isActive && {
                      backgroundColor: withOpacity(theme.bgPrimary, 0.94),
                      borderColor: theme.border,
                      shadowColor: theme.buttonShadow,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.segmentText,
                      {
                        color: isActive
                          ? theme.textPrimary
                          : theme.textSecondary,
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>

                  <View
                    style={[
                      styles.segmentUnderline,
                      {
                        backgroundColor: isUnlocked
                          ? theme.accent
                          : withOpacity(theme.border, 0.95),
                        opacity: isActive ? 1 : 0,
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.statusCapsule,
              {
                backgroundColor: withOpacity(theme.bgPrimary, 0.55),
                borderColor: theme.border,
              },
            ]}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const isUnlocked = hintsUnlocked.has(tab.id);

              return (
                <View
                  key={tab.id}
                  style={[
                    styles.statusBar,
                    {
                      backgroundColor: isUnlocked ? theme.accent : theme.border,
                      borderColor: isActive
                        ? withOpacity(theme.accentFaded, 0.95)
                        : 'transparent',
                      opacity: isUnlocked || isActive ? 1 : 0.72,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {activeTab && (
          <View
            style={[
              styles.panelSection,
              {
                borderTopColor: theme.border,
                backgroundColor: withOpacity(theme.bgPrimary, 0.16),
              },
            ]}
          >
            <PanelTexture theme={theme} />

            {activeUnlocked ? (
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <TabContent tabId={activeTab} derived={derived} theme={theme} />
              </ScrollView>
            ) : (
              activeConfig && (
                <LockedHintState
                  tab={activeConfig}
                  onUnlock={() => onUnlock(activeConfig.id)}
                  theme={theme}
                />
              )
            )}
          </View>
        )}
      </View>

      {!activeTab && <View style={styles.reservedSpace} />}
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
  if (tabId === 'overview') {
    return <OverviewContent derived={derived} theme={theme} />;
  }

  if (tabId === 'lengths') {
    return <LengthsContent derived={derived} theme={theme} />;
  }

  return <PairsContent derived={derived} theme={theme} />;
}

function OverviewContent({
  derived,
  theme,
}: {
  derived: DerivedHintData;
  theme: Theme;
}) {
  const pct = Math.round((derived.wordsFound / derived.wordCount) * 100);
  const { pangramStats } = derived;
  const pangramLabel = pangramStats.total === 1 ? 'Pangrammi' : 'Pangrammit';
  const unfoundLengths = derived.lengthDistribution.filter(
    (e) => e.remaining > 0,
  );
  const uniqueCount = unfoundLengths.length;
  const longest =
    unfoundLengths.length > 0
      ? Math.max(...unfoundLengths.map((e) => e.len))
      : 0;
  const allFound = derived.wordsRemaining === 0;
  const primaryColor = allFound ? theme.textTertiary : theme.textPrimary;
  const secondaryColor = allFound ? theme.textTertiary : theme.textSecondary;

  return (
    <View style={styles.overviewRows}>
      <View style={styles.summaryHeadlineRow}>
        <Text style={[styles.summaryCount, { color: primaryColor }]}>
          {derived.wordsRemaining}/{derived.wordCount}
        </Text>
        <Text style={[styles.summaryCopy, { color: primaryColor }]}>
          sanaa löytämättä
        </Text>
        <View
          style={[
            styles.summaryPercentChip,
            {
              backgroundColor: withOpacity(theme.bgPrimary, 0.84),
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.summaryPercentText, { color: secondaryColor }]}>
            {pct}%
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <SummaryMetric
          label={pangramLabel}
          value={`${pangramStats.remaining}/${pangramStats.total}`}
          theme={theme}
        />
        <SummaryMetric
          label="Pituuksia"
          value={`${uniqueCount} eri`}
          theme={theme}
        />
        <SummaryMetric label="Pisin" value={`${longest} kirj.`} theme={theme} />
      </View>
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
        Sanoja jäljellä
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
                  {
                    backgroundColor: withOpacity(theme.bgPrimary, 0.78),
                    borderColor: theme.border,
                  },
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
        Pituus, kirjainta
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
  const columns = toColumns(derived.pairMap, PAIRS_PER_COLUMN);

  return (
    <View style={styles.pairsColumns}>
      {columns.map((column, index) => (
        <View key={`pairs-col-${index}`} style={styles.pairsColumn}>
          {column.map((item) => (
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
  shell: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  aputLabel: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    minHeight: 30,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    position: 'relative',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  segmentUnderline: {
    position: 'absolute',
    left: '24%',
    right: '24%',
    bottom: 3,
    height: 3,
    borderRadius: 999,
  },
  statusCapsule: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
    minHeight: 30,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  statusBar: {
    width: 5,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
  },
  panelSection: {
    height: CONTENT_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  texture: {
    ...StyleSheet.absoluteFillObject,
  },
  textureLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reservedSpace: {
    height: RESERVED_PANEL_SPACE,
  },
  lockedContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  lockedTextBlock: {
    gap: 3,
  },
  lockedEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  lockedTeaser: {
    fontSize: 13,
    lineHeight: 17,
  },
  unlockBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  unlockBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  overviewRows: {
    gap: 8,
  },
  summaryHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryCount: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  summaryCopy: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 16,
  },
  summaryPercentChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  summaryPercentText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    lineHeight: 13,
  },
  metricValue: {
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 14,
  },
  barsWrapper: {
    alignItems: 'center',
    gap: 4,
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
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
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
  pairsColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignSelf: 'stretch',
  },
  pairsColumn: {
    flexDirection: 'column',
    gap: 4,
  },
  pairItem: {
    fontSize: 13,
    lineHeight: 17,
  },
  pairKey: {
    fontWeight: '700',
  },
});
