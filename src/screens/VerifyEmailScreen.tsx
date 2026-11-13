import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { ApiRequestError } from '../lib/api';
import { colors } from '../theme';

export function VerifyEmailScreen() {
  const {
    user,
    verificationOtp,
    verifyEmail,
    resendVerification,
    signOut,
  } = useAuth();
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  async function onVerify() {
    if (!/^\d{6}$/.test(code)) return;
    setPending(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await verifyEmail(code);
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Could not verify that code. Please try again.',
      );
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    setResending(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await resendVerification();
      setMessage('A new verification code has been sent.');
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Could not resend the code. Please try again.',
      );
    } finally {
      setResending(false);
    }
  }

  const codeValid = /^\d{6}$/.test(code);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>DreamWare</Text>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.body}>
          Enter the six-digit code sent to {user?.email ?? 'your email address'}.
        </Text>

        <Text style={styles.label}>Verification code</Text>
        <TextInput
          autoComplete="one-time-code"
          autoFocus
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={colors.muted}
          style={styles.pinInput}
          textContentType="oneTimeCode"
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
        />

        {verificationOtp ? (
          <Text style={styles.developmentCode}>
            Development code: {verificationOtp}
          </Text>
        ) : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={!codeValid || pending}
          onPress={() => void onVerify()}
          style={({ pressed }) => [
            styles.button,
            (pressed || pending) && styles.buttonPressed,
            (!codeValid || pending) && styles.buttonDisabled,
          ]}
        >
          {pending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonLabel}>Verify email</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={resending}
          onPress={() => void onResend()}
          style={styles.linkButton}
        >
          <Text style={styles.link}>
            {resending ? 'Sending…' : 'Resend verification code'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={pending || resending}
          onPress={() => void signOut()}
          style={styles.linkButton}
        >
          <Text style={styles.secondaryLink}>Use a different account</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 20,
  },
  brand: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandText,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  body: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  label: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  pinInput: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  developmentCode: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  success: {
    marginTop: 14,
    color: colors.brandText,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    marginTop: 14,
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  linkButton: { marginTop: 16, alignItems: 'center' },
  link: { color: colors.brandText, fontSize: 14, fontWeight: '700' },
  secondaryLink: { color: colors.muted, fontSize: 14, fontWeight: '600' },
});
