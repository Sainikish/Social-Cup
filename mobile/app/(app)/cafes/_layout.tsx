import { Stack } from 'expo-router';

import { colors } from '../../../src/theme';

// Nested Stack inside the "Cafes" tab: the tab bar stays visible while
// browsing (index) and navigating into a cafe's own detail screen ([id]),
// which shows its own header (the cafe's name) rather than a generic tab
// title - see the Tabs.Screen options in app/(app)/_layout.tsx.
export default function CafesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Cafes' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  );
}
