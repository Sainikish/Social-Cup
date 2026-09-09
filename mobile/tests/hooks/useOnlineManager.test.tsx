import { onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { renderHook } from '@testing-library/react-native';

import { useOnlineManager } from '../../src/hooks/useOnlineManager';

describe('useOnlineManager', () => {
  it('marks TanStack Query online when NetInfo reports a connection', () => {
    const setOnlineSpy = jest.spyOn(onlineManager, 'setOnline');
    const addEventListenerSpy = jest.spyOn(NetInfo, 'addEventListener');

    renderHook(() => useOnlineManager());

    const [handler] = addEventListenerSpy.mock.calls[0];
    handler({ isConnected: true } as Parameters<typeof handler>[0]);

    expect(setOnlineSpy).toHaveBeenCalledWith(true);
  });

  it('marks TanStack Query offline when NetInfo reports no connection', () => {
    const setOnlineSpy = jest.spyOn(onlineManager, 'setOnline');
    const addEventListenerSpy = jest.spyOn(NetInfo, 'addEventListener');

    renderHook(() => useOnlineManager());

    const [handler] = addEventListenerSpy.mock.calls[0];
    handler({ isConnected: false } as Parameters<typeof handler>[0]);

    expect(setOnlineSpy).toHaveBeenCalledWith(false);
  });

  it('removes the NetInfo subscription on unmount, so it never leaks across renders', () => {
    const unsubscribeSpy = jest.fn();
    jest.spyOn(NetInfo, 'addEventListener').mockReturnValue(unsubscribeSpy);

    const { unmount } = renderHook(() => useOnlineManager());
    unmount();

    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });
});
