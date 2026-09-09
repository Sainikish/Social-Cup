import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingIndicator } from '../src/components';
import { AuthProvider, useAuth } from '../src/features/auth';
import { useAppStateFocusManager } from '../src/hooks/useAppStateFocusManager';
import { useOnlineManager } from '../src/hooks/useOnlineManager';
import { queryClient } from '../src/lib/queryClient';
import { colors } from '../src/theme';

export default function RootLayout() {
  useAppStateFocusManager();
  useOnlineManager();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

// Auth state has three phases: loading (tokens are being read/verified),
// authenticated, unauthenticated. While loading, NEITHER route group is
// mounted - only a loading view is - so no screen ever briefly flashes
// before the real destination is known, and no redirect can happen before
// there's anything settled to redirect based on. Stack.Protected's `guard`
// is expo-router's own supported mechanism for this (replacing the older
// useSegments()-based manual-redirect pattern): an unauthenticated user
// simply cannot navigate into (app), and vice versa.
function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <LoadingIndicator label="Loading your session..." />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={status === 'authenticated'}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={status === 'unauthenticated'}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
