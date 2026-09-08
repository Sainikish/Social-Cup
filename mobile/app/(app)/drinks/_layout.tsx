import { Stack } from 'expo-router';

import { colors } from '../../../src/theme';

// Mirrors app/(app)/cafes/_layout.tsx's structure exactly: a nested Stack
// inside the "Drinks" tab, so the tab bar stays visible while browsing
// (index) and navigating into a drink's own detail screen ([id]), which
// shows its own header (the drink's name) rather than a generic tab title -
// see the Tabs.Screen options in app/(app)/_layout.tsx.
export default function DrinksLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Drinks' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="redeem" options={{ title: 'Redeem' }} />
    </Stack>
  );
}
