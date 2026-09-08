import { render, screen } from '@testing-library/react-native';

import { SubscriptionStatusCard } from '../../../../src/features/subscription/components/SubscriptionStatusCard';
import type { SubscriptionResponse } from '../../../../src/features/subscription/types';

function subscription(overrides: Partial<SubscriptionResponse> = {}): SubscriptionResponse {
  return {
    status: 'ACTIVE',
    currentPeriodStart: '2026-01-01',
    currentPeriodEnd: '2026-02-01',
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

describe('SubscriptionStatusCard', () => {
  it('shows a "not subscribed" state when subscription is null', () => {
    render(<SubscriptionStatusCard subscription={null} />);

    expect(screen.getByText('Not subscribed')).toBeTruthy();
    expect(screen.getByText('Subscribe to get 30 drink credits every month.')).toBeTruthy();
  });

  it('shows Active status with the renewal date', () => {
    render(<SubscriptionStatusCard subscription={subscription({ status: 'ACTIVE' })} />);

    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText(/Renews on/)).toBeTruthy();
  });

  it('shows a Past Due warning', () => {
    render(<SubscriptionStatusCard subscription={subscription({ status: 'PAST_DUE' })} />);

    expect(screen.getByText('Payment past due')).toBeTruthy();
    expect(screen.getByText(/last payment didn't go through/)).toBeTruthy();
  });

  it('shows a Cancelled state without renewal or scheduled-cancellation text', () => {
    render(<SubscriptionStatusCard subscription={subscription({ status: 'CANCELLED' })} />);

    expect(screen.getByText('Cancelled')).toBeTruthy();
    expect(screen.queryByText(/Renews on/)).toBeNull();
    expect(screen.queryByText(/Cancellation scheduled/)).toBeNull();
  });

  it('shows scheduled-cancellation copy, and "ends on" rather than "renews on", when cancelAtPeriodEnd is true', () => {
    render(
      <SubscriptionStatusCard subscription={subscription({ status: 'ACTIVE', cancelAtPeriodEnd: true })} />
    );

    expect(screen.getByText(/Membership ends on/)).toBeTruthy();
    expect(screen.getByText('Cancellation scheduled for the end of this billing period.')).toBeTruthy();
    expect(screen.queryByText(/Renews on/)).toBeNull();
  });
});
