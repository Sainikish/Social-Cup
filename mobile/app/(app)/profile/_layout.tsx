import { Stack } from 'expo-router';

import { colors } from '../../../src/theme';

// Nested Stack inside the "Profile" tab, mirroring app/(app)/cafes/_layout.tsx
// and app/(app)/drinks/_layout.tsx exactly: the tab bar stays visible while
// on the profile screen (index) and while viewing the drink diary (diary),
// which gets its own header rather than a generic tab title - see the
// Tabs.Screen options in app/(app)/_layout.tsx.
export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="diary" options={{ title: 'My Drink Diary' }} />
    </Stack>
  );
}
