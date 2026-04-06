import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { deriveHintData } from '@sanakenno/shared';
import type { HintData, DerivedHintData } from '@sanakenno/shared';
import type { Theme } from '../theme';

const TABS = [
  { id: 'overview', label: 'Yleiskuva' },
  { id: 'lengths', label: 'Pituudet' },
  { id: 'pairs', label: 'Alkuparit' },
] as const;

type TabId = (typeof TABS)[number]['id'];

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
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const derived = deriveHintData(hintData, foundWords, allLetters);

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isUnlocked = hintsUnlocked.has(tab.id);
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tab,
                isActive && { borderBottomColor: theme.accent },
              ]}
            >
              <View style={styles.tabInner}>
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isActive ? theme.accent : theme.textSecondary,
                      fontWeight: isActive ? '600' : '400',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isUnlocked ? theme.accent : theme.border,
                    },
                  ]}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      <View
        style={[
          styles.content,
          { backgroundColor: theme.bgSecondary, borderColor: theme.border },
        ]}
      >
        {hintsUnlocked.has(activeTab) ? (
          <TabContent tabId={activeTab} derived={derived} theme={theme} />
        ) : (
          <View style={styles.locked}>
            <Pressable
              onPress={() => onUnlock(activeTab)}
              style={[styles.unlockBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.unlockText, { color: theme.onAccent }]}>
                Avaa vihje
              </Text>
            </Pressable>
          </View>
        )}
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
  if (tabId === 'overview') {
    return (
      <View style={styles.overviewGrid}>
        <Text style={[styles.overviewText, { color: theme.textPrimary }]}>
          Sanoja: {derived.wordsFound}/{derived.wordCount}
        </Text>
        <Text style={[styles.overviewText, { color: theme.textPrimary }]}>
          Täysosumia: {derived.pangramStats.found}/{derived.pangramStats.total}
        </Text>
        {derived.letterMap.map((entry) => (
          <Text
            key={entry.letter}
            style={[styles.entryText, { color: theme.textSecondary }]}
          >
            {entry.letter.toUpperCase()}: {entry.found}/{entry.total}
          </Text>
        ))}
      </View>
    );
  }

  if (tabId === 'lengths') {
    return (
      <View style={styles.lengthGrid}>
        {derived.lengthDistribution.map((entry) => (
          <View key={entry.len} style={styles.lengthRow}>
            <Text style={[styles.lengthLabel, { color: theme.textSecondary }]}>
              {entry.len} kirj.
            </Text>
            <Text style={[styles.lengthValue, { color: theme.textPrimary }]}>
              {entry.found}/{entry.total}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  // pairs
  return (
    <View style={styles.pairGrid}>
      {derived.pairMap.map((entry) => (
        <View key={entry.pair} style={styles.pairCell}>
          <Text style={[styles.pairLabel, { color: theme.textSecondary }]}>
            {entry.pair.toUpperCase()}
          </Text>
          <Text
            style={[
              styles.pairValue,
              {
                color: entry.remaining === 0 ? theme.accent : theme.textPrimary,
              },
            ]}
          >
            {entry.found}/{entry.total}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 36,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tabText: {
    fontSize: 13,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  content: {
    minHeight: 80,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    marginTop: 2,
  },
  locked: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
  unlockBtn: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  unlockText: {
    fontWeight: '600',
    fontSize: 14,
  },
  overviewGrid: {
    gap: 4,
  },
  overviewText: {
    fontSize: 14,
    fontWeight: '600',
  },
  entryText: {
    fontSize: 13,
  },
  lengthGrid: {
    gap: 4,
  },
  lengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lengthLabel: {
    fontSize: 13,
  },
  lengthValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  pairGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pairCell: {
    alignItems: 'center',
    width: 50,
  },
  pairLabel: {
    fontSize: 12,
  },
  pairValue: {
    fontSize: 13,
    fontWeight: '600',
  },
});
