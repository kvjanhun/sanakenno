import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { CheckCircle2, Tally5, HelpCircle, Link2 } from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import type { Theme } from '../../src/theme';

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

function SectionCard({
  icon,
  title,
  children,
  theme,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  theme: Theme;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.bgSecondary }]}>
      <View style={[styles.accentStrip, { backgroundColor: theme.accent }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          {icon}
          <Text style={[styles.heading, { color: theme.textPrimary }]}>
            {title}
          </Text>
        </View>
        {children}
      </View>
    </View>
  );
}

function BulletRow({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: Theme;
}) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.dot, { backgroundColor: theme.accent }]} />
      <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
        {children}
      </Text>
    </View>
  );
}

function ScoreRow({
  label,
  value,
  divider,
  theme,
}: {
  label: React.ReactNode;
  value: string;
  divider?: boolean;
  theme: Theme;
}) {
  return (
    <View
      style={[
        styles.scoreRow,
        divider && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
        },
      ]}
    >
      <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <View style={[styles.scoreBadge, { backgroundColor: theme.bgPrimary }]}>
        <Text style={[styles.scoreValue, { color: theme.accent }]}>
          {value}
        </Text>
      </View>
    </View>
  );
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
      <View
        style={[styles.countdownBox, { backgroundColor: theme.bgSecondary }]}
      >
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

      <Text style={[styles.intro, { color: theme.textSecondary }]}>
        Yritä löytää mahdollisimman monta sanaa seitsemästä annetusta
        kirjaimesta.
      </Text>

      {/* Rules section */}
      <SectionCard
        icon={<CheckCircle2 size={17} color={accentColor} strokeWidth={2.2} />}
        title="Hyväksyttävien sanojen täytyy"
        theme={theme}
      >
        <BulletRow theme={theme}>
          {'Sisältää '}
          <Text style={{ color: accentColor }}>oranssi keskikirjain</Text>
        </BulletRow>
        <BulletRow theme={theme}>Olla vähintään 4 kirjaimen pituisia</BulletRow>
        <BulletRow theme={theme}>
          Koostua vain annetuista kirjaimista — samaa kirjainta voi käyttää
          useasti
        </BulletRow>
        <BulletRow theme={theme}>
          {'Löytyä Kotuksen sanalistasta ('}
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
        </BulletRow>
      </SectionCard>

      {/* Scoring section */}
      <SectionCard
        icon={<Tally5 size={17} color={accentColor} strokeWidth={2.2} />}
        title="Pisteytys"
        theme={theme}
      >
        <View style={[styles.scoreTable, { borderColor: theme.border }]}>
          <ScoreRow label="4-kirjaiminen sana" value="1 p." theme={theme} />
          <ScoreRow
            label={
              <>
                {'Pidempi sana '}
                <Text style={{ color: theme.textTertiary, fontSize: 13 }}>
                  (n kirjainta)
                </Text>
              </>
            }
            value="n p."
            divider
            theme={theme}
          />
          <ScoreRow
            label={
              <>
                {'Pangrammi '}
                <Text style={{ color: theme.textTertiary, fontSize: 13 }}>
                  (kaikki 7 kirjainta)
                </Text>
              </>
            }
            value="n+7 p."
            divider
            theme={theme}
          />
        </View>
      </SectionCard>

      {/* Hints section */}
      <SectionCard
        icon={<HelpCircle size={17} color={accentColor} strokeWidth={2.2} />}
        title="Avut"
        theme={theme}
      >
        <BulletRow theme={theme}>
          <Text style={{ fontWeight: '600', color: theme.textPrimary }}>
            Yleiskuva
          </Text>
          {'\n'}
          {'mm. sanojen ja pangrammien määrä'}
        </BulletRow>
        <BulletRow theme={theme}>
          <Text style={{ fontWeight: '600', color: theme.textPrimary }}>
            Pituudet
          </Text>
          {'\n'}
          {'jäljellä olevien sanojen pituusjakauma'}
        </BulletRow>
        <BulletRow theme={theme}>
          <Text style={{ fontWeight: '600', color: theme.textPrimary }}>
            Alkuparit
          </Text>
          {'\n'}
          {'sanojen ensimmäiset 2 kirjainta'}
        </BulletRow>
      </SectionCard>

      {/* Compound words section */}
      <SectionCard
        icon={<Link2 size={17} color={accentColor} strokeWidth={2.2} />}
        title="Yhdyssanat"
        theme={theme}
      >
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Sanalista sisältää myös yhdyssanoja.{'\n'}
          Yhdysviivallisen sanan voi kirjoittaa joko viivalla tai ilman —
          esimerkiksi{' '}
          <Text style={[styles.mono, { color: theme.textPrimary }]}>
            palo-ovi
          </Text>{' '}
          tai{' '}
          <Text style={[styles.mono, { color: theme.textPrimary }]}>
            paloovi
          </Text>{' '}
          ovat molemmat hyväksyttyjä muotoja.
        </Text>
      </SectionCard>

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
          onPress={() =>
            Linking.openURL('https://github.com/kvjanhun/sanakenno')
          }
        >
          GitHub
        </Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  countdownBox: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  countdownLabel: {
    fontSize: 14,
  },
  countdownValue: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentStrip: {
    width: 3,
  },
  cardContent: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 2,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  scoreTable: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  scoreLabel: {
    fontSize: 14,
    flex: 1,
  },
  scoreBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
  },
  mono: {
    fontFamily: 'Courier',
    fontWeight: '500',
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
