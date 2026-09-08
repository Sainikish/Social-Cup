import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { Button, Card } from '../../components';
import styles from './Dashboard.module.css';

// Placeholder only, per Phase 1 scope - no metrics, no subscription/
// redemption/payout/audit-log data of any kind. Drink management is reached
// via Cafe Detail rather than linked here directly (a drink always belongs
// to a specific cafe). Member Management (Phase 4) has no list/search to
// browse from here either - see MemberLookup for why.
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
        <div className={styles.navButtons}>
          <Button label="Manage Cafes" onClick={() => navigate('/cafes')} className={styles.manageCafesButton} />
          <Button label="Manage Members" onClick={() => navigate('/members')} className={styles.manageCafesButton} />
        </div>
      </Card>
    </div>
  );
}
