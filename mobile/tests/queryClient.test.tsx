import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { queryClient } from '../src/lib/queryClient';

describe('QueryClient provider', () => {
  it('renders its children', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Text>ready</Text>
      </QueryClientProvider>
    );

    expect(screen.getByText('ready')).toBeTruthy();
  });
});
