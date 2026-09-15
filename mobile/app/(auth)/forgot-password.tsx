import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../src/api/client';
import { Button, TextInput } from '../../src/components';
import { useAuth, validateEmail } from '../../src/features/auth';
import { colors, fontSize, fontWeight, spacing } from '../../src/theme';

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Always moves forward to the code-entry screen, on purpose - the backend
  // itself never reveals whether the email is registered (see
  // AuthService.forgotPassword), so a request that reached the server
  // successfully has nothing left to distinguish here. Only a genuine
  // network failure (the request never reached the server at all) is worth
  // stopping and showing an error for.
  async function handleSubmit() {
    setFormError(null);
    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    if (nextEmailError) {
      return;
    }

    const trimmedEmail = email.trim();
    setIsSubmitting(true);
    try {
      await forgotPassword({ email: trimmedEmail });
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === 'NETWORK_ERROR' || apiError.code === 'REQUEST_TIMEOUT') {
        setFormError('Could not reach the server. Check your connection and try again.');
        setIsSubmitting(false);
        return;
      }
    }
    setIsSubmitting(false);
    router.push({ pathname: '/(auth)/reset-password', params: { email: trimmedEmail } });
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Forgot your password?</Text>
        <Text style={styles.subtitle}>
          Enter your email and we&apos;ll send you a code to reset your password.
        </Text>

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
            errorMessage={emailError}
            editable={!isSubmitting}
            returnKeyType="done"
            onSubmitEditing={() => void handleSubmit()}
          />

          {formError ? (
            <Text style={styles.formError} accessibilityRole="alert">
              {formError}
            </Text>
          ) : null}

          <Button
            label="Send Code"
            onPress={() => void handleSubmit()}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
        </View>

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>Back to log in</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: 'center',
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
