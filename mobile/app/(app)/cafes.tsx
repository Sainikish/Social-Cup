import { View, StyleSheet } from 'react-native';

import { EmptyState } from '../../src/components';
import { colors } from '../../src/theme';

// Placeholder only - the real cafe list/search (backed by GET /cafes) is a
// later phase.
export default function CafesScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        title="Cafes coming soon"
        description="Cafe discovery will be implemented in a later phase."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
