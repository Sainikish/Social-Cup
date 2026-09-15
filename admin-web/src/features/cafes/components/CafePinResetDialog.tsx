import { useState } from 'react';

import { Button, Card } from '../../../components';
import styles from './CafePinResetDialog.module.css';

export interface CafePinResetDialogProps {
  open: boolean;
  pin: string | null;
  onDismiss: () => void;
}

// Shows a freshly-reset PIN exactly once, the common "reveal once" security
// pattern - nothing here persists the plaintext PIN anywhere client-side
// (no localStorage/sessionStorage, no query cache): it lives only in the
// `pin` prop the caller holds in local component state, and dismissing this
// dialog is expected to be paired with the caller clearing that state too
// (see CafeDetail.tsx), so the value is gone from memory once closed.
export function CafePinResetDialog({ open, pin, onDismiss }: CafePinResetDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!open || !pin) {
    return null;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pin!);
      setCopied(true);
    } catch {
      // Clipboard access can be unavailable/denied - the PIN is still shown
      // on screen either way, so this is a convenience only, never the only
      // way to read it.
      setCopied(false);
    }
  }

  function handleDismiss() {
    setCopied(false);
    onDismiss();
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="cafe-pin-reset-dialog-title">
      <Card className={styles.dialog}>
        <h2 id="cafe-pin-reset-dialog-title" className={styles.title}>
          New barista PIN
        </h2>
        <p className={styles.body}>
          Share this PIN with the cafe&apos;s barista staff. It will not be shown again after you close this
          dialog - resetting it again is the only way to see a new one.
        </p>

        <p className={styles.pin} aria-label="New PIN">
          {pin}
        </p>

        <p className={styles.warning}>Any previously issued PIN and signed-in barista devices stop working now.</p>

        <div className={styles.actions}>
          <Button label={copied ? 'Copied' : 'Copy PIN'} variant="outline" onClick={handleCopy} />
          <Button label="Done" onClick={handleDismiss} />
        </div>
      </Card>
    </div>
  );
}
