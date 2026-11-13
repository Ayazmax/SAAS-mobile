import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { ApiRequestError } from '../lib/api';
import { webUrl } from '../lib/env';
import { colors } from '../theme';

const passwordRules = [
  { label: '12 or more characters', test: (value: string) => value.length >= 12 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
];

export function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const passwordValid = passwordRules.every((rule) => rule.test(password));
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit =
    Boolean(email.trim()) &&
    passwordValid &&
    passwordsMatch &&
    acceptedPolicies &&
    !pending;

  async function onSubmit() {
    if (!canSubmit) return;
    setPending(true);
    setError(undefined);
    try {
      await register(email, password, acceptedPolicies);
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Could not create your account. Please try again.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.brand}>DreamWare</Text>
          <Text style={styles.title}>Create cleaner account</Text>
          <Text style={styles.body}>
            Use the same email address your cleaning business added for you.
            Other email addresses cannot register.
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            autoComplete="new-password"
            secureTextEntry
            placeholder="Create a password"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          <View style={styles.rules}>
            {passwordRules.map((rule) => {
              const met = rule.test(password);
              return (
                <Text key={rule.label} style={[styles.rule, met && styles.ruleMet]}>
                  {met ? '✓' : '•'} {rule.label}
                </Text>
              );
            })}
          </View>

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            autoComplete="new-password"
            secureTextEntry
            placeholder="Repeat your password"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {confirmPassword && !passwordsMatch ? (
            <Text style={styles.inlineError}>Passwords do not match.</Text>
          ) : null}

          <View style={styles.policyRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="Accept the Terms of Service and Privacy Policy"
              accessibilityState={{ checked: acceptedPolicies }}
              onPress={() => setAcceptedPolicies((accepted) => !accepted)}
              style={[
                styles.checkbox,
                acceptedPolicies && styles.checkboxChecked,
              ]}
            >
              {acceptedPolicies ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : null}
            </Pressable>
            <Text style={styles.policyText}>
              I agree to the{' '}
              <Text
                style={styles.policyLink}
                onPress={() => void Linking.openURL(`${webUrl}/terms`)}
              >
                Terms of Service
              </Text>{' '}
              and acknowledge the{' '}
              <Text
                style={styles.policyLink}
                onPress={() => void Linking.openURL(`${webUrl}/privacy`)}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={() => void onSubmit()}
            style={({ pressed }) => [
              styles.button,
              (pressed || pending) && styles.buttonPressed,
              !canSubmit && styles.buttonDisabled,
            ]}
          >
            {pending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonLabel}>Create account</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
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
    marginTop: 12,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
  rules: { marginTop: 10, gap: 4 },
  rule: { color: colors.muted, fontSize: 13 },
  ruleMet: { color: colors.brandText, fontWeight: '600' },
  inlineError: { marginTop: 6, color: colors.danger, fontSize: 13 },
  policyRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    marginTop: 2,
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  checkmark: { color: '#fff', fontWeight: '800', fontSize: 13 },
  policyText: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 20 },
  policyLink: { color: colors.brandText, fontWeight: '700' },
  error: {
    marginTop: 14,
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
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
});
