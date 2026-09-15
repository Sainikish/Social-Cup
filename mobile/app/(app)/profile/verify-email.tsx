import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../../src/api/client';
import { Button, TextInput } from '../../../src/components';
import { useAuth, validateVerificationCode, verificationCodeErrorMessage } from '../../../src/features/auth';
import { colors, fontSize, fontWeight, spacing } from '../../../src/theme';

// Reached only from ProfileScreen's "Verify email" button, which only shows
// while user.emailVerified is false. A code was already sent once at
// registration - "Resend code" below is for when that one expired or never
// arrived, not a first send.
export default function VerifyEmailScreen() {
  const { user, verifyEmail, resendVerificationEmail } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const verifyMutation = useMutation({
    mutationFn: () => verifyEmail(code.trim()),
    onSuccess: () => router.back(),
    onError: (error) => setFormError(verificationCodeErrorMessage(toApiError(error).code)),
  });

  const resendMutation = useMutation({
    mutationFn: () => resendVerificationEmail(),
    onSuccess: () => {
      setFormError(null);
      setResendMessage('A new code has been sent to your email.');
    },
    onError: (error) => setFormError(verificationCodeErrorMessage(toApiError(error).code)),
  });

  function handleSubmit() {
    setFormError(null);
    setResendMessage(null);
    const nextCodeError = validateVerificationCode(code);
    setCodeError(nextCodeError);
    if (nextCodeError) {
      return;
    }
    verifyMutation.mutate();
  }

  function handleResend() {
    setFormError(null);
    setResendMessage(null);
    resendMutation.mutate();
  }

  const isSubmitting = verifyMutation.isPending;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>
        {user?.email
          ? `Enter the code we sent to ${user.email}.`
          : 'Enter the code we emailed you.'}
      </Text>

      <View style={styles.form}>
        <TextInput
          label="Code"
          accessibilityLabel="Code"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          keyboardType="number-pad"
          errorMessage={codeError}
          editable={!isSubmitting}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        {formError ? (
          <Text style={styles.formError} accessibilityRole="alert">
            {formError}
          </Text>
        ) : null}
        {resendMessage ? (
          <Text style={styles.successMessage} accessibilityRole="alert">
            {resendMessage}
          </Text>
        ) : null}

        <Button label="Verify" onPress={handleSubmit} loading={isSubmitting} disabled={isSubmitting} />
        <Button
          label="Resend Code"
          variant="outline"
          onPress={handleResend}
          loading={resendMutation.isPending}
          disabled={resendMutation.isPending || isSubmitting}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
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
  successMessage: {
    fontSize: fontSize.sm,
    color: colors.success,
  },
});
