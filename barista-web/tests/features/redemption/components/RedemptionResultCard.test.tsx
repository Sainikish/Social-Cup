import { fireEvent, render, screen } from '@testing-library/react';

import { RedemptionResultCard } from '../../../../src/features/redemption/components/RedemptionResultCard';
import type { RedemptionOutcome } from '../../../../src/features/redemption/types';

describe('RedemptionResultCard', () => {
  it('shows the green success state with drink, credits, and member details', () => {
    const outcome: RedemptionOutcome = {
      status: 'success',
      data: {
        redemptionId: 'r1',
        drinkId: 'd1',
        drinkName: 'Oat Milk Latte',
        creditsDeducted: 4,
        memberFirstName: 'Ada',
        redeemedAt: '2026-01-01T00:00:00Z',
      },
    };

    render(<RedemptionResultCard outcome={outcome} onScanNext={vi.fn()} />);

    expect(screen.getByText('Redemption Successful')).toBeInTheDocument();
    expect(screen.getByText('Oat Milk Latte')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('shows the red failure state with the already-mapped message, never a raw backend string', () => {
    const outcome: RedemptionOutcome = { status: 'error', message: 'Code not found or invalid.' };

    render(<RedemptionResultCard outcome={outcome} onScanNext={vi.fn()} />);

    expect(screen.getByText('Redemption Failed')).toBeInTheDocument();
    expect(screen.getByText('Code not found or invalid.')).toBeInTheDocument();
  });

  it('calls onScanNext when "Scan Next" is pressed', () => {
    const onScanNext = vi.fn();
    render(<RedemptionResultCard outcome={{ status: 'error', message: 'x' }} onScanNext={onScanNext} />);

    fireEvent.click(screen.getByText('Scan Next'));

    expect(onScanNext).toHaveBeenCalledTimes(1);
  });
});
