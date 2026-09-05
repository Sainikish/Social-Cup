import { fireEvent, render, screen } from '@testing-library/react-native';

import { RatingStars } from '../../../src/features/ratings/components/RatingStars';

describe('RatingStars (read-only mode)', () => {
  it('exposes an accessible summary label with the current rating', () => {
    render(<RatingStars value={4} />);
    expect(screen.getByLabelText('Rated 4 out of 5 stars')).toBeTruthy();
  });

  it('shows a not-yet-rated label when there is no value', () => {
    render(<RatingStars value={undefined} />);
    expect(screen.getByLabelText('Not yet rated')).toBeTruthy();
  });

  it('renders exactly 5 star glyphs, filled up to the given value', () => {
    render(<RatingStars value={3} />);
    expect(screen.getAllByText('★')).toHaveLength(3);
    expect(screen.getAllByText('☆')).toHaveLength(2);
  });

  it('does not expose star buttons in read-only mode', () => {
    render(<RatingStars value={3} />);
    expect(screen.queryByLabelText('Rate 3 stars')).toBeNull();
  });
});

describe('RatingStars (interactive mode)', () => {
  it('renders 5 tappable stars with accessible per-star labels', () => {
    render(<RatingStars value={undefined} onChange={() => {}} />);
    expect(screen.getByLabelText('Rate 1 star')).toBeTruthy();
    expect(screen.getByLabelText('Rate 2 stars')).toBeTruthy();
    expect(screen.getByLabelText('Rate 3 stars')).toBeTruthy();
    expect(screen.getByLabelText('Rate 4 stars')).toBeTruthy();
    expect(screen.getByLabelText('Rate 5 stars')).toBeTruthy();
  });

  it('calls onChange with the tapped star value', () => {
    const onChange = jest.fn();
    render(<RatingStars value={undefined} onChange={onChange} />);

    fireEvent.press(screen.getByLabelText('Rate 4 stars'));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('marks the currently selected star as selected for accessibility', () => {
    render(<RatingStars value={3} onChange={() => {}} />);

    expect(screen.getByLabelText('Rate 3 stars').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Rate 4 stars').props.accessibilityState.selected).toBe(false);
  });

  it('restricts values to 1-5 (never renders a 6th star or a 0 option)', () => {
    render(<RatingStars value={undefined} onChange={() => {}} />);

    expect(screen.queryByLabelText('Rate 0 stars')).toBeNull();
    expect(screen.queryByLabelText('Rate 6 stars')).toBeNull();
  });
});
