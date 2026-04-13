import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { Copy, LogOut, Mail, QrCode } from 'lucide-react-native';
import isEmail from 'validator/lib/isEmail';
import QRCode from 'react-native-qrcode-svg';
import * as PreparedHaptics from 'prepared-haptics';
import { useAuthStore } from '../store/useAuthStore';
import type { Theme } from '../theme';

interface AuthSectionProps {
  theme: Theme;
}

/**
 * Pressable that scales down + triggers a light haptic on touch-down,
 * scales back to 1 on release. Used for all auth action buttons so they
 * feel responsive (especially copy actions which have no visible result).
 */
function AnimatedButton({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        if (disabled) return;
        PreparedHaptics.triggerImpact('light');
        scale.value = withTiming(0.96, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export function AuthSection({ theme }: AuthSectionProps) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isLinked = useAuthStore((s) => s.isLinked);
  const transferToken = useAuthStore((s) => s.transferToken);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const [codeInput, setCodeInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const connectUrl = transferToken
    ? `https://sanakenno.fi/connect?connect=${encodeURIComponent(transferToken)}`
    : '';

  const ensureToken = useCallback(async () => {
    if (!transferToken) {
      await useAuthStore.getState().createTransfer();
    }
  }, [transferToken]);

  const handleCopyLink = useCallback(async () => {
    await ensureToken();
    if (connectUrl) {
      await Clipboard.setStringAsync(connectUrl);
    }
  }, [ensureToken, connectUrl]);

  const handleCopyCode = useCallback(async () => {
    await ensureToken();
    if (transferToken) {
      await Clipboard.setStringAsync(transferToken);
    }
  }, [ensureToken, transferToken]);

  const handleToggleQr = useCallback(async () => {
    if (showQr) {
      setShowQr(false);
      return;
    }
    await ensureToken();
    setShowQr(true);
  }, [ensureToken, showQr]);

  const handleSendEmail = useCallback(async () => {
    const email = emailInput.trim();
    if (!isEmail(email)) {
      useAuthStore.setState({ error: 'Tarkista sähköpostiosoite.' });
      return;
    }
    await useAuthStore.getState().createTransfer(email);
    if (!useAuthStore.getState().error) {
      setEmailSent(true);
    }
  }, [emailInput]);

  const handleUseCode = useCallback(async () => {
    const token = codeInput.trim();
    if (!token) return;
    await useAuthStore.getState().useTransfer(token);
    setCodeInput('');
  }, [codeInput]);

  const handleLogout = useCallback(async () => {
    await useAuthStore.getState().logout();
  }, []);

  if (!isLoggedIn) {
    return (
      <View style={[styles.card, { backgroundColor: theme.bgSecondary }]}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Tili</Text>
        <Text style={[styles.hint, { color: theme.textTertiary }]}>
          Luodaan pelaajaprofiilia...
        </Text>
        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <AnimatedButton
              onPress={() => void useAuthStore.getState().initPlayer()}
              style={[styles.button, { borderColor: theme.border }]}
            >
              <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
                Yritä uudelleen
              </Text>
            </AnimatedButton>
          </>
        ) : (
          <ActivityIndicator size="small" color={theme.textSecondary} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.bgSecondary }]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        Lisää laite
      </Text>

      {!isLinked ? (
        <>
          <Text style={[styles.hint, { color: theme.textTertiary }]}>
            Synkronoi edistymisesi ja tilastosi muille laitteille.
          </Text>
          <AnimatedButton
            onPress={() => void useAuthStore.getState().createTransfer()}
            disabled={isLoading}
            style={[
              styles.primaryButton,
              {
                backgroundColor: theme.accent,
                opacity: isLoading ? 0.6 : 1,
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Synkronoi muille laitteille
              </Text>
            )}
          </AnimatedButton>
          <Text style={[styles.hint, { color: theme.textTertiary }]}>
            Syötä koodi toiselta laitteelta:
          </Text>
          <View style={styles.codeRow}>
            <TextInput
              value={codeInput}
              onChangeText={(v) => {
                setCodeInput(v);
                if (error) useAuthStore.setState({ error: null });
              }}
              style={[
                styles.input,
                styles.codeInput,
                {
                  backgroundColor: theme.bgPrimary,
                  color: theme.textPrimary,
                  borderColor: theme.border,
                },
              ]}
            />
            <AnimatedButton
              onPress={() => void handleUseCode()}
              disabled={isLoading || !codeInput.trim()}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: theme.accent,
                  opacity: isLoading || !codeInput.trim() ? 0.6 : 1,
                  paddingHorizontal: 14,
                },
              ]}
            >
              <Text style={styles.primaryButtonText}>Yhdistä</Text>
            </AnimatedButton>
          </View>
        </>
      ) : (
        <>
          <AnimatedButton
            onPress={() => void handleCopyLink()}
            disabled={isLoading}
            style={[
              styles.button,
              { borderColor: theme.border, opacity: isLoading ? 0.6 : 1 },
            ]}
          >
            <View style={styles.buttonRow}>
              <Copy size={16} color={theme.textPrimary} />
              <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
                Kopioi linkki
              </Text>
            </View>
          </AnimatedButton>

          <AnimatedButton
            onPress={() => void handleCopyCode()}
            disabled={isLoading}
            style={[
              styles.button,
              { borderColor: theme.border, opacity: isLoading ? 0.6 : 1 },
            ]}
          >
            <View style={styles.buttonRow}>
              <Copy size={16} color={theme.textPrimary} />
              <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
                Kopioi koodi
              </Text>
            </View>
          </AnimatedButton>

          <AnimatedButton
            onPress={() => void handleToggleQr()}
            disabled={isLoading}
            style={[
              styles.button,
              { borderColor: theme.border, opacity: isLoading ? 0.6 : 1 },
            ]}
          >
            <View style={styles.buttonRow}>
              <QrCode size={16} color={theme.textPrimary} />
              <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
                {showQr ? 'Piilota QR-koodi' : 'Näytä QR-koodi'}
              </Text>
            </View>
          </AnimatedButton>

          <AnimatedButton
            onPress={() => {
              setShowEmail(true);
              setEmailSent(false);
            }}
            style={[styles.button, { borderColor: theme.border }]}
          >
            <View style={styles.buttonRow}>
              <Mail size={16} color={theme.textPrimary} />
              <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
                Lähetä sähköpostiin
              </Text>
            </View>
          </AnimatedButton>

          {showQr && connectUrl ? (
            <View style={styles.qrWrap}>
              <QRCode value={connectUrl} size={180} />
            </View>
          ) : null}

          {showEmail ? (
            <View style={styles.emailWrap}>
              <Text style={[styles.hint, { color: theme.textTertiary }]}>
                Sanakenno.fi ei tallenna sähköpostiosoitettasi.
              </Text>
              <TextInput
                value={emailInput}
                onChangeText={(v) => {
                  setEmailInput(v);
                  if (error) useAuthStore.setState({ error: null });
                }}
                placeholder="sähköpostiosoite"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.bgPrimary,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  },
                ]}
              />
              <AnimatedButton
                onPress={() => void handleSendEmail()}
                disabled={isLoading || !emailInput.trim()}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: theme.accent,
                    opacity: isLoading || !emailInput.trim() ? 0.6 : 1,
                  },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Lähetä</Text>
                )}
              </AnimatedButton>
              {emailSent ? (
                <Text style={[styles.hint, { color: theme.accent }]}>
                  Sähköposti lähetetty!
                </Text>
              ) : null}
            </View>
          ) : null}

          <AnimatedButton
            onPress={() => void handleLogout()}
            style={[styles.button, { borderColor: theme.border }]}
          >
            <View style={styles.buttonRow}>
              <LogOut size={16} color={theme.textPrimary} />
              <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
                Kirjaudu ulos
              </Text>
            </View>
          </AnimatedButton>
        </>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
  },
  qrWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emailWrap: {
    gap: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
  },
});
