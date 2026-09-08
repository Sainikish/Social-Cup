import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { RedemptionOutcome } from '../../src/features/redemption/types';
import { RedemptionResultScreen } from '../../src/screens/RedemptionResultScreen';

function successOutcome(): RedemptionOutcome {
  return {
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
}

function renderWithOutcome(outcome?: RedemptionOutcome) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/result', state: outcome ? { outcome } : undefined }]}
    >
      <Routes>
        <Route path="/result" element={<RedemptionResultScreen />} />
        <Route path="/scanner" element={<div>Scanner Screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RedemptionResultScreen', () => {
  it('renders the green success card for a success outcome', () => {
    renderWithOutcome(successOutcome());

    expect(screen.getByText('Redemption Successful')).toBeInTheDocument();
    expect(screen.getByText('Oat Milk Latte')).toBeInTheDocument();
  });

  it('renders the red failure card for an error outcome', () => {
    renderWithOutcome({ status: 'error', message: 'Code not found or invalid.' });

    expect(screen.getByText('Redemption Failed')).toBeInTheDocument();
    expect(screen.getByText('Code not found or invalid.')).toBeInTheDocument();
  });

  it('redirects to /scanner when there is no outcome in navigation state (e.g. a direct reload of /result)', async () => {
    renderWithOutcome(undefined);

    expect(await screen.findByText('Scanner Screen')).toBeInTheDocument();
  });

  it('navigates to /scanner when "Scan Next" is pressed', () => {
    renderWithOutcome(successOutcome());

    fireEvent.click(screen.getByText('Scan Next'));

    expect(screen.getByText('Scanner Screen')).toBeInTheDocument();
  });
});
