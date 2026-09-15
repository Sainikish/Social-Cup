import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../src/api/client';
import { Button, TextInput } from '../../src/components';
import { loginErrorMessage, useAuth, validateEmail, validateRequiredPassword } from '../../src/features/auth';
import { colors, fontSize, fontWeight, spacing } from '../../src/theme';
import { extractFieldErrors } from '../../src/utils/apiErrors';

interface LoginFieldErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: () => login({ email: email.trim(), password }),
    onError: (error) => {
      const apiError = toApiError(error);
      const serverFieldErrors = extractFieldErrors(apiError);
      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors(serverFieldErrors);
        return;
      }
      setFormError(loginErrorMessage(apiError.code));
    },
  });

  function handleSubmit() {
    setFormError(null);

    const nextFieldErrors: LoginFieldErrors = {
      email: validateEmail(email),
      password: validateRequiredPassword(password),
    };
    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.email || nextFieldErrors.password) {
      return;
    }

    loginMutation.mutate();
  }

  const isSubmitting = loginMutation.isPending;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image source={require('../../assets/login-hero.jpg')} style={styles.hero} resizeMode="cover" />

        <View style={styles.content}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to continue to Social Cup.</Text>

          <View style={styles.form}>
            <TextInput
              label="Email"
              accessibilityLabel="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              errorMessage={fieldErrors.email}
              editable={!isSubmitting}
              returnKeyType="next"
            />
            <TextInput
              label="Password"
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              errorMessage={fieldErrors.password}
              editable={!isSubmitting}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {formError ? (
              <Text style={styles.formError} accessibilityRole="alert">
                {formError}
              </Text>
            ) : null}

            <Button label="Log In" onPress={handleSubmit} loading={isSubmitting} disabled={isSubmitting} />
          </View>

          <Link href="/(auth)/forgot-password" style={styles.link}>
            <Text style={styles.linkText}>Forgot your password?</Text>
          </Link>
          <Link href="/(auth)/register" style={styles.link}>
            <Text style={styles.linkText}>Don&apos;t have an account? Create one</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  // The image's own bottom edge already fades to colors.background (see
  // the asset itself) - no card/shadow needed for the content below it to
  // read as one continuous surface, not two stacked panels.
  hero: {
    width: '100%',
    height: 300,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.md,
  },
  formError: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  link: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
  },
  linkText: {
    fontSize: fontSize.sm,
    color: colors.accent,
  },
});
