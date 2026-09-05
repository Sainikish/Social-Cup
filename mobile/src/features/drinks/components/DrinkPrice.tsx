import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '../../../theme';

export interface DrinkPriceProps {
  retailPrice: number | null;
  creditPrice: number;
}

// Shared by DrinkCard and the drink detail screen (and used by CafeDrinkList
// in the cafes feature too) - one place for "$X.XX" + "N credit(s)"
// formatting rather than three copies of the same logic drifting apart.
export function DrinkPrice({ retailPrice, creditPrice }: DrinkPriceProps) {
  return (
    <View style={styles.row}>
      {retailPrice != null ? <Text style={styles.price}>${retailPrice.toFixed(2)}</Text> : null}
      <Text style={styles.creditPrice}>
        {creditPrice} credit{creditPrice === 1 ? '' : 's'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  price: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  creditPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
