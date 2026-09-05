import { fireEvent, render, screen } from '@testing-library/react-native';

import { CafeSearchBar } from '../../../src/features/cafes/components/CafeSearchBar';

describe('CafeSearchBar', () => {
  it('calls onChangeText as the user types', () => {
    const onChangeText = jest.fn();
    render(<CafeSearchBar value="" onChangeText={onChangeText} />);

    fireEvent.changeText(screen.getByLabelText('Search cafes'), 'blue');
    expect(onChangeText).toHaveBeenCalledWith('blue');
  });

  it('does not show a clear button when the search is empty', () => {
    render(<CafeSearchBar value="" onChangeText={() => {}} />);
    expect(screen.queryByLabelText('Clear search')).toBeNull();
  });

  it('shows a clear button when there is search text, and clears it on press', () => {
    const onChangeText = jest.fn();
    render(<CafeSearchBar value="blue" onChangeText={onChangeText} />);

    fireEvent.press(screen.getByLabelText('Clear search'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });
});
