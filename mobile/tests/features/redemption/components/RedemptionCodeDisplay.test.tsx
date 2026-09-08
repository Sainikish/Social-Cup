import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { RedemptionCodeDisplay } from '../../../../src/features/redemption/components/RedemptionCodeDisplay';
import type { RedemptionCodeResponse } from '../../../../src/features/redemption/types';

function redemption(overrides: Partial<RedemptionCodeResponse> = {}): RedemptionCodeResponse {
  return {
    code: 'sJ3f9x2k',
    backupCode: '004821',
    validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    drinkId: 'drink-1',
    drinkName: 'Cortado',
    cafeId: 'cafe-1',
    cafeName: 'Blue Bottle Coffee',
    creditPrice: 4,
    ...overrides,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('RedemptionCodeDisplay', () => {
  it('displays the drink name, cafe name, credit price, redemption code, and backup code', () => {
    render(<RedemptionCodeDisplay redemption={redemption()} onRegenerate={jest.fn()} />);

    expect(screen.getByText('Cortado')).toBeTruthy();
    expect(screen.getByText('Blue Bottle Coffee')).toBeTruthy();
    expect(screen.getByText('4 credits')).toBeTruthy();
    expect(screen.getByText('sJ3f9x2k')).toBeTruthy();
    expect(screen.getByText('004821')).toBeTruthy();
  });

  it('singularizes the credit price label when it is exactly 1', () => {
    render(<RedemptionCodeDisplay redemption={redemption({ creditPrice: 1 })} onRegenerate={jest.fn()} />);

    expect(screen.getByText('1 credit')).toBeTruthy();
  });

  it('shows a live countdown derived from validUntil, and ticks down as time passes', () => {
    render(
      <RedemptionCodeDisplay
        redemption={redemption({ validUntil: new Date(Date.now() + 125_000).toISOString() })}
        onRegenerate={jest.fn()}
      />
    );

    expect(screen.getByText('Expires in 2:05')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('Expires in 2:04')).toBeTruthy();
  });

  it('shows an expired state and a "Generate new code" action once validUntil has already passed', () => {
    render(
      <RedemptionCodeDisplay
        redemption={redemption({ validUntil: new Date(Date.now() - 1000).toISOString() })}
        onRegenerate={jest.fn()}
      />
    );

    expect(screen.getByText('This code has expired.')).toBeTruthy();
    expect(screen.getByText('Generate new code')).toBeTruthy();
    expect(screen.queryByText(/Expires in/)).toBeNull();
  });

  it('transitions from a live countdown to the expired state once the timer crosses validUntil, without calling anything on its own', () => {
    const onRegenerate = jest.fn();
    render(
      <RedemptionCodeDisplay
        redemption={redemption({ validUntil: new Date(Date.now() + 2000).toISOString() })}
        onRegenerate={onRegenerate}
      />
    );

    expect(screen.getByText(/Expires in/)).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByText('This code has expired.')).toBeTruthy();
    // The countdown reaching zero only changes what is rendered - it must
    // never call the backend or the regenerate callback by itself.
    expect(onRegenerate).not.toHaveBeenCalled();
  });

  it('calls onRegenerate when "Generate new code" is pressed', () => {
    const onRegenerate = jest.fn();
    render(
      <RedemptionCodeDisplay
        redemption={redemption({ validUntil: new Date(Date.now() - 1000).toISOString() })}
        onRegenerate={onRegenerate}
      />
    );

    fireEvent.press(screen.getByTestId('regenerate-code-button'));

    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('shows the regenerate action in a loading state while regenerating', () => {
    render(
      <RedemptionCodeDisplay
        redemption={redemption({ validUntil: new Date(Date.now() - 1000).toISOString() })}
        onRegenerate={jest.fn()}
        regenerating
      />
    );

    expect(screen.getByTestId('regenerate-code-button').props.accessibilityState.busy).toBe(true);
  });
});
