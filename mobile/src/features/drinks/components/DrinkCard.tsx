import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../../components';
import { colors, fontSize, fontWeight, spacing } from '../../../theme';
import type { DrinkResponse } from '../types';
import { DrinkPhoto } from './DrinkPhoto';
import { DrinkPrice } from './DrinkPrice';

export interface DrinkCardProps {
  drink: DrinkResponse;
  onPress: (drinkId: string) => void;
}

const PHOTO_SIZE = 64;

export function DrinkCard({ drink, onPress }: DrinkCardProps) {
  return (
    <Pressable
      onPress={() => onPress(drink.id)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${drink.name} details`}
    >
      <Card style={styles.card}>
        <DrinkPhoto photoUrl={drink.photoUrl} size={PHOTO_SIZE} accessibilityLabel={drink.name} />

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {drink.name}
            </Text>
            {drink.signature ? <Text style={styles.signatureBadge}>★ Signature</Text> : null}
          </View>
          <Text style={styles.cafeName} numberOfLines={1}>
            {drink.cafeName}
          </Text>
          {drink.type ? <Text style={styles.type}>{drink.type}</Text> : null}
          <DrinkPrice retailPrice={drink.retailPrice} creditPrice={drink.creditPrice} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  cafeName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  type: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
