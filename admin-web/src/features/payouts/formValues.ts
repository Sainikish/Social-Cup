import type { MarkPayoutPaidRequest } from './types';

export interface MarkPayoutPaidFormValues {
  amountPaid: string;
  paymentReference: string;
  paymentDate: string;
}

// Purely presentational pre-validation mirroring the constraints
// MarkPayoutPaidRequest already declares (@NotNull/@DecimalMin("0.0"),
// @NotBlank/@Size(max=255), @NotNull) - faster feedback only, no new
// business rule. The backend still re-validates and remains authoritative.
export function validateMarkPayoutPaidForm(values: MarkPayoutPaidFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  const amountPaidTrimmed = values.amountPaid.trim();
  if (!amountPaidTrimmed) {
    errors.amountPaid = 'Amount paid is required.';
  } else {
    const amount = Number(amountPaidTrimmed);
    if (!Number.isFinite(amount) || amount < 0) {
      errors.amountPaid = 'Amount paid must not be negative.';
    }
  }

  const referenceTrimmed = values.paymentReference.trim();
  if (!referenceTrimmed) {
    errors.paymentReference = 'Payment reference is required.';
  } else if (referenceTrimmed.length > 255) {
    errors.paymentReference = 'Payment reference must not exceed 255 characters.';
  }

  if (!values.paymentDate.trim()) {
    errors.paymentDate = 'Payment date is required.';
  }

  return errors;
}

export function toMarkPayoutPaidRequest(values: MarkPayoutPaidFormValues): MarkPayoutPaidRequest {
  return {
    amountPaid: Number(values.amountPaid.trim()),
    paymentReference: values.paymentReference.trim(),
    paymentDate: values.paymentDate,
  };
}
