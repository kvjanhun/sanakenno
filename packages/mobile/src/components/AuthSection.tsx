/**
 * Auth section for the settings screen.
 *
 * Shows login state and handles the magic link auth flow.
 * Three views: logged-in, pending email, email entry form.
 *
 * @module src/components/AuthSection
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import isEmail from 'validator/lib/isEmail';
import { useAuthStore } from '../store/useAuthStore';
import type { Theme } from '../theme';

interface AuthSectionProps {
  theme: Theme;
}

export function AuthSection({ theme }: AuthSectionProps) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const email = useAuthStore((s) => s.email);
  const pendingEmail = useAuthStore((s) => s.pendingEmail);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const [inputEmail, setInputEmail] = useState('');

  const handleRequestLink = useCallback(async () => {
    const trimmed = inputEmail.trim();
    if (!trimmed) return;
    if (!isEmail(trimmed)) {
      useAuthStore.setState({ error: 'Tarkista sähköpostiosoite.' });
      return;
    }
    const { requestLink } = useAuthStore.getState();
    await requestLink(trimmed);
    setInputEmail('');
  }, [inputEmail]);

  const handleResend = useCallback(async () => {
    if (!pendingEmail) return;
    const { requestLink } = useAuthStore.getState();
    await requestLink(pendingEmail);
  }, [pendingEmail]);

  const handleLogout = useCallback(async () => {
    const { logout } = useAuthStore.getState();
    await logout();
  }, []);

  if (isLoggedIn) {
    return (
      <View style={[styles.card, { backgroundColor: theme.bgSecondary }]}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          Kirjautunut sisään
        </Text>
        <Text style={[styles.emailText, { color: theme.textPrimary }]}>
          {email}
        </Text>
        <Text style={[styles.hint, { color: theme.textTertiary }]}>
          Tilastosi synkronoidaan automaattisesti.
        </Text>
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

  if (pendingEmail) {
    return (
      <View style={[styles.card, { backgroundColor: theme.bgSecondary }]}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          Tarkista sähköpostisi
        </Text>
        <Text style={[styles.emailText, { color: theme.textPrimary }]}>
          {pendingEmail}
        </Text>
        <Text style={[styles.hint, { color: theme.textTertiary }]}>
          Lähetimme sinulle kirjautumislinkin. Linkki on voimassa 15 minuuttia.
          Avaa se samalla laitteella.
        </Text>
        <Pressable
          onPress={() => void handleResend()}
          disabled={isLoading}
          style={[
            styles.button,
            { borderColor: theme.border, opacity: isLoading ? 0.6 : 1 },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.textPrimary} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.textPrimary }]}>
              Lähetä uudelleen
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={() =>
            useAuthStore.setState({ pendingEmail: null, error: null })
          }
          style={styles.changeEmailButton}
        >
          <Text style={[styles.changeEmailText, { color: theme.textTertiary }]}>
            Vaihda sähköpostiosoite
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.bgSecondary }]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        Kirjaudu sisään
      </Text>
      <Text style={[styles.hint, { color: theme.textTertiary }]}>
        Tallenna tilastosi ja synkronoi edistymisesi eri laitteille. Ei
        salasanaa — lähetämme kirjautumislinkin sähköpostiisi.
      </Text>
      <TextInput
        value={inputEmail}
        onChangeText={(v) => {
          setInputEmail(v);
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
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable
        onPress={() => void handleRequestLink()}
        disabled={isLoading || !inputEmail.trim()}
        style={[
          styles.primaryButton,
          {
            backgroundColor: theme.accent,
            opacity: isLoading || !inputEmail.trim() ? 0.6 : 1,
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Lähetä kirjautumislinkki</Text>
        )}
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
  emailText: {
    fontSize: 15,
    fontWeight: '500',
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
  errorText: {
    color: '#ef4444',
    fontSize: 13,
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
  primaryButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  changeEmailButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  changeEmailText: {
    fontSize: 13,
  },
});
