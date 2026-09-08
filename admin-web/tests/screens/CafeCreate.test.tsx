import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { createCafe } from '../../src/features/cafes/api';
import type { AdminCafeDetailResponse } from '../../src/features/cafes/types';
import { CafeCreate } from '../../src/screens/CafeCreate/CafeCreate';

vi.mock('../../src/features/cafes/api');

const mockCreateCafe = vi.mocked(createCafe);

const SAMPLE_ADMIN_DETAIL: AdminCafeDetailResponse = {
  id: 'cafe-1',
  name: 'Daily Grind',
  address: '123 Main St',
  neighbourhood: null,
  latitude: null,
  longitude: null,
  openingHours: [],
  phoneNumber: null,
  email: null,
  website: null,
  payoutRate: 0.1,
  featured: false,
  vibeTags: null,
  description: null,
  status: 'ACTIVE',
  photos: [],
  drinks: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cafes/new']}>
        <Routes>
          <Route path="/cafes/new" element={<CafeCreate />} />
          <Route path="/cafes/:id" element={<div>Cafe Detail Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Daily Grind' } });
  fireEvent.change(screen.getByLabelText('Address'), { target: { value: '123 Main St' } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CafeCreate', () => {
  it('renders the create form with required fields', () => {
    renderScreen();

    expect(screen.getByText('Create Cafe', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields, without calling createCafe', () => {
    renderScreen();

    fireEvent.click(screen.getByText('Create Cafe', { selector: 'button' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Address is required.')).toBeInTheDocument();
    expect(mockCreateCafe).not.toHaveBeenCalled();
  });

  it('creates a cafe successfully and navigates to its detail screen with the admin response in state', async () => {
    mockCreateCafe.mockResolvedValue(SAMPLE_ADMIN_DETAIL);
    renderScreen();

    fillRequiredFields();
    fireEvent.click(screen.getByText('Create Cafe', { selector: 'button' }));

    expect(await screen.findByText('Cafe Detail Screen')).toBeInTheDocument();
    expect(mockCreateCafe).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Daily Grind', address: '123 Main St' })
    );
  });

  it('shows a loading state on the submit button while the request is in flight', async () => {
    let resolveCreate: (value: AdminCafeDetailResponse) => void = () => {};
    mockCreateCafe.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      })
    );
    renderScreen();

    fillRequiredFields();
    const submitButton = screen.getByText('Create Cafe', { selector: 'button' });
    fireEvent.click(submitButton);

    await waitFor(() => expect(submitButton).toBeDisabled());

    resolveCreate(SAMPLE_ADMIN_DETAIL);
    await screen.findByText('Cafe Detail Screen');
  });

  it('shows a duplicate-cafe message on a CONFLICT error, without navigating', async () => {
    mockCreateCafe.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { code: 'CONFLICT', message: 'duplicate' } },
      toJSON: () => ({}),
    });
    renderScreen();

    fillRequiredFields();
    fireEvent.click(screen.getByText('Create Cafe', { selector: 'button' }));

    expect(await screen.findByText('A cafe with this name and address already exists.')).toBeInTheDocument();
    expect(screen.queryByText('Cafe Detail Screen')).not.toBeInTheDocument();
  });

  it('shows backend field-level validation errors mapped to the matching input', async () => {
    mockCreateCafe.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fieldErrors: [{ field: 'email', message: 'must be a well-formed email address' }],
        },
      },
      toJSON: () => ({}),
    });
    renderScreen();

    fillRequiredFields();
    fireEvent.click(screen.getByText('Create Cafe', { selector: 'button' }));

    expect(await screen.findByText('must be a well-formed email address')).toBeInTheDocument();
  });

  it('shows a generic error message on a server error', async () => {
    mockCreateCafe.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderScreen();

    fillRequiredFields();
    fireEvent.click(screen.getByText('Create Cafe', { selector: 'button' }));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('never sends an invented role or admin-only field the CreateCafeRequest does not declare', async () => {
    mockCreateCafe.mockResolvedValue(SAMPLE_ADMIN_DETAIL);
    renderScreen();

    fillRequiredFields();
    fireEvent.click(screen.getByText('Create Cafe', { selector: 'button' }));

    await screen.findByText('Cafe Detail Screen');
    const sentPayload = mockCreateCafe.mock.calls[0][0];
    expect(Object.keys(sentPayload).sort()).toEqual(
      [
        'name',
        'address',
        'neighbourhood',
        'latitude',
        'longitude',
        'phoneNumber',
        'email',
        'website',
        'payoutRate',
        'featured',
        'vibeTags',
        'description',
      ].sort()
    );
  });
});
