import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TextInput } from '../../../components';
import { colors, fontSize, fontWeight, radius, spacing } from '../../../theme';

export interface CafeFiltersProps {
  neighbourhood: string;
  onNeighbourhoodChange: (value: string) => void;
  featured: boolean;
  onFeaturedChange: (value: boolean) => void;
  // The backend's search endpoint (GET /cafes/search) does not accept a
  // "featured" parameter - only the plain list endpoint (GET /cafes) does
  // (see backend CafeController). The featured toggle is only meaningful
  // outside of an active text search, so it's hidden rather than shown
  // disabled/misleading while searching.
  showFeaturedToggle: boolean;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function CafeFilters({
  neighbourhood,
  onNeighbourhoodChange,
  featured,
  onFeaturedChange,
  showFeaturedToggle,
  onClear,
  hasActiveFilters,
}: CafeFiltersProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.neighbourhoodInput}>
          <TextInput
            value={neighbourhood}
            onChangeText={onNeighbourhoodChange}
            placeholder="Neighbourhood"
            accessibilityLabel="Filter by neighbourhood"
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>

        {showFeaturedToggle ? (
          <Pressable
            onPress={() => onFeaturedChange(!featured)}
            accessibilityRole="button"
            accessibilityLabel="Show featured cafes only"
            accessibilityState={{ selected: featured }}
            style={[styles.featuredToggle, featured && styles.featuredToggleActive]}
          >
            <Text style={[styles.featuredToggleText, featured && styles.featuredToggleTextActive]}>
              Featured
            </Text>
          </Pressable>
        ) : null}
      </View>

      {hasActiveFilters ? (
        <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel="Clear filters">
          <Text style={styles.clearText}>Clear filters</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  neighbourhoodInput: {
    flex: 1,
  },
  featuredToggle: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  featuredToggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  featuredToggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  featuredToggleTextActive: {
    color: colors.onPrimary,
  },
  clearText: {
    fontSize: fontSize.xs,
    color: colors.accent,
  },
});
