import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { createDrink } from '../../src/features/drinks/api';
import type { DrinkResponse } from '../../src/features/drinks/types';
import { DrinkCreate } from '../../src/screens/DrinkCreate/DrinkCreate';

vi.mock('../../src/features/drinks/api');

const mockCreateDrink = vi.mocked(createDrink);

const SAMPLE_DRINK: DrinkResponse = {
  id: 'drink-1',
  cafeId: 'cafe-1',
  cafeName: 'Daily Grind',
  name: 'Iced Latte',
  type: null,
  description: null,
  retailPrice: 4.5,
  creditPrice: 2,
  photoUrl: null,
  signature: false,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cafes/cafe-1/drinks/new']}>
        <Routes>
          <Route path="/cafes/:cafeId/drinks/new" element={<DrinkCreate />} />
          <Route path="/drinks/:drinkId" element={<div>Drink Detail Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Iced Latte' } });
  fireEvent.change(screen.getByLabelText('Retail price'), { target: { value: '4.50' } });
  fireEvent.change(screen.getByLabelText('Credit price'), { target: { value: '2' } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DrinkCreate', () => {
  it('renders the create form with required fields', () => {
    renderScreen();

    expect(screen.getByText('Add Drink', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Retail price')).toBeInTheDocument();
    expect(screen.getByLabelText('Credit price')).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields, without calling createDrink', () => {
    renderScreen();

    fireEvent.click(screen.getByText('Add Drink', { selector: 'button' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Retail price is required.')).toBeInTheDocument();
    expect(screen.getByText('Credit price is required.')).toBeInTheDocument();
    expect(mockCreateDrink).not.toHaveBeenCalled();
  });

  it('creates a drink successfully and navigates to its detail screen', async () => {
    mockCreateDrink.mockResolvedValue(SAMPLE_DRINK);
    renderScreen();

    fillRequiredFields();
    fireEvent.click(screen.getByText('Add Drink', { selector: 'button' }));

    expect(await screen.findByText('Drink Detail Screen')).toBeInTheDocument();
    expect(mockCreateDrink).toHaveBeenCalledWith(
      'cafe-1',
      expect.objectContaining({ name: 'Iced Latte', retailPrice: 4.5, creditPrice: 2 })
    );
  });

  it('shows a loading state on the submit button while the request is in flight, preventing duplicate submission', async () => {
    let resolveCreate: (value: DrinkResponse) => void = () => {};
    mockCreateDrink.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      })
    );
    renderScreen();

    fillRequiredFields();
    const submitButton = screen.getByText('Add Drink', { selector: 'button' });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => expect(submitButton).toBeDisabled());
    expect(mockCreateDrink).toHaveBeenCalledTimes(1);

    resolveCreate(SAMPLE_DRINK);
    await screen.findByText('Drink Detail Screen');
  });

  it('shows a duplicate-drink message on a CONFLICT error, without navigating', async () => {
    mockCreateDrink.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { code: 'CONFLICT', message: 'duplicate' } },
      toJSON: () => ({}),
    });
    renderScreen();

    fillRequiredFields();
    fireEvent.click(screen.getByText('Add Drink', { selector: 'button' }));

    expect(await screen.findByText('A drink with this name already exists for this cafe.')).toBeInTheDocument();
    expect(screen.queryByText('Drink Detail Screen')).not.toBeInTheDocument();
  });

  it('shows backend field-level validation errors mapped to the matching input', async () => {
    mockCreateDrink.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fieldErrors: [{ field: 'retailPrice', message: 'Retail price must be positive' }],
        },
      },
      toJSON: () => ({}),
    });
    renderScreen();

    fillRequiredFields();
    fireEvent.click(screen.getByText('Add Drink', { selector: 'button' }));

    expect(await screen.findByText('Retail price must be positive')).toBeInTheDocument();
  });

  it('shows a generic error message on a server error', async () => {
    mockCreateDrink.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderScreen();

    fillRequiredFields();
    fireEvent.click(screen.getByText('Add Drink', { selector: 'button' }));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('never sends an invented cafeId or other field the CreateDrinkRequest does not declare', async () => {
    mockCreateDrink.mockResolvedValue(SAMPLE_DRINK);
    renderScreen();

    fillRequiredFields();
    fireEvent.click(screen.getByText('Add Drink', { selector: 'button' }));

    await screen.findByText('Drink Detail Screen');
    const [, sentPayload] = mockCreateDrink.mock.calls[0];
    expect(Object.keys(sentPayload).sort()).toEqual(
      ['name', 'type', 'description', 'retailPrice', 'creditPrice', 'photoUrl', 'signature'].sort()
    );
  });
});
