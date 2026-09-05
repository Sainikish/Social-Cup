import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../../api/client';
import { Button, TextInput } from '../../../components';
import { colors, fontSize, fontWeight, spacing } from '../../../theme';
import { extractFieldErrors } from '../../../utils/apiErrors';
import { ratingSubmitErrorMessage } from '../errorMessages';
import { useCreateRatingMutation, useUpdateRatingMutation } from '../hooks';
import { validateRatingNote, validateRatingValue } from '../validation';
import { RatingStars } from './RatingStars';

export interface RatingFormProps {
  drinkId: string;
  mode: 'create' | 'edit';
  /** Required for `mode: 'edit'` - the member's current rating to prefill. */
  initialValue?: { rating: number; note: string | null };
  onSuccess?: () => void;
}

interface RatingFieldErrors {
  rating?: string;
  note?: string;
}

// Create and update share this one form: identical fields, identical
// validation, identical request shape (see CreateRatingRequest/
// UpdateRatingRequest) - only the mutation and the copy differ by mode.
// There is no memberId/userId input anywhere here; identity comes from the
// authenticated request itself (see CurrentUserResolver on the backend).
export function RatingForm({ drinkId, mode, initialValue, onSuccess }: RatingFormProps) {
  const [ratingValue, setRatingValue] = useState<number | undefined>(initialValue?.rating);
  const [note, setNote] = useState(initialValue?.note ?? '');
  const [fieldErrors, setFieldErrors] = useState<RatingFieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const createMutation = useCreateRatingMutation(drinkId);
  const updateMutation = useUpdateRatingMutation(drinkId);
  const mutation = mode === 'create' ? createMutation : updateMutation;
  const isSubmitting = mutation.isPending;

  function handleSubmit() {
    setFormError(undefined);

    const nextFieldErrors: RatingFieldErrors = {
      rating: validateRatingValue(ratingValue),
      note: validateRatingNote(note),
    };
    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.rating || nextFieldErrors.note) {
      return;
    }

    mutation.mutate(
      { rating: ratingValue as number, note: note.trim() || undefined },
      {
        onSuccess: () => onSuccess?.(),
        onError: (error) => {
          const apiError = toApiError(error);
          const serverFieldErrors = extractFieldErrors(apiError);
          if (Object.keys(serverFieldErrors).length > 0) {
            setFieldErrors(serverFieldErrors);
            return;
          }
          setFormError(ratingSubmitErrorMessage(apiError.code));
        },
      }
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{mode === 'create' ? 'Rate this drink' : 'Update your rating'}</Text>

      <RatingStars value={ratingValue} onChange={setRatingValue} />
      {fieldErrors.rating ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {fieldErrors.rating}
        </Text>
      ) : null}

      <TextInput
        label="Note (optional)"
        accessibilityLabel="Rating note"
        value={note}
        onChangeText={setNote}
        placeholder="What did you think?"
        multiline
        maxLength={140}
        errorMessage={fieldErrors.note}
        editable={!isSubmitting}
      />

      {formError ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {formError}
        </Text>
      ) : null}

      <Button
        testID="rating-submit-button"
        label={mode === 'create' ? 'Submit rating' : 'Update rating'}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
});
