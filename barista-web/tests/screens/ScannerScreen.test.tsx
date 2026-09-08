import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AuthContextValue } from '../../src/auth/types';
import * as redemptionApi from '../../src/features/redemption/api';
import type { RedemptionResponse } from '../../src/features/redemption/types';
import { useQrScanner, type ScannerStatus } from '../../src/hooks/useQrScanner';
import { ScannerScreen } from '../../src/screens/ScannerScreen';

vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});
vi.mock('../../src/features/redemption/api');
vi.mock('../../src/hooks/useQrScanner');

const mockUseAuth = vi.mocked(useAuth);
const mockRedeemCode = vi.mocked(redemptionApi.redeemCode);
const mockUseQrScanner = vi.mocked(useQrScanner);

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'authenticated',
    cafeId: 'cafe-1',
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

function scannerValue(status: ScannerStatus, overrides: Partial<ReturnType<typeof useQrScanner>> = {}) {
  return {
    videoRef: { current: null },
    status,
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    ...overrides,
  };
}

function sampleRedemption(): RedemptionResponse {
  return {
    redemptionId: 'r1',
    drinkId: 'd1',
    drinkName: 'Oat Milk Latte',
    creditsDeducted: 4,
    memberFirstName: 'Ada',
    redeemedAt: '2026-01-01T00:00:00Z',
  };
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/scanner']}>
        <Routes>
          <Route path="/scanner" element={<ScannerScreen />} />
          <Route path="/result" element={<div>Result Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue(authValue());
});

describe('ScannerScreen', () => {
  it('shows the "Start Scanner" placeholder before scanning begins, and calls start() when pressed', () => {
    const scanner = scannerValue('idle');
    mockUseQrScanner.mockReturnValue(scanner);

    renderScreen();
    fireEvent.click(screen.getByText('Start Scanner'));

    expect(scanner.start).toHaveBeenCalledTimes(1);
  });

  it('shows a "Camera unavailable" message with manual entry still available', () => {
    mockUseQrScanner.mockReturnValue(scannerValue('unavailable'));

    renderScreen();

    expect(screen.getByText('Camera unavailable.')).toBeInTheDocument();
    expect(screen.getByLabelText('Enter code manually')).toBeInTheDocument();
  });

  it('shows the live camera preview once active', () => {
    mockUseQrScanner.mockReturnValue(scannerValue('active'));

    const { container } = renderScreen();

    expect(container.querySelector('video')).not.toBeNull();
  });

  it('redeems a code decoded by the scanner and navigates to /result with a success outcome', async () => {
    mockRedeemCode.mockResolvedValue(sampleRedemption());
    let capturedOnDecode: ((value: string) => void) | undefined;
    mockUseQrScanner.mockImplementation(({ onDecode }) => {
      capturedOnDecode = onDecode;
      return scannerValue('active');
    });

    renderScreen();
    capturedOnDecode?.('member-code-1');

    expect(await screen.findByText('Result Screen')).toBeInTheDocument();
    expect(mockRedeemCode).toHaveBeenCalledWith('member-code-1');
  });

  it('navigates to /result with a mapped error outcome when the scanned code is rejected', async () => {
    mockRedeemCode.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'Redemption code not found' } },
      toJSON: () => ({}),
    });
    let capturedOnDecode: ((value: string) => void) | undefined;
    mockUseQrScanner.mockImplementation(({ onDecode }) => {
      capturedOnDecode = onDecode;
      return scannerValue('active');
    });

    renderScreen();
    capturedOnDecode?.('unknown-code');

    expect(await screen.findByText('Result Screen')).toBeInTheDocument();
  });

  it('redeems a manually entered code', async () => {
    mockRedeemCode.mockResolvedValue(sampleRedemption());
    mockUseQrScanner.mockReturnValue(scannerValue('idle'));

    renderScreen();
    fireEvent.change(screen.getByLabelText('Enter code manually'), { target: { value: 'manual-code-1' } });
    fireEvent.click(screen.getByText('Redeem'));

    expect(await screen.findByText('Result Screen')).toBeInTheDocument();
    expect(mockRedeemCode).toHaveBeenCalledWith('manual-code-1');
  });

  it('does not enable submission for an empty manual code', () => {
    mockUseQrScanner.mockReturnValue(scannerValue('idle'));

    renderScreen();

    expect(screen.getByText('Redeem')).toBeDisabled();
    expect(mockRedeemCode).not.toHaveBeenCalled();
  });

  it('disables the Redeem action while a request is in flight, preventing a second submission', async () => {
    let resolveRedeem: (value: RedemptionResponse) => void = () => {};
    mockRedeemCode.mockReturnValue(
      new Promise((resolve) => {
        resolveRedeem = resolve;
      })
    );
    mockUseQrScanner.mockReturnValue(scannerValue('idle'));

    renderScreen();
    fireEvent.change(screen.getByLabelText('Enter code manually'), { target: { value: 'code-A' } });
    // Captured before clicking: once loading, the button shows a spinner
    // instead of the "Redeem" text (see Button.tsx), so it can no longer be
    // found by that text - the stored DOM node reference stays valid across
    // that re-render, which is what a second real click would also target.
    const redeemButton = screen.getByText('Redeem');
    fireEvent.click(redeemButton);

    await waitFor(() => expect(redeemButton).toBeDisabled());

    // A second press while disabled must not fire a second request - this is
    // the actual, primary duplicate-submission guard (a disabled control
    // does not dispatch its click handler); the mutation's own isPending
    // check in submitCode is a secondary guard, not the sole protection.
    fireEvent.click(redeemButton);
    expect(mockRedeemCode).toHaveBeenCalledTimes(1);

    resolveRedeem(sampleRedemption());
    await screen.findByText('Result Screen');
  });

  it('logs out when "Log out" is pressed', () => {
    const logout = vi.fn();
    mockUseAuth.mockReturnValue(authValue({ logout }));
    mockUseQrScanner.mockReturnValue(scannerValue('idle'));

    renderScreen();
    fireEvent.click(screen.getByText('Log out'));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
