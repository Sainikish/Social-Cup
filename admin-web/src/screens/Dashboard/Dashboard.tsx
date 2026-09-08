import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { Button, Card } from '../../components';
import styles from './Dashboard.module.css';

// Placeholder only, per Phase 1 scope - no metrics, no drink/member/
// subscription/redemption/payout/audit-log data of any kind. Cafe
// Management (Phase 2) is the only feature area linked from here so far;
// the rest remain separate, later implementation phases.
export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Social Cup Admin</h1>
        <Button label="Log out" variant="outline" className={styles.logoutButton} onClick={logout} />
      </header>

      <Card className={styles.card}>
        {user ? <p className={styles.signedInAs}>Signed in as {user.email}</p> : null}
        <p className={styles.placeholder}>More of the dashboard is coming in later implementation phases.</p>
        <Button label="Manage Cafes" onClick={() => navigate('/cafes')} className={styles.manageCafesButton} />
      </Card>
    </div>
  );
}
