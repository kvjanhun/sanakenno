import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/theme';
import { storage } from '../../src/platform';
import {
  STATS_STORAGE_KEY,
  RANKS,
  computeStreak,
  computeRankDistribution,
  computeAverageCompletion,
  emptyStats,
  type PlayerStats,
} from '@sanakenno/shared';

export default function StatsScreen() {
  const theme = useTheme();
  const [stats, setStats] = useState<PlayerStats>(
    storage.load<PlayerStats>(STATS_STORAGE_KEY) ?? emptyStats(),
  );

  useFocusEffect(
    useCallback(() => {
      setStats(storage.load<PlayerStats>(STATS_STORAGE_KEY) ?? emptyStats());
    }, []),
  );
  if (stats.records.length === 0) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.center, { backgroundColor: theme.bgPrimary }]}
      >
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Ei vielä tilastoja. Pelaa kenno!
        </Text>
      </SafeAreaView>
    );
  }

  const streak = computeStreak(stats.records);
  const rankDist = computeRankDistribution(stats.records);
  const avgCompletion = computeAverageCompletion(stats.records);
  const totalWords = stats.records.reduce((s, r) => s + r.words_found, 0);
  const totalPangrams = stats.records.reduce(
    (s, r) => s + (r.pangrams_found ?? 0),
    0,
  );
  const longestWord = stats.records.reduce((best, r) => {
    const w = r.longest_word ?? '';
    return w.length > best.length ? w : best;
  }, '');

  return (
    <ScrollView
      style={{ backgroundColor: theme.bgPrimary }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Summary grid */}
      <View style={styles.grid}>
        <StatCard label="Pelattu" value={stats.records.length} theme={theme} />
        <StatCard label="Putki" value={streak.current} theme={theme} />
        <StatCard label="Paras putki" value={streak.best} theme={theme} />
      </View>

      {/* Lifetime totals */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Kaikki pelit
        </Text>
        <View
          style={[styles.totalsCard, { backgroundColor: theme.bgSecondary }]}
        >
          <TotalRow
            label="Sanoja löydetty"
            value={String(totalWords)}
            theme={theme}
          />
          <TotalRow
            label="Pangrammeja"
            value={String(totalPangrams)}
            theme={theme}
          />
          <TotalRow
            label="Pisin sana"
            value={longestWord || '—'}
            theme={theme}
          />
        </View>
      </View>

      {/* Average completion */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Keskimääräinen suoritus
        </Text>
        <View
          style={[styles.progressBg, { backgroundColor: theme.bgSecondary }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.accent,
                width: `${Math.min(100, avgCompletion)}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.avgText, { color: theme.textSecondary }]}>
          {avgCompletion.toFixed(0)} %
        </Text>
      </View>

      {/* Rank distribution */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Tasojakauma
        </Text>
        {[...RANKS].reverse().map((rank) => {
          const count = rankDist[rank.name] ?? 0;
          const maxCount = Math.max(...Object.values(rankDist), 1);
          return (
            <View key={rank.name} style={styles.rankRow}>
              <Text
                style={[styles.rankLabel, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {rank.name}
              </Text>
              <View
                style={[
                  styles.rankBarBg,
                  { backgroundColor: theme.bgSecondary },
                ]}
              >
                <View
                  style={[
                    styles.rankBarFill,
                    {
                      backgroundColor: theme.accent,
                      width: count > 0 ? `${(count / maxCount) * 100}%` : '0%',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.rankCount, { color: theme.textSecondary }]}>
                {count}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  theme,
}: {
  label: string;
  value: number;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.bgSecondary }]}>
      <Text style={[styles.cardValue, { color: theme.textPrimary }]}>
        {value}
      </Text>
      <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

function TotalRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.totalValue, { color: theme.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  content: {
    padding: 16,
    gap: 24,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  cardLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  avgText: {
    fontSize: 14,
    textAlign: 'right',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankLabel: {
    width: 100,
    fontSize: 13,
  },
  rankBarBg: {
    flex: 1,
    height: 16,
    borderRadius: 4,
    overflow: 'hidden',
  },
  rankBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  rankCount: {
    width: 24,
    fontSize: 13,
    textAlign: 'right',
  },
  totalsCard: {
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
