import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { toApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, TextField } from '../components';
import { baristaLoginErrorMessage, CafeSearchSelect, type CafeSummaryResponse } from '../features/cafeLogin';
import styles from './LoginScreen.module.css';

export function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [cafe, setCafe] = useState<CafeSummaryResponse | null>(null);
  const [pin, setPin] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!cafe) {
        throw new Error('No cafe selected');
      }
      await login(cafe.id, pin);
    },
    onSuccess: () => {
      navigate('/scanner', { replace: true });
    },
    onError: (error) => {
      setFormError(baristaLoginErrorMessage(toApiError(error).code));
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!cafe || pin.trim().length === 0) {
      setFormError('Please select a cafe and enter the PIN.');
      return;
    }

    loginMutation.mutate();
  }

  const isSubmitting = loginMutation.isPending;

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Social Cup Barista</h1>
        <p className={styles.subtitle}>Log in with your cafe and PIN.</p>

        <CafeSearchSelect value={cafe} onSelect={setCafe} onClear={() => setCafe(null)} />

        <TextField
          id="cafe-pin"
          label="PIN"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          disabled={isSubmitting}
        />

        {formError ? (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        ) : null}

        <Button type="submit" label="Log In" loading={isSubmitting} disabled={isSubmitting} />
      </form>
    </div>
  );
}
