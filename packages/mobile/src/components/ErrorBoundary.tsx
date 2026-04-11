import { Component } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import type { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react-native';
import { getTheme } from '../theme';
import { useSettingsStore } from '../store/useSettingsStore';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Hook-based wrapper that resolves theme for the class component.
 * Exported as `ErrorBoundary` so expo-router picks it up.
 */
export function ErrorBoundary({ children }: Props) {
  const systemScheme = useColorScheme();
  const pref = useSettingsStore((s) => s.themePreference);
  const scheme = pref === 'system' ? systemScheme : pref;
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');

  return <ErrorBoundaryInner theme={theme}>{children}</ErrorBoundaryInner>;
}

class ErrorBoundaryInner extends Component<
  Props & { theme: ReturnType<typeof getTheme> },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console -- error boundary must log
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const { theme } = this.props;
      return (
        <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
          <AlertTriangle
            size={48}
            strokeWidth={2.5}
            color={theme.error}
            style={styles.icon}
          />
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Jokin meni pieleen
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Sovelluksessa tapahtui odottamaton virhe.
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={[styles.buttonText, { color: theme.onAccent }]}>
              Yritä uudelleen
            </Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
