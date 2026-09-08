import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button, Input } from '../../components';
import { AdminAccessRequiredError, loginErrorMessage } from '../../utils/errors';
import styles from './Login.module.css';

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return 'Email is required.';
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    return 'Enter a valid email address.';
  }
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) {
    return 'Password is required.';
  }
  return undefined;
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: () => login(email.trim(), password),
    onSuccess: () => {
      navigate('/dashboard', { replace: true });
    },
    onError: (error) => {
      // AdminAccessRequiredError means the credentials were valid but the
      // member is not an ADMIN - a distinct, safe message from a wrong
      // password, and no admin API call was ever attempted for it (see
      // AuthContext.login).
      if (error instanceof AdminAccessRequiredError) {
        setFormError(error.message);
        return;
      }
      setFormError(loginErrorMessage(toApiError(error).code));
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const nextFieldErrors: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.email || nextFieldErrors.password) {
      return;
    }

    loginMutation.mutate();
  }

  const isSubmitting = loginMutation.isPending;

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>Social Cup Admin</h1>
        <p className={styles.subtitle}>Log in with your administrator account.</p>

        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          errorMessage={fieldErrors.email}
          disabled={isSubmitting}
        />

        <Input
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          errorMessage={fieldErrors.password}
          disabled={isSubmitting}
        />

        {formError ? (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        ) : null}

        <Button type="submit" label="Log In" loading={isSubmitting} disabled={isSubmitting} />
      </form>
    </div>
  );
}
