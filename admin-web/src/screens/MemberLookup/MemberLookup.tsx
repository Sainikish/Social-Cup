import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Input } from '../../components';
import styles from './MemberLookup.module.css';

// There is no admin member-list endpoint and no admin member-search
// endpoint on the backend (AdminMemberController exposes only suspend and
// reactivate) - this screen is NOT a member directory. It exists solely to
// route a known member ID to /members/:memberId, exactly like Cafe's
// "open by ID" fallback, except here it is the only entry point rather
// than a fallback.
export function MemberLookup() {
  const [memberId, setMemberId] = useState('');
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = memberId.trim();
    if (trimmed) {
      navigate(`/members/${trimmed}`);
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Members</h1>

      <Card className={styles.notice}>
        <p className={styles.noticeText}>
          Member listing and member search both require a backend API that does not exist yet, and are deferred.
          Credit balance and redemption history also require backend APIs that do not exist yet, and are deferred.
          Enter a known member ID below to suspend or reactivate that member.
        </p>
      </Card>

      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          id="member-lookup-id"
          label="Member ID"
          value={memberId}
          onChange={(event) => setMemberId(event.target.value)}
        />
        <Button type="submit" label="Open" className={styles.submitButton} />
      </form>
    </div>
  );
}
