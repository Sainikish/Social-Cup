import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TextInput } from '../../../components';
import { colors, fontSize, spacing } from '../../../theme';

export interface CafeSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function CafeSearchBar({ value, onChangeText }: CafeSearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search cafes by name or vibe"
          accessibilityLabel="Search cafes"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          style={styles.clearButton}
        >
          <Text style={styles.clearButtonText}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  clearButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
