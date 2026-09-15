import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../src/api/client';
import { Button, TextInput } from '../../src/components';
import {
  useAuth,
  validateEmail,
  validateNewPassword,
  validateVerificationCode,
  verificationCodeErrorMessage,
} from '../../src/features/auth';
import { colors, fontSize, fontWeight, spacing } from '../../src/theme';
import { extractFieldErrors } from '../../src/utils/apiErrors';

interface ResetPasswordFieldErrors {
  email?: string;
  code?: string;
  newPassword?: string;
}

// Arrived at only from forgot-password.tsx, which always forwards here with
// the email the member typed - editable in case they need to fix a typo,
// never assumed correct. Success logs the member straight in (see
// AuthContext.resetPassword) - RootNavigator's Stack.Protected guard then
// swaps them into (app) on its own, the same way login/register already do.
export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const resetPasswordMutation = useMutation({
    mutationFn: () => resetPassword({ email: email.trim(), code: code.trim(), newPassword }),
    onError: (error) => {
      const apiError = toApiError(error);
      const serverFieldErrors = extractFieldErrors(apiError);
      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors(serverFieldErrors);
        return;
      }
      setFormError(verificationCodeErrorMessage(apiError.code));
    },
  });

  function handleSubmit() {
    setFormError(null);

    const nextFieldErrors: ResetPasswordFieldErrors = {
      email: validateEmail(email),
      code: validateVerificationCode(code),
      newPassword: validateNewPassword(newPassword),
    };
    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.email || nextFieldErrors.code || nextFieldErrors.newPassword) {
      return;
    }

    resetPasswordMutation.mutate();
  }

  const isSubmitting = resetPasswordMutation.isPending;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>Enter the code we emailed you and choose a new password.</Text>

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
            label="Code"
            accessibilityLabel="Code"
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            keyboardType="number-pad"
            errorMessage={fieldErrors.code}
            editable={!isSubmitting}
            returnKeyType="next"
          />
          <TextInput
            label="New Password"
            accessibilityLabel="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            textContentType="newPassword"
            errorMessage={fieldErrors.newPassword}
            editable={!isSubmitting}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {formError ? (
            <Text style={styles.formError} accessibilityRole="alert">
              {formError}
            </Text>
          ) : null}

          <Button label="Reset Password" onPress={handleSubmit} loading={isSubmitting} disabled={isSubmitting} />
        </View>
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
});
