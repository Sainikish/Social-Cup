import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DrinkPhoto, DrinkPrice } from '../../drinks';
import { EmptyState } from '../../../components';
import { colors, fontSize, fontWeight, spacing } from '../../../theme';
import type { DrinkResponse } from '../types';

export interface CafeDrinkListProps {
  drinks: DrinkResponse[];
  onDrinkPress: (drinkId: string) => void;
}

const PHOTO_SIZE = 56;

// Rendered inline (not a FlatList) - a cafe's active menu is a small,
// bounded list, and this is already composed inside the detail screen's own
// ScrollView, so a second virtualized list here would be the exact nested-
// virtualization anti-pattern to avoid. Photo/price rendering is shared with
// the drinks feature's own DrinkCard (see src/features/drinks/components) -
// same backend DrinkResponse shape, same display rules, one implementation.
export function CafeDrinkList({ drinks, onDrinkPress }: CafeDrinkListProps) {
  if (drinks.length === 0) {
    return (
      <EmptyState
        title="No drinks listed yet"
        description="This cafe hasn't added any drinks to their menu."
      />
    );
  }

  return (
    <View style={styles.container}>
      {drinks.map((drink) => (
        <Pressable
          key={drink.id}
          onPress={() => onDrinkPress(drink.id)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${drink.name} details`}
          style={styles.row}
        >
          <DrinkPhoto photoUrl={drink.photoUrl} size={PHOTO_SIZE} accessibilityLabel={drink.name} />

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {drink.name}
              </Text>
              {drink.signature ? <Text style={styles.signatureBadge}>★ Signature</Text> : null}
            </View>
            {drink.type ? <Text style={styles.type}>{drink.type}</Text> : null}
            <DrinkPrice retailPrice={drink.retailPrice} creditPrice={drink.creditPrice} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  signatureBadge: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: fontWeight.medium,
  },
  type: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
