import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { MemberLookup } from '../../src/screens/MemberLookup/MemberLookup';

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/members']}>
      <Routes>
        <Route path="/members" element={<MemberLookup />} />
        <Route path="/members/:memberId" element={<div>Member Detail Screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('MemberLookup', () => {
  it('renders the lookup form and clearly states the listing/search limitation', () => {
    renderScreen();

    expect(screen.getByText('Members', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByLabelText('Member ID')).toBeInTheDocument();
    expect(screen.getByText(/require a backend API/i)).toBeInTheDocument();
  });

  it('navigates to /members/:memberId with the entered ID', () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText('Member ID'), { target: { value: 'member-42' } });
    fireEvent.click(screen.getByText('Open'));

    expect(screen.getByText('Member Detail Screen')).toBeInTheDocument();
  });

  it('does not navigate when the field is left blank', () => {
    renderScreen();

    fireEvent.click(screen.getByText('Open'));

    expect(screen.queryByText('Member Detail Screen')).not.toBeInTheDocument();
  });
});
