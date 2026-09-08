import { useCallback, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { toApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, TextField } from '../components';
import { redemptionErrorMessage, useRedeemCodeMutation, type RedemptionOutcome } from '../features/redemption';
import { useQrScanner } from '../hooks/useQrScanner';
import styles from './ScannerScreen.module.css';

export function ScannerScreen() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const redeemMutation = useRedeemCodeMutation();
  const [manualCode, setManualCode] = useState('');

  // Both the scanner-decoded path and the manual-entry path funnel through
  // this one function, so duplicate-submission protection (the `isPending`
  // check) and the outcome navigation only need to be written once.
  const submitCode = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed || redeemMutation.isPending) {
        return;
      }
      redeemMutation.mutate(trimmed, {
        onSuccess: (data) => {
          const outcome: RedemptionOutcome = { status: 'success', data };
          navigate('/result', { state: { outcome }, replace: true });
        },
        onError: (error) => {
          const apiError = toApiError(error);
          const outcome: RedemptionOutcome = {
            status: 'error',
            message: redemptionErrorMessage(apiError.code, apiError.message),
          };
          navigate('/result', { state: { outcome }, replace: true });
        },
      });
    },
    [navigate, redeemMutation]
  );

  const { videoRef, status: scannerStatus, start: startScanner } = useQrScanner({ onDecode: submitCode });

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitCode(manualCode);
    setManualCode('');
  }

  const isSubmitting = redeemMutation.isPending;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Scan a code</h1>
        <Button label="Log out" variant="outline" className={styles.logoutButton} onClick={logout} />
      </header>

      <Card className={styles.scannerCard}>
        {scannerStatus === 'idle' ? (
          <div className={styles.placeholder}>
            <p>Point the camera at the member&apos;s QR code.</p>
            <Button label="Start Scanner" onClick={() => void startScanner()} />
          </div>
        ) : scannerStatus === 'unavailable' ? (
          <div className={styles.placeholder}>
            <p className={styles.unavailable}>Camera unavailable.</p>
            <p>Enter the code manually below.</p>
          </div>
        ) : (
          <div className={styles.videoWrapper}>
            <video ref={videoRef} className={styles.video} playsInline muted>
              <track kind="captions" />
            </video>
            {scannerStatus === 'requesting' ? <p className={styles.hint}>Requesting camera access…</p> : null}
          </div>
        )}
      </Card>

      <form className={styles.manualForm} onSubmit={handleManualSubmit}>
        <TextField
          id="manual-code"
          label="Enter code manually"
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value)}
          autoComplete="off"
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          label="Redeem"
          loading={isSubmitting}
          disabled={isSubmitting || manualCode.trim().length === 0}
        />
      </form>
    </div>
  );
}
