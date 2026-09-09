import { onlineManager } from '@tanstack/react-query';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect } from 'react';

// TanStack Query's default connectivity detection listens for the browser's
// `online`/`offline` events, which do not exist in React Native - without
// this, `onlineManager` reports "always online", so `refetchOnReconnect`
// (see src/lib/queryClient.ts) never actually fires when the device regains
// a connection after being offline. Wiring onlineManager to NetInfo is
// TanStack Query's own documented React Native setup and fixes exactly that
// gap, the same way useAppStateFocusManager wires focusManager to AppState.
export function useOnlineManager(): void {
  useEffect(() => {
    function onConnectivityChange(state: NetInfoState): void {
      onlineManager.setOnline(state.isConnected === true);
    }

    const unsubscribe = NetInfo.addEventListener(onConnectivityChange);
    return unsubscribe;
  }, []);
}
