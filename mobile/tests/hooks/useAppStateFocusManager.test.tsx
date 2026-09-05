import { focusManager } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useAppStateFocusManager } from '../../src/hooks/useAppStateFocusManager';

describe('useAppStateFocusManager', () => {
  it('marks TanStack Query focused when the app becomes active', () => {
    const setFocusedSpy = jest.spyOn(focusManager, 'setFocused');
    const addEventListenerSpy = jest.spyOn(AppState, 'addEventListener');

    renderHook(() => useAppStateFocusManager());

    const [, handler] = addEventListenerSpy.mock.calls[0];
    handler('active');

    expect(setFocusedSpy).toHaveBeenCalledWith(true);
  });

  it('marks TanStack Query unfocused when the app is backgrounded or inactive', () => {
    const setFocusedSpy = jest.spyOn(focusManager, 'setFocused');
    const addEventListenerSpy = jest.spyOn(AppState, 'addEventListener');

    renderHook(() => useAppStateFocusManager());

    const [, handler] = addEventListenerSpy.mock.calls[0];
    handler('background');

    expect(setFocusedSpy).toHaveBeenCalledWith(false);
  });

  it('removes the AppState subscription on unmount, so it never leaks across renders', () => {
    const removeSpy = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: removeSpy });

    const { unmount } = renderHook(() => useAppStateFocusManager());
    unmount();

    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});
