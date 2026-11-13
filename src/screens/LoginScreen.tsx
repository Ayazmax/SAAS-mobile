import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import type { AuthStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit() {
    setPending(true);
    setError(undefined);
    try {
      await signIn(email, password);
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Could not sign in. Check your email and password.',
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
      <View style={styles.card}>
        <Text style={styles.brand}>DreamWare</Text>
        <Text style={styles.title}>Cleaner sign in</Text>
        <Text style={styles.body}>
          Sign in to see your cleaning schedule and manage assigned visits.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
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
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={pending || !email.trim() || !password}
          onPress={() => {
            void onSubmit();
          }}
          style={({ pressed }) => [
            styles.button,
            (pressed || pending) && styles.buttonPressed,
            (!email.trim() || !password) && styles.buttonDisabled,
          ]}
        >
          {pending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonLabel}>Sign in</Text>
          )}
        </Pressable>

        <View style={styles.accountRow}>
          <Text style={styles.accountText}>New to DreamWare?</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.link}>Create account</Text>
          </Pressable>
        </View>
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
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  accountRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  accountText: {
    color: colors.muted,
    fontSize: 14,
  },
  link: {
    color: colors.brandText,
    fontSize: 14,
    fontWeight: '700',
  },
});
