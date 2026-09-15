import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import brandMark from '../assets/brand-mark.png';
import loginHero from '../assets/login-hero.jpg';
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
    <div className={styles.page}>
      <div className={styles.heroPanel} style={{ backgroundImage: `url(${loginHero})` }}>
        <div className={styles.heroOverlay}>
          <span className={styles.heroBadge}>Social Cup</span>
          <h2 className={styles.heroTitle}>Ready behind the counter.</h2>
          <p className={styles.heroSubtitle}>Scan codes and redeem drinks in seconds.</p>
        </div>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.card}>
          <img className={styles.badge} src={brandMark} alt="" aria-hidden="true" />
          <h1 className={styles.title}>Social Cup Barista</h1>
          <p className={styles.subtitle}>Log in with your cafe and PIN.</p>

          <form className={styles.form} onSubmit={handleSubmit}>
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
      </div>
    </div>
  );
}
