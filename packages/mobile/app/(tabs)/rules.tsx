import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { useTheme } from '../../src/theme';

function getHelsinkiMidnight(): Date {
  const now = new Date();
  const hel = new Date(
    now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }),
  );
  const tomorrow = new Date(hel);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  // Convert back to local time
  const diff = tomorrow.getTime() - hel.getTime();
  return new Date(now.getTime() + diff);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function RulesScreen() {
  const theme = useTheme();
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const midnight = getHelsinkiMidnight();
    const tick = () => {
      const ms = midnight.getTime() - Date.now();
      setCountdown(formatCountdown(ms));
      if (ms <= 0) clearInterval(id);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <ScrollView
      style={{ backgroundColor: theme.bgPrimary }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Next puzzle countdown */}
      <View
        style={[styles.countdownBox, { backgroundColor: theme.bgSecondary }]}
      >
        <Text style={[styles.countdownLabel, { color: theme.textSecondary }]}>
          Seuraava kenno
        </Text>
        <Text style={[styles.countdownValue, { color: theme.textPrimary }]}>
          {countdown}
        </Text>
      </View>

      <Text style={[styles.heading, { color: theme.textPrimary }]}>
        Miten pelataan
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Muodosta sanoja annetuista kirjaimista. Jokaisen sanan täytyy sisältää
        keskikirjain ja olla vähintään 4 kirjainta pitkä.
      </Text>

      <Text style={[styles.heading, { color: theme.textPrimary }]}>
        Pisteytys
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        • 4-kirjaimiset sanat: 1 piste{'\n'}• Pidemmät sanat: 1 piste per
        kirjain{'\n'}• Täysosuma (kaikki 7 kirjainta): +7 bonuspistettä
      </Text>

      <Text style={[styles.heading, { color: theme.textPrimary }]}>
        Hyväksytyt sanat
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Hyväksytyt sanat perustuvat Kotimaisten kielten keskuksen (Kotus)
        nykysuomen sanakirjaan. Yhdyssanat, taivutusmuodot ja johdokset
        hyväksytään, kun ne löytyvät sanakirjasta.
      </Text>

      <Text
        style={[styles.link, { color: theme.accent }]}
        onPress={() =>
          Linking.openURL('https://kaino.kotus.fi/sanat/nykysuomi/')
        }
      >
        Kotuksen sanakirja →
      </Text>

      <Text style={[styles.heading, { color: theme.textPrimary }]}>Tasot</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Pisteesi määrittävät tason. Tasot perustuvat prosenttiosuuteen
        enimmäispisteistä:{'\n\n'}• Etsi sanoja! — 0 %{'\n'}• Hyvä alku — 2 %
        {'\n'}• Nyt mennään! — 10 %{'\n'}• Onnistuja — 20 %{'\n'}• Sanavalmis —
        40 %{'\n'}• Ällistyttävä — 70 %{'\n'}• Täysi kenno — 100 %
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  countdownBox: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  countdownLabel: {
    fontSize: 14,
  },
  countdownValue: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
  },
});
