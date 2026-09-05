import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../src/api/client';
import { Button, TextInput } from '../../src/components';
import { registerErrorMessage, useAuth, validateEmail, validateNewPassword } from '../../src/features/auth';
import { colors, fontSize, fontWeight, spacing } from '../../src/theme';
import { extractFieldErrors } from '../../src/utils/apiErrors';

interface RegisterFieldErrors {
  email?: string;
  password?: string;
}

// Only fields the backend's RegisterRequest actually accepts (email,
// password, firstName, lastName) - no role selector exists here because the
// backend intentionally always assigns MEMBER on registration; there is
// nothing for this screen to offer instead.
export default function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: () =>
      register({
        email: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      }),
    onError: (error) => {
      const apiError = toApiError(error);
      const serverFieldErrors = extractFieldErrors(apiError);
      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors(serverFieldErrors);
        return;
      }
      setFormError(registerErrorMessage(apiError.code));
    },
  });

  function handleSubmit() {
    setFormError(null);

    const nextFieldErrors: RegisterFieldErrors = {
      email: validateEmail(email),
      password: validateNewPassword(password),
    };
    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.email || nextFieldErrors.password) {
      return;
    }

    registerMutation.mutate();
  }

  const isSubmitting = registerMutation.isPending;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Join Social Cup to start discovering cafes.</Text>

        <View style={styles.form}>
          <TextInput
            label="First name"
            accessibilityLabel="First name"
            value={firstName}
            onChangeText={setFirstName}
            autoComplete="given-name"
            textContentType="givenName"
            editable={!isSubmitting}
            returnKeyType="next"
          />
          <TextInput
            label="Last name"
            accessibilityLabel="Last name"
            value={lastName}
            onChangeText={setLastName}
            autoComplete="family-name"
            textContentType="familyName"
            editable={!isSubmitting}
            returnKeyType="next"
          />
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
            autoComplete="password-new"
            textContentType="newPassword"
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

          <Button
            label="Create Account"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
        </View>

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
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
