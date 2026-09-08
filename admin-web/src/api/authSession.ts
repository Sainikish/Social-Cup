// A tiny pub/sub bridging the Axios interceptor (outside the React tree) and
// AuthContext (inside it) - mirrors mobile/src/api/authSession.ts and
// barista-web/src/api/authSession.ts exactly. When a token refresh fails
// permanently, the interceptor clears the session and calls
// notifyAuthExpired() - it does not, and should not, know how to update
// React state or navigate; AuthContext registers the one handler that does,
// via setOnAuthExpired.
type AuthExpiredHandler = () => void;

let handler: AuthExpiredHandler | null = null;

export function setOnAuthExpired(nextHandler: AuthExpiredHandler | null): void {
  handler = nextHandler;
}

export function notifyAuthExpired(): void {
  handler?.();
}
