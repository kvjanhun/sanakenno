import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { useTheme } from '../../src/theme';

/** Milliseconds until next midnight in Helsinki timezone. */
function msUntilHelsinkiMidnight(): number {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Helsinki',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  const h = get('hour');
  const m = get('minute');
  const s = get('second');
  const msIntoDay = (h === 24 ? 0 : h) * 3_600_000 + m * 60_000 + s * 1_000;
  return 86_400_000 - msIntoDay;
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
  const [msRemaining, setMsRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const ms = msUntilHelsinkiMidnight();
      setMsRemaining(ms);
      setCountdown(formatCountdown(ms));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const accentColor = theme.accent;
  const nearMidnight = msRemaining < 30 * 60 * 1000 && msRemaining > 0;

  return (
    <ScrollView
      style={{ backgroundColor: theme.bgPrimary }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Next puzzle countdown */}
      <View style={[styles.countdownBox, { backgroundColor: theme.bgSecondary }]}>
        <Text style={[styles.countdownLabel, { color: theme.textSecondary }]}>
          Seuraava kenno
        </Text>
        <Text
          style={[
            styles.countdownValue,
            { color: nearMidnight ? accentColor : theme.textPrimary },
          ]}
        >
          {countdown}
        </Text>
      </View>

      {/* Rules content */}
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Yritä löytää mahdollisimman monta sanaa seitsemästä annetusta kirjaimesta.
      </Text>

      <Text style={[styles.heading, { color: theme.textPrimary }]}>
        Hyväksyttävien sanojen täytyy
      </Text>
      <View style={styles.list}>
        <Text style={[styles.item, { color: theme.textSecondary }]}>
          {'• Sisältää '}
          <Text style={{ color: accentColor }}>oranssi keskikirjain</Text>
        </Text>
        <Text style={[styles.item, { color: theme.textSecondary }]}>
          • Olla vähintään 4 kirjaimen pituisia
        </Text>
        <Text style={[styles.item, { color: theme.textSecondary }]}>
          • Koostua vain annetuista kirjaimista — samaa kirjainta voi käyttää useasti
        </Text>
        <Text style={[styles.item, { color: theme.textSecondary }]}>
          {'• Löytyä Kotuksen sanalistasta ('}
          <Text
            style={{ color: accentColor, textDecorationLine: 'underline' }}
            onPress={() =>
              Linking.openURL(
                'https://kotus.fi/sanakirjat/kielitoimiston-sanakirja/nykysuomen-sana-aineistot/nykysuomen-sanalista',
              )
            }
          >
            Kotus
          </Text>
          {')'}
        </Text>
      </View>

      <Text style={[styles.heading, { color: theme.textPrimary }]}>Pisteytys</Text>
      <View style={styles.list}>
        <Text style={[styles.item, { color: theme.textSecondary }]}>
          • 4-kirjaiminen sana: 1 piste
        </Text>
        <Text style={[styles.item, { color: theme.textSecondary }]}>
          • Pidempi sana: pisteitä sanan pituuden verran
        </Text>
        <Text style={[styles.item, { color: theme.textSecondary }]}>
          • Pangrammi: +7 lisäpistettä
        </Text>
        <Text style={[styles.item, { color: theme.textTertiary }]}>
          Sana on pangrammi sen sisältäessä kaikki 7 kirjainta.
        </Text>
      </View>

      <Text style={[styles.heading, { color: theme.textPrimary }]}>Avut</Text>
      <View style={styles.list}>
        <Text style={[styles.item, { color: theme.textSecondary }]}>
          • Yleiskuva: mm. sanojen ja pangrammien määrä
        </Text>
        <Text style={[styles.item, { color: theme.textSecondary }]}>
          • Pituudet: jäljellä olevien sanojen pituusjakauma
        </Text>
        <Text style={[styles.item, { color: theme.textSecondary }]}>
          • Alkuparit: sanojen ensimmäiset 2 kirjainta
        </Text>
      </View>

      <Text style={[styles.heading, { color: theme.textPrimary }]}>Yhdyssanat</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Sanalista sisältää myös yhdyssanoja.{'\n'}Yhdysviivallisen sanan voi kirjoittaa
        joko viivalla tai ilman — esimerkiksi{' '}
        <Text style={styles.mono}>palo-ovi</Text> tai{' '}
        <Text style={styles.mono}>paloovi</Text> ovat molemmat hyväksyttyjä muotoja.
      </Text>

      <View style={[styles.divider, { borderColor: theme.border }]} />

      <Text style={[styles.footer, { color: theme.textTertiary }]}>
        <Text
          style={{ textDecorationLine: 'underline' }}
          onPress={() => Linking.openURL('https://erez.ac')}
        >
          erez.ac
        </Text>
        {'  ·  Lähdekoodi  '}
        <Text
          style={{ textDecorationLine: 'underline' }}
          onPress={() => Linking.openURL('https://github.com/kvjanhun/sanakenno')}
        >
          GitHub
        </Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
  },
  countdownBox: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
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
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: 4,
  },
  item: {
    fontSize: 15,
    lineHeight: 22,
  },
  mono: {
    fontFamily: 'Courier',
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  footer: {
    fontSize: 13,
    textAlign: 'center',
  },
});

