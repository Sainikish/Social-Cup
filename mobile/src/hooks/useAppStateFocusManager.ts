import { focusManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// TanStack Query's default focus detection listens for the browser's
// `visibilitychange` event, which does not exist in React Native - without
// this, a stale query (per its staleTime) never refetches just because the
// user backgrounded and re-foregrounded the app; it only refetches the next
// time something re-mounts an observer for it. Wiring focusManager to
// AppState (a core React Native API, not a new dependency) is TanStack
// Query's own documented React Native setup and fixes exactly that gap.
export function useAppStateFocusManager(): void {
  useEffect(() => {
    function onAppStateChange(status: AppStateStatus): void {
      focusManager.setFocused(status === 'active');
    }

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);
}
