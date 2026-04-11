import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy } from 'lucide-react-native';
import isEmail from 'validator/lib/isEmail';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '../store/useAuthStore';
import type { Theme } from '../theme';

interface AuthSectionProps {
  theme: Theme;
}

export function AuthSection({ theme }: AuthSectionProps) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
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

  const handleShowQr = useCallback(async () => {
    await ensureToken();
    setShowQr(true);
  }, [ensureToken]);

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
            <Pressable
              onPress={() => void useAuthStore.getState().initPlayer()}
              style={[styles.button, { borderColor: theme.border }]}
            >
              <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
                Yritä uudelleen
              </Text>
            </Pressable>
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
      <Text style={[styles.hint, { color: theme.textTertiary }]}>
        Synkronoi edistymisesi ja tilastosi toiselle laitteelle.
      </Text>

      <Pressable
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
      </Pressable>

      <Pressable
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
      </Pressable>

      <Pressable
        onPress={() => void handleShowQr()}
        disabled={isLoading}
        style={[
          styles.button,
          { borderColor: theme.border, opacity: isLoading ? 0.6 : 1 },
        ]}
      >
        <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
          Näytä QR-koodi
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          setShowEmail(true);
          setEmailSent(false);
        }}
        style={[styles.button, { borderColor: theme.border }]}
      >
        <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
          Lähetä sähköpostiin
        </Text>
      </Pressable>

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
          <Pressable
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
          </Pressable>
          {emailSent ? (
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Tarkista sähköpostiosoite.
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text style={[styles.hint, { color: theme.textTertiary }]}>
        Syötä koodi:
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
        <Pressable
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
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        onPress={() => void handleLogout()}
        style={[styles.button, { borderColor: theme.border }]}
      >
        <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
          Kirjaudu ulos
        </Text>
      </Pressable>
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
