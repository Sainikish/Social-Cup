import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { toApiError } from '../../../src/api/client';
import { DrinkList, useSignatureDrinksQuery } from '../../../src/features/drinks';
import { colors } from '../../../src/theme';
import { genericErrorMessage } from '../../../src/utils/apiErrors';

// GET /drinks/signature is the only drink discovery/listing endpoint the
// backend exposes (verified against DrinkController.java) - no search or
// filter parameters exist for drinks, so unlike the Cafes tab there is no
// search bar or filter row here. See the Phase 7.4 report's "Search/Filter
// Behavior" section for why that's a backend limitation, not an oversight.
export default function DrinksScreen() {
  const router = useRouter();
  const signatureQuery = useSignatureDrinksQuery();

  const drinks = useMemo(
    () => signatureQuery.data?.pages.flatMap((page) => page.content) ?? [],
    [signatureQuery.data]
  );

  return (
    <View style={styles.container}>
      <DrinkList
        drinks={drinks}
        isLoading={signatureQuery.isLoading}
        isError={signatureQuery.isError}
        errorMessage={
          signatureQuery.error ? genericErrorMessage(toApiError(signatureQuery.error)) : undefined
        }
        onRetry={() => void signatureQuery.refetch()}
        isRefreshing={signatureQuery.isRefetching && !signatureQuery.isFetchingNextPage}
        onRefresh={() => void signatureQuery.refetch()}
        hasNextPage={Boolean(signatureQuery.hasNextPage)}
        isFetchingNextPage={signatureQuery.isFetchingNextPage}
        onEndReached={() => void signatureQuery.fetchNextPage()}
        onDrinkPress={(drinkId) => router.push(`/(app)/drinks/${drinkId}`)}
        emptyTitle="No signature drinks available"
        emptyDescription="Check back soon for hand-picked drinks from our cafes."
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
