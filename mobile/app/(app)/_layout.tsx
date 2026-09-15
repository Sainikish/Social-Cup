import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors } from '../../src/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Filled icon when the tab is active, outline when it isn't - a widely
// recognized convention that reads at a glance without needing to read the
// label text underneath it.
function tabIcon(active: IoniconName, inactive: IoniconName) {
  function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={size} color={color as string} />;
  }
  return TabIcon;
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="cafes"
        options={{ title: 'Cafes', headerShown: false, tabBarIcon: tabIcon('storefront', 'storefront-outline') }}
      />
      <Tabs.Screen
        name="drinks"
        options={{ title: 'Drinks', headerShown: false, tabBarIcon: tabIcon('cafe', 'cafe-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', headerShown: false, tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}
