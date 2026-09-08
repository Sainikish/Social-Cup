import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { RedemptionResultCard, type RedemptionOutcome } from '../features/redemption';

interface LocationState {
  outcome?: RedemptionOutcome;
}

// The outcome travels here purely as router navigation state (see
// ScannerScreen's submitCode) - there is deliberately no global "last
// redemption result" context anywhere in this app. That means there is
// nothing for logout to separately clear, and reloading/navigating to this
// route directly (with no state) simply has nothing to show, handled below
// by redirecting back to the scanner rather than rendering a blank screen.
export function RedemptionResultScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const outcome = (location.state as LocationState | null)?.outcome;

  useEffect(() => {
    if (!outcome) {
      navigate('/scanner', { replace: true });
    }
  }, [outcome, navigate]);

  if (!outcome) {
    return null;
  }

  return <RedemptionResultCard outcome={outcome} onScanNext={() => navigate('/scanner', { replace: true })} />;
}
