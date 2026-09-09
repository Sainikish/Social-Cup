import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { toApiError } from '../../api/client';
import { Button, Card, ErrorState, LoadingState } from '../../components';
import { drinkErrorMessage, useDrinksByCafeQuery } from '../../features/drinks';
import styles from './DrinkList.module.css';

interface DrinkListLocationState {
  cafeName?: string;
}

// There is no admin drink-list endpoint, so this screen calls the same
// public GET /cafes/{id}/drinks mobile/barista-web use - which the backend
// hardcodes to ACTIVE drinks only (DrinkService.getDrinksByCafe). This is
// therefore NOT "All Drinks" for the cafe; inactive/archived drinks never
// appear here, and that limitation is stated explicitly below.
export function DrinkList() {
  const { cafeId } = useParams<{ cafeId: string }>();
  const location = useLocation();
  const cafeName = (location.state as DrinkListLocationState | null)?.cafeName;
  const navigate = useNavigate();

  const drinksQuery = useDrinksByCafeQuery(cafeId);

  if (!cafeId) {
    return <ErrorState message="No cafe was specified." />;
  }

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/cafes">Cafes</Link> <span aria-hidden="true">/</span>{' '}
        <Link to={`/cafes/${cafeId}`}>{cafeName ?? cafeId}</Link> <span aria-hidden="true">/</span> <span>Drinks</span>
      </nav>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Drinks</h1>
          <p className={styles.subtitle}>{cafeName ?? `Cafe ${cafeId}`}</p>
        </div>
        <Button
          label="Add Drink"
          onClick={() => navigate(`/cafes/${cafeId}/drinks/new`, { state: { cafeName } })}
          className={styles.addButton}
        />
      </header>

      <Card className={styles.notice}>
        <p className={styles.noticeText}>
          There is no admin drink-list endpoint yet. This shows the same public,{' '}
          <strong>active-drinks-only</strong> list mobile/barista-web use (<code>GET /cafes/{'{id}'}/drinks</code>) -
          inactive and archived drinks will not appear here.
        </p>
      </Card>

      {drinksQuery.isLoading ? <LoadingState label="Loading drinks…" /> : null}
      {drinksQuery.isError ? (
        <ErrorState
          message={drinkErrorMessage(toApiError(drinksQuery.error).code)}
          onRetry={() => drinksQuery.refetch()}
        />
      ) : null}
      {drinksQuery.isSuccess && drinksQuery.data.content.length === 0 ? (
        <p className={styles.emptyMessage}>No active drinks at this cafe yet.</p>
      ) : null}

      {drinksQuery.isSuccess && drinksQuery.data.content.length > 0 ? (
        <ul className={styles.resultList}>
          {drinksQuery.data.content.map((drink) => (
            <li key={drink.id}>
              <Link
                to={`/drinks/${drink.id}`}
                state={{ drink, cafeName }}
                className={styles.resultLink}
              >
                {drink.photoUrl ? <img src={drink.photoUrl} alt={drink.name} className={styles.thumbnail} /> : null}
                <span className={styles.resultText}>
                  <span className={styles.resultNameRow}>
                    <span className={styles.resultName}>{drink.name}</span>
                    {drink.signature ? <span className={styles.signatureBadge}>Signature</span> : null}
                  </span>
                  <span className={styles.resultMeta}>
                    {drink.type ? `${drink.type} · ` : ''}
                    {drink.retailPrice != null ? `$${drink.retailPrice.toFixed(2)}` : 'No retail price'} ·{' '}
                    {drink.creditPrice} credits
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
