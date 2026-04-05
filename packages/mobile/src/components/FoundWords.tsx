import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { Theme } from '../theme';

interface FoundWordsProps {
  foundWords: Set<string>;
  theme: Theme;
}

export function FoundWords({ foundWords, theme }: FoundWordsProps) {
  if (foundWords.size === 0) return null;

  const recent = [...foundWords].slice(-8);

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: theme.textSecondary }]}>
        Löydetyt sanat ({foundWords.size}):
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {recent.map((word) => (
          <View
            key={word}
            style={[
              styles.pill,
              {
                backgroundColor: theme.bgSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.pillText, { color: theme.textPrimary }]}>
              {word}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 'auto',
    paddingBottom: 8,
  },
  header: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
  },
});
