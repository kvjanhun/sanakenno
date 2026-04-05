import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RANKS } from '@sanakenno/shared';

export default function GameScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sanakenno</Text>
        <Text style={styles.subtitle}>
          {RANKS.length} rankia ladattu shared-paketista
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A3A3A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F5E6C8',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCBBAA',
    marginTop: 8,
  },
});
